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
          width: size,
          height: size,
          boxShadow: shouldPulse
            ? `0 0 0 4px ${glow}33, 0 0 20px ${glow}88`
            : selected
              ? `0 0 0 2px #fff, 0 0 12px ${glow}`
              : `0 0 8px ${glow}`,
          backgroundColor: meta.bg,
          border: `2px solid #ffffff33`,
          animation: shouldPulse ? "node-pulse 1.5s infinite" : isNew ? "node-ping 0.6s ease-out 1" : "none",
          opacity: 1
        }}
        className="rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer"
      >
        <Icon
          size={size * 0.5}
          strokeWidth={2.5}
          className="text-black"
        />
      </div>

      {/* Cluster count badge */}
      {isCluster && data.count > 0 && (
        <div
          style={{ background: glow, boxShadow: `0 0 6px ${glow}` }}
          className="absolute -top-1 -right-1 text-black font-black font-mono text-[8px] w-4 h-4 rounded-full flex items-center justify-center"
        >
          {data.count}
        </div>
      )}

      {/* Label */}
      {showLabels && (
        <div
          style={{ color: isKingpin && highlight ? glow : "#ffffff", maxWidth: 176 }}
          className={clsx(
            "absolute top-full mt-2 rounded-lg border border-white/12 bg-[#050505]/95 px-2.5 py-1.5 text-[11px] font-mono text-center leading-tight shadow-lg backdrop-blur",
            "whitespace-nowrap overflow-hidden text-ellipsis transition-colors",
            isKingpin && "font-bold border-[#34d399]/30"
          )}
        >
          {data.label || data.value}
        </div>
      )}
    </div>
  );
}
