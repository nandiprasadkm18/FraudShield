import asyncio
import aiohttp

async def main():
    async with aiohttp.ClientSession() as session:
        payload = {
            'phoneNumber': '+918369271548',
            'text': 'Dear Card Holder, Your HDFC Bank Credit Card ending with 4821 is blocked...',
            'state': 'Karnataka',
            'city': 'Bangalore',
            'pincode': '',
            'analysisResult': None
        }
        async with session.post('http://127.0.0.1:8000/api/intel/submit', json=payload) as resp:
            print(await resp.text())

asyncio.run(main())
