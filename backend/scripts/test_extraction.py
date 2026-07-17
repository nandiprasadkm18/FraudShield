import asyncio
import sys
import os
import re

from presidio_analyzer import AnalyzerEngine, PatternRecognizer, Pattern

analyzer = AnalyzerEngine()

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

def test():
    text = "Send it to my upi nandi@ybl or bank account 123456789012345 or email me at nandi@gmail.com. Check my website https://google.com or telegram @nandi123 or my crypto wallet 0x1234567890123456789012345678901234567890"
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
    
    redacted_text = text
    for i, res in enumerate(results):
        placeholder = f"<{res.entity_type}_{i}>"
        redacted_text = redacted_text[:res.start] + placeholder + redacted_text[res.end:]
        
    print(redacted_text)
    for r in results:
        print(f"{r.entity_type}: {text[r.start:r.end]} (score: {r.score})")

if __name__ == "__main__":
    test()
