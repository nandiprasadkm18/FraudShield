"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Users, Search, Activity, User, MapPin, IndianRupee, Hash, Calendar } from "lucide-react";
import { InvestigationDrawer } from "@/components/InvestigationDrawer";

export default function VictimsPage() {
  const [victims, setVictims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
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
        
        const allEdges = [...edges];
        nodes.forEach((n: any) => {
          if (n.type === "cluster" && n.data?.hidden_edges) {
            allEdges.push(...n.data.hidden_edges);
          }
        });

        let victimNodes: any[] = [];
        nodes.forEach((n: any) => {
          if (n.type === "victim" || n.data?.label === "VICTIM") {
            victimNodes.push(n);
          } else if (n.type === "cluster" && n.data?.hidden_nodes) {
            const hiddenVictims = n.data.hidden_nodes.filter((hn: any) => 
              hn.type === "VICTIM" || hn.label === "VICTIM" || hn.entityType === "VICTIM"
            );
            hiddenVictims.forEach((hv: any) => {
              victimNodes.push({
                id: hv.id,
                type: "victim",
                data: {
                  ...hv,
                  label: hv.label || "Victim",
                  reports: hv.reports || 1,
                  firstSeen: hv.createdAt
                }
              });
            });
          }
        });
        
        const parsedVictims = victimNodes.map((v: any, idx: number) => {
          const connectedEdges = allEdges.filter((e: any) => e.source === v.id || e.target === v.id);
          const dateStr = v.data?.firstSeen ? v.data.firstSeen.split("T")[0] : "Unknown";
          
          return {
            id: v.id,
            name: v.data?.label || `Victim #${idx + 1}`,
            city: "India",
            lost: "₹0",
            reports: v.data?.reports || 1,
            seen: dateStr,
            links: connectedEdges.length
          };
        });
        
        setVictims(parsedVictims);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchNetwork();
  }, []);

  const filteredVictims = victims.filter(v => 
    v.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
    v.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = [
    { label: "TOTAL VICTIMS", value: victims.length.toString(), icon: Users },
    { label: "TOTAL LOST", value: "₹0", icon: IndianRupee },
    { label: "AVG LOST", value: "₹0", icon: Activity },
    { label: "CITIES", value: "1", icon: MapPin },
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
            <h1 className="text-3xl font-bold tracking-tight">Victims</h1>
            <div className="flex items-center gap-2 bg-[#34d399]/10 border border-[#34d399]/20 px-3 py-1 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-[#34d399] shadow-[0_0_8px_#34d399] animate-pulse" />
              <span className="text-[9px] font-bold font-mono tracking-widest text-[#34d399] uppercase">LIVE INTEL</span>
            </div>
          </div>
          <p className="text-sm text-zinc-500">
            {victims.length} victims detected in the active cluster - click any card for full investigation
          </p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {stats.map((stat, i) => (
          <div key={i} className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-4 flex items-center gap-4">
            <div className="bg-white text-black p-3 rounded-xl">
              <stat.icon size={20} />
            </div>
            <div>
              <div className="text-[10px] font-bold tracking-widest font-mono text-zinc-500 mb-1">{stat.label}</div>
              <div className="text-2xl font-bold">{stat.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input 
            type="text" 
            placeholder="Search victims..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#0a0a0a] border border-white/5 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-[#34d399]/50 transition-colors"
          />
        </div>
        <div className="text-[10px] font-bold font-mono tracking-widest text-zinc-500">
          SHOWING {filteredVictims.length} / {victims.length}
        </div>
      </div>

      {loading ? (
        <div className="text-center text-zinc-500 py-12 font-mono text-xs uppercase tracking-widest animate-pulse">
          Ingesting Network Data...
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {filteredVictims.map((victim, i) => (
            <div key={i} className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-colors cursor-pointer group flex flex-col">
              
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-[#34d399]/10 flex items-center justify-center border border-[#34d399]/20 text-[#34d399]">
                  <Users size={20} />
                </div>
                <div>
                  <div className="font-bold">{victim.name}</div>
                  <div className="text-sm font-bold">{victim.city}</div>
                  <div className="text-[10px] text-zinc-500 font-mono mt-0.5">{victim.id}</div>
                </div>
              </div>

              <div className="space-y-3 mb-6 flex-1">
                <div className="grid grid-cols-[80px_1fr] items-center text-xs">
                  <div className="flex items-center gap-2 text-zinc-500 font-mono tracking-widest text-[9px]"><User size={12} /> NAME</div>
                  <div className="font-bold text-white">{victim.name}</div>
                </div>
                <div className="grid grid-cols-[80px_1fr] items-center text-xs">
                  <div className="flex items-center gap-2 text-zinc-500 font-mono tracking-widest text-[9px]"><MapPin size={12} /> CITY</div>
                  <div className="font-bold text-white">{victim.city}</div>
                </div>
                <div className="grid grid-cols-[80px_1fr] items-center text-xs">
                  <div className="flex items-center gap-2 text-zinc-500 font-mono tracking-widest text-[9px]"><IndianRupee size={12} /> LOST</div>
                  <div className="font-bold text-white">{victim.lost}</div>
                </div>
                <div className="grid grid-cols-[80px_1fr] items-center text-xs">
                  <div className="flex items-center gap-2 text-zinc-500 font-mono tracking-widest text-[9px]"><Hash size={12} /> REPORTS</div>
                  <div className="font-bold text-white">{victim.reports} victim report(s)</div>
                </div>
                <div className="grid grid-cols-[80px_1fr] items-center text-xs">
                  <div className="flex items-center gap-2 text-zinc-500 font-mono tracking-widest text-[9px]"><Calendar size={12} /> FIRST SEEN</div>
                  <div className="font-bold text-white">{victim.seen}</div>
                </div>
              </div>

              <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-mono text-zinc-500">
                  <Activity size={14} className="text-zinc-600" /> {victim.links} LINKS
                </div>
                <button 
                  onClick={() => setSelectedEntity(victim.id)}
                  className="text-[10px] font-bold tracking-widest font-mono text-white hover:text-[#34d399] transition-colors bg-transparent border-none cursor-pointer"
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
