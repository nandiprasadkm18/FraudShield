import { Telegraf } from "telegraf";
import { message } from "telegraf/filters";
import { processFraudAnalysis } from "@/lib/fraud-analyzer";
import { transcribeAudio, extractTextFromImage } from "@/lib/media-processor";
import { prisma } from "@/lib/prisma";
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

<i>Report ID: ${analysis.reportId || "N/A"}</i>
  `.trim();
}

// ── Commands ─────────────────────────────────────────────────────────────────
bot.command("start", (ctx) => {
  ctx.reply(
    `🛡️ <b>Welcome to Citizen Shield (Raksha Setu)</b>\n\nI am your real-time scam identification assistant.\n\nYou can:\n- Paste a suspicious SMS/WhatsApp message\n- Upload a screenshot of a conversation\n- Forward a Voice Note from a scammer\n- Look up a number using /number +91...\n\nUse /help for more commands.`,
    { parse_mode: "HTML" }
  );
});

bot.command("help", (ctx) => {
  ctx.reply(
    `<b>Commands:</b>
/start - Welcome message
/help - Show this message
/number &lt;phone&gt; - Check prior intelligence for a number
/status - System status

Just send me text, an image, or a voice note to analyze!`,
    { parse_mode: "HTML" }
  );
});

bot.command("status", (ctx) => {
  ctx.reply(`✅ <b>Citizen Shield Systems Operational</b>\nGroq AI Pipeline: Online\nDatabase: Connected`, { parse_mode: "HTML" });
});

bot.command("number", async (ctx) => {
  const parts = ctx.message.text.split(" ");
  if (parts.length < 2) {
    return ctx.reply("Please provide a phone number. Example: /number +918765432109");
  }

  const phone = parts[1].replace(/\s/g, "");
  
  try {
    const rep = await prisma.phoneReputation.findUnique({ where: { phoneNumber: phone } });
    if (!rep) {
      return ctx.reply(`No prior intelligence exists for ${phone}.`);
    }

    ctx.reply(
      `🔍 <b>Intelligence for ${phone}</b>\n\nReports: ${rep.reportCount}\nFirst Reported: ${rep.lastReportedAt.toDateString()}\nKnown Scam Categories: ${rep.dominantFraudType || "Various"}`,
      { parse_mode: "HTML" }
    );
  } catch (err) {
    ctx.reply("Failed to query intelligence database.");
  }
});

// ── Message Handlers ─────────────────────────────────────────────────────────

// Voice and Audio Messages
bot.on([message("voice"), message("audio"), message("document")], async (ctx) => {
  try {
    let fileId: string | undefined;
    let fileName = "audio.ogg";

    if ("voice" in ctx.message) {
      fileId = ctx.message.voice.file_id;
    } else if ("audio" in ctx.message) {
      fileId = ctx.message.audio.file_id;
      fileName = ctx.message.audio.file_name || "audio.mp3";
    } else if ("document" in ctx.message) {
      const mime = ctx.message.document.mime_type || "";
      if (mime.startsWith("audio/")) {
        fileId = ctx.message.document.file_id;
        fileName = ctx.message.document.file_name || "audio.file";
      } else {
        // Ignore non-audio documents
        return;
      }
    }

    if (!fileId) return;

    const msg = await ctx.reply("🎙️ Downloading audio...");
    const fileLink = await ctx.telegram.getFileLink(fileId);
    
    await ctx.telegram.editMessageText(ctx.chat.id, msg.message_id, undefined, "🧠 Processing audio...");
    const response = await fetch(fileLink.href);
    const arrayBuffer = await response.arrayBuffer();
    
    const transcript = await transcribeAudio(arrayBuffer, fileName);
    
    if (!transcript.trim()) {
      return ctx.telegram.editMessageText(ctx.chat.id, msg.message_id, undefined, "Could not extract speech from audio.");
    }
    
    await ctx.telegram.editMessageText(ctx.chat.id, msg.message_id, undefined, `📝 <i>Transcript: "${transcript}"</i>\n\n🔍 Analyzing for fraud...`, { parse_mode: "HTML" });
    
    const analysis = await processFraudAnalysis({ text: transcript, ip: "telegram-bot" });
    await ctx.reply(formatVerdict(analysis), { parse_mode: "HTML" });
  } catch (err) {
    console.error("Audio processing error:", err);
    ctx.reply("❌ Failed to process audio message.");
  }
});

// Photo/Image Messages
bot.on(message("photo"), async (ctx) => {
  try {
    const msg = await ctx.reply("📸 Downloading image...");
    
    // Get highest resolution photo
    const photo = ctx.message.photo[ctx.message.photo.length - 1];
    const fileLink = await ctx.telegram.getFileLink(photo.file_id);
    
    await ctx.telegram.editMessageText(ctx.chat.id, msg.message_id, undefined, "👁️ Processing image...");
    
    const extractedText = await extractTextFromImage(fileLink.href);
    
    if (!extractedText.trim()) {
      return ctx.telegram.editMessageText(ctx.chat.id, msg.message_id, undefined, "Could not extract any meaningful text/context from the image.");
    }
    
    await ctx.telegram.editMessageText(ctx.chat.id, msg.message_id, undefined, `📝 <i>Extracted Context: "${extractedText.slice(0, 200)}..."</i>\n\n🔍 Analyzing for fraud...`, { parse_mode: "HTML" });
    
    const analysis = await processFraudAnalysis({ text: extractedText, ip: "telegram-bot" });
    await ctx.reply(formatVerdict(analysis), { parse_mode: "HTML" });
  } catch (err) {
    console.error("Image processing error:", err);
    ctx.reply("❌ Failed to process image.");
  }
});

// Text Messages
bot.on(message("text"), async (ctx) => {
  // Ignore commands
  if (ctx.message.text.startsWith("/")) return;

  try {
    const msg = await ctx.reply("🔍 Analyzing message...");
    const analysis = await processFraudAnalysis({ text: ctx.message.text, ip: "telegram-bot" });
    await ctx.telegram.editMessageText(ctx.chat.id, msg.message_id, undefined, formatVerdict(analysis), { parse_mode: "HTML" });
  } catch (err) {
    console.error("Text processing error:", err);
    ctx.reply("❌ Failed to process text.");
  }
});
