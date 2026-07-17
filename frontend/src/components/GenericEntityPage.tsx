"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Search, Activity, LucideIcon } from "lucide-react";
import { InvestigationDrawer } from "@/components/InvestigationDrawer";

interface GenericEntityPageProps {
  title: string;
  entityType: string;
  icon: LucideIcon;
  statsConfig: { label: string; field: string; type: "count" | "sum" }[];
}

export function GenericEntityPage({ title, entityType, icon: Icon, statsConfig }: GenericEntityPageProps) {
  const [entities, setEntities] = useState<any[]>([]);
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

        // Filter by the exact entity type requested.
        const filteredNodes = nodes.filter((n: any) => n.data?.type === entityType || n.data?.entityType === entityType);

        const parsedEntities = filteredNodes.map((n: any) => {
          const connectedEdges = edges.filter((e: any) => e.source === n.id || e.target === n.id);

          return {
            id: n.id,
            value: n.data?.value || n.data?.label || "Unknown",
            isKingpin: !!n.data?.isKingpin,
            riskScore: n.data?.riskScore || 50,
            community: n.data?.community,
            links: connectedEdges.length,
            reports: n.data?.reports || 1
          };
        });

        setEntities(parsedEntities);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchNetwork();
  }, [entityType]);

  const filteredEntities = entities.filter(e =>
    e.value.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white p-8 font-sans">

      {/* Header */}
      <div className="flex items-start gap-4 mb-8">
        <Link href="/network" className="p-2 border border-white/10 rounded-xl hover:bg-white/5 transition-colors mt-1">
          <ArrowLeft size={20} className="text-white" />
        </Link>
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
            <div className="flex items-center gap-2 bg-[#34d399]/10 border border-[#34d399]/20 px-3 py-1 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-[#34d399] shadow-[0_0_8px_#34d399] animate-pulse" />
              <span className="text-[9px] font-bold font-mono tracking-widest text-[#34d399] uppercase">LIVE INTEL</span>
            </div>
          </div>
          <p className="text-sm text-zinc-500">
            {entities.length} {title.toLowerCase()} detected in the active cluster - click any card for full investigation
          </p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-4 flex items-center gap-4">
          <div className="bg-white text-black p-3 rounded-xl">
            <Icon size={20} />
          </div>
          <div>
            <div className="text-[10px] font-bold tracking-widest font-mono text-zinc-500 mb-1">TOTAL {title.toUpperCase()}</div>
            <div className="text-2xl font-bold">{entities.length}</div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder={`Search ${title.toLowerCase()}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#0a0a0a] border border-white/5 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-[#34d399]/50 transition-colors"
          />
        </div>
        <div className="text-[10px] font-bold font-mono tracking-widest text-zinc-500 uppercase">
          SHOWING {filteredEntities.length} / {entities.length}
        </div>
      </div>

      {loading ? (
        <div className="text-center text-zinc-500 py-12 font-mono text-xs uppercase tracking-widest animate-pulse">
          Ingesting Network Data...
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {filteredEntities.map((entity, i) => (
            <div key={i} className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-colors cursor-pointer group flex flex-col h-full min-h-[220px]">

              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3 max-w-[70%]">
                  <div className="w-10 h-10 rounded-xl bg-[#34d399]/10 flex items-center justify-center border border-[#34d399]/20 text-[#34d399] shrink-0">
                    <Icon size={20} />
                  </div>
                  <div className="overflow-hidden">
                    <div className="font-bold font-mono truncate">{entity.value}</div>
                    <div className="text-[10px] text-zinc-500 font-mono mt-0.5 truncate">{entity.id}</div>
                  </div>
                </div>
                {entity.isKingpin && (
                  <div className="bg-white text-black px-2 py-1 rounded-md text-[9px] font-bold tracking-widest font-mono uppercase shrink-0">
                    KINGPIN
                  </div>
                )}
              </div>

              <div className="space-y-3 mb-6 flex-1">
                <div className="grid grid-cols-[80px_1fr] items-center text-xs">
                  <div className="flex items-center gap-2 text-zinc-500 font-mono tracking-widest text-[9px]"><Icon size={12} /> VALUE</div>
                  <div className="font-bold text-white font-mono truncate">{entity.value}</div>
                </div>
                <div className="grid grid-cols-[80px_1fr] items-center text-xs">
                  <div className="flex items-center gap-2 text-zinc-500 font-mono tracking-widest text-[9px]"><Activity size={12} /> RISK</div>
                  <div className="font-bold text-white font-mono">{entity.riskScore}%</div>
                </div>
              </div>

              <div className="pt-4 border-t border-white/5 flex items-center justify-between mt-auto">
                <div className="flex items-center gap-2 text-xs font-mono text-zinc-500">
                  <Activity size={14} className="text-zinc-600" /> {entity.links} LINKS
                </div>
                <button
                  onClick={() => setSelectedEntity(entity.id)}
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
