"use client";
import Link from "next/link";
import { Shield, Network, Activity, Globe, Eye, X } from "lucide-react";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen bg-[#050505] text-white font-sans">
      
      {/* LEFT SIDE: Form Panel */}
      <div className="flex-1 flex flex-col justify-center px-12 lg:px-32 py-12 overflow-y-auto">
        <div className="max-w-md w-full mx-auto">
          <div className="mb-8">
            <h3 className="text-[10px] text-[#34d399] font-mono tracking-widest uppercase font-bold mb-3">Sign Up</h3>
            <h2 className="text-4xl font-bold tracking-tight mb-2">Create an account</h2>
            <p className="text-zinc-400 text-sm">Set up your FraudShield analyst access in seconds.</p>
          </div>

          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold tracking-widest uppercase text-white">Full Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <input 
                  type="text" 
                  className="w-full bg-[#0a0a0a] border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#34d399] transition-colors"
                  placeholder="e.g. Riya Sharma"
                />
              </div>
            </div>

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
                  className="w-full bg-[#0a0a0a] border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#34d399] transition-colors"
                  placeholder="you@fraudshield.in"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold tracking-widest uppercase text-white">Phone Number</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <input 
                  type="tel" 
                  className="w-full bg-[#0a0a0a] border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#34d399] transition-colors font-mono tracking-wider"
                  placeholder="+91 98765 43210"
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
                  className="w-full bg-[#0a0a0a] border border-white/5 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white focus:outline-none focus:border-[#34d399] transition-colors"
                  placeholder="Min 6 chars"
                />
                <button type="button" className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-500 hover:text-white transition-colors">
                  <Eye size={16} />
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold tracking-widest uppercase text-white">Confirm Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input 
                  type="password" 
                  className="w-full bg-[#0a0a0a] border border-white/5 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white focus:outline-none focus:border-[#34d399] transition-colors"
                  placeholder="Re-type password"
                />
                <button type="button" className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-500 hover:text-white transition-colors">
                  <Eye size={16} />
                </button>
              </div>
            </div>

            {/* Password Requirements */}
            <div className="grid grid-cols-2 gap-2 text-[10px] text-zinc-500 pt-2 font-mono">
              <div className="flex items-center gap-2"><X size={10} className="text-zinc-600" /> 6+ characters</div>
              <div className="flex items-center gap-2"><X size={10} className="text-zinc-600" /> a letter</div>
              <div className="flex items-center gap-2"><X size={10} className="text-zinc-600" /> a number</div>
              <div className="flex items-center gap-2"><X size={10} className="text-zinc-600" /> passwords match</div>
            </div>

            <button 
              type="submit"
              className="w-full bg-white text-black font-bold py-3.5 rounded-xl hover:bg-zinc-200 transition-colors shadow-[0_0_20px_rgba(52,211,153,0.35)] mt-6 text-sm flex items-center justify-center gap-2"
            >
              CREATE ACCOUNT <span className="text-lg leading-none">&rarr;</span>
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-zinc-400">
            Already have an account? <Link href="/sign-in" className="text-white font-bold hover:underline">Sign in instead</Link>
          </p>
        </div>
      </div>

      {/* RIGHT SIDE: Visual Panel */}
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
      
    </div>
  );
}
