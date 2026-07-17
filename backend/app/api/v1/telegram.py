from fastapi import APIRouter, Request, HTTPException
from aiogram import Bot, Dispatcher, types
from app.core.config import settings
from app.services.ai_pipeline import ai_pipeline

router = APIRouter()

bot = Bot(token=settings.TELEGRAM_BOT_TOKEN) if settings.TELEGRAM_BOT_TOKEN else None
dp = Dispatcher()

@dp.message()
async def handle_message(message: types.Message):
    if not message.text:
        return
        
    if message.text.startswith('/start'):
        await message.reply("Welcome to Raksha Setu Intel Bot. Send me suspicious messages or numbers to analyze.")
        return
        
    if message.text.startswith('/analyze'):
        text_to_analyze = message.text.replace('/analyze', '').strip()
        if not text_to_analyze:
            await message.reply("Please provide text to analyze. E.g. /analyze You have won $1000")
            return
            
        result = await ai_pipeline.analyze_fraud(text_to_analyze)
        reply = f"Verdict: {result.get('verdict')}\nSeverity: {result.get('severity')}\nReasoning: {result.get('reasoning')}"
        await message.reply(reply)
        return
        
    # Default behavior for forwarding suspicious text
    result = await ai_pipeline.analyze_fraud(message.text)
    reply = f"Analysis Complete:\nVerdict: {result.get('verdict')}\nSeverity: {result.get('severity')}"
    await message.reply(reply)

@router.post("/telegram/webhook")
async def telegram_webhook(request: Request):
    if not bot:
        raise HTTPException(status_code=500, detail="Telegram bot not configured")
        
    try:
        update = types.Update(**await request.json())
        await dp.feed_update(bot=bot, update=update)
        return {"ok": True}
    except Exception as e:
        print(f"Telegram webhook error: {e}")
        return {"ok": False}
