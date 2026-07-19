"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Network, Users, ShieldAlert, Phone, Smartphone,
  MapPin, AlertTriangle, FileText, Activity
} from "lucide-react";
import clsx from "clsx";

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

    async function fetchStats() {
      try {
        const token = localStorage.getItem("token");
        const resStats = await fetch("/api/intel/network", {
          headers: { Authorization: `Bearer ${token}` }
        });
        const resReports = await fetch("/api/intel/reports", {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (resStats.ok) {
          const data = await resStats.json();
          setStats(data.stats);
        }
        if (resReports.ok) {
          const data = await resReports.json();
          setReports(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);



  const cards = [
    { title: "Total Reports", value: stats?.totalReports || 0, icon: FileText, href: "/network/reports" },
    { title: "Active Fraud Rings", value: stats?.fraudRings || 0, icon: Network, href: null },
    { title: "Detected Kingpins", value: stats?.kingpins || 0, icon: ShieldAlert, href: null },
    { title: "Total Victims", value: stats?.totalVictims || 0, icon: Users, href: "/network/victims" },
    { title: "Scammer Numbers", value: stats?.scammerNumbers || 0, icon: Phone, href: "/network/scammers" },
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-white p-8 font-sans">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-3xl font-bold tracking-tight">Graph Intelligence Dashboard</h1>
          <div className="flex items-center gap-2 bg-[#34d399]/10 border border-[#34d399]/20 px-3 py-1 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-[#34d399] shadow-[0_0_8px_#34d399] animate-pulse" />
            <span className="text-[9px] font-bold font-mono tracking-widest text-[#34d399] uppercase">LIVE INTEL</span>
          </div>
        </div>
        <p className="text-sm text-zinc-500">
          Enterprise Investigation Workspace - Powered by PostgreSQL & NetworkX
        </p>
      </div>

      {loading ? (
        <div className="text-center py-20">
          <Activity size={32} className="text-[#34d399] animate-spin mx-auto mb-4" />
          <p className="text-xs text-zinc-500 font-mono tracking-widest uppercase animate-pulse">Aggregating Intelligence...</p>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-6">
          {cards.map((card, i) => {
            const CardWrapper = card.href ? Link : "div";
            return (
            <CardWrapper href={card.href || "#"} key={i} className={clsx("bg-[#0a0a0a] border border-white/5 hover:border-white/10 transition-colors rounded-2xl p-6 relative overflow-hidden group", card.href && "hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(52,211,153,0.15)] cursor-pointer")}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#34d399]/5 blur-3xl rounded-full group-hover:bg-[#34d399]/10 transition-colors" />

              <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center">
                  <card.icon size={20} className="text-black fill-black" />
                </div>
                <div className="text-[10px] font-bold tracking-widest font-mono text-zinc-600 uppercase">
                  {card.title}
                </div>
              </div>

              <div className="text-4xl font-bold font-mono text-white relative z-10">
                {card.value}
              </div>
            </CardWrapper>
          )})}
        </div>
      )}



      <div className="mt-12 flex items-center justify-between bg-zinc-900 border border-white/10 rounded-2xl p-8">
        <div>
          <h3 className="text-xl font-bold mb-2">Deep Investigation</h3>
          <p className="text-sm text-zinc-400">Launch the interactive Graph Workspace to explore network topology and find hidden connections.</p>
        </div>
        <Link href="/network/graph" className="bg-[#34d399] text-black font-bold py-3 px-8 rounded-xl hover:bg-[#34d399]/90 transition-colors shadow-[0_0_20px_rgba(52,211,153,0.2)] text-sm flex items-center gap-2">
          <Network size={16} /> OPEN GRAPH WORKSPACE
        </Link>
      </div>
    </div>
  );
}
