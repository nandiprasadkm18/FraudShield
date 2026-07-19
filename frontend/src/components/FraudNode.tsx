import { Handle, Position, NodeProps } from "reactflow";
import {
  Phone, User, Landmark, ShieldAlert, Smartphone, Zap,
  Globe, Mail, Bitcoin, Activity, Network
} from "lucide-react";
import clsx from "clsx";

export const NODE_META: Record<string, { icon: any; glow: string; bg: string; label: string }> = {
  PHONE_NUMBER: { icon: Phone, glow: "#34d399", bg: "#34d399", label: "Scammer Number" },
  VICTIM: { icon: User, glow: "#60a5fa", bg: "#60a5fa", label: "Victim" },
  BANK_ACCOUNT: { icon: Landmark, glow: "#34d399", bg: "#34d399", label: "Mule Account" },
  UPI_ID: { icon: Zap, glow: "#a78bfa", bg: "#a78bfa", label: "UPI ID" },
  EMAIL: { icon: Mail, glow: "#fb923c", bg: "#fb923c", label: "Email" },
  TELEGRAM_ID: { icon: Smartphone, glow: "#38bdf8", bg: "#38bdf8", label: "Telegram" },
  CRYPTO_WALLET: { icon: Bitcoin, glow: "#facc15", bg: "#facc15", label: "Crypto Wallet" },
  WEBSITE: { icon: Globe, glow: "#f87171", bg: "#f87171", label: "Website" },
  CLUSTER: { icon: Network, glow: "#34d399", bg: "#34d399", label: "Fraud Ring" },
  IFSC_CODE: { icon: Landmark, glow: "#facc15", bg: "#facc15", label: "IFSC Code" },
};

export function getMeta(entityType: string, isKingpin: boolean) {
  if (isKingpin) return { icon: ShieldAlert, glow: "#34d399", bg: "#34d399", label: "Kingpin" };
  return NODE_META[entityType] ?? { icon: Activity, glow: "#86efac", bg: "#86efac", label: "Entity" };
}

export function normalizeEntityType(data: any) {
  const rawType = String(data?.entityType || "UNKNOWN").toUpperCase().replace("NODETYPE.", "");
  return rawType === "VICTIM" || (data?.label && String(data.label).toUpperCase().includes("VICTIM"))
    ? "VICTIM"
    : rawType;
}

export default function FraudNode({ data, selected }: NodeProps) {
  const entityType = normalizeEntityType(data);
  const isKingpin: boolean = data.isKingpin === true;
  const highlight: boolean = data.highlightKingpins === true;
  const highlightRepeat: boolean = data.highlightRepeatOffenders === true && (data.reports >= 2 || data.connections >= 2);
  const isVictim: boolean = entityType === "VICTIM";
  const isNew: boolean = data.isNew === true;
  const showLabels: boolean = data.showLabels !== false;

  const meta = getMeta(entityType, isKingpin);
  const Icon = meta.icon;
  const size = isKingpin ? 42 : isVictim ? 32 : 36;
  const glow = highlightRepeat ? "#ef4444" : meta.glow;

  const shouldPulse = (isKingpin && highlight) || highlightRepeat;
  const isCluster = entityType === "CLUSTER";

  return (
    <div className="relative flex flex-col items-center justify-center select-none">
      <Handle type="target" position={Position.Top} className="opacity-0 !w-1 !h-1 !min-w-0 !min-h-0" />
      <Handle type="source" position={Position.Bottom} className="opacity-0 !w-1 !h-1 !min-w-0 !min-h-0" />
      <Handle type="target" position={Position.Left} className="opacity-0 !w-1 !h-1 !min-w-0 !min-h-0" />
      <Handle type="source" position={Position.Right} className="opacity-0 !w-1 !h-1 !min-w-0 !min-h-0" />

      {/* Node body */}
      <div
        style={{
          boxShadow: shouldPulse
            ? `0 0 0 4px ${glow}33, 0 0 20px ${glow}88`
            : selected
              ? `0 0 0 2px #fff, 0 0 12px ${glow}`
              : `0 4px 12px rgba(0,0,0,0.5)`,
          borderColor: selected ? glow : `${glow}40`,
          animation: shouldPulse ? "node-pulse 1.5s infinite" : isNew ? "node-ping 0.6s ease-out 1" : "none",
        }}
        className="flex items-center gap-3 bg-[#0a0a0a] border rounded-xl p-2 pr-4 transition-all duration-300 cursor-pointer min-w-[140px]"
      >
        <div style={{ backgroundColor: meta.bg, boxShadow: `0 0 10px ${glow}60` }} className="flex items-center justify-center rounded-lg w-10 h-10 shrink-0">
          <Icon size={20} strokeWidth={2.5} className="text-black" />
        </div>
        <div className="flex flex-col text-left overflow-hidden">
          <span style={{ color: glow }} className="text-[9px] font-black tracking-widest uppercase mb-0.5 font-mono">
            {meta.label}
          </span>
          <span className="text-white font-mono text-[11px] truncate" title={data.label || data.value}>
            {data.label || data.value}
          </span>
        </div>
      </div>

      {/* Cluster count badge */}
      {isCluster && data.count > 0 && (
        <div
          style={{ background: glow, boxShadow: `0 0 6px ${glow}` }}
          className="absolute -top-2 -right-2 text-black font-black font-mono text-[10px] w-5 h-5 rounded-full flex items-center justify-center"
        >
          {data.count}
        </div>
      )}
    </div>
  );
}
