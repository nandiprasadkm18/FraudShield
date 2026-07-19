"use client";

import { useState } from "react";
import { Shield, Network, Globe, Activity, Eye, EyeOff } from "lucide-react";
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
    <div className="min-h-screen bg-[#050505] flex text-zinc-100 flex-col-reverse lg:flex-row">
      
      {/* Left Register Panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-24 relative overflow-y-auto">
        <div className="w-full max-w-md relative z-10 py-10">
          <div className="mb-10">
            <h3 className="text-[#34d399] text-xs font-mono uppercase tracking-widest mb-3">Sign Up</h3>
            <h2 className="text-3xl font-bold text-white mb-2">Create an account</h2>
            <p className="text-zinc-400 text-sm">Set up your FraudShield access in seconds.</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-5">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-lg">
                {error}
              </div>
            )}
            
            <div>
              <label className="block text-xs font-bold tracking-widest uppercase text-zinc-500 mb-2">
                Full Name
              </label>
              <div className="relative">
                <input 
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#34d399] transition-colors"
                  placeholder="e.g. Riya Sharma"
                  required
                  suppressHydrationWarning
                />
              </div>
            </div>

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
                Phone Number
              </label>
              <div className="relative">
                <input 
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#34d399] transition-colors"
                  autoComplete="off"
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
                  placeholder="Min 6 chars"
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

            <div>
              <label className="block text-xs font-bold tracking-widest uppercase text-zinc-500 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <input 
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#34d399] transition-colors pr-10"
                  placeholder="Re-type password"
                  required
                  suppressHydrationWarning
                />
                <button 
                  type="button" 
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                  suppressHydrationWarning
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-zinc-500 mt-2">
              <div className={`flex items-center gap-2 ${hasLength ? "text-[#34d399]" : ""}`}>
                <span className="font-mono">{hasLength ? "✓" : "×"}</span> 6+ characters
              </div>
              <div className={`flex items-center gap-2 ${hasLetter ? "text-[#34d399]" : ""}`}>
                <span className="font-mono">{hasLetter ? "✓" : "×"}</span> a letter
              </div>
              <div className={`flex items-center gap-2 ${hasNumber ? "text-[#34d399]" : ""}`}>
                <span className="font-mono">{hasNumber ? "✓" : "×"}</span> a number
              </div>
              <div className={`flex items-center gap-2 ${passwordsMatch ? "text-[#34d399]" : ""}`}>
                <span className="font-mono">{passwordsMatch ? "✓" : "×"}</span> passwords match
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black hover:bg-zinc-200 transition-colors rounded-xl py-3 text-sm font-bold mt-8 shadow-[0_0_20px_rgba(52,211,153,0.3)] disabled:opacity-50"
              suppressHydrationWarning
            >
              {loading ? "CREATING..." : "CREATE ACCOUNT →"}
            </button>

            <div className="text-center mt-6">
              <span className="text-zinc-500 text-xs">Already have an account? </span>
              <Link href="/login" className="text-white text-xs font-semibold hover:text-[#34d399] transition-colors">
                Sign in instead
              </Link>
            </div>
          </form>
        </div>
      </div>

      {/* Right Info Panel */}
      <div className="hidden lg:flex w-1/2 bg-[#081f14] p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-bl from-[#10b981]/10 to-transparent pointer-events-none" />
        
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

    </div>
  );
}
