import qrcode
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
import io
import hashlib
from typing import Dict, Any
from datetime import datetime, UTC

class PDFService:
    def generate_report_pdf(self, threat_id: str, analysis: dict) -> bytes:
        buffer = io.BytesIO()
        c = canvas.Canvas(buffer, pagesize=letter)
        
        # QR Code
        qr_url = f"https://fraudshield.ai/report/{threat_id}"
        qr = qrcode.make(qr_url)
        qr_io = io.BytesIO()
        qr.save(qr_io, format='PNG')
        qr_io.seek(0)
        qr_image = ImageReader(qr_io)
        
        c.setFont("Times-Bold", 16)
        c.drawString(50, 750, f"FraudShield AI Intelligence Report")
        
        c.setFont("Times-Roman", 10)
        c.drawString(50, 730, f"Report ID: {threat_id}")
        
        # Draw QR code in top right
        c.drawImage(qr_image, 450, 680, width=100, height=100)
        
        y_pos = 700
        c.setFont("Times-Bold", 12)
        
        c.drawString(50, y_pos, f"Timestamp: {datetime.now(UTC).isoformat()}Z")
        y_pos -= 20
        
        # Reported By
        reported_by = analysis.get('reportedBy', {})
        reporter_name = reported_by.get('name', 'Anonymous')
        reporter_phone = reported_by.get('phone', 'Unknown')
        c.drawString(50, y_pos, f"Reported By: {reporter_name} ({reporter_phone})")
        y_pos -= 20
        c.drawString(50, y_pos, f"Verdict: {analysis.get('verdict')}")
        y_pos -= 20
        c.drawString(50, y_pos, f"Severity: {analysis.get('severity')}")
        y_pos -= 20
        c.drawString(50, y_pos, f"Confidence: {analysis.get('confidenceScore')}")
        y_pos -= 20
        c.drawString(50, y_pos, f"Fraud Type: {analysis.get('fraudType')}")
        y_pos -= 40
        
        def check_page():
            nonlocal y_pos
            if y_pos < 100:
                c.showPage()
                y_pos = 750
                
        # Original Submission
        payload_text = analysis.get('payloadText')
        if payload_text:
            c.setFont("Times-Bold", 14)
            c.drawString(50, y_pos, "User Submission (Evidence):")
            y_pos -= 20
            c.setFont("Times-Roman", 10)
            import textwrap
            for line in payload_text.splitlines():
                for wrapped_line in textwrap.wrap(line, width=90):
                    c.drawString(70, y_pos, wrapped_line)
                    y_pos -= 15
                    check_page()
            y_pos -= 25

        # Timeline
        c.setFont("Times-Bold", 14)
        check_page()
        c.drawString(50, y_pos, "Timeline of Events:")
        y_pos -= 20
        c.setFont("Times-Roman", 10)
        for step in analysis.get('timeline', []):
            line = f"- {step.get('step')}: {step.get('detail')}"
            c.drawString(70, y_pos, line[:100] + ('...' if len(line)>100 else ''))
            y_pos -= 15
            check_page()
            
        y_pos -= 15
        
        # Extracted Scammer Entities
        c.setFont("Times-Bold", 14)
        c.drawString(50, y_pos, "Scammer Entities (Evidence):")
        y_pos -= 20
        c.setFont("Times-Roman", 10)
        for ent in analysis.get('extracted_scammer_entities', []):
            line = f"- {ent.get('type')}: {ent.get('value')} (Score: {ent.get('score')})"
            c.drawString(70, y_pos, line)
            y_pos -= 15
            check_page()
            
        y_pos -= 15
        
        # Reasoning
        c.setFont("Times-Bold", 14)
        c.drawString(50, y_pos, "Reasoning:")
        y_pos -= 20
        c.setFont("Times-Roman", 10)
        reasoning = analysis.get('reasoning', '')
        # Simple word wrap
        import textwrap
        for p_line in reasoning.splitlines():
            for line in textwrap.wrap(p_line, width=90):
                c.drawString(70, y_pos, line)
                y_pos -= 15
                check_page()
            
        y_pos -= 30
        
        # SHA-256 footprint
        content_str = f"{threat_id}:{analysis.get('verdict')}:{analysis.get('fraudType')}"
        footprint = hashlib.sha256(content_str.encode()).hexdigest()
        
        c.setFont("Courier", 8)
        c.drawString(50, 50, f"SHA-256 Digital Footprint: {footprint}")
        
        c.showPage()
        c.save()
        
        buffer.seek(0)
        return buffer.getvalue()

pdf_service = PDFService()
