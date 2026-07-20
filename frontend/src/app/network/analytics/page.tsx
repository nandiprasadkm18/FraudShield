"use client";

import { useEffect, useState } from "react";
import { Activity, BarChart3, PieChart as PieChartIcon, TrendingUp, ShieldAlert, Map, Network, Smartphone, AlertTriangle, Banknote, Target, Database } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from "recharts";
import clsx from "clsx";

export default function AnalyticsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [networkStats, setNetworkStats] = useState<any>(null);
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

    async function fetchData() {
      try {
        const token = localStorage.getItem("token");
        const resReports = await fetch("/api/intel/reports", {
          headers: { Authorization: `Bearer ${token}` }
        });
        const resNetwork = await fetch("/api/intel/network", {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (resReports.ok) {
          const data = await resReports.json();
          setReports(Array.isArray(data) ? data : []);
        }
        if (resNetwork.ok) {
          const data = await resNetwork.json();
          setNetworkStats(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // 1. Threat Volume Over Time (Bar Chart)
  const volumeDataMap: Record<string, number> = {};
  reports.forEach(r => {
    const date = new Date(r.createdAt);
    const dayKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    if (!volumeDataMap[dayKey]) {
      volumeDataMap[dayKey] = 0;
    }
    volumeDataMap[dayKey] += 1;
  });
  
  const volumeData = Object.entries(volumeDataMap)
    .sort((a, b) => {
        const [y1, m1, d1] = a[0].split('-').map(Number);
        const [y2, m2, d2] = b[0].split('-').map(Number);
        return new Date(y1, m1, d1).getTime() - new Date(y2, m2, d2).getTime();
    })
    .map(([key, count]) => {
        const [y, m, d] = key.split('-').map(Number);
        return {
            date: new Date(y, m, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
            count
        };
    });

  // 2. Fraud Categories Distribution (Donut Chart)
  const categoryMap: Record<string, number> = {};
  reports.forEach(r => {
    const type = r.fraudType || "Unknown";
    categoryMap[type] = (categoryMap[type] || 0) + 1;
  });
  const categoryData = Object.entries(categoryMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  const COLORS = ['#34d399', '#f97316', '#ef4444', '#eab308', '#6366f1', '#a855f7', '#ec4899', '#14b8a6'];

  // 3. Financial Impact Trend (Line Chart)
  const financialDataMap: Record<string, number> = {};
  reports.forEach(r => {
    const date = new Date(r.createdAt);
    const dayKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    const amount = r.financialExposure || 0;
    if (!financialDataMap[dayKey]) {
        financialDataMap[dayKey] = 0;
    }
    financialDataMap[dayKey] += amount;
  });
  
  const financialData = Object.entries(financialDataMap)
    .sort((a, b) => {
        const [y1, m1, d1] = a[0].split('-').map(Number);
        const [y2, m2, d2] = b[0].split('-').map(Number);
        return new Date(y1, m1, d1).getTime() - new Date(y2, m2, d2).getTime();
    })
    .map(([key, amount]) => {
        const [y, m, d] = key.split('-').map(Number);
        return {
            date: new Date(y, m, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
            amount
        };
    });

  // 4. Severity Breakdown (Horizontal Bar Chart)
  const severityMap: Record<string, number> = { "CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0 };
  reports.forEach(r => {
    const sev = r.severity?.toUpperCase() || "UNKNOWN";
    if (severityMap[sev] !== undefined) {
      severityMap[sev] += 1;
    } else {
      severityMap[sev] = 1;
    }
  });
  const severityData = Object.entries(severityMap).map(([name, count]) => ({ name, count })).filter(d => d.count > 0).sort((a, b) => b.count - a.count);
  const SEVERITY_COLORS: Record<string, string> = {
    "CRITICAL": "#ff4d6d",
    "HIGH": "#ffb020",
    "MEDIUM": "#eab308",
    "LOW": "#34d399",
    "UNKNOWN": "#6b7280"
  };

  // 5. Top Targeted Regions (Bar Chart - State wise)
  const regionMap: Record<string, number> = {};
  reports.forEach(r => {
    const state = r.state || "Unknown";
    regionMap[state] = (regionMap[state] || 0) + 1;
  });
  const regionData = Object.entries(regionMap).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 10);

  // 6. Entity Type Distribution
  const entityMap: Record<string, number> = {};
  if (networkStats?.nodes) {
    networkStats.nodes.forEach((n: any) => {
        let type = n.data?.entityType || "Unknown";
        
        // Exclude internal/victim nodes and redundant ones like IFSC
        if (type !== "VICTIM" && type !== "CLUSTER" && type !== "IFSC_CODE" && type !== "Unknown" && type !== "PHONE_NUMBER") {
            entityMap[type] = (entityMap[type] || 0) + 1;
        }
    });
  }
  const entityData = Object.entries(entityMap)
    .filter(([name, count]) => count > 0)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const customTooltipStyle = { 
    backgroundColor: 'rgba(5, 5, 5, 0.95)', 
    border: '1px solid rgba(255, 255, 255, 0.1)', 
    borderRadius: '12px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.8)',
    backdropFilter: 'blur(12px)',
    padding: '16px',
    color: '#fff',
    fontFamily: 'monospace'
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white p-8 font-sans">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-3xl font-bold tracking-tight">Intelligence Analytics</h1>
          <div className="flex items-center gap-2 bg-[#34d399]/10 border border-[#34d399]/20 px-3 py-1 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-[#34d399] shadow-[0_0_8px_#34d399] animate-pulse" />
            <span className="text-[9px] font-bold font-mono tracking-widest text-[#34d399] uppercase">LIVE METRICS</span>
          </div>
        </div>
        <p className="text-sm text-zinc-500">
          Explore multi-dimensional data visualizations of reported threats and entity intelligence.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-20 flex flex-col items-center">
          <Activity size={32} className="text-[#34d399] animate-spin mb-4" />
          <p className="text-xs text-zinc-500 font-mono tracking-widest uppercase animate-pulse">Computing Aggregations...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* 1. Threat Volume Over Time */}
          <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
            <h3 className="text-sm font-bold font-mono uppercase tracking-widest text-zinc-400 mb-6 flex items-center gap-2">
              <TrendingUp size={16} className="text-[#34d399]"/> Threat Volume
            </h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={volumeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#34d399" stopOpacity={0.6}/>
                      <stop offset="95%" stopColor="#34d399" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis dataKey="date" stroke="#52525b" fontSize={11} fontFamily="monospace" tickLine={false} axisLine={false} dy={10} />
                  <YAxis stroke="#52525b" fontSize={11} fontFamily="monospace" tickLine={false} axisLine={false} dx={-10} allowDecimals={false} />
                  <Tooltip contentStyle={customTooltipStyle} itemStyle={{ color: '#34d399', fontWeight: 'bold' }} cursor={{ stroke: '#34d399', strokeWidth: 1, strokeDasharray: '4 4' }} />
                  <Area type="monotone" dataKey="count" stroke="#34d399" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" activeDot={{ r: 6, fill: "#000", stroke: "#34d399", strokeWidth: 3 }} animationDuration={1500} animationEasing="ease-out" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 2. Entity Type Distribution */}
          <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
            <h3 className="text-sm font-bold font-mono uppercase tracking-widest text-zinc-400 mb-6 flex items-center gap-2">
              <Database size={16} className="text-[#6366f1]"/> Entity Type Distribution
            </h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={entityData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorEntity" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.8}/>
                      <stop offset="100%" stopColor="#818cf8" stopOpacity={1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" horizontal={true} vertical={false} />
                  <XAxis type="number" stroke="#52525b" fontSize={11} fontFamily="monospace" tickLine={false} axisLine={false} />
                  <YAxis dataKey="name" type="category" stroke="#a1a1aa" fontSize={11} fontFamily="monospace" tickLine={false} axisLine={false} dx={-10} />
                  <Tooltip contentStyle={customTooltipStyle} itemStyle={{ color: '#818cf8', fontWeight: 'bold' }} cursor={{ fill: '#ffffff05' }} />
                  <Bar dataKey="count" fill="url(#colorEntity)" radius={[0, 4, 4, 0]} barSize={20} animationDuration={1500} animationEasing="ease-out" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 3. Fraud Categories (Donut) */}
          <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
            <h3 className="text-sm font-bold font-mono uppercase tracking-widest text-zinc-400 mb-6 flex items-center gap-2">
              <PieChartIcon size={16} className="text-[#f97316]"/> Fraud Categories
            </h3>
            <div className="h-[300px] w-full relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={5}
                    cornerRadius={4}
                    dataKey="value"
                    stroke="none"
                    animationDuration={1500}
                  >
                    {categoryData.map((entry, index) => {
                      const color = COLORS[index % COLORS.length];
                      return (
                        <Cell key={`cell-${index}`} fill={color} style={{ filter: `drop-shadow(0px 0px 8px ${color}80)` }} />
                      );
                    })}
                  </Pie>
                  <Tooltip contentStyle={customTooltipStyle} itemStyle={{ fontWeight: 'bold' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-bold text-white">{categoryData.reduce((a, c) => a + c.value, 0)}</span>
                <span className="text-[9px] font-mono tracking-widest text-zinc-500 uppercase">Total</span>
              </div>
            </div>
          </div>

          {/* 4. Financial Impact (Line) */}
          <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
            <h3 className="text-sm font-bold font-mono uppercase tracking-widest text-zinc-400 mb-6 flex items-center gap-2">
              <Banknote size={16} className="text-[#eab308]"/> Financial Exposure Trend
            </h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={financialData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorFinance" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#eab308" stopOpacity={0.6}/>
                      <stop offset="95%" stopColor="#eab308" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis dataKey="date" stroke="#52525b" fontSize={11} fontFamily="monospace" tickLine={false} axisLine={false} dy={10} />
                  <YAxis stroke="#52525b" fontSize={11} fontFamily="monospace" tickLine={false} axisLine={false} dx={-10} tickFormatter={(value) => `₹${value >= 1000 ? (value/1000).toFixed(1) + 'k' : value}`} />
                  <Tooltip contentStyle={customTooltipStyle} formatter={(value: any) => [`₹${Number(value || 0).toLocaleString()}`, "Amount"]} itemStyle={{ color: '#eab308', fontWeight: 'bold' }} cursor={{ stroke: '#eab308', strokeWidth: 1, strokeDasharray: '4 4' }} />
                  <Area type="monotone" dataKey="amount" stroke="#eab308" strokeWidth={3} fillOpacity={1} fill="url(#colorFinance)" dot={{ r: 4, fill: "#eab308", strokeWidth: 0 }} activeDot={{ r: 6, fill: "#000", stroke: "#eab308", strokeWidth: 3 }} animationDuration={1500} animationEasing="ease-out" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 5. Severity Breakdown */}
          <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
            <h3 className="text-sm font-bold font-mono uppercase tracking-widest text-zinc-400 mb-6 flex items-center gap-2">
              <AlertTriangle size={16} className="text-[#ef4444]"/> Severity Breakdown
            </h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={severityData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" horizontal={true} vertical={false} />
                  <XAxis type="number" stroke="#52525b" fontSize={11} fontFamily="monospace" tickLine={false} axisLine={false} />
                  <YAxis dataKey="name" type="category" stroke="#a1a1aa" fontSize={11} fontFamily="monospace" tickLine={false} axisLine={false} dx={-10} />
                  <Tooltip contentStyle={customTooltipStyle} itemStyle={{ fontWeight: 'bold' }} cursor={{ fill: '#ffffff05' }} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={24} animationDuration={1500} animationEasing="ease-out">
                    {severityData.map((entry, index) => {
                        const color = SEVERITY_COLORS[entry.name] || SEVERITY_COLORS["UNKNOWN"];
                        return (
                            <Cell key={`cell-${index}`} fill={color} style={{ filter: `drop-shadow(0px 0px 6px ${color}90)` }} />
                        );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 6. Top States */}
          <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
            <h3 className="text-sm font-bold font-mono uppercase tracking-widest text-zinc-400 mb-6 flex items-center gap-2">
              <Map size={16} className="text-[#ec4899]"/> Top Affected States
            </h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={regionData} margin={{ top: 10, right: 10, left: -20, bottom: 30 }}>
                  <defs>
                    <linearGradient id="colorState" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ec4899" stopOpacity={0.9}/>
                      <stop offset="100%" stopColor="#be185d" stopOpacity={0.4}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis dataKey="name" stroke="#52525b" fontSize={11} fontFamily="monospace" tickLine={false} axisLine={false} dy={10} angle={-45} textAnchor="end" />
                  <YAxis stroke="#52525b" fontSize={11} fontFamily="monospace" tickLine={false} axisLine={false} dx={-10} allowDecimals={false} />
                  <Tooltip formatter={(value: any) => [value, "State Count"]} contentStyle={customTooltipStyle} itemStyle={{ color: '#ec4899', fontWeight: 'bold' }} cursor={{ fill: '#ffffff05' }} />
                  <Bar dataKey="count" fill="url(#colorState)" radius={[4, 4, 0, 0]} animationDuration={1500} animationEasing="ease-out" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
