import asyncio
import groq
from app.core.config import settings

async def test():
    client = groq.AsyncGroq(api_key=settings.GROQ_API_KEY)
    try:
        res = await client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "Extract all readable text, chat messages, and context from this image. Do not analyze for fraud yet, just extract the raw text and describe what is happening in the screenshot."},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
                            },
                        },
                    ],
                }
            ],
            model="openai/gpt-oss-120b",
        )
        print("Success:", res.choices[0].message.content)
    except Exception as e:
        print("Error:", repr(e))

if __name__ == "__main__":
    asyncio.run(test())
