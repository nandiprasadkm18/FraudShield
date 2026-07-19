"use client";

import { useState } from "react";
import { Shield, Network, Globe, Activity, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const formData = new URLSearchParams();
      formData.append("username", email);
      formData.append("password", password);

      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData,
      });

      if (!res.ok) {
        let errMessage = "Invalid email or password";
        try {
          const errData = await res.json();
          errMessage = errData.detail || errMessage;
        } catch (e) {
          if (res.status === 429) errMessage = "Too many requests. Please try again later.";
        }
        throw new Error(errMessage);
      }

      const data = await res.json();
      localStorage.setItem("token", data.access_token);

      // Fetch user profile to get role
      const meRes = await fetch("/api/v1/auth/me", {
        headers: {
          Authorization: `Bearer ${data.access_token}`
        }
      });
      
      if (!meRes.ok) throw new Error("Failed to get profile");
      
      const meData = await meRes.json();
      localStorage.setItem("user", JSON.stringify(meData));

      if (meData.role === "PLATFORM_ADMIN") {
        router.push("/network");
      } else {
        router.push("/citizen");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex text-zinc-100">
      {/* Left Info Panel */}
      <div className="hidden lg:flex w-1/2 bg-[#081f14] p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#10b981]/10 to-transparent pointer-events-none" />
        
        <div className="relative z-10 flex items-center gap-3">
          <div className="bg-white p-2 rounded-xl">
            <Shield className="text-[#081f14] w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">FraudShield</h1>
            <p className="text-[10px] uppercase tracking-widest text-[#34d399] font-mono">AI · INDIA</p>
          </div>
        </div>

        <div className="relative z-10 max-w-md mt-20">
          <h2 className="text-4xl font-bold text-white leading-tight mb-6 tracking-tight">
            The national fraud command centre.
          </h2>
          <p className="text-zinc-400 text-sm leading-relaxed mb-12">
            Live fraud network, citizen scam-shield chatbot, and a real-time geospatial dashboard — all on one platform.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-black/40 border border-[#34d399]/20 rounded-2xl p-6 text-center backdrop-blur-sm">
              <Network className="w-6 h-6 text-[#34d399] mx-auto mb-3" />
              <div className="font-semibold text-white text-sm">Graph Intel</div>
              <div className="text-[10px] text-[#34d399] tracking-widest uppercase font-mono mt-1">Live</div>
            </div>
            <div className="bg-black/40 border border-[#34d399]/20 rounded-2xl p-6 text-center backdrop-blur-sm">
              <Shield className="w-6 h-6 text-[#34d399] mx-auto mb-3" />
              <div className="font-semibold text-white text-sm">Scam Shield</div>
              <div className="text-[10px] text-[#34d399] tracking-widest uppercase font-mono mt-1">Always On</div>
            </div>
            <div className="bg-black/40 border border-[#34d399]/20 rounded-2xl p-6 text-center backdrop-blur-sm">
              <Globe className="w-6 h-6 text-[#34d399] mx-auto mb-3" />
              <div className="font-semibold text-white text-sm">Geo Intel</div>
              <div className="text-[10px] text-[#34d399] tracking-widest uppercase font-mono mt-1">Real-Time</div>
            </div>
            <div className="bg-black/40 border border-[#34d399]/20 rounded-2xl p-6 text-center backdrop-blur-sm">
              <Activity className="w-6 h-6 text-[#34d399] mx-auto mb-3" />
              <div className="font-semibold text-white text-sm">AI Verdicts</div>
              <div className="text-[10px] text-[#34d399] tracking-widest uppercase font-mono mt-1">Response</div>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-2 text-xs font-mono tracking-widest text-zinc-500 uppercase mt-20">
          <div className="w-2 h-2 rounded-full bg-[#34d399] animate-pulse" />
          Live · 24x7 Ingestion across India
        </div>
      </div>

      {/* Right Login Panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-24 relative">
        <div className="w-full max-w-md relative z-10">
          <div className="mb-10">
            <h3 className="text-[#34d399] text-xs font-mono uppercase tracking-widest mb-3">Sign In</h3>
            <h2 className="text-3xl font-bold text-white mb-2">Welcome back</h2>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-lg">
                {error}
              </div>
            )}
            
            <div>
              <label className="block text-xs font-bold tracking-widest uppercase text-zinc-500 mb-2">
                Email
              </label>
              <div className="relative">
                <input 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#34d399] transition-colors"
                  placeholder="you@fraudshield.in"
                  required
                  suppressHydrationWarning
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold tracking-widest uppercase text-zinc-500 mb-2">
                Password
              </label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#34d399] transition-colors pr-10"
                  placeholder="••••••••"
                  required
                  suppressHydrationWarning
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                  suppressHydrationWarning
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black hover:bg-zinc-200 transition-colors rounded-xl py-3 text-sm font-bold mt-8 shadow-[0_0_20px_rgba(52,211,153,0.3)] disabled:opacity-50"
              suppressHydrationWarning
            >
              {loading ? "SIGNING IN..." : "SIGN IN →"}
            </button>

            <div className="text-center mt-6">
              <span className="text-zinc-500 text-xs">New here? </span>
              <Link href="/register" className="text-white text-xs font-semibold hover:text-[#34d399] transition-colors">
                Create an account
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
