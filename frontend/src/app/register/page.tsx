"use client";

import { useState } from "react";
import { Shield, Network, Globe, Activity, Eye, EyeOff, User, Phone, Mail, Lock, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, phone, password }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Registration failed");
      }

      // Auto login after registration
      const formData = new URLSearchParams();
      formData.append("username", email);
      formData.append("password", password);

      const loginRes = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData,
      });

      if (!loginRes.ok) throw new Error("Login after registration failed");

      const loginData = await loginRes.json();
      localStorage.setItem("token", loginData.access_token);
      
      const meRes = await fetch("/api/v1/auth/me", {
        headers: { Authorization: `Bearer ${loginData.access_token}` }
      });
      const meData = await meRes.json();
      localStorage.setItem("user", JSON.stringify(meData));

      // Redirect CITIZEN by default
      router.push("/citizen");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const hasLength = password.length >= 6;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const passwordsMatch = password && password === confirmPassword;

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
          className="hidden md:flex flex-col justify-between p-10 w-[45%] relative order-2"
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
        <div className="flex-1 bg-[#050505] p-10 order-1 flex flex-col justify-center overflow-y-auto">
          <div className="max-w-md mx-auto w-full h-full flex flex-col justify-center py-4">
            <div className="mb-6">
              <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-[#34D399] mb-2 font-mono">
                {'> NEW_IDENTITY_PROTOCOL'}
              </p>
              <h1 className="text-[32px] font-bold text-white tracking-tight leading-none">Create an account</h1>
              <p className="text-[13px] text-[#8B96A1] mt-3">Set up your FraudShield access in seconds.</p>
            </div>
            
            <form onSubmit={handleRegister} className="space-y-3.5">
              {error && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-[#10B981]/10 border border-[#10B981]/40 text-[#34D399] text-[12px] font-semibold mb-4">
                  <span>{error}</span>
                </div>
              )}
              
              <div className="space-y-1.5">
                <label className="text-[10px] text-white uppercase tracking-[0.18em] font-bold">Full name</label>
                <div className="flex items-center gap-2.5 bg-black border border-white/10 rounded-xl px-4 py-3 focus-within:border-[#10B981] focus-within:ring-1 focus-within:ring-[#10B981]/40 transition-all">
                  <User size={16} className="text-[#8B96A1] shrink-0" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="flex-1 w-full bg-transparent text-[14px] text-white placeholder:text-[#4B5563] outline-none font-medium"
                    suppressHydrationWarning
                  />
                </div>
              </div>

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
                <label className="text-[10px] text-white uppercase tracking-[0.18em] font-bold">Phone number</label>
                <div className="flex items-center gap-2.5 bg-black border border-white/10 rounded-xl px-4 py-3 focus-within:border-[#10B981] focus-within:ring-1 focus-within:ring-[#10B981]/40 transition-all">
                  <Phone size={16} className="text-[#8B96A1] shrink-0" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
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

              <div className="space-y-1.5">
                <label className="text-[10px] text-white uppercase tracking-[0.18em] font-bold">Confirm password</label>
                <div className="flex items-center gap-2.5 bg-black border border-white/10 rounded-xl px-4 py-3 focus-within:border-[#10B981] focus-within:ring-1 focus-within:ring-[#10B981]/40 transition-all">
                  <Lock size={16} className="text-[#8B96A1] shrink-0" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="flex-1 w-full bg-transparent text-[14px] text-white placeholder:text-[#4B5563] outline-none font-medium"
                    suppressHydrationWarning
                  />
                  <button type="button" onClick={() => setShowConfirmPassword(s => !s)} className="text-[#8B96A1] hover:text-[#34D399] transition-colors">
                    {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-1 pb-2">
                <div className="flex items-center gap-1 text-[10px] font-mono" style={{ color: hasLength ? '#10B981' : '#4B5563' }}>
                  <span className="font-mono">{hasLength ? "✓" : "×"}</span>
                  <span>6+ chars</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-mono" style={{ color: hasLetter ? '#10B981' : '#4B5563' }}>
                  <span className="font-mono">{hasLetter ? "✓" : "×"}</span>
                  <span>a letter</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-mono" style={{ color: hasNumber ? '#10B981' : '#4B5563' }}>
                  <span className="font-mono">{hasNumber ? "✓" : "×"}</span>
                  <span>a number</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-mono" style={{ color: passwordsMatch ? '#10B981' : '#4B5563' }}>
                  <span className="font-mono">{passwordsMatch ? "✓" : "×"}</span>
                  <span>match</span>
                </div>
              </div>

              <button type="submit" disabled={loading || !hasLength || !hasLetter || !hasNumber || !passwordsMatch}
                className="w-full flex items-center justify-center gap-2 py-3.5 mt-2 rounded-xl font-bold uppercase tracking-wider text-[13px] transition-all relative overflow-hidden disabled:opacity-50"
                style={{ 
                  background: loading ? '#050505' : '#fff', 
                  color: loading ? '#10B981' : '#000',
                  border: loading ? '1px solid #10B981' : 'none',
                  boxShadow: loading ? '0 0 30px rgba(16,185,129,0.2) inset' : '0 0 22px rgba(16,185,129,0.45), 0 0 0 1px rgba(16,185,129,0.45)' 
                }}>
                {loading ? (
                  <span className="font-mono tracking-[0.15em] flex items-center gap-2">
                     <Loader2 size={16} className="animate-spin text-[#10B981]" />
                     REGISTERING...
                  </span>
                ) : (
                  <>Create Account <ArrowRight size={15} /></>
                )}
              </button>
            </form>
            
            <p className="text-center text-[12px] text-[#8B96A1] mt-6 select-none">
              Already have an account?{' '}
              <Link href="/login" className="font-bold text-white hover:text-[#34D399] transition-colors" style={{ fontFamily: 'monospace', letterSpacing: '0.03em' }}>
                Sign in instead
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
