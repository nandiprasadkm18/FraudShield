"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Search, Activity, Phone } from "lucide-react";
import { InvestigationDrawer } from "@/components/InvestigationDrawer";

export default function ScammersPage() {
  const [scammers, setScammers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statsData, setStatsData] = useState({ scammers: 0, calls: 0, sharedDevices: 0 });
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);

  useEffect(() => {
    async function fetchNetwork() {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch("/api/intel/network", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        
        const nodes = data.nodes || [];
        const edges = data.edges || [];
        
        // Filter phone number nodes that are NOT victims (type = "phone" in API response)
        const scammerNodes = nodes.filter((n: any) => n.data?.entityType === "PHONE_NUMBER");
        
        const parsedScammers = scammerNodes.map((n: any) => {
          const connectedEdges = edges.filter((e: any) => e.source === n.id || e.target === n.id);
          
          return {
            id: n.id,
            number: n.data?.value || "Unknown",
            isKingpin: n.type === "kingpin",
            links: connectedEdges.length,
            riskScore: n.data?.riskScore || 0,
          };
        });
        
        setScammers(parsedScammers);
        
        // Calculate basic stats
        const sharedDevs = nodes.filter((n: any) => n.data?.entityType === "DEVICE").length;
        setStatsData({
          scammers: parsedScammers.length,
          calls: parsedScammers.reduce((sum: number, s: any) => sum + s.links, 0),
          sharedDevices: sharedDevs || 0
        });
        
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchNetwork();
  }, []);

  const filteredScammers = scammers.filter(s => 
    s.number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = [
    { label: "SCAMMERS", value: statsData.scammers.toString(), icon: Phone },
    { label: "TOTAL CALLS", value: statsData.calls.toString(), icon: Phone },
    { label: "AVG VICTIMS/NUMBER", value: statsData.scammers ? (statsData.calls / statsData.scammers).toFixed(1) : "0.0", icon: Phone },
    { label: "SHARED DEVICES", value: statsData.sharedDevices.toString(), icon: Phone },
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-white p-8 font-sans">
      
      {/* Header */}
      <div className="flex items-start gap-4 mb-8">
        <Link href="/network" className="p-2 border border-white/10 rounded-xl hover:bg-white/5 transition-colors mt-1">
          <ArrowLeft size={20} className="text-white" />
        </Link>
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold tracking-tight">Scammers</h1>
            <div className="flex items-center gap-2 bg-[#34d399]/10 border border-[#34d399]/20 px-3 py-1 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-[#34d399] shadow-[0_0_8px_#34d399] animate-pulse" />
              <span className="text-[9px] font-bold font-mono tracking-widest text-[#34d399] uppercase">LIVE INTEL</span>
            </div>
          </div>
          <p className="text-sm text-zinc-500">
            {scammers.length} scammers detected in the active cluster - click any card for full investigation
          </p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {stats.map((s, i) => (
          <div key={i} className="bg-zinc-900 border border-white/5 rounded-2xl p-6 flex flex-col gap-3">
            <div className="flex items-center gap-3 text-zinc-400">
              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
                <s.icon size={16} className="text-black fill-black" />
              </div>
              <span className="text-[10px] font-bold font-mono tracking-widest uppercase">{s.label}</span>
            </div>
            <div className="text-3xl font-bold font-mono text-white">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input 
            type="text" 
            placeholder="Search scammers..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#0a0a0a] border border-white/5 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-[#34d399]/50 transition-colors"
          />
        </div>
        <div className="text-[10px] font-bold font-mono tracking-widest text-zinc-500">
          SHOWING {filteredScammers.length} / {scammers.length}
        </div>
      </div>

      {loading ? (
        <div className="text-center text-zinc-500 py-12 font-mono text-xs uppercase tracking-widest animate-pulse">
          Ingesting Network Data...
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {filteredScammers.map((scammer, i) => (
            <div key={i} className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-colors cursor-pointer group flex flex-col h-full min-h-[220px]">
              
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#34d399]/10 flex items-center justify-center border border-[#34d399]/20 text-[#34d399]">
                    <Phone size={20} />
                  </div>
                  <div>
                    <div className="font-bold font-mono">{scammer.number}</div>
                    <div className="text-[10px] text-zinc-500 font-mono mt-0.5">{scammer.id}</div>
                  </div>
                </div>
                {scammer.isKingpin && (
                  <div className="bg-white text-black px-2 py-1 rounded-md text-[9px] font-bold tracking-widest font-mono uppercase">
                    KINGPIN
                  </div>
                )}
              </div>

              <div className="space-y-3 mb-6 flex-1">
                <div className="grid grid-cols-[80px_1fr] items-center text-xs">
                  <div className="flex items-center gap-2 text-zinc-500 font-mono tracking-widest text-[9px]"><Phone size={12} /> NUMBER</div>
                  <div className="font-bold text-white font-mono">{scammer.number}</div>
                </div>
              </div>

              <div className="pt-4 border-t border-white/5 flex items-center justify-between mt-auto">
                <div className="flex items-center gap-2 text-xs font-mono text-zinc-500">
                  <Activity size={14} className="text-zinc-600" /> {scammer.links} LINKS
                </div>
                <button 
                  onClick={() => setSelectedEntity(scammer.id)}
                  className="text-[10px] font-bold tracking-widest font-mono text-white hover:text-[#34d399] transition-colors uppercase bg-transparent border-none cursor-pointer"
                >
                  INVESTIGATE &rarr;
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

      <InvestigationDrawer 
        isOpen={!!selectedEntity} 
        onClose={() => setSelectedEntity(null)} 
        entityId={selectedEntity} 
      />

    </div>
  );
}
