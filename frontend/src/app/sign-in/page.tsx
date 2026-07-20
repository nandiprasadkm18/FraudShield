"use client";
import Link from "next/link";
import { Shield, Network, Activity, Globe, Check, Eye } from "lucide-react";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen bg-[#050505] text-white font-sans">
      
      {/* LEFT SIDE: Visual Panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-[#021f15] p-12">
        
        <div>
          {/* Logo Area */}
          <div className="flex items-center gap-4 mb-16">
            <div className="bg-white text-black p-2 rounded-xl shadow-[0_0_20px_rgba(52,211,153,0.3)]">
              <Shield size={24} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight leading-none">FraudShield</h1>
              <p className="text-[10px] text-[#34d399] tracking-widest font-mono mt-1 font-bold">AI - INDIA</p>
            </div>
          </div>
          
          {/* Main Copy */}
          <h2 className="text-5xl font-extrabold tracking-tighter mb-6 leading-tight text-white">
            The national fraud<br />command centre.
          </h2>
          <p className="text-zinc-400 text-lg mb-12 max-w-md leading-relaxed">
            Live fraud network, citizen scam-shield chatbot, and a real-time geospatial dashboard — all on one platform.
          </p>
          
          {/* Feature Grid */}
          <div className="grid grid-cols-2 gap-4 max-w-md">
            {[
              { title: "Graph Intel", subtitle: "LIVE", icon: Network },
              { title: "Scam Shield", subtitle: "ALWAYS ON", icon: Shield },
              { title: "Geo Intel", subtitle: "REAL-TIME", icon: Globe },
              { title: "AI Verdicts", subtitle: "RESPONSE", icon: Activity },
            ].map((feature, i) => (
              <div key={i} className="bg-[#050505] rounded-2xl p-6 flex flex-col items-center justify-center gap-3">
                <div className="p-3 rounded-2xl border border-[#34d399]/30 shadow-[0_0_15px_rgba(52,211,153,0.15)] bg-transparent">
                  <feature.icon className="text-[#34d399]" size={22} strokeWidth={2} />
                </div>
                <div className="text-center">
                  <div className="font-bold text-sm text-white">{feature.title}</div>
                  <div className="text-[10px] text-[#34d399] font-mono tracking-widest mt-1">{feature.subtitle}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Info */}
        <div className="flex items-center gap-2 mt-12">
          <div className="w-2 h-2 rounded-full bg-[#34d399] animate-pulse" />
          <span className="text-[10px] font-mono tracking-widest text-zinc-400 font-bold uppercase">
            Live • 24x7 Ingestion Across India
          </span>
        </div>
      </div>

      {/* RIGHT SIDE: Form Panel */}
      <div className="flex-1 flex flex-col justify-center px-12 lg:px-32">
        <div className="max-w-md w-full mx-auto">
          <div className="mb-8">
            <h3 className="text-[10px] text-[#34d399] font-mono tracking-widest uppercase font-bold mb-3">Sign In</h3>
            <h2 className="text-4xl font-bold tracking-tight mb-2 text-white">Welcome back</h2>
            <p className="text-zinc-400 text-sm">Sign in to the FraudShield command centre.</p>
          </div>

          <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold tracking-widest uppercase text-white">Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <input 
                  type="email" 
                  className="w-full bg-[#0a0a0a] border border-white/5 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-[#34d399] transition-colors"
                  placeholder="you@fraudshield.in"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold tracking-widest uppercase text-white">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input 
                  type="password" 
                  className="w-full bg-[#0a0a0a] border border-white/5 rounded-xl pl-10 pr-10 py-3 text-sm text-white focus:outline-none focus:border-[#34d399] transition-colors font-mono tracking-widest"
                  placeholder="••••••••"
                />
                <button type="button" className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-500 hover:text-white transition-colors">
                  <Eye size={16} />
                </button>
              </div>
            </div>

            <button 
              type="submit"
              className="w-full bg-white text-black font-bold py-3.5 rounded-xl hover:bg-zinc-200 transition-colors shadow-[0_0_20px_rgba(52,211,153,0.35)] mt-8 text-sm flex items-center justify-center gap-2"
            >
              SIGN IN <span className="text-lg leading-none">&rarr;</span>
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-zinc-400">
            New here? <Link href="/sign-up" className="text-white font-bold hover:underline">Create an analyst account</Link>
          </p>
        </div>
      </div>
      
    </div>
  );
}
