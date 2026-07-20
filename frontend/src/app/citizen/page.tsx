"use client";

import { useState, useEffect } from "react";
import {
  ShieldAlert, Send, ShieldCheck, AlertTriangle, AlertCircle,
  Search, Mic, Image as ImageIcon, PhoneCall, PhoneOff,
  Flag, FileText, Share2, CheckCircle2, EyeOff,
  Fingerprint, Database, Users, Activity, Banknote, Crosshair,
  MapPin, ThumbsUp, ThumbsDown, TrendingUp
} from "lucide-react";
import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";

interface PhoneRep {
  status: "DATA_FOUND" | "NO_DATA";
  reportCount?: number;
  aggregatedRiskScore?: number;
  dominantSeverity?: string;
  dominantFraudType?: string;
  lastReportedAt?: string;
}

export default function CitizenShield() {
  const [input, setInput] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [reportId, setReportId] = useState<string | null>(null);
  const [threatReportId, setThreatReportId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [phoneRep, setPhoneRep] = useState<PhoneRep | null>(null);
  const [relatedReports, setRelatedReports] = useState<any[]>([]);
  const [feedbackGiven, setFeedbackGiven] = useState<"ACCURATE" | "FALSE_POSITIVE" | "FALSE_NEGATIVE" | null>(null);
  const [isSendingFeedback, setIsSendingFeedback] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (!userStr) {
      window.location.href = "/login";
    }
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "audio" | "image") => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingMedia(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);
      if (phone.trim()) formData.append("phoneNumber", phone.trim());

      const token = localStorage.getItem("token");
      const res = await fetch("/api/parse-media", {
        method: "POST",
        body: formData,
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();
      if (res.ok) {
        const extractedText = data.text || "";
        const extractedPhone = data.sender_number || "";

        if (extractedText) setInput(extractedText);
        if (extractedPhone) {
          // Keep only digits for the phone input, max 10 digits
          const cleanedPhone = extractedPhone.replace(/\D/g, '').slice(-10);
          if (cleanedPhone) setPhone(cleanedPhone);
        }
        
        // Reset analysis states since we only parsed media, not analyzed/submitted
        setResult(null);
        setReportId(null);
        setThreatReportId(null);
        setFeedbackGiven(null);
        setPhoneRep(null);
        setRelatedReports([]);
        setIsSubmitted(false);
      } else {
        alert(data.detail || data.error || "Failed to process media");
      }
    } catch (err: any) {
      alert("Error uploading file: " + err.message);
    } finally {
      setIsUploadingMedia(false);
      e.target.value = ''; // Reset input
    }
  };

  const handleAnalyze = async () => {
    if (!input.trim() && !phone.trim()) return;
    if (phone && phone.length !== 10) {
      alert("Phone number must be exactly 10 digits");
      return;
    }

    setIsAnalyzing(true);
    setResult(null);
    setReportId(null);
    setThreatReportId(null);
    setPhoneRep(null);
    setFeedbackGiven(null);
    setIsSubmitted(false);
    setIsSubmitting(false);

    try {
      const res = await fetch("/api/analyze-fraud", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: input,
          phoneNumber: phone,
          city: city || undefined,
          state: state || undefined,
          pincode: pincode || undefined,
        }),
      });
      const data = await res.json();

      if (res.status === 503 && data.degraded) {
        setResult({
          riskLevel: "unknown",
          verdict: "Analysis Unavailable",
          severity: "NONE",
          degraded: true,
          reasoning: data.message,
          tags: [],
          timeline: [],
          escalate: false,
        });
      } else if (!res.ok) {
        setResult({
          riskLevel: "error",
          verdict: "Error",
          reasoning: data.details || data.error || "Failed to analyze threat",
        });
      } else {
        setResult(data);
        if (data.reportId) setReportId(data.reportId);
        if (data.threatReportId) setThreatReportId(data.threatReportId);

        // Fetch phone reputation after analysis
        if (phone.trim()) {
          fetch(`/api/intel/phone/${encodeURIComponent(phone.trim())}`)
            .then((r) => r.json())
            .then((rep) => setPhoneRep(rep))
            .catch(() => { });
            
          fetch(`/api/intel/phone/${encodeURIComponent(phone.trim())}/reports`)
            .then((r) => r.json())
            .then((res) => {
              if (res.reports) setRelatedReports(res.reports);
            })
            .catch(() => { });
        }
      }
    } catch (error: any) {
      setResult({
        riskLevel: "error",
        verdict: "Connection Error",
        reasoning: error.message || "Failed to connect to the analysis engine.",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmitIncident = async () => {
    if (!result || isSubmitted || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/intel/submit", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
          text: input,
          phoneNumber: phone,
          city: city || undefined,
          state: state || undefined,
          pincode: pincode || undefined,
          isAnonymous: isAnonymous,
          analysisResult: result,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsSubmitted(true);
        if (data.reportId || data.threatReportId || data.legacyReportId) {
          setReportId(data.reportId || data.threatReportId || data.legacyReportId);
          setThreatReportId(data.threatReportId);
        }
      } else {
        console.error("Submit failed:", res.status, data);
        alert("Failed to submit: " + (data.detail || data.error || JSON.stringify(data) || "Unknown error"));
      }
    } catch (err: any) {
      alert("Error submitting incident: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportPDF = async () => {
    if (!reportId) return;
    setIsExporting(true);
    try {
      const res = await fetch(`/api/intel/export/incident/${reportId}`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fraudshield-ai-incident-${reportId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF export error:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleFeedback = async (feedback: "ACCURATE" | "FALSE_POSITIVE" | "FALSE_NEGATIVE") => {
    if (!threatReportId || feedbackGiven || isSendingFeedback) return;
    setIsSendingFeedback(true);
    try {
      await fetch("/api/intel/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId: threatReportId, feedback }),
      });
      setFeedbackGiven(feedback);
    } catch {
      // silent
    } finally {
      setIsSendingFeedback(false);
    }
  };

  const generateVCF = (phoneNumber: string, threatName: string) => {
    return `BEGIN:VCARD
VERSION:3.0
FN:[SCAM] - ${threatName}
N:;[SCAM] - ${threatName};;;
TEL:${phoneNumber}
END:VCARD`;
  };

  const handleDownloadVCF = () => {
    const vcfString = generateVCF(phone || "Unknown Number", result?.fraudType || "Threat");
    const blob = new Blob([vcfString], { type: "text/vcard" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "scam-blocklist.vcf";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    if (!result) return;
    const text = `WARNING: I just ran a threat analysis on ${phone || "this number"} via FraudShield AI and it was flagged as ${result.riskLevel?.toUpperCase()} risk for ${result.fraudType || "fraud"}. Please do not answer calls or messages from this number!`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Fraud Warning - Citizen Shield",
          text: text,
        });
      } catch (err) {
        // user cancelled or failed
      }
    } else {
      alert("Sharing is not natively supported on this browser. Copy this message:\n\n" + text);
    }
  };

  const displayId = reportId
    ? `RS-${reportId.slice(-8).toUpperCase()}`
    : `RS-${Math.floor(10000 + Math.random() * 90000)}`;

  const risk = result?.riskLevel || result?.severity?.toLowerCase();

  const colorClass =
    risk === "critical" ? "text-critical" :
      risk === "high" ? "text-warning" :
        risk === "low" ? "text-success" : "text-slate-400";

  const borderColorClass =
    risk === "critical" ? "border-critical" :
      risk === "high" ? "border-warning" :
        risk === "low" ? "border-success" : "border-slate-400";

  const bgClass =
    risk === "critical" ? "bg-critical" :
      risk === "high" ? "bg-warning" :
        risk === "low" ? "bg-success" : "bg-slate-400";

  const MainIcon =
    risk === "critical" ? AlertTriangle :
      risk === "high" ? AlertCircle :
        risk === "low" ? ShieldCheck : ShieldAlert;

  return (
    <div className="min-h-full flex flex-col items-center p-8 bg-[#050505] relative overflow-x-hidden overflow-y-auto font-sans">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[#34d399]/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-6xl w-full z-10 flex flex-col gap-8 mt-6 pb-20">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-[#0a0a0a] border border-[#34d399]/20 rounded-2xl flex items-center justify-center">
            <ShieldAlert size={32} className="text-[#34d399]" />
          </div>
          <div>
            <h1 className="text-5xl font-black mb-2 tracking-tight text-white">Citizen Fraud Shield</h1>
            <p className="text-sm text-slate-400 font-medium tracking-wide">National Cyber Crime Intelligence Platform</p>
          </div>
        </motion.div>

        {/* Input Panel */}
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="bg-[#0a0a0a] border border-white/5 p-8 rounded-[24px] flex flex-col gap-6 max-w-4xl w-full mx-auto">
          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mb-2 block font-mono">Target Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="9876543210"
                className="w-full bg-[#111111] border border-white/5 rounded-xl p-3.5 outline-none focus:border-[#34d399]/50 text-white transition-colors font-mono text-sm"
                suppressHydrationWarning
              />
            </div>
            <div className="flex items-end gap-3">
              <label className={clsx("flex-1 cursor-pointer bg-transparent hover:bg-white/5 border border-white/5 rounded-xl p-3.5 text-zinc-300 flex items-center justify-center gap-2 transition-colors font-medium text-sm", isUploadingMedia && "opacity-50 cursor-wait")}>
                <input type="file" accept="audio/*" className="hidden" disabled={isUploadingMedia} onChange={(e) => handleFileUpload(e, "audio")} />
                <Mic size={16} className="text-[#34d399]" /> {isUploadingMedia ? "Processing..." : "Upload Audio"}
              </label>
              <label className={clsx("flex-1 cursor-pointer bg-transparent hover:bg-white/5 border border-white/5 rounded-xl p-3.5 text-zinc-300 flex items-center justify-center gap-2 transition-colors font-medium text-sm", isUploadingMedia && "opacity-50 cursor-wait")}>
                <input type="file" accept="image/*" className="hidden" disabled={isUploadingMedia} onChange={(e) => handleFileUpload(e, "image")} />
                <ImageIcon size={16} className="text-[#34d399]" /> {isUploadingMedia ? "Processing..." : "Screenshot"}
              </label>
            </div>
          </div>

          {/* Location fields */}
          <div className="grid grid-cols-3 gap-5">
            <div>
              <label className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mb-2 block font-mono flex items-center gap-1.5">
                <MapPin size={10} className="text-[#34d399]" /> City <span className="lowercase normal-case tracking-normal text-zinc-700 font-normal">(Optional — populates map)</span>
              </label>
              <input
                type="text"
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="e.g. Mumbai, Delhi, Bangalore"
                className="w-full bg-[#111111] border border-white/5 rounded-xl p-3.5 outline-none focus:border-[#34d399]/50 text-white transition-colors placeholder:text-zinc-700 text-sm"
                suppressHydrationWarning
              />
            </div>
            
            <div>
              <label className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mb-2 block font-mono">State <span className="lowercase normal-case tracking-normal text-critical font-bold">*</span></label>
              <select
                value={state}
                onChange={e => setState(e.target.value)}
                className="w-full bg-[#111111] border border-white/5 rounded-xl p-3.5 outline-none focus:border-[#34d399]/50 text-white transition-colors text-sm appearance-none"
                style={{ color: state ? 'white' : '#52525b' }}
                suppressHydrationWarning
              >
                <option value="" disabled>Select a state/UT</option>
                <option value="Andaman and Nicobar Islands">Andaman and Nicobar Islands</option>
                <option value="Andhra Pradesh">Andhra Pradesh</option>
                <option value="Arunachal Pradesh">Arunachal Pradesh</option>
                <option value="Assam">Assam</option>
                <option value="Bihar">Bihar</option>
                <option value="Chandigarh">Chandigarh</option>
                <option value="Chhattisgarh">Chhattisgarh</option>
                <option value="Dadra and Nagar Haveli and Daman and Diu">Dadra and Nagar Haveli and Daman and Diu</option>
                <option value="Delhi">Delhi</option>
                <option value="Goa">Goa</option>
                <option value="Gujarat">Gujarat</option>
                <option value="Haryana">Haryana</option>
                <option value="Himachal Pradesh">Himachal Pradesh</option>
                <option value="Jammu and Kashmir">Jammu and Kashmir</option>
                <option value="Jharkhand">Jharkhand</option>
                <option value="Karnataka">Karnataka</option>
                <option value="Kerala">Kerala</option>
                <option value="Ladakh">Ladakh</option>
                <option value="Lakshadweep">Lakshadweep</option>
                <option value="Madhya Pradesh">Madhya Pradesh</option>
                <option value="Maharashtra">Maharashtra</option>
                <option value="Manipur">Manipur</option>
                <option value="Meghalaya">Meghalaya</option>
                <option value="Mizoram">Mizoram</option>
                <option value="Nagaland">Nagaland</option>
                <option value="Odisha">Odisha</option>
                <option value="Puducherry">Puducherry</option>
                <option value="Punjab">Punjab</option>
                <option value="Rajasthan">Rajasthan</option>
                <option value="Sikkim">Sikkim</option>
                <option value="Tamil Nadu">Tamil Nadu</option>
                <option value="Telangana">Telangana</option>
                <option value="Tripura">Tripura</option>
                <option value="Uttar Pradesh">Uttar Pradesh</option>
                <option value="Uttarakhand">Uttarakhand</option>
                <option value="West Bengal">West Bengal</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mb-2 block font-mono">Pincode <span className="lowercase normal-case tracking-normal text-zinc-700 font-normal">(Optional)</span></label>
              <input
                type="text"
                value={pincode}
                onChange={e => setPincode(e.target.value)}
                placeholder="e.g. 400001"
                maxLength={6}
                className="w-full bg-[#111111] border border-white/5 rounded-xl p-3.5 outline-none focus:border-[#34d399]/50 text-white transition-colors placeholder:text-zinc-700 text-sm"
                suppressHydrationWarning
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mb-2 block font-mono">Intercepted Payload <span className="lowercase normal-case tracking-normal text-zinc-700 font-normal">(Transcript/Message)</span></label>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Paste suspicious SMS, WhatsApp message, or call transcript here..."
              className="w-full h-28 bg-[#111111] border border-white/5 rounded-xl p-4 resize-none outline-none focus:border-[#34d399]/50 text-white transition-colors font-mono text-sm"
              suppressHydrationWarning
            />
          </div>

          <div className="flex justify-end items-center mt-4">
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing || (!input.trim() && !phone.trim()) || !state}
              className="relative group overflow-hidden bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.15)] hover:shadow-[0_0_25px_rgba(16,185,129,0.35)] px-8 py-3.5 rounded-xl font-bold flex items-center gap-2 transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-40 disabled:saturate-0 disabled:hover:translate-y-0 disabled:hover:shadow-none disabled:cursor-not-allowed text-sm border border-emerald-400/30"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-[150%] group-hover:translate-x-[150%] transition-transform duration-700 ease-in-out" />
              <span className="relative z-10 flex items-center gap-2">
                {isAnalyzing ? "Executing Analysis..." : "Assess Risk Vectors"}
                {!isAnalyzing && <Send size={16} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform duration-300" />}
              </span>
            </button>
          </div>
        </motion.div>

        {isAnalyzing && (
          <div className="flex flex-col items-center justify-center py-16 gap-6">
            <div className="relative flex items-center justify-center">
              <div className="w-16 h-16 border-4 border-[#34d399]/20 border-t-[#34d399] rounded-full animate-spin absolute" />
              <ShieldAlert size={24} className="text-[#34d399] animate-pulse" />
            </div>
            <p className="text-[#34d399] font-mono text-sm animate-pulse tracking-widest uppercase">QUERYING INTELLIGENCE DATABASES...</p>
          </div>
        )}

        {result && !isAnalyzing && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className={clsx(
              "rounded-2xl p-6 border shadow-2xl glass-panel w-full",
              risk === "critical" ? "border-critical/50 shadow-[0_0_40px_rgba(255,77,109,0.15)] bg-critical/5" :
                risk === "high" ? "border-warning/50 shadow-[0_0_40px_rgba(255,176,32,0.1)] bg-warning/5" :
                  risk === "low" ? "border-success/50 bg-success/5" : "border-slate-700"
            )}
          >
            {/* THREAT HEADER */}
            <div className="flex items-center justify-between border-b border-white/5 pb-6 mb-6">
              <div className="flex items-center gap-5">
                <div className={clsx("p-4 rounded-xl", bgClass, "bg-opacity-20", borderColorClass, "border")}>
                  <MainIcon size={36} className={colorClass} />
                </div>
                <div>
                  <div className="text-xs font-mono tracking-widest text-zinc-500 mb-1 font-bold">THREAT ID: {displayId}</div>
                  <h2 className={clsx("text-3xl font-black tracking-tight mb-2 uppercase", colorClass)}>
                    {result.fraud_type || result.fraudType || result.verdict?.split(" — ")[1] || "Threat Detected"}
                  </h2>
                  <div className="flex items-center gap-3 text-xs font-mono">
                    <span className={clsx("px-2 py-1 rounded bg-black/60 border font-bold", borderColorClass, colorClass)}>
                      SEVERITY: {result.severity?.toUpperCase() || "UNKNOWN"}
                    </span>
                    <span className="px-2 py-1 rounded bg-black/60 border border-primary/30 text-primary font-bold">
                      CONFIDENCE: {Math.round((result.confidence || result.confidenceScore || 0.95) * 100)}%
                    </span>
                    <span className={clsx("px-2 py-1 rounded bg-black/60 border font-bold", borderColorClass, colorClass)}>
                      RISK SCORE: {result.riskScore !== undefined ? Math.round(result.riskScore * 100) : (result.severity?.toUpperCase() === 'CRITICAL' ? 95 : result.severity?.toUpperCase() === 'HIGH' ? 80 : result.severity?.toUpperCase() === 'MEDIUM' ? 60 : result.severity?.toUpperCase() === 'LOW' ? 30 : 0)}/100
                    </span>
                  </div>
                </div>
              </div>

            </div>

            {/* DASHBOARD GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* LEFT COLUMN */}
              <div className="flex flex-col gap-6">
                {/* Phone Intelligence */}
                <div className="bg-zinc-900/50 backdrop-blur-md border border-white/5 rounded-xl p-5 relative overflow-hidden hover:border-primary/30 transition-colors shadow-lg">
                  <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary to-transparent" />
                  <h4 className="text-xs font-bold text-zinc-400 mb-4 uppercase tracking-widest flex items-center gap-2 font-mono">
                    <Database size={14} className="text-primary" /> Phone Intelligence
                  </h4>
                  <div className="text-xl font-black text-white tracking-widest mb-4">{phone || "+91 99999 00000"}</div>

                  {phoneRep === null ? (
                    <div className="flex flex-col items-center justify-center py-4 bg-zinc-900/50 backdrop-blur-md rounded border border-white/5">
                      <span className="text-zinc-500 text-sm font-mono">No prior intelligence.</span>
                      <span className="text-[10px] text-zinc-600 uppercase tracking-widest mt-1">Insufficient data</span>
                    </div>
                  ) : phoneRep.status === "NO_DATA" ? (
                    <div className="flex flex-col items-center justify-center py-4 bg-zinc-900/50 backdrop-blur-md rounded border border-white/5">
                      <span className="text-zinc-500 text-sm font-mono text-center">No prior reports for this number.</span>
                      <span className="text-[10px] text-zinc-600 uppercase tracking-widest mt-1">First-time report</span>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-zinc-400">Reports filed</span>
                        <span className="text-white font-bold">{phoneRep.reportCount}</span>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs font-mono mb-1">
                          <span className="text-zinc-400">Community risk</span>
                          <span className="text-critical font-bold">{phoneRep.aggregatedRiskScore}/100</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-1.5">
                          <div
                            className="h-full rounded-full bg-critical transition-all"
                            style={{ width: `${phoneRep.aggregatedRiskScore ?? 0}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-zinc-400">Fraud type</span>
                        <span className="text-warning font-bold text-right max-w-[120px] truncate">{phoneRep.dominantFraudType ?? "—"}</span>
                      </div>
                      {phoneRep.lastReportedAt && (
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-zinc-400">Last reported</span>
                          <span className="text-zinc-300">{new Date(phoneRep.lastReportedAt).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Financial Impact */}
                <div className="bg-zinc-900/50 backdrop-blur-md border border-white/5 rounded-xl p-5 shadow-lg">
                  <h4 className="text-xs font-bold text-zinc-400 mb-4 uppercase tracking-widest flex items-center gap-2 font-mono">
                    <Banknote size={14} className="text-primary" /> Financial Exposure
                  </h4>
                  {result.financialExposure ? (
                    <div className="flex items-center justify-center p-6 bg-zinc-900/50 backdrop-blur-md rounded border border-white/5">
                      <span className="text-3xl font-black text-critical font-mono tracking-widest">
                        ₹{result.financialExposure.toLocaleString('en-IN')}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center p-6 bg-zinc-900/50 backdrop-blur-md rounded border border-white/5">
                      <span className="text-zinc-500 font-mono text-sm tracking-widest uppercase text-center">Financial impact unknown.</span>
                    </div>
                  )}
                </div>

                {/* AI Explainability */}
                <div className="bg-zinc-900/50 backdrop-blur-md border border-white/5 rounded-xl p-5 shadow-lg">
                  <h4 className="text-xs font-bold text-zinc-400 mb-4 uppercase tracking-widest flex items-center gap-2 font-mono">
                    <Fingerprint size={14} className="text-primary" /> AI Reasoning
                  </h4>
                  {result.reasoning ? (
                    <p className="text-xs text-zinc-300 leading-relaxed">{result.reasoning}</p>
                  ) : (
                    <div className="flex items-center justify-center p-6 bg-zinc-900/50 backdrop-blur-md rounded border border-white/5">
                      <span className="text-zinc-500 font-mono text-sm tracking-widest uppercase text-center">No reasoning available.</span>
                    </div>
                  )}
                </div>

                {/* Feedback */}
                {threatReportId && (
                  <div className="bg-zinc-900/50 backdrop-blur-md border border-white/5 rounded-xl p-5 shadow-lg">
                    <h4 className="text-xs font-bold text-zinc-400 mb-4 uppercase tracking-widest flex items-center gap-2 font-mono">
                      <TrendingUp size={14} className="text-primary" /> Was This Accurate?
                    </h4>
                    {feedbackGiven ? (
                      <div className="flex items-center justify-center py-3 text-success text-sm font-mono gap-2">
                        <CheckCircle2 size={16} /> Feedback recorded — thank you
                      </div>
                    ) : (
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleFeedback("ACCURATE")}
                          disabled={isSendingFeedback}
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-success/10 hover:bg-success/20 border border-success/30 rounded-lg text-success text-xs font-bold transition-all disabled:opacity-40"
                        >
                          <ThumbsUp size={14} /> Accurate
                        </button>
                        <button
                          onClick={() => handleFeedback("FALSE_POSITIVE")}
                          disabled={isSendingFeedback}
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-critical/10 hover:bg-critical/20 border border-critical/30 rounded-lg text-critical text-xs font-bold transition-all disabled:opacity-40"
                        >
                          <ThumbsDown size={14} /> Wrong
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* MIDDLE COLUMN */}
              <div className="flex flex-col gap-6">
                {/* Intelligence Tags */}
                <div className="bg-zinc-900/50 backdrop-blur-md border border-white/5 rounded-xl p-5 shadow-lg">
                  <h4 className="text-xs font-bold text-zinc-400 mb-4 uppercase tracking-widest flex items-center gap-2 font-mono">
                    <Crosshair size={14} className="text-primary" /> Intelligence Tags
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {(result.indicators || result.tags || []).length > 0 ? (
                      (result.indicators || result.tags || []).map((ind: string, i: number) => (
                        <div key={i} className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-default">
                          <CheckCircle2 size={14} className={colorClass} />
                          <span className="text-xs font-medium text-slate-200">{ind}</span>
                        </div>
                      ))
                    ) : (
                      <>
                        <div className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-lg"><CheckCircle2 size={14} className="text-warning" /> <span className="text-xs font-medium text-slate-200">Unsolicited Contact</span></div>
                        <div className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-lg"><CheckCircle2 size={14} className="text-critical" /> <span className="text-xs font-medium text-slate-200">Authority Impersonation</span></div>
                      </>
                    )}
                  </div>
                </div>

                {/* Response Action Center */}
                <div className="bg-zinc-900/50 backdrop-blur-md border border-white/5 rounded-xl p-5 shadow-lg flex-1">
                  <h4 className="text-xs font-bold text-zinc-400 mb-4 uppercase tracking-widest flex items-center gap-2 font-mono">
                    <ShieldCheck size={14} className="text-primary" /> Response Action Center
                  </h4>
                  <div className="flex flex-col gap-3">
                    {[
                      { icon: PhoneCall, color: "primary", label: "Call Official Bank Number", action: () => { window.location.href = "tel:14440"; } },
                      ...(result?.verdict === "HIGH_RISK_SCAM" ? [{ icon: PhoneOff, color: "critical", label: "Add to Blocklist", action: handleDownloadVCF, isVCF: true }] : []),
                      { icon: Flag, color: "warning", label: "Report to 1930 Cyber Cell", action: () => { window.location.href = "tel:1930"; } },
                    ].map(({ icon: Icon, color, label, action, isVCF }) => (
                      <div key={label} className="flex flex-col gap-1">
                        <button onClick={action} className={`flex items-center gap-4 p-3 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-${color}/50 rounded-xl text-sm text-left transition-all group overflow-hidden relative`}>
                          <div className={`absolute inset-0 bg-gradient-to-r from-${color}/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity`} />
                          <div className={`p-2.5 bg-black/50 text-${color} border border-${color}/20 rounded-lg group-hover:bg-${color} group-hover:text-black transition-colors relative z-10`}><Icon size={18} /></div>
                          <span className="text-zinc-200 font-bold tracking-wide relative z-10">{label}</span>
                        </button>
                        {isVCF && (
                          <div className="text-[10px] text-zinc-500 font-mono mt-0.5 mb-1 px-1">
                            Download and open this file on your phone to add the scammer to your native blocklist.
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Anonymous Toggle */}
                    <div className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-xl mt-2 mb-2">
                      <div className="flex items-center gap-3">
                        <div className={clsx("w-8 h-8 rounded-full flex items-center justify-center transition-colors", isAnonymous ? "bg-[#34d399]/20 text-[#34d399]" : "bg-black/50 text-zinc-500")}>
                          <EyeOff size={16} />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-white mb-0.5">Report Anonymously</div>
                          <div className="text-[9px] text-zinc-500 font-mono leading-tight">Your name and phone won't be recorded<br/>but location will be.</div>
                        </div>
                      </div>
                      <button
                        onClick={() => setIsAnonymous(!isAnonymous)}
                        disabled={isSubmitted || isSubmitting}
                        className={clsx(
                          "relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
                          isAnonymous ? "bg-[#34d399]" : "bg-zinc-700"
                        )}
                      >
                        <span className={clsx("inline-block h-4 w-4 transform rounded-full bg-white transition-transform", isAnonymous ? "translate-x-6" : "translate-x-1")} />
                      </button>
                    </div>

                    <button
                      onClick={handleSubmitIncident}
                      disabled={isSubmitted || isSubmitting}
                      className="flex items-center gap-4 p-3 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-success/50 rounded-xl text-sm text-left transition-all group overflow-hidden relative disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-success/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="p-2.5 bg-black/50 text-success border border-success/20 rounded-lg group-hover:bg-success group-hover:text-black transition-colors relative z-10">
                        {isSubmitted ? <CheckCircle2 size={18} /> : <Database size={18} />}
                      </div>
                      <span className="text-zinc-200 font-bold tracking-wide relative z-10">
                        {isSubmitting ? "Submitting..." : isSubmitted ? "Submitted to Database" : "Submit Incident to National Database"}
                      </span>
                    </button>

                    <button
                      onClick={handleExportPDF}
                      disabled={!reportId || isExporting}
                      className="flex items-center gap-4 p-3 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-primary/50 rounded-xl text-sm text-left transition-all group overflow-hidden relative disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="p-2.5 bg-black/50 text-primary border border-primary/20 rounded-lg group-hover:bg-primary group-hover:text-black transition-colors relative z-10">
                        <FileText size={18} />
                      </div>
                      <span className="text-zinc-200 font-bold tracking-wide relative z-10">
                        {isExporting ? "Generating PDF..." : reportId ? "Download Incident Report" : "Generate Incident Report (submit first)"}
                      </span>
                    </button>

                    <button onClick={handleShare} className="flex items-center gap-4 p-3 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-success/50 rounded-xl text-sm text-left transition-all group overflow-hidden relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-success/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="p-2.5 bg-black/50 text-success border border-success/20 rounded-lg group-hover:bg-success group-hover:text-black transition-colors relative z-10"><Share2 size={18} /></div>
                      <span className="text-zinc-200 font-bold tracking-wide relative z-10">Share Warning with Family</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN */}
              <div className="flex flex-col gap-6">
                {/* Incident Timeline */}
                <div className="bg-black/40 border border-white/5 rounded-xl p-5 shadow-lg">
                  <h4 className="text-xs font-bold text-slate-400 mb-6 uppercase tracking-widest flex items-center gap-2 font-mono">
                    <Activity size={14} className="text-primary" /> Incident Reconstruction
                  </h4>
                  <div className="flex flex-col gap-5 relative before:absolute before:inset-0 before:ml-[5px] before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-primary/30 before:to-transparent">
                    {result.timeline && result.timeline.length > 0 ? (
                      result.timeline.map((t: { step: string; detail: string }, i: number) => (
                        <motion.div
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.15 }}
                          key={i}
                          className="relative flex items-start gap-4"
                        >
                          <div className="flex items-center justify-center w-3 h-3 rounded-full border mt-1.5 shrink-0 relative z-10 bg-primary border-primary shadow-[0_0_10px_#00E5FF]" />
                          <div className="p-3 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 transition-colors w-full">
                            <div className="text-[10px] font-mono mb-1 tracking-widest text-primary">STEP {i + 1}</div>
                            <div className="text-[11px] font-bold text-slate-300 mb-0.5">{t.step}</div>
                            <div className="text-xs leading-relaxed text-slate-400">{t.detail}</div>
                          </div>
                        </motion.div>
                      ))
                    ) : result.indicators && result.indicators.length > 0 ? (
                      result.indicators.map((ind: string, i: number) => (
                        <motion.div
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.15 }}
                          key={i}
                          className="relative flex items-start gap-4"
                        >
                          <div className="flex items-center justify-center w-3 h-3 rounded-full border mt-1.5 shrink-0 relative z-10 bg-primary border-primary shadow-[0_0_10px_#00E5FF]" />
                          <div className="p-3 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 transition-colors w-full">
                            <div className="text-[10px] font-mono mb-1 tracking-widest text-primary">INDICATOR {i + 1}</div>
                            <div className="text-xs leading-relaxed text-white font-medium">{ind}</div>
                          </div>
                        </motion.div>
                      ))
                    ) : (
                      <div className="flex items-center justify-center p-6 bg-black/40 rounded border border-white/5 z-10 relative">
                        <span className="text-slate-500 font-mono text-sm tracking-widest uppercase text-center">No transcript events available.</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Related Incidents */}
                <div className="bg-black/40 border border-white/5 rounded-xl p-5 shadow-lg flex-1">
                  <h4 className="text-xs font-bold text-slate-400 mb-4 uppercase tracking-widest flex items-center gap-2 font-mono">
                    <Users size={14} className="text-primary" /> Related Incidents
                  </h4>
                  <div className="flex flex-col gap-3 h-full">
                    {relatedReports && relatedReports.length > 0 ? (
                      relatedReports.map((report: any, i: number) => (
                        <div key={i} className="p-3 bg-white/5 border border-white/5 rounded-xl text-xs flex flex-col gap-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white uppercase">{report.fraudType || "Unknown"}</span>
                            <span className={clsx("px-1.5 py-0.5 rounded text-[9px] font-bold tracking-widest font-mono uppercase", 
                              report.severity === "CRITICAL" ? "bg-red-500/20 text-red-400" : 
                              report.severity === "HIGH" ? "bg-orange-500/20 text-orange-400" : 
                              "bg-zinc-500/20 text-zinc-400"
                            )}>
                              {report.severity}
                            </span>
                          </div>
                          <div className="text-[10px] text-zinc-600 font-mono mt-1">ID: {report.id.substring(0, 8)}... | {new Date(report.createdAt).toLocaleDateString()}</div>
                        </div>
                      ))
                    ) : (
                      <div className="flex items-center justify-center p-6 bg-black/40 rounded border border-white/5 h-full">
                        <span className="text-slate-500 font-mono text-sm tracking-widest uppercase text-center">No related incidents found.</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
