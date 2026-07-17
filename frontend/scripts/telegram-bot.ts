

import { bot } from "../src/lib/telegram-bot";

console.log("Starting Citizen Shield Telegram Bot in Long Polling mode...");

bot.launch().then(() => {
  console.log("✅ Bot is successfully running!");
}).catch((err) => {
  console.error("❌ Failed to start bot:", err);
});

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
