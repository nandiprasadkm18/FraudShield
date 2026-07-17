import asyncio
import json
import logging
from presidio_analyzer import AnalyzerEngine, PatternRecognizer, Pattern
from pydantic import BaseModel, Field, ValidationError
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from typing import List, Optional, Dict, Any
import time
import os
from app.core.config import settings
logger = logging.getLogger(__name__)

analyzer = AnalyzerEngine()

# Custom Pattern Recognizers for Indian PII
aadhaar_pattern = Pattern(name="aadhaar_pattern", regex=r"\b\d{4}\s?\d{4}\s?\d{4}\b", score=0.85)
aadhaar_recognizer = PatternRecognizer(supported_entity="IN_AADHAAR", patterns=[aadhaar_pattern])
pan_pattern = Pattern(name="pan_pattern", regex=r"\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b", score=0.85)
pan_recognizer = PatternRecognizer(supported_entity="IN_PAN", patterns=[pan_pattern])
phone_pattern = Pattern(name="phone_pattern", regex=r"(?<!\d)(?:\+91|0)?[-\s]?[6-9]\d{9}(?!\d)", score=0.85)
phone_recognizer = PatternRecognizer(supported_entity="IN_PHONE", patterns=[phone_pattern])
bank_pattern = Pattern(name="bank_pattern", regex=r"(?<!\d)\d{9,18}(?!\d)", score=0.85)
bank_recognizer = PatternRecognizer(supported_entity="IN_BANK_ACCOUNT", patterns=[bank_pattern])
upi_pattern = Pattern(name="upi_pattern", regex=r"\b[a-zA-Z0-9.\-_]+@[a-zA-Z]+\b", score=0.85)
upi_recognizer = PatternRecognizer(supported_entity="UPI_ID", patterns=[upi_pattern])
website_pattern = Pattern(name="website_pattern", regex=r"(?<![\w.-])(?:https?://|www\.)[a-zA-Z0-9.\-_]+\.[a-zA-Z]{2,}\b", score=0.85)
website_recognizer = PatternRecognizer(supported_entity="WEBSITE", patterns=[website_pattern])
telegram_pattern = Pattern(name="telegram_pattern", regex=r"(?<![\w.-])(?:t\.me/|@)[a-zA-Z0-9_]{5,32}\b", score=0.85)
telegram_recognizer = PatternRecognizer(supported_entity="TELEGRAM_ID", patterns=[telegram_pattern])
crypto_pattern = Pattern(name="crypto_pattern", regex=r"\b(?:0x[a-fA-F0-9]{40}|(?:bc1|[13])[a-zA-HJ-NP-Z0-9]{25,39})\b", score=0.85)
crypto_recognizer = PatternRecognizer(supported_entity="CRYPTO_WALLET", patterns=[crypto_pattern])

analyzer.registry.add_recognizer(aadhaar_recognizer)
analyzer.registry.add_recognizer(pan_recognizer)
analyzer.registry.add_recognizer(phone_recognizer)
analyzer.registry.add_recognizer(bank_recognizer)
analyzer.registry.add_recognizer(upi_recognizer)
analyzer.registry.add_recognizer(website_recognizer)
analyzer.registry.add_recognizer(telegram_recognizer)
analyzer.registry.add_recognizer(crypto_recognizer)

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
    financialExposure: Optional[int] = None

class AIPipelineService:
    def __init__(self):
        self._async_client = None
        if _HAS_GROQ and settings.GROQ_API_KEY:
            self._async_client = _groq_module.AsyncGroq(api_key=settings.GROQ_API_KEY)

    def _extract_and_redact_sync(self, text: str):
        """Synchronous presidio PII extraction (CPU-bound)."""
        results = analyzer.analyze(
            text=text,
            language="en",
            entities=[
                "IN_AADHAAR", "IN_PAN", "IN_PHONE", "IN_BANK_ACCOUNT",
                "EMAIL_ADDRESS", "LOCATION", "UPI_ID", "WEBSITE",
                "TELEGRAM_ID", "CRYPTO_WALLET",
            ],
        )

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
            extracted_scammer_entities = [
                entities_map[ph]
                for ph in scammer_placeholders
                if ph in entities_map
            ]
            parsed["extracted_scammer_entities"] = extracted_scammer_entities
            return parsed

        except Exception as e:
            logger.error(f"Groq API error after retries: {e}")
            default["reasoning"] = f"AI Engine error: {str(e)}"
            return default


ai_pipeline = AIPipelineService()
