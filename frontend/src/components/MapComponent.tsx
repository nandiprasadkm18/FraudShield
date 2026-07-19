"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { motion } from "framer-motion";

interface GeoEvent {
  id: string;
  lat: number;
  lng: number;
  district: string | null;
  severity: string;
  fraudType: string;
  phoneNumber: string;
  createdAt: string;
}

interface NcrbData {
  district?: string;
  city?: string;
  state: string;
  cases: number;
  lat: number;
  lng: number;
  metadata?: any;
}

interface FinancialData {
  state: string;
  totalIncidents: number;
  amountReported: number;
  lienAmount: number;
  refundedAmount: number;
  lat: number;
  lng: number;
}

type ActiveLayer = "community" | "districts" | "cities" | "states" | "financial";

interface MapComponentProps {
  newReport?: { lat?: number; lng?: number; id: string; type: string; severity: string } | null;
}

export default function MapComponent({ newReport }: MapComponentProps = {}) {
  const [mounted, setMounted] = useState(false);
  const [communityEvents, setCommunityEvents] = useState<GeoEvent[]>([]);
  const [ncrbDistricts, setNcrbDistricts] = useState<NcrbData[]>([]);
  const [ncrbCities, setNcrbCities] = useState<NcrbData[]>([]);
  const [ncrbStates, setNcrbStates] = useState<NcrbData[]>([]);
  const [financialData, setFinancialData] = useState<FinancialData[]>([]);
  const [activeLayer, setActiveLayer] = useState<ActiveLayer>("districts");

  useEffect(() => {
    setMounted(true);
    // Fix Leaflet's default icon path issues with webpack
    const L = require("leaflet");
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png").default,
      iconUrl: require("leaflet/dist/images/marker-icon.png").default,
      shadowUrl: require("leaflet/dist/images/marker-shadow.png").default,
    });

    // Fetch Community Reports
    fetch("/api/intel/geospatial")
      .then((r) => r.json())
      .then((d) => setCommunityEvents(d.events ?? []))
      .catch(() => {});

    // Fetch NCRB Historical Intelligence
    fetch("/api/geo/districts")
      .then((r) => r.json())
      .then((d) => setNcrbDistricts(d))
      .catch(() => {});

    fetch("/api/geo/cities")
      .then((r) => r.json())
      .then((d) => setNcrbCities(d))
      .catch(() => {});
      
    fetch("/api/geo/states")
      .then((r) => r.json())
      .then((d) => setNcrbStates(d))
      .catch(() => {});

    fetch("/api/geo/financial")
      .then((r) => r.json())
      .then((d) => setFinancialData(d))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (newReport && newReport.lat && newReport.lng) {
      setCommunityEvents(prev => {
        // Prevent duplicates
        if (prev.some(e => e.id === newReport.id)) return prev;
        
        return [{
          id: newReport.id,
          lat: newReport.lat!,
          lng: newReport.lng!,
          district: null,
          severity: newReport.severity,
          fraudType: newReport.type,
          phoneNumber: "Unknown",
          createdAt: new Date().toISOString()
        }, ...prev];
      });
    }
  }, [newReport]);

  if (!mounted) {
    return (
      <div className="w-full h-full bg-slate-900 animate-pulse rounded-lg flex items-center justify-center text-slate-500">
        Loading Map Intelligence...
      </div>
    );
  }

  const center: [number, number] = [22.9734, 78.6569];

  const severityColor = (s: string) => {
    switch (s) {
      case "critical": return "#FF4D6D";
      case "high":     return "#FFB020";
      case "medium":   return "#00E5FF";
      default:         return "#475569";
    }
  };

  // Determine what data to render based on the active tab
  let renderData: any[] = [];
  if (activeLayer === "community") renderData = communityEvents;
  else if (activeLayer === "districts") renderData = ncrbDistricts;
  else if (activeLayer === "cities") renderData = ncrbCities;
  else if (activeLayer === "states") renderData = ncrbStates;
  else if (activeLayer === "financial") renderData = financialData;

  return (
    <div className="w-full h-full rounded-xl overflow-hidden border border-white/5 shadow-2xl relative z-0 flex flex-col">
      <style>{`
        .leaflet-popup-content-wrapper, .leaflet-popup-tip {
          background: rgba(24, 24, 27, 0.75) !important;
          backdrop-filter: blur(12px) !important;
          -webkit-backdrop-filter: blur(12px) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          color: #e4e4e7 !important;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5) !important;
        }
        .leaflet-container {
          background: #09090b !important;
          font-family: 'Inter', sans-serif !important;
        }
        .leaflet-popup-close-button {
          color: #a1a1aa !important;
        }
      `}</style>
      <MapContainer
        center={center}
        zoom={5}
        style={{ width: "100%", height: "100%" }}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />

        {/* LAYER RENDERER */}
        {activeLayer === "financial" ? (
          // RENDER FINANCIAL DATA
          renderData.map((item: FinancialData, idx: number) => {
            const radius = Math.max(10, Math.min(50, item.amountReported / 5000));
            const opacity = Math.max(0.5, Math.min(0.9, item.amountReported / 100000));

            return (
              <CircleMarker
                key={`fin-${idx}`}
                center={[item.lat, item.lng]}
                radius={radius}
                pathOptions={{
                  color: "#34d399", // Emerald Glow
                  fillColor: "#059669",
                  fillOpacity: opacity * 0.4,
                  weight: 2,
                  opacity: 0.8,
                }}
              >
                <Popup>
                  <div className="p-1 min-w-[200px]">
                    <div className="font-bold text-zinc-100 text-sm mb-2 pb-1 border-b border-white/10 tracking-wide">
                      {item.state}
                    </div>
                    <div className="flex flex-col gap-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Total Incidents:</span>
                        <span className="font-mono font-bold text-zinc-200">{item.totalIncidents.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Amount Reported:</span>
                        <span className="font-mono font-bold text-emerald-400">₹ {item.amountReported.toLocaleString()} L</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Lien Amount:</span>
                        <span className="font-mono font-bold text-amber-400">₹ {item.lienAmount.toLocaleString()} L</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Refunded:</span>
                        <span className="font-mono font-bold text-blue-400">₹ {item.refundedAmount.toLocaleString()} L</span>
                      </div>
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-2 border-t border-white/10 pt-1 uppercase tracking-widest font-mono">
                      Source: I4C Financial Impact Report
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })
        ) : activeLayer === "community" ? (
          // RENDER COMMUNITY EVENTS
          renderData.map((event: GeoEvent) => (
            <CircleMarker
              key={event.id}
              center={[event.lat, event.lng]}
              radius={event.severity === "critical" ? 8 : event.severity === "high" ? 6 : 5}
              pathOptions={{
                color: severityColor(event.severity),
                fillColor: severityColor(event.severity),
                fillOpacity: 0.3,
                weight: 2,
                opacity: 0.9,
              }}
            >
              <Popup>
                <div className="p-1 min-w-[160px]">
                  <div className="font-bold text-zinc-100 text-sm">{event.fraudType}</div>
                  <div className="text-xs text-zinc-400 mb-1 uppercase tracking-wider">{event.severity}</div>
                  {event.district && (
                    <div className="text-xs text-zinc-300">📍 {event.district}</div>
                  )}
                  <div className="text-[10px] text-zinc-500 mt-1 border-t border-white/10 pt-1 uppercase tracking-widest font-mono">
                    Source: FraudShield AI Intel
                    <br/>
                    {new Date(event.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          ))
        ) : (
          // RENDER NCRB DATA (Districts, Cities, States)
          renderData.map((item: NcrbData, idx: number) => {
            // Dynamic radius and opacity based on cases (heat intensity)
            let maxDivisor = 500;
            if (activeLayer === "states") maxDivisor = 2000;
            if (activeLayer === "cities") maxDivisor = 1000;

            const radius = Math.max(6, Math.min(30, item.cases / maxDivisor));
            const opacity = Math.max(0.2, Math.min(0.6, item.cases / (maxDivisor * 10)));
            
            return (
              <CircleMarker
                key={`ncrb-${idx}`}
                center={[item.lat, item.lng]}
                radius={radius}
                pathOptions={{
                  color: "#a5b4fc", // Soft Indigo Glow
                  fillColor: "#4f46e5",
                  fillOpacity: opacity,
                  weight: 2,
                  opacity: 0.7,
                }}
              >
                <Popup>
                  <div className="p-1 min-w-[160px]">
                    <div className="font-bold text-zinc-100 text-sm tracking-wide">
                      {item.district || item.city || item.state}
                    </div>
                    {item.district || item.city ? (
                      <div className="text-xs text-zinc-400 mb-2 uppercase tracking-wider">
                        {item.state}
                      </div>
                    ) : null}
                    <div className="text-sm font-bold text-indigo-400 mb-1">
                      Cybercrime Cases: {item.cases.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-2 border-t border-white/10 pt-2 font-mono">
                      {item.metadata && (
                        <div className="flex flex-col gap-1 mb-2">
                          {(activeLayer === "states" || activeLayer === "cities") && item.metadata.cases2021 !== undefined ? (
                            <>
                              <div className="flex justify-between">
                                <span>2021 Cases:</span>
                                <span className="font-mono text-slate-300">{item.metadata.cases2021}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>2022 Cases:</span>
                                <span className="font-mono text-slate-300">{item.metadata.cases2022}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Crime Rate:</span>
                                <span className="font-mono text-slate-300">{item.metadata.crimeRate}%</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Chargesheeting:</span>
                                <span className="font-mono text-slate-300">{item.metadata.chargeSheetRate}%</span>
                              </div>
                            </>
                          ) : (
                            <>
                              {item.metadata.totalItAct !== undefined && (
                                <div className="flex justify-between">
                                  <span>IT Act Offences:</span>
                                  <span className="font-mono text-slate-300">{item.metadata.totalItAct}</span>
                                </div>
                              )}
                              {item.metadata.totalIpc !== undefined && (
                                <div className="flex justify-between">
                                  <span>IPC Offences:</span>
                                  <span className="font-mono text-slate-300">{item.metadata.totalIpc}</span>
                                </div>
                              )}
                              {item.metadata.fraud !== undefined && (
                                <div className="flex justify-between">
                                  <span className="text-red-400">Online Fraud:</span>
                                  <span className="font-mono text-red-400">{item.metadata.fraud}</span>
                                </div>
                              )}
                              {item.metadata.identityTheft !== undefined && (
                                <div className="flex justify-between">
                                  <span className="text-orange-400">Identity Theft:</span>
                                  <span className="font-mono text-orange-400">{item.metadata.identityTheft}</span>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}
                      Source: NCRB Crime in India 2023
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })
        )}
      </MapContainer>

      {/* Top Navigation Bar for Layer Selection */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[1000] flex bg-zinc-950/80 backdrop-blur-xl border border-white/10 p-1.5 rounded-2xl shadow-2xl pointer-events-auto">
        {[
          { id: "community", label: "Live Threats" },
          { id: "districts", label: "NCRB Districts" },
          { id: "cities", label: "NCRB Cities" },
          { id: "states", label: "NCRB States" },
          { id: "financial", label: "Financial Impact" },
        ].map((tab) => {
          const isActive = activeLayer === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveLayer(tab.id as ActiveLayer)}
              className={`relative px-5 py-2 text-xs font-semibold rounded-xl transition-colors z-10 ${
                isActive ? "text-white" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeMapLayer"
                  className="absolute inset-0 bg-primary/20 border border-primary/30 rounded-xl -z-10"
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                />
              )}
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Map UI Legend Overlay */}
      <div className="absolute bottom-6 right-6 z-[400] bg-zinc-950/80 backdrop-blur-xl border border-white/10 p-5 rounded-2xl pointer-events-none shadow-2xl w-52">
        <h3 className="text-[10px] font-bold text-zinc-400 mb-3 tracking-widest uppercase border-b border-white/10 pb-2">
          {activeLayer === "community" ? "LIVE THREATS" : activeLayer === "financial" ? "FINANCIAL LOSSES" : "HISTORICAL (NCRB)"}
        </h3>
        
        <div className="flex flex-col gap-3">
          {activeLayer === "financial" ? (
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-3 h-3 rounded-full bg-success border-2 border-success/30 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                <span className="text-xs text-zinc-300 font-medium">High Impact</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-success/50" />
                <span className="text-xs text-zinc-400">Low Impact</span>
              </div>
            </div>
          ) : activeLayer !== "community" ? (
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-3 h-3 rounded-full bg-primary border-2 border-primary/30 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                <span className="text-xs text-zinc-300 font-medium">High Volume</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-primary/50" />
                <span className="text-xs text-zinc-400">Low Volume</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {[
                { label: "Critical", color: "bg-critical shadow-[0_0_10px_rgba(239,68,68,0.6)]" },
                { label: "High",     color: "bg-warning shadow-[0_0_10px_rgba(245,158,11,0.6)]" },
                { label: "Medium",   color: "bg-primary shadow-[0_0_10px_rgba(99,102,241,0.6)]" },
              ].map(({ label, color }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${color} ${label === "Critical" ? "animate-pulse" : ""}`} />
                  <span className="text-xs text-zinc-300 font-medium">{label}</span>
                </div>
              ))}
            </div>
          )}

          <div className="text-[10px] text-zinc-500 mt-4 border-t border-white/5 pt-3 font-mono flex justify-between uppercase">
            <span>Data Points</span>
            <span className="font-bold text-zinc-300">{renderData.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
