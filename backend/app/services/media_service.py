from app.core.config import settings
import groq
import base64
from fastapi import HTTPException, UploadFile

_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB

_ALLOWED_AUDIO_TYPES = {
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/x-wav",
    "audio/webm",
    "audio/mp4",
    "audio/m4a",
    "audio/x-m4a",
    "audio/ogg",
}

_ALLOWED_IMAGE_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
}

_ALLOWED_TYPES = _ALLOWED_AUDIO_TYPES | _ALLOWED_IMAGE_TYPES

class MediaService:
    def __init__(self):
        self.groq_client = groq.Groq(api_key=settings.GROQ_API_KEY) if settings.GROQ_API_KEY else None

    async def process_upload(self, file: UploadFile) -> dict:
        content_type = (file.content_type or "").lower().split(";")[0].strip()
        if content_type not in _ALLOWED_TYPES:
            raise HTTPException(
                status_code=415,
                detail=f"Unsupported file type '{content_type}'. Allowed: audio (mp3/wav/webm/m4a/ogg) and image (jpeg/png/webp).",
            )

        content = await file.read(_MAX_FILE_SIZE_BYTES + 1)
        if len(content) > _MAX_FILE_SIZE_BYTES:
            raise HTTPException(
                status_code=413,
                detail=f"File too large. Maximum allowed size is {_MAX_FILE_SIZE_BYTES // (1024 * 1024)} MB.",
            )

        import filetype
        kind = filetype.guess(content)
        if not kind or kind.mime not in _ALLOWED_TYPES:
            raise HTTPException(
                status_code=415,
                detail=f"Invalid file content detected. Magic bytes do not match allowed types.",
            )

        try:
            if content_type in _ALLOWED_AUDIO_TYPES:
                text = await self.transcribe_audio(content, file.filename)
                return {"text": text}

            elif content_type in _ALLOWED_IMAGE_TYPES:
                result = await self.extract_text_from_image(content)
                if isinstance(result, dict) and "error" in result:
                    return {"error": result["error"]}
                elif isinstance(result, dict):
                    return result
                else:
                    return {"text": str(result)}

            else:
                raise HTTPException(status_code=400, detail="Unsupported file type")

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    async def transcribe_audio(self, audio_bytes: bytes, filename: str) -> str:
        if not self.groq_client:
            return "Audio transcription failed: Groq API key not configured."
            
        try:
            transcription = self.groq_client.audio.transcriptions.create(
                file=(filename, audio_bytes),
                model="whisper-large-v3-turbo",
            )
            return transcription.text
        except Exception as e:
            return f"Audio transcription error: {str(e)}"

    async def extract_text_from_image(self, image_bytes: bytes) -> dict:
        if not self.groq_client:
            return {"error": "Image extraction failed: Groq API key not configured."}
            
        try:
            base64_image = base64.b64encode(image_bytes).decode('utf-8')
            chat_completion = self.groq_client.chat.completions.create(
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text", 
                                "text": "Extract all text from this image perfectly. If this is a screenshot of a message (like SMS or WhatsApp), look for the sender's phone number or ID at the very top (e.g., +91... or a name). Return your response strictly as a JSON object with two keys: 'sender_number' (the sender's phone number or ID at the top, or an empty string if not found) and 'text' (the main body of the text in the image). Do not include any markdown formatting like ```json, just the raw JSON object."
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{base64_image}",
                                },
                            },
                        ],
                    }
                ],
                model="meta-llama/llama-4-scout-17b-16e-instruct",
            )
            import json
            result_str = chat_completion.choices[0].message.content.strip()
            if result_str.startswith("```json"):
                result_str = result_str[7:]
            if result_str.startswith("```"):
                result_str = result_str[3:]
            if result_str.endswith("```"):
                result_str = result_str[:-3]
            return json.loads(result_str.strip())
        except Exception as e:
            return {"error": f"Image extraction error: {str(e)}"}

media_service = MediaService()
