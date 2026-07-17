import { z } from "zod";

/**
 * Canonical schema for all Groq AI analysis responses.
 * Every field has a safe default so partial responses never crash the app.
 * "INSUFFICIENT_EVIDENCE" is a first-class verdict — never fake a score.
 */
export const GroqOutputSchema = z.object({
  verdict: z.enum([
    "SCAM",
    "SUSPICIOUS",
    "BENIGN",
    "INSUFFICIENT_EVIDENCE",
  ]),
  severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW", "NONE"]),
  confidenceScore: z.number().min(0).max(1),
  fraudType: z.string().default("Unknown"),
  tags: z.array(z.string()).default([]),
  timeline: z
    .array(
      z.object({
        step: z.string(),
        detail: z.string(),
      })
    )
    .default([]),
  reasoning: z.string().default(""),
  escalate: z.boolean().default(false),
});

export type GroqOutput = z.infer<typeof GroqOutputSchema>;

/**
 * Safe fallback verdict returned when Groq is unreachable.
 * Never fabricates a fraud signal.
 */
export const DEGRADED_VERDICT: GroqOutput = {
  verdict: "INSUFFICIENT_EVIDENCE",
  severity: "NONE",
  confidenceScore: 0,
  fraudType: "Analysis Unavailable",
  tags: [],
  timeline: [],
  reasoning:
    "Analysis engine is temporarily unavailable. No verdict has been made. Please retry.",
  escalate: false,
};
