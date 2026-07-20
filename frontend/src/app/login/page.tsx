"use client";

import { useState } from "react";
import { Shield, Network, Globe, Activity, Eye, EyeOff, Mail, Lock, ArrowRight, Loader2 } from "lucide-react";
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
    <div className="min-h-screen w-full flex bg-black relative overflow-hidden font-[var(--font-manrope)] text-zinc-100">
      {/* Background radial glow */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute inset-0" style={{
          background:
            'radial-gradient(60% 60% at 30% 30%, rgba(16,185,129,0.09), transparent 60%),' +
            'radial-gradient(60% 60% at 70% 70%, rgba(16,185,129,0.07), transparent 60%)',
        }} />
      </div>

      <div
        className="flex w-full max-w-[1280px] mx-auto my-6 rounded-[28px] overflow-hidden border border-[#10B981]/40 relative z-10"
        style={{
          backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)',
          boxShadow: '0 0 60px -10px rgba(16,185,129,0.35), inset 0 0 30px rgba(16,185,129,0.05)',
        }}
      >
        {/* Brand pane */}
        <div
          className="hidden md:flex flex-col justify-between p-10 w-[45%] relative order-1"
          style={{ background: 'linear-gradient(135deg, rgba(6,95,70,0.55) 0%, rgba(6,78,59,0.30) 50%, rgba(16,185,129,0.10) 100%)' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-white"
              style={{ boxShadow: '0 0 24px rgba(16,185,129,0.45)' }}>
              <Shield size={22} className="text-black" strokeWidth={2.4} />
            </div>
            <div>
              <p className="text-[22px] font-bold text-white tracking-tight leading-none">FraudShield</p>
              <p className="text-[10px] text-[#34D399] uppercase tracking-[0.24em] font-bold mt-1">AI · INDIA</p>
            </div>
          </div>

          <div>
            <h2 className="text-[38px] font-bold text-white leading-[1.05] tracking-tight">
              The national fraud<br />command centre.
            </h2>
            <p className="text-[14px] text-[#8B96A1] mt-4 max-w-md leading-relaxed">
              Live fraud network, citizen scam-shield chatbot, and a real-time geospatial dashboard — all on one platform.
            </p>
            <div className="grid grid-cols-2 gap-3 mt-8 max-w-md">
              {[
                { title: "Graph Intel", subtitle: "LIVE", icon: Network, accent: '#34D399' },
                { title: "Scam Shield", subtitle: "ALWAYS ON", icon: Shield, accent: '#6EE7B7' },
                { title: "Geo Intel", subtitle: "REAL-TIME", icon: Globe, accent: '#A7F3D0' },
                { title: "AI Verdicts", subtitle: "RESPONSE", icon: Activity, accent: '#10B981' },
              ].map((feature, i) => (
                <div key={i}
                  className="relative p-4 rounded-2xl border border-white/10 bg-black/60 overflow-hidden text-center">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 mx-auto"
                    style={{ backgroundColor: `${feature.accent}1A`, border: `1px solid ${feature.accent}55`, boxShadow: `0 0 14px ${feature.accent}66` }}>
                    <feature.icon size={20} style={{ color: feature.accent }} strokeWidth={2.4} />
                  </div>
                  <p className="text-[14px] text-white font-bold leading-tight">{feature.title}</p>
                  <p className="mt-1.5 text-[10px] text-[#34D399] uppercase tracking-[0.18em] font-bold">{feature.subtitle}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#34D399] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#34D399]" />
            </span>
            <span className="text-white uppercase tracking-widest font-bold text-[10px]">Live · 24x7 ingestion across India</span>
          </div>
        </div>

        {/* Form pane */}
        <div className="flex-1 bg-[#050505] p-10 order-2 flex flex-col justify-center">
          <div className="max-w-md mx-auto w-full h-full flex flex-col justify-center">
            <div className="mb-8">
              <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-[#34D399] mb-2 font-mono">
                {'> ACCESS_PORTAL'}
              </p>
              <h1 className="text-[32px] font-bold text-white tracking-tight leading-none">Welcome back</h1>
              <p className="text-[13px] text-[#8B96A1] mt-3">Sign in to the FraudShield command centre.</p>
            </div>
            
            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-[#10B981]/10 border border-[#10B981]/40 text-[#34D399] text-[12px] font-semibold mb-4">
                  <span>{error}</span>
                </div>
              )}
              
              <div className="space-y-1.5">
                <label className="text-[10px] text-white uppercase tracking-[0.18em] font-bold">Email</label>
                <div className="flex items-center gap-2.5 bg-black border border-white/10 rounded-xl px-4 py-3 focus-within:border-[#10B981] focus-within:ring-1 focus-within:ring-[#10B981]/40 transition-all">
                  <Mail size={16} className="text-[#8B96A1] shrink-0" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="flex-1 w-full bg-transparent text-[14px] text-white placeholder:text-[#4B5563] outline-none font-medium"
                    suppressHydrationWarning
                  />
                </div>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[10px] text-white uppercase tracking-[0.18em] font-bold">Password</label>
                <div className="flex items-center gap-2.5 bg-black border border-white/10 rounded-xl px-4 py-3 focus-within:border-[#10B981] focus-within:ring-1 focus-within:ring-[#10B981]/40 transition-all">
                  <Lock size={16} className="text-[#8B96A1] shrink-0" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="flex-1 w-full bg-transparent text-[14px] text-white placeholder:text-[#4B5563] outline-none font-medium"
                    suppressHydrationWarning
                  />
                  <button type="button" onClick={() => setShowPassword(s => !s)} className="text-[#8B96A1] hover:text-[#34D399] transition-colors">
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3.5 mt-6 rounded-xl font-bold uppercase tracking-wider text-[13px] transition-all relative overflow-hidden"
                style={{ 
                  background: loading ? '#050505' : '#fff', 
                  color: loading ? '#10B981' : '#000',
                  border: loading ? '1px solid #10B981' : 'none',
                  boxShadow: loading ? '0 0 30px rgba(16,185,129,0.2) inset' : '0 0 22px rgba(16,185,129,0.45), 0 0 0 1px rgba(16,185,129,0.45)' 
                }}>
                {loading ? (
                  <span className="font-mono tracking-[0.15em] flex items-center gap-2">
                     <Loader2 size={16} className="animate-spin text-[#10B981]" />
                     AUTHENTICATING...
                  </span>
                ) : (
                  <>Sign In <ArrowRight size={15} /></>
                )}
              </button>
            </form>
            
            <p className="text-center text-[12px] text-[#8B96A1] mt-6 select-none">
              New here?{' '}
              <Link href="/register" className="font-bold text-white hover:text-[#34D399] transition-colors" style={{ fontFamily: 'monospace', letterSpacing: '0.03em' }}>
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
