"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { ArrowLeft, ShieldAlert, Activity, AlertTriangle, AlertCircle, ShieldCheck, Database, Phone, Link as LinkIcon, Crosshair, FileText } from "lucide-react";
import clsx from "clsx";

interface ReportDetail {
  id: string;
  targetPhoneNumber: string;
  payloadText: string;
  verdict: string;
  severity: string;
  confidenceScore: number;
  fraudType: string;
  analysisOutput: any;
  createdAt: string;
}

export default function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch(`/api/intel/reports/${unwrappedParams.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => {
        if (!res.ok) throw new Error("Report not found");
        return res.json();
      })
      .then(data => setReport(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [unwrappedParams.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="text-center">
          <Activity size={32} className="text-[#34d399] animate-spin mx-auto mb-4" />
          <p className="text-xs text-zinc-500 font-mono tracking-widest uppercase animate-pulse">Loading Deep Intel...</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white">
        <div className="text-center">
          <ShieldAlert size={48} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Report Not Found</h2>
          <p className="text-zinc-500 mb-6">{error || "The requested incident report could not be located."}</p>
          <Link href="/network/reports" className="text-black bg-white px-6 py-2 rounded-lg font-bold">
            Back to Reports
          </Link>
        </div>
      </div>
    );
  }

  const analysis = report.analysisOutput || {};
  const isCritical = report.severity === "CRITICAL";
  const isHigh = report.severity === "HIGH";

  const colorClass =
    report.severity === "CRITICAL" ? "text-red-500" :
      report.severity === "HIGH" ? "text-orange-500" :
        report.severity === "MEDIUM" ? "text-yellow-500" : "text-[#34d399]";

  const borderClass =
    report.severity === "CRITICAL" ? "border-red-500" :
      report.severity === "HIGH" ? "border-orange-500" :
        report.severity === "MEDIUM" ? "border-yellow-500" : "border-[#34d399]";

  const bgClass =
    report.severity === "CRITICAL" ? "bg-red-500" :
      report.severity === "HIGH" ? "bg-orange-500" :
        report.severity === "MEDIUM" ? "bg-yellow-500" : "bg-[#34d399]";

  const MainIcon =
    report.severity === "CRITICAL" ? AlertTriangle :
      report.severity === "HIGH" ? AlertCircle :
        report.severity === "LOW" ? ShieldCheck : ShieldAlert;

  const displayId = `RS-${report.id.slice(-8).toUpperCase()}`;

  return (
    <div className="min-h-screen bg-[#050505] text-white p-8 font-sans pb-20">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/network/reports" className="p-2 border border-white/10 rounded-xl hover:bg-white/5 transition-colors">
          <ArrowLeft size={20} className="text-white" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Threat Investigation</h1>
          <p className="text-sm text-zinc-500 font-mono tracking-widest mt-1 uppercase">Report ID: {displayId}</p>
        </div>
      </div>

      <div className={clsx(
        "rounded-2xl p-8 border bg-[#0a0a0a] w-full mb-8 relative overflow-hidden",
        isCritical ? "border-red-500/30 shadow-[0_0_40px_rgba(239,68,68,0.1)]" : "border-white/10"
      )}>
        {isCritical && <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 blur-[100px] pointer-events-none" />}
        
        <div className="flex items-center justify-between border-b border-white/5 pb-8 mb-8 relative z-10">
          <div className="flex items-center gap-6">
            <div className={clsx("w-20 h-20 rounded-2xl flex items-center justify-center bg-white")}>
              <MainIcon size={40} className="text-black fill-black" />
            </div>
            <div>
              <h2 className={clsx("text-4xl font-black tracking-tight mb-2 uppercase", colorClass)}>
                {report.fraudType || "Unknown Threat"}
              </h2>
              <div className="flex items-center gap-3 text-xs font-mono">
                <span className={clsx("px-3 py-1.5 rounded bg-black border font-bold uppercase", borderClass, colorClass)}>
                  SEVERITY: {report.severity}
                </span>
                <span className="px-3 py-1.5 rounded bg-black border border-white/20 text-white font-bold">
                  CONFIDENCE: {Math.round((report.confidenceScore || 0) * 100)}%
                </span>
                <span className={clsx(
                  "px-3 py-1.5 rounded font-bold uppercase border",
                  report.verdict === "SCAM" ? "bg-red-500/20 text-red-500 border-red-500/30" : "bg-white/10 border-white/20 text-white"
                )}>
                  VERDICT: {report.verdict}
                </span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-mono tracking-widest text-zinc-500 mb-2">INVESTIGATION STATUS</div>
            <div className={clsx("font-bold flex items-center gap-2 justify-end tracking-widest text-xl", colorClass, (isCritical || isHigh) && "animate-pulse")}>
              <div className={clsx("w-3 h-3 rounded-full", bgClass)} />
              {(isCritical || isHigh) ? "ACTIVE THREAT" : "RESOLVED"}
            </div>
            <div className="text-xs text-zinc-600 mt-2 font-mono uppercase tracking-widest">
              {new Date(report.createdAt).toLocaleString()}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-8 relative z-10">
          <div className="col-span-1 flex flex-col gap-8">
            <div>
              <h4 className="text-[10px] font-bold text-zinc-500 mb-3 uppercase tracking-widest flex items-center gap-2 font-mono">
                <Crosshair size={12} className="text-white" /> Target Vector
              </h4>
              <div className="bg-zinc-900 border border-white/5 rounded-xl p-5">
                <div className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest mb-1">Target Phone</div>
                <div className="text-xl font-bold tracking-widest text-white">{report.targetPhoneNumber || "UNKNOWN"}</div>
              </div>
            </div>

            <div>
              <h4 className="text-[10px] font-bold text-zinc-500 mb-3 uppercase tracking-widest flex items-center gap-2 font-mono">
                <Database size={12} className="text-white" /> Extracted Scammer Entities
              </h4>
              <div className="bg-zinc-900 border border-white/5 rounded-xl p-5 flex flex-col gap-3">
                {(!analysis.scammerEntities || analysis.scammerEntities.length === 0) ? (
                  <div className="text-sm text-zinc-500 font-mono italic">No entities extracted.</div>
                ) : (
                  analysis.scammerEntities.map((ent: string, idx: number) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-[#050505] border border-white/5 rounded-lg">
                      <LinkIcon size={14} className="text-zinc-500" />
                      <span className="font-mono text-sm font-bold text-white break-all">{ent}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {analysis.tags && analysis.tags.length > 0 && (
              <div>
                <h4 className="text-[10px] font-bold text-zinc-500 mb-3 uppercase tracking-widest font-mono">Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {analysis.tags.map((tag: string, i: number) => (
                    <span key={i} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-mono text-zinc-300">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="col-span-2 flex flex-col gap-8">
            <div>
              <h4 className="text-[10px] font-bold text-zinc-500 mb-3 uppercase tracking-widest flex items-center gap-2 font-mono">
                <FileText size={12} className="text-white" /> AI Threat Reasoning
              </h4>
              <div className="bg-zinc-900 border border-white/5 rounded-xl p-6 text-sm text-zinc-300 leading-relaxed border-l-2 border-l-[#34d399]">
                {analysis.reasoning || "No reasoning provided."}
              </div>
            </div>

            <div>
              <h4 className="text-[10px] font-bold text-zinc-500 mb-3 uppercase tracking-widest flex items-center gap-2 font-mono">
                <Activity size={12} className="text-white" /> Attack Timeline
              </h4>
              <div className="bg-zinc-900 border border-white/5 rounded-xl p-6">
                {(!analysis.timeline || analysis.timeline.length === 0) ? (
                  <div className="text-sm text-zinc-500 font-mono italic">Timeline not available.</div>
                ) : (
                  <div className="relative border-l border-white/10 ml-3 space-y-6">
                    {analysis.timeline.map((item: any, i: number) => (
                      <div key={i} className="pl-6 relative">
                        <div className="absolute w-3 h-3 bg-zinc-800 border-2 border-[#34d399] rounded-full -left-[6.5px] top-1" />
                        <div className="text-xs font-mono font-bold text-[#34d399] uppercase tracking-widest mb-1">{item.step}</div>
                        <div className="text-sm text-zinc-400">{item.detail}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <h4 className="text-[10px] font-bold text-zinc-500 mb-3 uppercase tracking-widest font-mono">Original Payload</h4>
              <div className="bg-[#050505] border border-white/5 rounded-xl p-6 font-mono text-xs text-zinc-400 leading-relaxed whitespace-pre-wrap">
                {report.payloadText || "No payload available."}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
