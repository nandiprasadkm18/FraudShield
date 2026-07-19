"use client";

import { useEffect, useState } from "react";
import { X, Activity, Cpu, Shield, ExternalLink, RefreshCcw, Network } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import Link from "next/link";

interface InvestigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  entityId: string | null;
}

export function InvestigationDrawer({ isOpen, onClose, entityId }: InvestigationDrawerProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && entityId) {
      setLoading(true);
      fetch(`/api/intel/entity/${encodeURIComponent(entityId)}/summary`)
        .then((res) => res.json())
        .then((resData) => {
          setData(resData);
          setLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setLoading(false);
        });
    } else {
      setData(null);
    }
  }, [isOpen, entityId]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-[500px] bg-[#050505] border-l border-white/10 z-50 shadow-2xl flex flex-col overflow-hidden text-white font-sans"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#34d399]/10 rounded-xl border border-[#34d399]/20 text-[#34d399]">
                  <Activity size={20} />
                </div>
                <div>
                  <h2 className="font-bold text-lg leading-none">Investigation File</h2>
                  <p className="text-[10px] text-[#34d399] font-mono tracking-widest mt-1 uppercase">ID: {entityId?.substring(0, 8)}...</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-xl transition-colors text-zinc-500 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">

              {loading ? (
                <div className="flex flex-col items-center justify-center h-40 space-y-4">
                  <RefreshCcw size={24} className="text-[#34d399] animate-spin" />
                  <p className="text-xs text-zinc-500 font-mono tracking-widest uppercase animate-pulse">Running AI Analysis...</p>
                </div>
              ) : data ? (
                <>
                  {/* Entity Card */}
                  <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-5">
                    <div className="text-[10px] font-bold tracking-widest text-zinc-500 font-mono mb-4 uppercase">Entity Details</div>
                    <div className="grid grid-cols-[100px_1fr] gap-3 text-sm">
                      <span className="text-zinc-500">Value</span>
                      <span className="font-bold font-mono">{data.entity?.value}</span>
                      <span className="text-zinc-500">Type</span>
                      <span className="font-bold text-[#34d399]">{data.entity?.type}</span>
                    </div>
                  </div>

                  {/* AI Summary */}
                  <div className="bg-[#0a0a0a] border border-[#34d399]/20 rounded-2xl p-5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#34d399]/5 blur-3xl rounded-full" />
                    <div className="flex items-center gap-2 mb-4 text-[#34d399]">
                      <Cpu size={16} />
                      <div className="text-[10px] font-bold tracking-widest font-mono uppercase">AI Investigation Summary</div>
                    </div>

                    <div className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap relative z-10">
                      {data.summary}
                    </div>
                  </div>

                  {/* Connected Reports */}
                  {data.reports && data.reports.length > 0 && (
                    <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-5">
                      <div className="text-[10px] font-bold tracking-widest text-zinc-500 font-mono mb-4 uppercase">Connected Reports ({data.reports.length})</div>
                      <div className="flex flex-col gap-3">
                        {data.reports.map((report: any, i: number) => (
                          <Link href={`/network/reports/${report.id}`} key={i} className="block p-3 bg-white/5 border border-white/5 rounded-xl text-xs flex flex-col gap-1.5 hover:bg-white/10 transition-colors cursor-pointer">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-white uppercase">{report.fraudType || "Unknown"}</span>
                              <span className={clsx("px-1.5 py-0.5 rounded text-[9px] font-bold tracking-widest font-mono uppercase", 
                                report.severity === "CRITICAL" ? "bg-red-500/20 text-red-400" : 
                                report.severity === "HIGH" ? "bg-orange-500/20 text-orange-400" : 
                                "bg-zinc-500/20 text-zinc-400"
                              )}>
                                {report.severity}
                              </span>
                            </div>
                            <div className="text-zinc-400 font-mono flex flex-col gap-1">
                              <span>Target: {report.targetPhoneNumber}</span>
                              {report.victim && <span className="text-[#34d399]">Victim: {report.victim}</span>}
                            </div>
                            <div className="text-[10px] text-zinc-600 font-mono mt-1">ID: {report.id.substring(0, 8)}... | {new Date(report.createdAt).toLocaleDateString()}</div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-col gap-3">
                    <Link href={`/network/graph?entity=${entityId}`} className="w-full bg-[#34d399] text-black font-bold py-3.5 rounded-xl hover:bg-[#34d399]/90 transition-colors shadow-[0_0_20px_rgba(52,211,153,0.2)] text-sm flex items-center justify-center gap-2">
                      <Network size={16} /> OPEN IN GRAPH WORKSPACE
                    </Link>
                    <button className="w-full bg-transparent border border-white/10 text-white font-bold py-3.5 rounded-xl hover:bg-white/5 transition-colors text-sm flex items-center justify-center gap-2">
                      <Shield size={16} /> ESCALATE TO I4C
                    </button>
                    <button className="w-full bg-transparent border border-white/10 text-white font-bold py-3.5 rounded-xl hover:bg-white/5 transition-colors text-sm flex items-center justify-center gap-2">
                      <ExternalLink size={16} /> VIEW RAW EVIDENCE
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center text-zinc-500 py-12 text-sm">No data available.</div>
              )}

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
