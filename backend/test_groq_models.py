import groq
from app.core.config import settings

client = groq.Groq(api_key=settings.GROQ_API_KEY)
models = client.models.list()
all_models = [m.id for m in models.data]
print("All Models:", all_models)
