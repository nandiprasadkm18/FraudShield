import asyncio
import os
import groq
from dotenv import load_dotenv

load_dotenv("backend/.env")

async def test():
    client = groq.AsyncGroq(api_key=os.environ.get("GROQ_API_KEY"))
    try:
        chat_completion = await client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "Hello"},
                    ],
                }
            ],
            model="llama-3.2-11b-vision-preview",
        )
        print("Success:", chat_completion.choices[0].message.content)
    except Exception as e:
        print("Error:", repr(e))

asyncio.run(test())
