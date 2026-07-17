"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ShieldAlert, FileText, ChevronRight, Activity } from "lucide-react";
import clsx from "clsx";

interface Report {
  id: string;
  targetPhoneNumber: string;
  fraudType: string;
  verdict: string;
  severity: string;
  createdAt: string;
  confidenceScore: number;
}

export default function ReportsList() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch("/api/intel/reports", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => setReports(Array.isArray(data) ? data : []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] text-white p-8 font-sans">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/network" className="p-2 border border-white/10 rounded-xl hover:bg-white/5 transition-colors">
          <ArrowLeft size={20} className="text-white" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Intercepted Reports</h1>
          <p className="text-sm text-zinc-500 font-mono tracking-widest mt-1 uppercase">Enterprise Intelligence Database</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20">
          <Activity size={32} className="text-[#34d399] animate-spin mx-auto mb-4" />
          <p className="text-xs text-zinc-500 font-mono tracking-widest uppercase animate-pulse">Loading Reports...</p>
        </div>
      ) : (
        <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-900 border-b border-white/5 font-mono text-[10px] uppercase tracking-widest text-zinc-500">
              <tr>
                <th className="px-6 py-4 font-bold">Threat ID</th>
                <th className="px-6 py-4 font-bold">Target Phone</th>
                <th className="px-6 py-4 font-bold">Type</th>
                <th className="px-6 py-4 font-bold">Verdict</th>
                <th className="px-6 py-4 font-bold">Severity</th>
                <th className="px-6 py-4 font-bold text-right">Timestamp</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-zinc-500 font-mono text-sm">
                    No reports found.
                  </td>
                </tr>
              ) : reports.map((r) => (
                <tr key={r.id} className="hover:bg-white/5 transition-colors group cursor-pointer" onClick={() => window.location.href = `/network/reports/${r.id}`}>
                  <td className="px-6 py-4 font-mono font-bold text-xs text-zinc-300">
                    RS-{r.id.slice(-8).toUpperCase()}
                  </td>
                  <td className="px-6 py-4 font-mono font-bold text-white tracking-widest">
                    {r.targetPhoneNumber || "UNKNOWN"}
                  </td>
                  <td className="px-6 py-4 font-bold text-zinc-300">
                    {r.fraudType || "Threat Detected"}
                  </td>
                  <td className="px-6 py-4">
                    <span className={clsx(
                      "px-2 py-1 rounded text-[10px] font-bold font-mono tracking-widest uppercase border",
                      r.verdict === "SCAM" ? "bg-red-500/10 text-red-500 border-red-500/20" :
                        r.verdict === "SUSPICIOUS" ? "bg-orange-500/10 text-orange-500 border-orange-500/20" :
                          "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
                    )}>
                      {r.verdict}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={clsx(
                      "text-xs font-bold font-mono tracking-widest uppercase flex items-center gap-2",
                      r.severity === "CRITICAL" ? "text-red-500" :
                        r.severity === "HIGH" ? "text-orange-500" :
                          r.severity === "MEDIUM" ? "text-yellow-500" : "text-zinc-500"
                    )}>
                      <div className={clsx("w-1.5 h-1.5 rounded-full", r.severity === "CRITICAL" ? "bg-red-500 animate-pulse" : r.severity === "HIGH" ? "bg-orange-500" : "bg-zinc-500")} />
                      {r.severity}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-zinc-500 text-right">
                    {new Date(r.createdAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <ChevronRight size={16} className="inline text-zinc-600 group-hover:text-white transition-colors" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
