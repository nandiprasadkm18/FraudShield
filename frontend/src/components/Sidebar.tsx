"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldAlert, Map, Network, Users, UserX, Crown, Smartphone, Phone,
  LogOut, Shield, ChevronUp, X, PieChart
} from "lucide-react";
import clsx from "clsx";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function Sidebar() {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [graphIntelOpen, setGraphIntelOpen] = useState(pathname.includes('/network'));
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUser(JSON.parse(userStr));
    }
  }, [pathname]);
  
  if (pathname === '/login' || pathname === '/register' || pathname === '/') {
    return null;
  }

  const topLinks = [
    { href: "/citizen", label: "Scam Shield", icon: ShieldAlert },
    { href: "/geo", label: "Geo Intel", icon: Map },
  ];

  const graphLinks = [
    { href: "/network", label: "Dashboard", icon: Network },
    { href: "/network/analytics", label: "Analytics & Graphs", icon: PieChart },
    { href: "/network/reports", label: "Intercepted Reports", icon: ShieldAlert },
    { href: "/network/scammers", label: "Scammer Numbers", icon: Phone },
    { href: "/network/victims", label: "Victims", icon: Users },
    { href: "/network/upi", label: "UPI Accounts", icon: UserX },
    { href: "/network/banks", label: "Bank Accounts", icon: UserX },
    { href: "/network/emails", label: "Email Addresses", icon: UserX },
    { href: "/network/websites", label: "Websites", icon: UserX },
    { href: "/network/telegram", label: "Telegram IDs", icon: UserX },
    { href: "/network/crypto", label: "Crypto Wallets", icon: UserX },
    { href: "/network/users", label: "User Management", icon: Users },
  ];

  return (
    <div className="w-64 h-full bg-[#050505] border-r border-white/5 flex flex-col justify-between overflow-y-auto custom-scrollbar font-sans">

      <div>
        {/* Logo Area */}
        <div className="p-6 pb-2">
          <div className="flex items-center gap-3">
            <div className="bg-white text-black p-1.5 rounded-lg">
              <Shield size={20} className="fill-black" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight leading-none text-white">FraudShield</h1>
              <p className="text-[9px] text-[#34d399] tracking-widest font-mono mt-0.5 font-bold">AI - INDIA</p>
            </div>
          </div>
        </div>

        {/* Modules Section */}
        <div className="px-4 py-4">
          <div className="text-[10px] text-zinc-500 font-mono tracking-widest font-bold px-3 mb-2 uppercase">Modules</div>

          <nav className="flex flex-col gap-1">

            {/* Graph Intel (Expandable) - ADMIN ONLY */}
            {user?.role === "PLATFORM_ADMIN" && (
              <div className="flex flex-col">
                <button
                  onClick={() => setGraphIntelOpen(!graphIntelOpen)}
                className={clsx(
                  "flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 border border-transparent",
                  graphIntelOpen ? "bg-zinc-900 border-white/5" : "hover:bg-zinc-900/50 hover:border-white/5"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={clsx(
                    "p-1.5 rounded-lg",
                    graphIntelOpen ? "bg-white text-black" : "text-zinc-500"
                  )}>
                    <Network size={16} />
                  </div>
                  <span className={clsx("text-sm font-bold", graphIntelOpen ? "text-white" : "text-zinc-400")}>Graph Intel</span>
                </div>
                <ChevronUp size={16} className={clsx("text-zinc-500 transition-transform duration-300", !graphIntelOpen && "rotate-180")} />
              </button>

              <AnimatePresence>
                {graphIntelOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="flex flex-col gap-1 py-2 pl-4 ml-5 border-l border-white/10 mt-1">
                      {graphLinks.map((link) => {
                        const isActive = pathname === link.href;
                        return (
                          <Link
                            key={link.href}
                            href={link.href}
                            className={clsx(
                              "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-xs font-bold",
                              isActive
                                ? "bg-[#34d399]/10 text-[#34d399]"
                                : "text-zinc-500 hover:text-white"
                            )}
                          >
                            <link.icon size={14} className={isActive ? "text-[#34d399]" : "text-zinc-500"} />
                            {link.label}
                          </Link>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            )}

            {/* Other Top Links */}
            {topLinks.map((link) => {
              if (link.label === "Geo Intel" && user?.role !== "PLATFORM_ADMIN") return null;
              
              const isActive = pathname === link.href && !pathname.includes('/network');
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={clsx(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 border border-transparent",
                    isActive ? "bg-zinc-900 border-white/5" : "hover:bg-zinc-900/50 hover:border-white/5"
                  )}
                >
                  <div className="p-1.5 rounded-lg text-zinc-500">
                    <link.icon size={16} />
                  </div>
                  <span className={clsx("text-sm font-bold", isActive ? "text-white" : "text-zinc-400")}>
                    {link.label}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      <div>
        {/* User Profile */}
        {user && (
          <div className="px-6 py-4 border-t border-white/5 bg-[#0a0a0a]">
            <div className="flex items-center justify-between">
              <button 
                onClick={() => setProfileOpen(true)}
                className="flex items-center gap-3 overflow-hidden text-left hover:bg-white/5 p-2 rounded-xl transition-colors -ml-2"
              >
                <div className="w-8 h-8 rounded-full bg-[#34d399]/20 flex items-center justify-center text-[#34d399] font-bold text-xs shrink-0">
                  {user.name?.charAt(0) || user.email?.charAt(0) || "U"}
                </div>
                <div className="flex flex-col truncate">
                  <span className="text-sm font-bold text-white truncate">{user.name || "User"}</span>
                  <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest truncate">{user.role}</span>
                </div>
              </button>
              <button 
                onClick={() => {
                  localStorage.removeItem("token");
                  localStorage.removeItem("user");
                  window.location.href = "/";
                }}
                className="text-zinc-500 hover:text-white transition-colors shrink-0"
                title="Logout"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        )}

        <AnimatePresence>
          {profileOpen && user && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setProfileOpen(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 z-50 shadow-2xl"
              >
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-white mb-1">User Profile</h2>
                    <p className="text-xs text-zinc-500 font-mono tracking-widest uppercase">Identity Details</p>
                  </div>
                  <button onClick={() => setProfileOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-zinc-900/50 border border-white/5">
                    <div className="w-12 h-12 rounded-full bg-[#34d399]/20 flex items-center justify-center text-[#34d399] font-bold text-lg shrink-0">
                      {user.name?.charAt(0) || user.email?.charAt(0) || "U"}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">{user.name || "User"}</div>
                      <div className="text-xs text-zinc-400">{user.email}</div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-zinc-900/50 border border-white/5 space-y-3">
                    <div>
                      <div className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase mb-1">Assigned Role</div>
                      <div className="text-sm font-bold text-[#34d399] flex items-center gap-2">
                        <Crown size={14} /> {user.role}
                      </div>
                    </div>
                    
                    {user.phone && (
                      <div>
                        <div className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase mb-1">Phone Number</div>
                        <div className="text-sm font-bold text-white flex items-center gap-2">
                          <Phone size={14} className="text-zinc-500" /> {user.phone}
                        </div>
                      </div>
                    )}
                    
                    <div>
                      <div className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase mb-1">Organization ID</div>
                      <div className="text-xs font-mono text-zinc-300 break-all">{user.organizationId || "N/A"}</div>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => setProfileOpen(false)}
                  className="w-full mt-6 py-2.5 bg-white text-black font-bold text-sm rounded-xl hover:bg-zinc-200 transition-colors"
                >
                  Close
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/5 bg-zinc-900/20">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-[#34d399] shadow-[0_0_8px_#34d399] animate-pulse" />
            <span className="text-[10px] font-mono font-bold tracking-widest text-[#34d399] uppercase">LIVE</span>
          </div>
          <p className="text-[10px] text-zinc-500 leading-relaxed mb-4 pr-4">
            Real-time ingestion engine streaming <strong className="text-zinc-300">scam reports</strong> across India.
          </p>
          <div className="text-[9px] text-zinc-600 font-mono tracking-widest flex items-center gap-2">
            <Network size={10} /> V3.0 · BUILD 0713
          </div>
        </div>
      </div>
    </div>
  );
}
