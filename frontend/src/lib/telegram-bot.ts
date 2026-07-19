import { Telegraf } from "telegraf";
import { message } from "telegraf/filters";
import dotenv from "dotenv";

dotenv.config();

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!TELEGRAM_TOKEN) {
  console.warn("TELEGRAM_BOT_TOKEN is not defined in environment variables.");
}

export const bot = new Telegraf(TELEGRAM_TOKEN || "mock-token");

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatVerdict(analysis: any) {
  const icon =
    analysis.severity === "CRITICAL" ? "🔴" :
    analysis.severity === "HIGH" ? "🟠" :
    analysis.severity === "MEDIUM" ? "🟡" :
    analysis.severity === "LOW" ? "🔵" : "⚪";

  return `
${icon} <b>${analysis.severity} RISK</b>

<b>Fraud Type:</b>
${analysis.fraudType || "Unknown"}

<b>Confidence:</b>
${Math.round((analysis.confidenceScore || 0) * 100)}%

<b>Indicators:</b>
${(analysis.tags || []).map((t: string) => `• ${t}`).join("\n")}

<b>Recommended Actions:</b>
${(analysis.timeline || []).map((t: any) => `• ${t.detail}`).join("\n")}
  `.trim();
}

// ── Commands ─────────────────────────────────────────────────────────────────
bot.command("start", (ctx) => {
  ctx.reply(
    `🛡️ <b>Welcome to Citizen Shield (FraudShield AI)</b>\n\nI am your real-time scam identification assistant.\n\nYou can:\n- Paste a suspicious SMS/WhatsApp message\n- Upload a screenshot of a conversation\n- Forward a Voice Note from a scammer\n\nUse /help for more commands.`,
    { parse_mode: "HTML" }
  );
});

bot.command("help", (ctx) => {
  ctx.reply(
    `<b>Commands:</b>
/start - Welcome message
/help - Show this message
/status - System status

Just send me text, an image, or a voice note to analyze!`,
    { parse_mode: "HTML" }
  );
});

bot.command("status", (ctx) => {
  ctx.reply(`✅ <b>Citizen Shield Systems Operational</b>\nGroq AI Pipeline: Online\nDatabase: Connected`, { parse_mode: "HTML" });
});

// ── Message Handlers ─────────────────────────────────────────────────────────

// Voice and Audio Messages
bot.on([message("voice"), message("audio"), message("document")], async (ctx) => {
  try {
    let fileId: string | undefined;

    if ("voice" in ctx.message) {
      fileId = ctx.message.voice.file_id;
    } else if ("audio" in ctx.message) {
      fileId = ctx.message.audio.file_id;
    } else if ("document" in ctx.message) {
      const mime = ctx.message.document.mime_type || "";
      if (mime.startsWith("audio/")) {
        fileId = ctx.message.document.file_id;
      } else {
        return;
      }
    }

    if (!fileId) return;

    const msg = await ctx.reply("🎙️ Downloading and analyzing audio...");
    const fileLink = await ctx.telegram.getFileLink(fileId);
    
    // Download file locally to a buffer
    const response = await fetch(fileLink.href);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const blob = new Blob([buffer], { type: "audio/ogg" });
    const formData = new FormData();
    formData.append("file", blob, "audio.ogg");

    const res = await fetch("http://127.0.0.1:8000/api/v1/intel/media/upload", {
      method: "POST",
      body: formData,
    });
    
    if (!res.ok) {
        return ctx.telegram.editMessageText(ctx.chat.id, msg.message_id, undefined, "❌ Failed to process audio.");
    }
    
    const analysisData = await res.json();
    await ctx.telegram.editMessageText(ctx.chat.id, msg.message_id, undefined, formatVerdict(analysisData.analysisOutput), { parse_mode: "HTML" });
  } catch (err) {
    console.error("Audio processing error:", err);
    ctx.reply("❌ Failed to process audio message.");
  }
});

// Photo/Image Messages
bot.on(message("photo"), async (ctx) => {
  try {
    const msg = await ctx.reply("📸 Downloading and analyzing image...");
    
    const photo = ctx.message.photo[ctx.message.photo.length - 1];
    const fileLink = await ctx.telegram.getFileLink(photo.file_id);
    
    const response = await fetch(fileLink.href);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const blob = new Blob([buffer], { type: "image/jpeg" });
    const formData = new FormData();
    formData.append("file", blob, "image.jpg");

    const res = await fetch("http://127.0.0.1:8000/api/v1/intel/media/upload", {
      method: "POST",
      body: formData,
    });
    
    if (!res.ok) {
        return ctx.telegram.editMessageText(ctx.chat.id, msg.message_id, undefined, "❌ Failed to process image.");
    }
    
    const analysisData = await res.json();
    await ctx.telegram.editMessageText(ctx.chat.id, msg.message_id, undefined, formatVerdict(analysisData.analysisOutput), { parse_mode: "HTML" });
  } catch (err) {
    console.error("Image processing error:", err);
    ctx.reply("❌ Failed to process image.");
  }
});

// Text Messages
bot.on(message("text"), async (ctx) => {
  if (ctx.message.text.startsWith("/")) return;

  try {
    const msg = await ctx.reply("🔍 Analyzing message...");
    
    const res = await fetch("http://127.0.0.1:8000/api/v1/intel/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: ctx.message.text, phoneNumber: null })
    });
    
    if (!res.ok) {
        return ctx.telegram.editMessageText(ctx.chat.id, msg.message_id, undefined, "❌ Failed to process text.");
    }
    
    const analysisData = await res.json();
    await ctx.telegram.editMessageText(ctx.chat.id, msg.message_id, undefined, formatVerdict(analysisData.analysisOutput), { parse_mode: "HTML" });
  } catch (err) {
    console.error("Text processing error:", err);
    ctx.reply("❌ Failed to process text.");
  }
});
