"use client";

import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import { AlertTriangle, Activity, ShieldCheck, Zap } from "lucide-react";
import clsx from "clsx";
import { motion } from "framer-motion";
import Link from "next/link";
import { Virtuoso } from "react-virtuoso";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Dynamically import Map to avoid SSR issues with Leaflet window object
const MapComponent = dynamic(() => import("@/components/MapComponent"), { ssr: false });

interface LiveAlert {
  id: string;
  type: string;
  module: string;
  confidence: number;
  severity: "low" | "medium" | "high" | "critical";
  timestamp: string;
  description: string;
  lat?: number;
  lng?: number;
  location?: string;
}

const containerVariants: any = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants: any = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export default function CommandCentre() {
  const [liveAlerts, setLiveAlerts] = useState<LiveAlert[]>([]);
  const [isLoadingFeed, setIsLoadingFeed] = useState(true);
  const [highRiskCount, setHighRiskCount] = useState(0);
  const [selectedReport, setSelectedReport] = useState<LiveAlert | null>(null);

  // Aggregate stats from DB
  const [stats, setStats] = useState<{
    scamsPrevented: number;
    muleClusters: number;
    highRiskNumbers: number;
  } | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (!userStr) {
      window.location.href = "/login";
      return;
    }
    const user = JSON.parse(userStr);
    if (user.role !== "PLATFORM_ADMIN") {
      window.location.href = "/citizen";
      return;
    }

    const fetchFeed = async () => {
      try {
        const res = await fetch("/api/intel/stream");
        if (res.ok) {
          const data = await res.json();
          setLiveAlerts(data.feed ?? []);
          setHighRiskCount(
            (data.feed ?? []).filter(
              (a: LiveAlert) => a.severity === "critical" || a.severity === "high"
            ).length
          );
        }
      } catch {
        // Silent
      } finally {
        setIsLoadingFeed(false);
      }
    };

    const fetchStats = async () => {
      try {
        const res = await fetch("/api/intel/stats");
        if (res.ok) {
          const data = await res.json();
          setStats({
            scamsPrevented: data.scamsPrevented ?? 0,
            muleClusters: data.muleClusters ?? 0,
            highRiskNumbers: data.highRiskNumbers ?? 0,
          });
        }
      } catch {
        // Silent
      } finally {
        setIsLoadingStats(false);
      }
    };

    fetchFeed();
    fetchStats();

    // --- Live WebSocket feed: push new reports in real time ---
    const WS_BASE = process.env.NEXT_PUBLIC_API_URL?.replace(/^http/, "ws") ?? "ws://localhost:8000";
    const ws = new WebSocket(`${WS_BASE}/api/intel/ws`);

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.event === "NEW_REPORT") {
          const newAlert: LiveAlert = {
            id: msg.id,
            type: msg.type,
            module: "AI_ANALYSIS",
            confidence: msg.confidence,
            severity: (msg.severity as LiveAlert["severity"]) || "low",
            timestamp: msg.timestamp,
            description: `Phone: ${msg.phone} — Verdict: ${msg.verdict}`,
            lat: msg.lat,
            lng: msg.lng,
            location: msg.district || msg.state || "Unknown Location",
          };
          setLiveAlerts((prev) => [newAlert, ...prev].slice(0, 50));
          setHighRiskCount((prev) =>
            newAlert.severity === "critical" || newAlert.severity === "high"
              ? prev + 1
              : prev
          );
          // Refresh stats on new submission
          fetchStats();
        }
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onerror = () => {
      // Silently fall back to polling if WebSocket fails
      const interval = setInterval(() => { fetchFeed(); fetchStats(); }, 30_000);
      ws.close();
      return () => clearInterval(interval);
    };

    return () => {
      ws.close();
    };
  }, []);

  return (
    <div className="h-full flex flex-col p-8 gap-8 bg-[#050505] relative overflow-hidden font-sans">
      {/* Subtle background glow */}
      <div className="absolute top-0 right-0 w-[800px] h-[400px] bg-[#34d399]/5 rounded-full blur-[120px] pointer-events-none" />

      <header className="flex items-center justify-between z-10 mb-2">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-1">National Command Centre</h1>
          <p className="text-sm text-zinc-500">Real-time Public Safety Intelligence</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex gap-4 items-center"
        >
          <div className="flex items-center gap-4 bg-[#0a0a0a] border border-white/5 px-6 py-3 rounded-2xl">
            <Activity className="text-[#34d399]" size={24} />
            <div className="flex flex-col">
              <span className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase">System Status</span>
              <span className="text-sm font-bold text-[#34d399] tracking-wider">ALL MODULES ONLINE</span>
            </div>
          </div>

        </motion.div>
      </header>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-4 gap-6 z-10"
      >
        {[
          {
            label: "Threats Intercepted",
            value: isLoadingStats ? "—" : String(stats?.scamsPrevented ?? 0),
            icon: ShieldCheck,
            color: "text-[#34d399]",
            bg: "bg-[#34d399]/10",
          },
          {
            label: "High-Risk Alerts",
            value: isLoadingFeed ? "—" : String(highRiskCount),
            icon: AlertTriangle,
            color: "text-red-500",
            bg: "bg-red-500/10",
          },
          {
            label: "Phone Numbers Flagged",
            value: isLoadingStats ? "—" : String(stats?.highRiskNumbers ?? 0),
            icon: Zap,
            color: "text-orange-500",
            bg: "bg-orange-500/10",
          },
          {
            label: "Fraud Clusters Mapped",
            value: isLoadingStats ? "—" : String(stats?.muleClusters ?? 0),
            icon: Activity,
            color: "text-[#34d399]",
            bg: "bg-[#34d399]/10",
          },
        ].map((stat, i) => (
          <motion.div key={i} variants={itemVariants} className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-5 flex items-center gap-5">
            <div className={clsx("w-14 h-14 rounded-xl flex items-center justify-center shrink-0", stat.bg, stat.color)}>
              <stat.icon size={24} strokeWidth={2.5} />
            </div>
            <div className="flex flex-col">
              <div className="text-3xl font-black text-white leading-none tracking-tight">{stat.value}</div>
              <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1.5 max-w-[120px] leading-snug">{stat.label}</div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="flex-1 grid grid-cols-3 gap-8 min-h-0 z-10"
      >
        <div className="col-span-2 relative rounded-3xl overflow-hidden bg-[#0a0a0a] border border-white/5 shadow-2xl">
          <ErrorBoundary>
            <MapComponent newReport={liveAlerts[0] || null} selectedReport={selectedReport} />
          </ErrorBoundary>
        </div>

        <div className="col-span-1 flex flex-col bg-[#0a0a0a] border border-white/5 rounded-3xl overflow-hidden">
          <div className="p-5 border-b border-white/5 bg-[#0a0a0a]">
            <h2 className="font-bold flex items-center gap-3 text-white text-lg">
              <div className="p-1.5 rounded-lg bg-warning/10 text-warning">
                <Zap size={18} strokeWidth={2.5} />
              </div>
              Live Intelligence Feed
              {liveAlerts.length > 0 && (
                <span className="ml-auto text-xs font-mono font-medium text-zinc-500 bg-zinc-800/50 px-2 py-1 rounded-md">
                  {liveAlerts.length} reports
                </span>
              )}
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4 custom-scrollbar">
            {isLoadingFeed ? (
              <div className="flex items-center justify-center h-full">
                <span className="text-zinc-600 font-mono text-xs tracking-widest uppercase animate-pulse">Establishing secure link...</span>
              </div>
            ) : liveAlerts.length > 0 ? (
              <Virtuoso
                style={{ height: '100%', width: '100%' }}
                data={liveAlerts}
                itemContent={(index, alert) => (
                  <div className="pb-4">
                    <motion.div
                      layout
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={clsx(
                        "p-4 rounded-xl border flex flex-col gap-2 relative overflow-hidden backdrop-blur-md transition-all cursor-pointer",
                        alert.severity === 'critical' ? 'bg-critical/5 border-critical/20 hover:bg-critical/10' :
                          alert.severity === 'high' ? 'bg-warning/5 border-warning/20 hover:bg-warning/10' :
                            'bg-white/5 border-white/5 hover:bg-white/10'
                      )}
                      onClick={() => setSelectedReport(alert)}
                    >
                      {alert.severity === 'critical' && (
                        <div className="absolute top-0 left-0 w-1 h-full bg-critical shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
                      )}
                      {alert.severity === 'high' && (
                        <div className="absolute top-0 left-0 w-1 h-full bg-warning shadow-[0_0_10px_rgba(245,158,11,0.8)]" />
                      )}

                      <div className="flex justify-between items-start pl-2">
                        <span className="text-[10px] font-mono font-bold text-primary tracking-wider">{alert.id.slice(-8).toUpperCase()}</span>
                        <span className="text-[10px] text-zinc-500 font-mono">{new Date(alert.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <div className="pl-2">
                        <div className={clsx("font-bold text-[15px] mb-1.5",
                          alert.severity === 'critical' ? 'text-critical' : alert.severity === 'high' ? 'text-warning' : 'text-zinc-200'
                        )}>{alert.type}</div>
                        <div className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">{alert.description}</div>
                        {alert.location && (
                          <div className="text-[11px] text-zinc-500 mt-2 flex items-center gap-1.5 font-mono">
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                            {alert.location}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5 pl-2">
                        <span className="text-[9px] uppercase tracking-widest text-zinc-400 bg-zinc-900 px-2 py-1 rounded-md font-bold">
                          {alert.module}
                        </span>
                        <span className={clsx("text-xs font-mono font-bold px-2 py-1 rounded-md",
                          alert.confidence > 0.9 ? 'text-success bg-success/10' : 'text-primary bg-primary/10'
                        )}>
                          CONF: {(alert.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    </motion.div>
                  </div>
                )}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <span className="text-zinc-600 font-mono text-xs tracking-widest uppercase">No intelligence available</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
