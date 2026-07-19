"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ShieldAlert, FileText, ChevronRight, Activity, Download } from "lucide-react";
import clsx from "clsx";

interface Report {
  id: string;
  targetPhoneNumber: string;
  fraudType: string;
  verdict: string;
  severity: string;
  createdAt: string;
  confidenceScore: number;
  reporterName?: string;
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

    // Connect to WebSocket for real-time feed
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/api/v1/intel/ws";
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.event === "NEW_REPORT") {
          const newReport = {
            id: payload.id,
            targetPhoneNumber: payload.phone,
            fraudType: payload.type,
            verdict: payload.verdict,
            severity: payload.severity.toUpperCase(),
            createdAt: payload.timestamp,
            confidenceScore: payload.confidence,
          };
          setReports((prev) => [newReport, ...prev]);
        }
      } catch (err) {
        console.error("WebSocket message parse error:", err);
      }
    };

    ws.onclose = () => {
      console.log("WebSocket connection closed.");
    };

    return () => {
      ws.close();
    };
  }, []);

  const handleDownload = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/intel/export/incident/${id}`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fraudshield-ai-incident-${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF export error:", err);
      alert("Failed to download PDF");
    }
  };

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
                <th className="px-6 py-4 font-bold">Reporter</th>
                <th className="px-6 py-4 font-bold">Scammer Number</th>
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
                  <td colSpan={8} className="px-6 py-12 text-center text-zinc-500 font-mono text-sm">
                    No reports found.
                  </td>
                </tr>
              ) : reports.map((r) => (
                <tr key={r.id} className="hover:bg-white/5 transition-colors group cursor-pointer" onClick={() => window.location.href = `/network/reports/${r.id}`}>
                  <td className="px-6 py-4 font-mono font-bold text-xs text-zinc-300">
                    RS-{r.id.slice(-8).toUpperCase()}
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-[#34d399]">
                    {r.reporterName || "Citizen"}
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
                  <td className="px-6 py-4 text-right flex items-center justify-end gap-3">
                    <button 
                      onClick={(e) => handleDownload(e, r.id)}
                      className="p-1.5 hover:bg-white/10 rounded-lg text-zinc-500 hover:text-[#34d399] transition-colors"
                      title="Download PDF Report"
                    >
                      <Download size={16} />
                    </button>
                    <ChevronRight size={16} className="text-zinc-600 group-hover:text-white transition-colors" />
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
