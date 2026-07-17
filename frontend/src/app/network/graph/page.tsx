"use client";

import { useCallback, useEffect, useState, useMemo, useRef } from "react";
import ReactFlow, {
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
  useReactFlow,
  ReactFlowProvider,
} from "reactflow";
import "reactflow/dist/style.css";
import {
  Phone, User, Landmark, ShieldAlert, Smartphone, Zap,
  Plus, Minus, Maximize, Crosshair, X, Globe, Mail,
  Bitcoin, Activity, Network, Search, RefreshCw, Wifi,
  Eye, EyeOff, ListFilter, MousePointerClick, Rows3
} from "lucide-react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";
import { getMeta, normalizeEntityType, NODE_META } from "@/components/FraudNode";
import dagre from "dagre";

import { initialNodeTypes, initialEdgeTypes } from "./flowTypes";

// ── Custom Controls ────────────────────────────────────────────────────────

function CustomControls() {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const btns = [
    { icon: Plus, label: "Zoom in", action: () => zoomIn({ duration: 200 }) },
    { icon: Minus, label: "Zoom out", action: () => zoomOut({ duration: 200 }) },
    { icon: Maximize, label: "Fit graph", action: () => fitView({ duration: 600 }) },
    { icon: Crosshair, label: "Center graph", action: () => fitView({ duration: 600, padding: 0.05 }) },
  ];
  return (
    <div className="absolute bottom-6 right-6 flex flex-col gap-1.5 bg-[#0d0d0d]/95 backdrop-blur border border-white/10 rounded-2xl p-2 z-50 shadow-2xl">
      {btns.map(({ icon: Icon, label, action }, i) => (
        <button
          key={i}
          aria-label={label}
          title={label}
          onClick={action}
          className="p-2.5 text-white/60 hover:text-[#34d399] hover:bg-[#34d399]/10 rounded-xl transition-all duration-150"
        >
          <Icon size={16} />
        </button>
      ))}
    </div>
  );
}

// ── Stats Bar ──────────────────────────────────────────────────────────────

function StatsBar({ stats, nodeCount }: { stats: any; nodeCount: number }) {
  // Format real amountReported from StateFinancialImpact table
  const amountStr = stats?.totalAmountReported
    ? `Rs ${Number(stats.totalAmountReported).toLocaleString("en-IN")}`
    : "-";

  const items = [
    { label: "GRAPH NODES", value: nodeCount, icon: Network },
    { label: "TOTAL VICTIMS", value: stats?.totalVictims ?? "-", icon: User },
    { label: "AMOUNT REPORTED", value: amountStr, icon: Landmark },
    { label: "KINGPINS DETECTED", value: stats?.kingpins ?? "-", icon: ShieldAlert, accent: true },
  ];
  return (
    <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((s, i) => (
        <div
          key={i}
          className={clsx(
            "flex min-w-0 items-center gap-3 rounded-xl border px-4 py-3",
            s.accent
              ? "bg-[#34d399]/10 border-[#34d399]/30"
              : "bg-[#0d0d0d] border-white/5"
          )}
        >
          <div className={clsx("w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
            s.accent ? "bg-[#34d399]/20" : "bg-white/5"
          )}>
            <s.icon size={16} className={s.accent ? "text-[#34d399]" : "text-white/40"} />
          </div>
          <div className="min-w-0">
            <div className="mb-1 text-[10px] font-mono tracking-widest text-white/45 uppercase">{s.label}</div>
            <div className={clsx("truncate text-xl font-black font-mono leading-none", s.accent ? "text-[#34d399]" : "text-white")}>
              {s.value}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Node Detail Panel ──────────────────────────────────────────────────────

function formatGraphValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "number") return value.toLocaleString("en-IN");
  return String(value);
}

function NodeDetailPanel({ node, onClose }: { node: any; onClose: () => void }) {
  const meta = getMeta(normalizeEntityType(node.data), node.data?.isKingpin);
  const Icon = meta.icon;

  return (
    <motion.div
      initial={{ x: 320, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 320, opacity: 0 }}
      transition={{ type: "spring", damping: 28, stiffness: 300 }}
      className="absolute right-0 top-0 bottom-0 z-50 flex w-full max-w-sm flex-col border-l border-white/8 bg-[#0a0a0a]/98 shadow-2xl backdrop-blur-2xl sm:w-96"
    >
      {/* Header */}
      <div className="p-5 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div style={{ background: meta.glow + "22", border: `1px solid ${meta.glow}44` }}
            className="w-8 h-8 rounded-lg flex items-center justify-center">
            <Icon size={16} style={{ color: meta.glow }} />
          </div>
          <div>
            <div className="text-[10px] font-mono tracking-widest uppercase" style={{ color: meta.glow }}>
              {meta.label}
            </div>
            <div className="text-xs text-white/50 font-mono">{node.id.slice(-8).toUpperCase()}</div>
          </div>
        </div>
        <button onClick={onClose} className="text-white/30 hover:text-white transition-colors p-1">
          <X size={16} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {/* Value */}
        <div className="bg-white/3 rounded-xl p-4 border border-white/5">
          <div className="text-[10px] font-mono tracking-widest text-white/45 mb-1 uppercase">Identifier</div>
          <div className="text-base font-mono font-bold text-white break-all">
            {node.data?.value || node.data?.label || "Unknown"}
          </div>
        </div>

        {/* Grid metrics */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { l: "RISK SCORE", v: node.data?.riskScore || 0 },
            { l: "CONNECTIONS", v: node.data?.connections || 0 },
            { l: "REPORTS", v: node.data?.reports || 1 },
            { l: "RISK LEVEL", v: node.data?.riskLevel || "MEDIUM" },
          ].map(({ l, v }) => (
            <div key={l} className="bg-white/3 p-3 rounded-xl border border-white/5">
              <div className="text-[10px] font-mono tracking-widest text-white/45 mb-1 uppercase">{l}</div>
              <div className="text-base text-white font-mono font-bold">{formatGraphValue(v)}</div>
            </div>
          ))}
        </div>

        {/* Kingpin badge */}
        {node.data?.isKingpin && (
          <div className="bg-[#34d399]/8 border border-[#34d399]/25 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-[#34d399] shadow-[0_0_8px_#34d399] animate-pulse" />
              <span className="text-[#34d399] font-bold font-mono text-xs tracking-widest">KINGPIN NODE</span>
            </div>
            <div className="text-[11px] text-[#34d399]/70 leading-relaxed">
              Exhibits high centrality and PageRank. Central coordinator in this fraud cluster.
            </div>
          </div>
        )}

        {/* First seen */}
        {node.data?.firstSeen && (
          <div className="bg-white/3 rounded-xl p-3 border border-white/5">
            <div className="text-[8px] font-mono tracking-widest text-white/40 mb-1">FIRST SEEN</div>
            <div className="text-xs text-white/70 font-mono">
              {new Date(node.data.firstSeen).toLocaleString()}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Live Feed Ticker ───────────────────────────────────────────────────────

function LiveTicker({ events }: { events: any[] }) {
  if (events.length === 0) return null;
  return (
    <div className="flex items-center gap-2 overflow-hidden h-6">
      <div className="w-2 h-2 rounded-full bg-[#34d399] shadow-[0_0_6px_#34d399] animate-pulse shrink-0" />
      <div className="relative overflow-hidden flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={events[0]?.id}
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -12, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="text-[10px] font-mono text-[#34d399] tracking-wider whitespace-nowrap"
          >
            {events[0]?.type ?? "NEW_REPORT"} - {events[0]?.phone ?? "Unknown"} - {events[0]?.severity?.toUpperCase() ?? "-"}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Main Graph Content ─────────────────────────────────────────────────────

function GraphOverviewPanel({
  nodes,
  edges,
  searchTerm,
  selectedNode,
}: {
  nodes: any[];
  edges: any[];
  searchTerm: string;
  selectedNode: any;
}) {
  const rows = useMemo(() => {
    const counts = new Map<string, { count: number; meta: ReturnType<typeof getMeta> }>();
    nodes.forEach((node) => {
      const type = normalizeEntityType(node.data);
      const isKingpin = node.data?.isKingpin === true;
      const label = getMeta(type, isKingpin).label;
      const current = counts.get(label) ?? { count: 0, meta: getMeta(type, isKingpin) };
      counts.set(label, { ...current, count: current.count + 1 });
    });
    return Array.from(counts.entries())
      .map(([label, value]) => ({ label, ...value }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [nodes]);

  const matchedNodes = useMemo(() => {
    if (!searchTerm) return nodes.length;
    const term = searchTerm.toLowerCase();
    return nodes.filter((node) =>
      String(node.data?.label || node.data?.value || "").toLowerCase().includes(term)
    ).length;
  }, [nodes, searchTerm]);

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="absolute left-4 top-4 z-30 w-[min(22rem,calc(100%-2rem))] max-h-[calc(100vh-2rem)] overflow-y-auto scrollbar-hide rounded-2xl border border-white/10 bg-[#0d0d0d]/92 p-4 shadow-2xl backdrop-blur"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-bold text-white">Network overview</div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-white/45">
            {formatGraphValue(nodes.length)} entities / {formatGraphValue(edges.length)} links
          </div>
        </div>
        <div className="rounded-lg bg-[#34d399]/10 p-2 text-[#34d399]">
          <ListFilter size={16} />
        </div>
      </div>

      <div className="mb-3 grid grid-cols-3 gap-2">
        {[
          { label: "Entities", value: nodes.length },
          { label: "Links", value: edges.length },
          { label: searchTerm ? "Matches" : "Shown", value: matchedNodes },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border border-white/6 bg-white/[0.03] px-3 py-1.5">
            <div className="text-[9px] font-mono uppercase tracking-widest text-white/40">{item.label}</div>
            <div className="mt-0.5 text-lg font-black leading-none text-white">{formatGraphValue(item.value)}</div>
          </div>
        ))}
      </div>

      <div className="space-y-1.5">
        {rows.map((row) => {
          const Icon = row.meta.icon;
          return (
            <div key={row.label} className="flex items-center gap-3">
              <div
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border"
                style={{
                  borderColor: `${row.meta.bg}40`,
                  backgroundColor: `${row.meta.bg}10`,
                  color: row.meta.bg,
                }}
              >
                <Icon size={12} strokeWidth={2} />
              </div>
              <span className="min-w-0 flex-1 text-xs font-medium text-[#d4d4d4]">{row.label}</span>
              <span className="font-mono text-xs font-bold text-white">{formatGraphValue(row.count)}</span>
            </div>
          );
        })}
      </div>

      <div className="mt-3 space-y-1.5 border-t border-white/8 pt-3">
        <div className="flex items-center gap-3">
          <div className="w-6 flex shrink-0 justify-center"><div className="w-full h-px bg-[#34d399]" /></div>
          <span className="text-xs font-medium text-[#a3a3a3]">Direct call</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-6 flex shrink-0 justify-center"><div className="w-full h-px border-t border-dashed border-[#34d399] border-2" style={{ borderTopWidth: '1.5px', borderStyle: 'dashed' }} /></div>
          <span className="text-xs font-medium text-[#a3a3a3]">Transfer / UPI</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-6 flex shrink-0 justify-center"><div className="w-full h-px border-t border-dashed border-[#60a5fa] border-2" style={{ borderTopWidth: '1.5px', borderStyle: 'dashed' }} /></div>
          <span className="text-xs font-medium text-[#a3a3a3]">Contact</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-6 flex shrink-0 justify-center"><div className="w-full h-px border-t border-dashed border-[#facc15] border-2" style={{ borderTopWidth: '1.5px', borderStyle: 'dashed' }} /></div>
          <span className="text-xs font-medium text-[#a3a3a3]">Crypto</span>
        </div>
      </div>

      <div className="mt-4 border-t border-white/8 pt-3">
        {selectedNode ? (
          <div className="flex items-start gap-2.5">
            <MousePointerClick size={15} className="mt-0.5 shrink-0 text-[#34d399]" />
            <div className="min-w-0">
              <div className="truncate text-xs font-bold text-white">
                {selectedNode.data?.label || selectedNode.data?.value || "Selected entity"}
              </div>
              <div className="mt-0.5 text-[10px] font-mono uppercase tracking-widest text-white/45">
                Risk {formatGraphValue(selectedNode.data?.riskScore || 0)} / Connections {formatGraphValue(selectedNode.data?.connections || 0)}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 text-xs text-white/55">
            <MousePointerClick size={15} className="shrink-0 text-[#34d399]" />
            Click any node to inspect risk, reports, and first seen details.
          </div>
        )}
      </div>
    </motion.div>
  );
}

const FIT_VIEW_OPTIONS = { padding: 0.2 };
const DEFAULT_EDGE_OPTIONS = { animated: false };

function organizeGraphLayout(inputNodes: any[], inputEdges: any[]) {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  
  // Top to Bottom layout, with generous spacing
  dagreGraph.setGraph({ rankdir: 'TB', nodesep: 150, edgesep: 50, ranksep: 180 });

  // Map node sizes based on their type to center them nicely
  inputNodes.forEach((node) => {
    const isKingpin = node.data?.isKingpin === true;
    const isVictim = normalizeEntityType(node.data) === "VICTIM";
    const size = isKingpin ? 42 : isVictim ? 32 : 36;
    // adding extra width height for labels
    dagreGraph.setNode(node.id, { width: size + 150, height: size + 50 });
  });

  inputEdges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  return inputNodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const isKingpin = node.data?.isKingpin === true;
    const isVictim = normalizeEntityType(node.data) === "VICTIM";
    const size = isKingpin ? 42 : isVictim ? 32 : 36;

    return {
      ...node,
      position: {
        x: nodeWithPosition.x - (size + 150) / 2,
        y: nodeWithPosition.y - (size + 50) / 2,
      },
    };
  });
}

function GraphLaneGuide() {
  return null;
}

function GraphContent() {
  const { fitView } = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [highlightKingpins, setHighlightKingpins] = useState(false);
  const [filterMode, setFilterMode] = useState<"ALL" | "SINGLE" | "REPEAT">("ALL");
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showOverview, setShowOverview] = useState(true);
  const [showNodeLabels, setShowNodeLabels] = useState(true);
  const [showEdgeLabels, setShowEdgeLabels] = useState(false);
  const [liveEvents, setLiveEvents] = useState<any[]>([]);
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const edgesRef = useRef<any[]>([]);

  const onConnect = useCallback(
    (params: any) => setEdges(eds => addEdge(params, eds)),
    [setEdges]
  );

  const organizeCurrentGraph = useCallback(() => {
    setNodes((currentNodes) => organizeGraphLayout(currentNodes, edges));
    window.setTimeout(() => fitView({ duration: 500, padding: 0.18 }), 50);
  }, [edges, fitView, setNodes]);

  // Fetch full graph
  const fetchGraph = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/intel/network?layout=hierarchical", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setStats(data.stats);

      const formattedNodes = (data.nodes ?? []).map((n: any) => {
        return {
          ...n,
          type: "entity",
          data: { ...n.data, highlightKingpins, showLabels: showNodeLabels },
        };
      });

      const formattedEdges = (data.edges ?? []).map((e: any) => {
        const backendLabel: string = e.label ?? "";
        const backendColor: string = e.style?.stroke ?? "#34d399";
        const isDash = backendLabel !== "Called" && backendLabel !== "";

        return {
          id: e.id ?? `e-${e.source}-${e.target}`,
          source: e.source,
          target: e.target,
          type: "custom",
          label: backendLabel,
          animated: e.animated ?? false,
          style: {
            stroke: backendColor,
            strokeWidth: 2.0,
            strokeDasharray: isDash ? "5 5" : "none",
            opacity: 1.0,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: backendColor,
            width: 12,
            height: 12,
          },
          data: { showLabels: showEdgeLabels },
        };
      });

      setNodes(organizeGraphLayout(formattedNodes, formattedEdges));
      setEdges(formattedEdges);
      window.setTimeout(() => fitView({ duration: 500, padding: 0.18 }), 50);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [fitView, highlightKingpins, showEdgeLabels, showNodeLabels, setNodes, setEdges]);

  // Initial load
  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (!userStr) { window.location.href = "/login"; return; }
    fetchGraph();
  }, []);

  // Sync view toggles into graph data
  useEffect(() => {
    setNodes(nds => nds.map(n => ({
      ...n,
      data: { ...n.data, highlightKingpins, showLabels: showNodeLabels },
    })));
  }, [highlightKingpins, showNodeLabels, setNodes]);

  useEffect(() => {
    setEdges(eds => eds.map(e => ({
      ...e,
      data: { ...e.data, showLabels: showEdgeLabels },
    })));
  }, [showEdgeLabels, setEdges]);

  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  // WebSocket for live updates
  useEffect(() => {
    const WS_BASE = "ws://localhost:8000";
    const ws = new WebSocket(`${WS_BASE}/api/intel/ws`);
    wsRef.current = ws;

    ws.onopen = () => setWsConnected(true);
    ws.onclose = () => setWsConnected(false);
    ws.onerror = () => setWsConnected(false);

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.event === "NEW_REPORT") {
          setLiveEvents(prev => [msg, ...prev].slice(0, 5));
          // Add a glowing new node to the graph
          const newNode = {
            id: msg.id,
            type: "entity",
            position: {
              x: 300 + Math.random() * 400,
              y: 100 + Math.random() * 300,
            },
            data: {
              label: msg.phone || "New Report",
              value: msg.phone || "New Report",
              entityType: "PHONE_NUMBER",
              riskLevel: msg.severity?.toUpperCase() || "MEDIUM",
              riskScore: Math.round(msg.confidence * 100),
              reports: 1,
              connections: 0,
              isKingpin: false,
              highlightKingpins,
              showLabels: showNodeLabels,
              isNew: true,
            },
          };
          setNodes(nds => organizeGraphLayout([...nds, newNode], edgesRef.current));
        }
      } catch { /* ignore */ }
    };

    return () => ws.close();
  }, []);

  // Filter & Search
  const filteredNodes = useMemo(() => {
    const term = searchTerm.toLowerCase();
    
    return nodes.map(n => {
      let isVisible = true;
      const reports = n.data?.reports || 1;
      const isVictim = normalizeEntityType(n.data) === "VICTIM";
      
      if (filterMode === "SINGLE" && !isVictim) {
        isVisible = reports < 2;
      } else if (filterMode === "REPEAT" && !isVictim) {
        isVisible = reports >= 2;
      }
      
      const matchesSearch = !term || (n.data?.label || n.data?.value || "").toLowerCase().includes(term);
      
      return {
        ...n,
        hidden: !isVisible,
        style: {
          ...n.style,
          opacity: matchesSearch ? 1 : 0.15,
        },
      };
    });
  }, [nodes, searchTerm, filterMode]);

  const onNodeClick = (_: React.MouseEvent, node: any) => {
    if (node.data?.entityType === "CLUSTER" && node.data?.hidden_nodes) {
      const clusterId = node.id;
      const { x, y } = node.position;

      const hiddenNodes = node.data.hidden_nodes.map((hn: any, i: number) => {
        const angle = (i / node.data.hidden_nodes.length) * 2 * Math.PI;
        const radius = 100 + (Math.random() * 20); // slightly varied radius
        return {
          id: hn.id,
          type: "custom",
          position: { x: x + Math.cos(angle) * radius, y: y + Math.sin(angle) * radius },
          data: {
            ...hn,
            entityType: hn.type || hn.entityType || "VICTIM",
            isKingpin: false,
            highlightKingpins,
            showLabels: showNodeLabels,
          }
        };
      });

      const hiddenEdges = (node.data.hidden_edges || []).map((he: any) => ({
        id: `e-${he.source}-${he.target}-${Math.random()}`,
        source: he.source,
        target: he.target,
        type: "liveEdge",
        label: he.label || "Received Call",
        style: { stroke: he.style?.stroke || "#ef4444", strokeWidth: 2 },
        labelStyle: { fill: "#a1a1aa", fontSize: 10, fontFamily: "monospace" },
        labelBgStyle: { fill: "#18181b", color: "#18181b", fillOpacity: 0.8 },
        data: { showLabels: showEdgeLabels },
      }));

      const nextEdges = [
        ...edges.filter((e) => e.source !== clusterId && e.target !== clusterId),
        ...hiddenEdges,
      ];
      const nextNodes = organizeGraphLayout(
        [...nodes.filter((n) => n.id !== clusterId), ...hiddenNodes],
        nextEdges
      );

      setNodes(nextNodes);
      setEdges(nextEdges);
      window.setTimeout(() => fitView({ duration: 500, padding: 0.18 }), 50);
    } else {
      setSelectedNode(node);
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-[#050505] font-sans">

      {/* ── Top Header ── */}
      <div className="shrink-0 px-4 pt-5 pb-0 z-20 sm:px-6">
        {/* Title row */}
        <div className="mb-4 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                Fraud Network Intelligence
              </h1>
              <div className="flex items-center gap-1.5 bg-[#34d399]/10 border border-[#34d399]/25 px-3 py-1 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-[#34d399] animate-pulse shadow-[0_0_6px_#34d399]" />
                <span className="text-[9px] font-bold font-mono tracking-[0.18em] text-[#34d399] uppercase">
                  Live Intel Feed
                </span>
              </div>
            </div>
            <p className="text-xs text-white/45 font-mono tracking-wide">
              Coordinated scam rings, mule chains, and shared-device correlations across India
            </p>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-2 xl:justify-end">
            {/* Search */}
            <div className="relative min-w-[15rem] flex-1 sm:flex-none">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type="text"
                placeholder="Search nodes, accounts..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-[#0d0d0d] border border-white/8 rounded-xl pl-8 pr-4 py-2.5 text-xs font-mono text-white/75 placeholder:text-white/30 focus:outline-none focus:border-[#34d399]/50 sm:w-72 transition-colors"
              />
            </div>

            {/* Refresh */}
            <button
              onClick={fetchGraph}
              disabled={isLoading}
              className="p-2 bg-[#0d0d0d] border border-white/8 rounded-xl text-white/40 hover:text-[#34d399] hover:border-[#34d399]/30 transition-all"
            >
              <RefreshCw size={15} className={isLoading ? "animate-spin" : ""} />
            </button>

            <button
              onClick={organizeCurrentGraph}
              className="flex items-center gap-2 rounded-xl border border-[#34d399]/25 bg-[#34d399]/10 px-3 py-2.5 font-mono text-[10px] uppercase tracking-widest text-[#34d399] transition-all hover:border-[#34d399]/50 hover:bg-[#34d399]/15"
            >
              <Rows3 size={12} />
              Organize
            </button>

            <button
              onClick={() => setShowNodeLabels(v => !v)}
              className={clsx(
                "flex items-center gap-2 rounded-xl border px-3 py-2.5 font-mono text-[10px] uppercase tracking-widest transition-all",
                showNodeLabels
                  ? "bg-[#34d399]/12 border-[#34d399]/35 text-[#34d399]"
                  : "bg-[#0d0d0d] border-white/10 text-white/50 hover:text-white"
              )}
            >
              {showNodeLabels ? <Eye size={12} /> : <EyeOff size={12} />}
              Nodes
            </button>

            <button
              onClick={() => setShowEdgeLabels(v => !v)}
              className={clsx(
                "flex items-center gap-2 rounded-xl border px-3 py-2.5 font-mono text-[10px] uppercase tracking-widest transition-all",
                showEdgeLabels
                  ? "bg-[#34d399]/12 border-[#34d399]/35 text-[#34d399]"
                  : "bg-[#0d0d0d] border-white/10 text-white/50 hover:text-white"
              )}
            >
              {showEdgeLabels ? <Eye size={12} /> : <EyeOff size={12} />}
              Links
            </button>

            {/* WS status */}
            <div className={clsx(
              "flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[9px] font-mono tracking-widest uppercase",
              wsConnected
                ? "bg-[#34d399]/8 border-[#34d399]/20 text-[#34d399]"
                : "bg-white/3 border-white/8 text-white/30"
            )}>
              <Wifi size={11} />
              {wsConnected ? "Live" : "Offline"}
            </div>

            {/* Highlight Kingpins */}
            <button
              onClick={() => setHighlightKingpins(v => !v)}
              className={clsx(
                "flex items-center gap-2 px-4 py-2 rounded-xl border font-mono text-[10px] tracking-widest uppercase transition-all",
                highlightKingpins
                  ? "bg-[#34d399]/15 border-[#34d399]/60 text-[#34d399] shadow-[0_0_16px_rgba(52,211,153,0.25)]"
                  : "bg-[#0d0d0d] border-white/10 text-white/50 hover:border-[#34d399]/30 hover:text-[#34d399]"
              )}
            >
              <Zap size={12} className={highlightKingpins ? "fill-[#34d399]" : ""} />
              Highlight Kingpins
            </button>

            {/* Filter Toggle */}
            <div className="flex items-center bg-[#0d0d0d] border border-white/10 rounded-xl p-1 gap-1">
              <button
                onClick={() => setFilterMode("ALL")}
                className={clsx(
                  "px-3 py-1.5 text-[10px] font-mono tracking-widest uppercase rounded-lg transition-all",
                  filterMode === "ALL" ? "bg-white/10 text-white font-bold" : "text-white/50 hover:text-white"
                )}
              >
                All
              </button>
              <button
                onClick={() => setFilterMode("SINGLE")}
                className={clsx(
                  "px-3 py-1.5 text-[10px] font-mono tracking-widest uppercase rounded-lg transition-all",
                  filterMode === "SINGLE" ? "bg-[#34d399]/20 text-[#34d399] font-bold" : "text-white/50 hover:text-white"
                )}
              >
                Single
              </button>
              <button
                onClick={() => setFilterMode("REPEAT")}
                className={clsx(
                  "px-3 py-1.5 text-[10px] font-mono tracking-widest uppercase rounded-lg transition-all flex items-center gap-1",
                  filterMode === "REPEAT" ? "bg-[#ef4444]/20 text-[#ef4444] font-bold" : "text-white/50 hover:text-white"
                )}
              >
                Repeat (2+)
              </button>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <StatsBar stats={stats} nodeCount={nodes.length} />

        {/* Engine badge + live ticker */}
        <div className="mb-3 flex flex-col gap-2 px-1 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2 text-white/30">
            <div className="text-[#34d399]/60 bg-[#34d399]/10 p-1 rounded">
              <Zap size={11} />
            </div>
            <span className="text-[9px] font-mono tracking-widest uppercase">
              Graph Engine: NetworkX / force-directed 2D / layered layout
            </span>
          </div>
          <LiveTicker events={liveEvents} />
        </div>
      </div>

      {/* ── Canvas ── */}
      <div className="relative mx-4 mb-4 min-h-[34rem] flex-1 overflow-hidden rounded-2xl border border-white/5 bg-[#050505] sm:mx-6 sm:mb-6"
        style={{ boxShadow: "inset 0 0 60px rgba(52,211,153,0.03)" }}>

        {/* Loading overlay */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-[#050505] z-30"
            >
              <div className="w-10 h-10 border-2 border-[#34d399]/20 border-t-[#34d399] rounded-full animate-spin mb-4" />
              <div className="text-[#34d399] font-mono text-[10px] tracking-[0.2em] uppercase animate-pulse">
                Aggregating Network Intelligence...
              </div>
              <div className="text-white/25 font-mono text-[9px] mt-1 tracking-widest">
                Running PageRank / Detecting Clusters
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showOverview && (
            <GraphOverviewPanel
              nodes={nodes}
              edges={edges}
              searchTerm={searchTerm}
              selectedNode={selectedNode}
            />
          )}
        </AnimatePresence>
        <GraphLaneGuide />

        <ReactFlow
          nodes={filteredNodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={() => setSelectedNode(null)}
          nodeTypes={initialNodeTypes}
          edgeTypes={initialEdgeTypes}
          fitView
          fitViewOptions={FIT_VIEW_OPTIONS}
          minZoom={0.05}
          maxZoom={3}
          className="bg-[#050505]"
          defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={28}
            size={0.8}
            color="#1a1a1a"
          />
          <CustomControls />
        </ReactFlow>

        {/* Legend toggle */}
        <button
          onClick={() => setShowOverview(v => !v)}
          className="absolute bottom-8 left-6 flex items-center gap-2 px-4 py-2 bg-[#0d0d0d]/95 backdrop-blur border border-white/10 rounded-xl text-[10px] font-mono tracking-widest text-white/50 hover:text-[#34d399] hover:border-[#34d399]/30 transition-all z-40"
        >
          <Network size={12} />
          {showOverview ? "Hide" : "Show"} Overview
        </button>

        {/* Node detail panel */}
        <AnimatePresence>
          {selectedNode && (
            <NodeDetailPanel node={selectedNode} onClose={() => setSelectedNode(null)} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Provider wrapper ────────────────────────────────────────────────────────

export default function NetworkGraphPage() {
  return (
    <ErrorBoundary>
      <ReactFlowProvider>
        <GraphContent />
      </ReactFlowProvider>
    </ErrorBoundary>
  );
}

