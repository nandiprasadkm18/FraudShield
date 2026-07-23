import asyncio
import json
import logging
from presidio_analyzer import AnalyzerEngine, PatternRecognizer, Pattern
from presidio_analyzer.nlp_engine import NlpEngineProvider
from pydantic import BaseModel, Field, ValidationError
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from typing import List, Optional, Dict, Any
import time
import os
from app.core.config import settings
logger = logging.getLogger(__name__)

# Configure Presidio to use small spaCy model to avoid OOM on 512MB RAM servers (like Render)
configuration = {
    "nlp_engine_name": "spacy",
    "models": [{"lang_code": "en", "model_name": "en_core_web_sm"}],
}
provider = NlpEngineProvider(nlp_configuration=configuration)
nlp_engine = provider.create_engine()

analyzer = AnalyzerEngine(nlp_engine=nlp_engine, supported_languages=["en"])

# Custom Pattern Recognizers for Indian PII
aadhaar_pattern = Pattern(name="aadhaar_pattern", regex=r"\b\d{4}\s?\d{4}\s?\d{4}\b", score=0.85)
aadhaar_recognizer = PatternRecognizer(supported_entity="IN_AADHAAR", patterns=[aadhaar_pattern])
pan_pattern = Pattern(name="pan_pattern", regex=r"\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b", score=0.85)
pan_recognizer = PatternRecognizer(supported_entity="IN_PAN", patterns=[pan_pattern])
phone_pattern = Pattern(name="phone_pattern", regex=r"(?<!\d)(?:\+91|0)?[-\s]?[6-9]\d{9}(?!\d)", score=0.90)
phone_recognizer = PatternRecognizer(supported_entity="IN_PHONE", patterns=[phone_pattern])
bank_pattern = Pattern(name="bank_pattern", regex=r"\b(?![6-9]\d{9}\b)\d{9,18}\b", score=0.85)
bank_recognizer = PatternRecognizer(supported_entity="IN_BANK_ACCOUNT", patterns=[bank_pattern], context=["account", "a/c", "ac", "bank", "ifsc"])
ifsc_pattern = Pattern(name="ifsc_pattern", regex=r"\b[A-Z]{4}0[A-Z0-9]{6}\b", score=0.85)
ifsc_recognizer = PatternRecognizer(supported_entity="IN_IFSC_CODE", patterns=[ifsc_pattern], context=["ifsc", "bank", "branch"])
upi_pattern = Pattern(name="upi_pattern", regex=r"\b[a-zA-Z0-9.\-_]+@[a-zA-Z0-9.\-_]+\b", score=0.85)
upi_recognizer = PatternRecognizer(supported_entity="UPI_ID", patterns=[upi_pattern])
website_pattern = Pattern(name="website_pattern", regex=r"(?<![\w.-])(?:https?://|www\.)[a-zA-Z0-9.\-_]+\.[a-zA-Z]{2,}\b", score=0.85)
website_recognizer = PatternRecognizer(supported_entity="WEBSITE", patterns=[website_pattern])
telegram_pattern = Pattern(name="telegram_pattern", regex=r"(?:t\.me/|@)[a-zA-Z0-9_]{5,32}\b", score=0.85)
telegram_recognizer = PatternRecognizer(supported_entity="TELEGRAM_ID", patterns=[telegram_pattern])
crypto_pattern = Pattern(name="crypto_pattern", regex=r"\b(?:0x[a-fA-F0-9]{40}|(?:bc1|[13])[a-zA-HJ-NP-Z0-9]{25,39}|T[A-Za-z1-9]{33}|[1-9A-HJ-NP-Za-km-z]{32,44}|r[0-9a-zA-Z]{24,34}|[LM][a-km-zA-HJ-NP-Z1-9]{26,33}|ltc1[a-zA-HJ-NP-Z0-9]{25,39}|D[5-9A-HJ-NP-U][1-9A-HJ-NP-Za-km-z]{32}|addr1[a-z0-9]{58,120}|4[0-9AB][1-9A-HJ-NP-Za-km-z]{93})\b", score=0.85)
crypto_recognizer = PatternRecognizer(supported_entity="CRYPTO_WALLET", patterns=[crypto_pattern])
email_pattern = Pattern(name="email_pattern", regex=r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b", score=0.85)
email_recognizer = PatternRecognizer(supported_entity="EMAIL_ADDRESS", patterns=[email_pattern])

analyzer.registry.add_recognizer(aadhaar_recognizer)
analyzer.registry.add_recognizer(aadhaar_recognizer)
analyzer.registry.add_recognizer(pan_recognizer)
analyzer.registry.add_recognizer(phone_recognizer)
analyzer.registry.add_recognizer(bank_recognizer)
analyzer.registry.add_recognizer(ifsc_recognizer)
analyzer.registry.add_recognizer(upi_recognizer)
analyzer.registry.add_recognizer(website_recognizer)
analyzer.registry.add_recognizer(telegram_recognizer)
analyzer.registry.add_recognizer(crypto_recognizer)
analyzer.registry.add_recognizer(email_recognizer)
analyzer.registry.add_recognizer(upi_recognizer)
analyzer.registry.add_recognizer(website_recognizer)
analyzer.registry.add_recognizer(telegram_recognizer)
analyzer.registry.add_recognizer(crypto_recognizer)
analyzer.registry.add_recognizer(email_recognizer)

# Groq is imported lazily to avoid startup errors when the key is missing
try:
    import groq as _groq_module
    _HAS_GROQ = True
except ImportError:
    _HAS_GROQ = False

_GROQ_TIMEOUT_SECONDS = 45.0
_GROQ_MODEL = "openai/gpt-oss-120b"

_DEFAULT_RESPONSE: dict = {
    "verdict": "INSUFFICIENT_EVIDENCE",
    "severity": "NONE",
    "confidenceScore": 0.0,
    "fraudType": "Unknown",
    "tags": [],
    "reasoning": "Groq API key not configured or service unavailable.",
    "timeline": [],
    "escalate": False,
    "scammerEntities": [],
    "extracted_scammer_entities": [],
    "financialExposure": None,
}


class AIResponseSchema(BaseModel):
    verdict: str
    severity: str
    confidenceScore: float
    fraudType: Optional[str]
    tags: List[str] = []
    reasoning: str
    timeline: List[Dict[str, Any]] = []
    escalate: bool
    scammerEntities: List[str] = []
    bankDetails: Optional[Dict[str, Dict[str, Any]]] = Field(default_factory=dict)
    financialExposure: Optional[int] = None

class AIPipelineService:
    def __init__(self):
        self._async_client = None
        if _HAS_GROQ and settings.GROQ_API_KEY:
            self._async_client = _groq_module.AsyncGroq(api_key=settings.GROQ_API_KEY)

    async def transcribe_audio(self, file_content: bytes, filename: str) -> str:
        if not self._async_client:
            return ""
        try:
            transcription = await self._async_client.audio.transcriptions.create(
                file=(filename, file_content),
                model="whisper-large-v3-turbo",
                response_format="text"
            )
            return transcription
        except Exception as e:
            logger.error(f"Audio transcription failed: {e}")
            return (
                "*[Audio Model Unavailable - Using Mock Data]*\n\n"
                "Hello, I received a call from someone claiming to be from the State Bank of India. "
                "They said my account is blocked due to KYC issues and asked me to share the OTP sent to my phone. "
                "The caller's number was +91 9876543210. Is this a scam?"
            )

    async def generate_entity_summary(self, entity_type: str, entity_value: str, connections: int, reports: int, victims: int, financial_exposure: str) -> str:
        if not self._async_client:
            return ""
        try:
            prompt = f"""You are a Cyber Crime Investigation AI Assistant for Law Enforcement.
Write a short, professional, and actionable intelligence summary (max 3-4 sentences) for the following suspicious entity:
Entity Type: {entity_type}
Entity Value: {entity_value}
Part of a fraud ring with {connections} direct connections.
Appears in {reports} threat reports.
Directly linked to {victims} victims.
Estimated financial exposure: {financial_exposure}.

End with a bulleted list of 3 concise recommended actions for the investigator.
Keep it highly analytical and professional."""

            chat_completion = await self._async_client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model=_GROQ_MODEL,
                temperature=0.3,
            )
            return chat_completion.choices[0].message.content
        except Exception as e:
            logger.error(f"Failed to generate summary: {e}")
            return "AI Investigation model unavailable."

    async def extract_text_from_image(self, base64_image: str) -> str:
        if not self._async_client:
            return ""
        try:
            chat_completion = await self._async_client.chat.completions.create(
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": "Extract all readable text, chat messages, and context from this image. Do not analyze for fraud yet, just extract the raw text and describe what is happening in the screenshot."},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{base64_image}",
                                },
                            },
                        ],
                    }
                ],
                model="qwen/qwen3.6-27b",
            )
            return chat_completion.choices[0].message.content
        except Exception as e:
            logger.error(f"Vision extraction failed: {e}")
            return (
                "*[Vision Model Decommissioned - Using Mock Data]*\n\n"
                "Hello,\n"
                "I received a WhatsApp message saying my bank account has been blocked.\n"
                "They asked me to contact +91 9123456780 or send an email to support-update@bank-securehelp.com\n"
                "They also provided:\n"
                "UPI: bank.help@okicici\n"
                "Website: https://secure-bank-verify.co\n"
                "Telegram: @BankSupport24x7\n"
                "Bank Account: 417826593104\n"
                "IFSC: SBIN0004589\n"
                "Bitcoin Wallet: bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"
            )

    def _extract_and_redact_sync(self, text: str):
        """Synchronous presidio PII extraction (CPU-bound)."""
        results = analyzer.analyze(
            text=text,
            language="en",
            entities=[
                "IN_AADHAAR", "IN_PAN", "IN_PHONE", "IN_BANK_ACCOUNT",
                "IN_IFSC_CODE", "EMAIL_ADDRESS", "LOCATION", "UPI_ID", "WEBSITE",
                "TELEGRAM_ID", "CRYPTO_WALLET",
            ],
        )

        # Sort results by score (desc), then length (desc), then prefer BANK_ACCOUNT over AADHAAR
        results = sorted(results, key=lambda x: (x.score, x.end - x.start, x.entity_type == "IN_BANK_ACCOUNT"), reverse=True)
        
        # Filter overlapping results
        filtered = []
        for res in results:
            overlap = any(
                max(res.start, prev.start) < min(res.end, prev.end)
                for prev in filtered
            )
            if not overlap:
                filtered.append(res)

        results = sorted(filtered, key=lambda x: x.start, reverse=True)
        entities_map: dict = {}
        redacted_text = text

        for i, res in enumerate(results):
            original = text[res.start:res.end]
            placeholder = f"<{res.entity_type}_{i}>"
            entities_map[placeholder] = {
                "type": res.entity_type,
                "value": original,
                "score": res.score,
            }
            redacted_text = redacted_text[:res.start] + placeholder + redacted_text[res.end:]

        return redacted_text, entities_map

    async def extract_and_redact(self, text: str):
        """Run PII extraction in a thread-pool executor to avoid blocking the event loop."""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._extract_and_redact_sync, text)

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((asyncio.TimeoutError, json.JSONDecodeError, ValidationError))
    )
    async def _call_llm_with_retry(self, prompt: str) -> dict:
        start_time = time.monotonic()
        chat_completion = await asyncio.wait_for(
            self._async_client.chat.completions.create(
                messages=[
                    {
                        "role": "system",
                        "content": "You are a cyber security AI fraud analyzer. Always output strict JSON matching the schema requested.",
                    },
                    {"role": "user", "content": prompt},
                ],
                model=_GROQ_MODEL,
                temperature=1,
                top_p=1,
                response_format={"type": "json_object"},
                extra_body={"reasoning_effort": "medium"},
            ),
            timeout=_GROQ_TIMEOUT_SECONDS,
        )
        latency = int((time.monotonic() - start_time) * 1000)
        content = chat_completion.choices[0].message.content
        parsed = json.loads(content)
        AIResponseSchema.model_validate(parsed)
        
        # Add metrics
        if hasattr(chat_completion, 'usage') and chat_completion.usage:
            prompt_tokens = chat_completion.usage.prompt_tokens
            completion_tokens = chat_completion.usage.completion_tokens
            cost = (prompt_tokens * 0.0000007) + (completion_tokens * 0.0000009) # approximate
            parsed["_metrics"] = {
                "latencyMs": latency,
                "promptTokens": prompt_tokens,
                "completionTokens": completion_tokens,
                "estimatedCost": cost
            }
        
        return parsed

    async def analyze_fraud(self, text: str, phone: str = None) -> dict:
        if not text:
            text = ""
        # Truncate to avoid context window explosion
        text = text[:15000]
        
        redacted, entities_map = await self.extract_and_redact(text)

        try:
            prompt_path = os.path.join(os.path.dirname(__file__), "..", "..", "prompts", "fraud_analysis.txt")
            with open(prompt_path, "r", encoding="utf-8") as f:
                prompt_template = f.read()
            prompt = prompt_template.replace("{phone}", str(phone) if phone else "unknown").replace("{redacted}", str(redacted))
        except Exception as e:
            logger.error(f"Failed to load prompt: {e}")
            prompt = f"Analyze the following intercepted communication for fraud:\nTarget Phone: {phone}\n<user_payload>\n{redacted}\n</user_payload>"

        default = {**_DEFAULT_RESPONSE}

        if not self._async_client:
            return default

        try:
            parsed = await self._call_llm_with_retry(prompt)

            # Map placeholders back to real entities
            scammer_placeholders = parsed.get("scammerEntities", [])
            bank_details = parsed.get("bankDetails", {})
            extracted_scammer_entities = []
            for ph in scammer_placeholders:
                entity_obj = None
                if ph in entities_map:
                    entity_obj = dict(entities_map[ph])
                else:
                    # In case the LLM returned the exact value instead of the placeholder
                    for key, val in entities_map.items():
                        if val["value"] == ph or val["value"].lower() == ph.lower():
                            entity_obj = dict(val)
                            ph = key
                            break
                
                if entity_obj:
                    if ph in bank_details:
                        meta = dict(bank_details[ph])
                        for k, v in meta.items():
                            if isinstance(v, str):
                                for ph_key, ph_val in entities_map.items():
                                    if ph_key in v:
                                        v = v.replace(ph_key, ph_val["value"])
                                meta[k] = v
                        entity_obj["metadata"] = meta
                    extracted_scammer_entities.append(entity_obj)

            parsed["extracted_scammer_entities"] = extracted_scammer_entities
            return parsed

        except Exception as e:
            logger.error(f"Groq API error after retries: {e}")
            default["reasoning"] = f"AI Engine error: {str(e)}"
            return default


ai_pipeline = AIPipelineService()
