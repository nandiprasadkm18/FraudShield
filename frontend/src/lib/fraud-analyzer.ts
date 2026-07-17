import { analyzeWithGroq } from "@/lib/groq-client";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

// ── Entity extraction ─────────────────────────────────────────────────────────
const PHONE_RE = /(?:\+91[\s-]?)?[6-9]\d{9}/g;
const UPI_RE = /[\w.+-]+@[\w]+/g;
const URL_RE = /https?:\/\/[^\s"'<>]+/g;
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

export interface ExtractedEntity {
  type: "PHONE_NUMBER" | "UPI_ID" | "WEBSITE" | "EMAIL";
  value: string;
}

export function extractEntities(text: string, reportedPhone?: string): ExtractedEntity[] {
  const seen = new Set<string>();
  const entities: ExtractedEntity[] = [];

  const add = (type: ExtractedEntity["type"], value: string) => {
    const key = `${type}:${value}`;
    if (!seen.has(key)) {
      seen.add(key);
      entities.push({ type, value });
    }
  };

  if (reportedPhone) {
    add("PHONE_NUMBER", reportedPhone.replace(/\s/g, ""));
  }

  for (const match of text.matchAll(PHONE_RE)) {
    add("PHONE_NUMBER", match[0].replace(/\s|-/g, ""));
  }

  const emailMatches = [...text.matchAll(EMAIL_RE)].map((m) => m[0]);
  const emailSet = new Set(emailMatches);
  for (const email of emailMatches) {
    add("EMAIL", email);
  }

  for (const match of text.matchAll(UPI_RE)) {
    if (!emailSet.has(match[0])) {
      add("UPI_ID", match[0]);
    }
  }

  for (const match of text.matchAll(URL_RE)) {
    add("WEBSITE", match[0].slice(0, 255));
  }

  return entities.slice(0, 20); // cap for safety
}

// ── Severity → numeric risk score ────────────────────────────────────────────
export function severityToScore(severity: string): number {
  switch (severity) {
    case "CRITICAL": return 95;
    case "HIGH": return 75;
    case "MEDIUM": return 50;
    case "LOW": return 20;
    default: return 0;
  }
}

export interface FraudAnalysisResult {
  degraded?: boolean;
  verdict: string;
  severity?: string;
  confidenceScore?: number;
  fraudType?: string;
  tags?: string[];
  timeline?: { step: string; detail: string }[];
  reasoning: string;
  escalate?: boolean;

  // Legacy UI fields
  riskLevel?: string;
  indicators?: string[];
  confidence?: number;
  recommendedActions?: string[];

  reportId?: string;
  threatReportId?: string;

  injectionDetected?: boolean;
  latencyMs?: number;
  message?: string; // If degraded
}

export async function processFraudAnalysis({
  text,
  phoneNumber,
  ip = "unknown",
  district,
  pincode,
  saveToDb = false,
}: {
  text: string;
  phoneNumber?: string;
  ip?: string;
  district?: string;
  pincode?: string;
  saveToDb?: boolean;
}): Promise<FraudAnalysisResult> {

  // ── 1. Analyse via Groq ─────────────────────────────────────────────────────
  const result = await analyzeWithGroq({ text, phoneNumber });

  // ── 2. Degraded mode ────────────────────────────────────────────────────────
  if (result.degraded) {
    try {
      await prisma.groqCallLog.create({
        data: {
          payloadHash: result.payloadHash,
          model: result.model,
          latencyMs: result.latencyMs,
          promptTokens: result.promptTokens,
          completionTokens: result.completionTokens,
          success: false,
          schemaValid: false,
          degraded: true,
          injectionDetected: result.injectionDetected,
          errorMessage: result.errorMessage ?? null,
        },
      });
    } catch (dbErr: any) {
      console.error("[analyze-fraud] Groq log write failed:", dbErr.message);
    }

    return {
      degraded: true,
      verdict: "Analysis Unavailable",
      message: "Analysis engine is temporarily unavailable. No fraud verdict has been made. Please retry in a few moments.",
      reasoning: result.output?.reasoning || "",
    };
  }

  const { output } = result;
  const payloadHash = crypto
    .createHash("sha256")
    .update(`${phoneNumber ?? ""}:${text}`)
    .digest("hex");

  let threatReportId: string | undefined;
  let legacyReportId: string | undefined;

  // ── 3. Persist everything to PostgreSQL ────────────────────────────────────
  try {
    // 3a. GroqCallLog
    await prisma.groqCallLog.create({
      data: {
        payloadHash: result.payloadHash,
        model: result.model,
        latencyMs: result.latencyMs,
        promptTokens: result.promptTokens,
        completionTokens: result.completionTokens,
        success: result.success,
        schemaValid: result.schemaValid,
        degraded: false,
        injectionDetected: result.injectionDetected,
        errorMessage: null,
      },
    });

    // 3b. PhoneReputation upsert
    const targetPhone = phoneNumber ?? "unknown";
    await prisma.phoneReputation.upsert({
      where: { phoneNumber: targetPhone },
      update: {
        reportCount: { increment: 1 },
        lastReportedAt: new Date(),
        aggregatedRiskScore: severityToScore(output.severity),
        dominantSeverity: output.severity as any,
        dominantFraudType: output.fraudType,
      },
      create: {
        phoneNumber: targetPhone,
        reportCount: 1,
        aggregatedRiskScore: severityToScore(output.severity),
        dominantSeverity: output.severity as any,
        dominantFraudType: output.fraudType,
      },
    });

    // 3c. ThreatReport
    const threatReport = await prisma.threatReport.create({
      data: {
        targetPhoneNumber: targetPhone,
        payloadText: text || null,
        payloadHash,
        channel: "UNKNOWN",
        verdict: output.verdict as any,
        severity: output.severity as any,
        confidenceScore: output.confidenceScore,
        fraudType: output.fraudType,
        tags: output.tags,
        timelineSteps: output.timeline as any,
        reasoning: output.reasoning,
        escalate: output.escalate,
        sourceIp: ip === "unknown" ? null : crypto.createHash("sha256").update(ip).digest("hex"),
      },
    });

    threatReportId = threatReport.id;

    // Legacy NumberReputation
    if (phoneNumber) {
      await prisma.numberReputation.upsert({
        where: { phoneNumber },
        update: {
          reportsCount: { increment: 1 },
          lastReportedAt: new Date(),
          riskScore: severityToScore(output.severity),
          riskLevel: output.severity,
          scamCategory: output.fraudType,
        },
        create: {
          phoneNumber,
          reportsCount: 1,
          riskScore: severityToScore(output.severity),
          riskLevel: output.severity,
          scamCategory: output.fraudType,
        },
      });
    }

    // 3d. Entity extraction
    const entities = extractEntities(text, phoneNumber);
    if (entities.length >= 2) {
      const nodeIds: string[] = [];
      for (const entity of entities) {
        try {
          const node = await prisma.networkNode.create({
            data: {
              entityType: entity.type as any,
              entityValue: entity.value,
              label: entity.value,
              reportId: threatReport.id,
            },
          });
          nodeIds.push(node.id);
        } catch {
          // ignore duplicate
        }
      }

      if (nodeIds.length >= 2) {
        for (let i = 1; i < nodeIds.length; i++) {
          try {
            await prisma.networkEdge.create({
              data: {
                sourceNodeId: nodeIds[0],
                targetNodeId: nodeIds[i],
                weight: 1.0,
                reportId: threatReport.id,
              },
            });
          } catch {
            // ignore duplicate
          }
        }
      }
    }

    // 3e. GeoEvent
    if (threatReportId && (district || pincode)) {
      let lat = null;
      let lng = null;

      if (district) {
        const dLower = district.toLowerCase().trim();
        let match = await prisma.districtCoordinate.findFirst({
          where: { name: { equals: dLower, mode: "insensitive" } }
        });

        if (!match) {
          match = await prisma.districtCoordinate.findFirst({
            where: { name: { contains: dLower, mode: "insensitive" } }
          });
        }

        if (match) {
          lat = match.lat;
          lng = match.lng;
        }
      }

      if (lat !== null && lng !== null) {
        await prisma.geoEvent.create({
          data: {
            lat: lat,
            lng: lng,
            district: district ?? null,
            pincode: pincode ?? null,
            reportId: threatReport.id,
            severity: output.severity as any,
            locationSource: "USER_SUPPLIED",
          },
        });
      }
    }

    // 3f. Legacy Report
    const legacyReport = await prisma.report.create({
      data: {
        phoneNumber: phoneNumber ?? "unknown",
        transcript: text || null,
        riskScore: Math.round(output.confidenceScore * 100),
        riskLevel: output.severity,
        fraudType: output.fraudType,
        confidence: output.confidenceScore,
        indicators: JSON.stringify(output.tags),
        actions: JSON.stringify(output.timeline.map((t) => t.detail)),
      },
    });

    legacyReportId = legacyReport.id;
  } catch (dbErr: any) {
    console.error("[analyze-fraud] DB write failed:", dbErr.message);
  }

  // ── 4. Return response ──────────────────────────────────────────────────────
  return {
    verdict: output.verdict,
    severity: output.severity,
    confidenceScore: output.confidenceScore,
    fraudType: output.fraudType,
    tags: output.tags,
    timeline: output.timeline,
    reasoning: output.reasoning,
    escalate: output.escalate,

    riskLevel: output.severity.toLowerCase(),
    indicators: output.tags,
    confidence: output.confidenceScore,
    recommendedActions: output.timeline.map((t) => t.detail),

    reportId: threatReportId ?? legacyReportId,
    threatReportId,

    injectionDetected: result.injectionDetected,
    latencyMs: result.latencyMs,
  };
}

export async function saveFraudReport({
  text,
  phoneNumber,
  ip = "unknown",
  district,
  pincode,
  output,
  payloadHash,
}: {
  text: string;
  phoneNumber?: string;
  ip?: string;
  district?: string;
  pincode?: string;
  output: any;
  payloadHash: string;
}): Promise<{ threatReportId?: string; legacyReportId?: string }> {
  let threatReportId: string | undefined;
  let legacyReportId: string | undefined;

  try {
    const targetPhone = phoneNumber ?? "unknown";
    await prisma.phoneReputation.upsert({
      where: { phoneNumber: targetPhone },
      update: {
        reportCount: { increment: 1 },
        lastReportedAt: new Date(),
        aggregatedRiskScore: severityToScore(output.severity),
        dominantSeverity: output.severity as any,
        dominantFraudType: output.fraudType,
      },
      create: {
        phoneNumber: targetPhone,
        reportCount: 1,
        aggregatedRiskScore: severityToScore(output.severity),
        dominantSeverity: output.severity as any,
        dominantFraudType: output.fraudType,
      },
    });

    const threatReport = await prisma.threatReport.create({
      data: {
        targetPhoneNumber: targetPhone,
        payloadText: text || null,
        payloadHash,
        channel: "UNKNOWN",
        verdict: output.verdict as any,
        severity: output.severity as any,
        confidenceScore: output.confidenceScore,
        fraudType: output.fraudType,
        tags: output.tags,
        timelineSteps: output.timeline as any,
        reasoning: output.reasoning,
        escalate: output.escalate,
        sourceIp: ip === "unknown" ? null : crypto.createHash("sha256").update(ip).digest("hex"),
      },
    });

    threatReportId = threatReport.id;

    if (phoneNumber) {
      await prisma.numberReputation.upsert({
        where: { phoneNumber },
        update: {
          reportsCount: { increment: 1 },
          lastReportedAt: new Date(),
          riskScore: severityToScore(output.severity),
          riskLevel: output.severity,
          scamCategory: output.fraudType,
        },
        create: {
          phoneNumber,
          reportsCount: 1,
          riskScore: severityToScore(output.severity),
          riskLevel: output.severity,
          scamCategory: output.fraudType,
        },
      });
    }

    const entities = extractEntities(text, phoneNumber);
    if (entities.length >= 2) {
      const nodeIds: string[] = [];
      for (const entity of entities) {
        try {
          const node = await prisma.networkNode.create({
            data: {
              entityType: entity.type as any,
              entityValue: entity.value,
              label: entity.value,
              reportId: threatReport.id,
            },
          });
          nodeIds.push(node.id);
        } catch {
          // ignore duplicate
        }
      }

      if (nodeIds.length >= 2) {
        for (let i = 1; i < nodeIds.length; i++) {
          try {
            await prisma.networkEdge.create({
              data: {
                sourceNodeId: nodeIds[0],
                targetNodeId: nodeIds[i],
                weight: 1.0,
                reportId: threatReport.id,
              },
            });
          } catch {
            // ignore duplicate
          }
        }
      }
    }

    if (threatReportId && (district || pincode)) {
      let lat = null;
      let lng = null;

      if (district) {
        const dLower = district.toLowerCase().trim();
        let match = await prisma.districtCoordinate.findFirst({
          where: { name: { equals: dLower, mode: "insensitive" } }
        });

        if (!match) {
          match = await prisma.districtCoordinate.findFirst({
            where: { name: { contains: dLower, mode: "insensitive" } }
          });
        }

        if (match) {
          lat = match.lat;
          lng = match.lng;
        }
      }

      if (lat !== null && lng !== null) {
        await prisma.geoEvent.create({
          data: {
            lat: lat,
            lng: lng,
            district: district ?? null,
            pincode: pincode ?? null,
            reportId: threatReport.id,
            severity: output.severity as any,
            locationSource: "USER_SUPPLIED",
          },
        });
      }
    }

    const legacyReport = await prisma.report.create({
      data: {
        phoneNumber: phoneNumber ?? "unknown",
        transcript: text || null,
        riskScore: Math.round(output.confidenceScore * 100),
        riskLevel: output.severity,
        fraudType: output.fraudType,
        confidence: output.confidenceScore,
        indicators: JSON.stringify(output.tags),
        actions: JSON.stringify(output.timeline.map((t: any) => t.detail)),
      },
    });

    legacyReportId = legacyReport.id;
  } catch (dbErr: any) {
    console.error("[saveFraudReport] DB write failed:", dbErr.message);
  }

  return { threatReportId, legacyReportId };
}
