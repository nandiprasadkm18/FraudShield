import groq
from app.core.config import settings

client = groq.Groq(api_key=settings.GROQ_API_KEY)
models = client.models.list()
for m in models.data:
    if "vision" in m.id:
        print("Vision:", m.id)
    if "llama-3.2" in m.id:
        print("Llama 3.2:", m.id)
