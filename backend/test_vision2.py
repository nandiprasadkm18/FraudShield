import asyncio
from app.services.ai_pipeline import ai_pipeline

async def test():
    # Use a dummy base64 string
    res = await ai_pipeline.extract_text_from_image("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==")
    print("Result:", repr(res))

if __name__ == "__main__":
    asyncio.run(test())
