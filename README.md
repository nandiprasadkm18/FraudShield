<div align="center">
  
  # 🛡️ FraudShield (Raksha-Setu)
  
  **Next-Generation AI Cybercrime Investigation & Network Analysis Platform**
  
  [![ET Hackathon](https://img.shields.io/badge/ET_Hackathon-2026-34d399?style=for-the-badge&logo=hackthebox)](#)
  [![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
  [![Next.js](https://img.shields.io/badge/Next.js-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
  [![Groq AI](https://img.shields.io/badge/Powered_by-Groq_AI-f55036?style=for-the-badge)](https://groq.com/)
</div>

---

> [!IMPORTANT]
> FraudShield aggregates siloed cybercrime data (UPI, Crypto, Emails, Telegram, Phone Numbers) into a unified visual graph, empowering Law Enforcement to track fraud rings, identify kingpins, and stop organized scams in real-time.

## 🌟 The Problem
Cybercrime operates in complex, organized networks. Traditional reporting mechanisms treat incidents as isolated events, missing the broader connections between scammers, mules, and kingpins. **FraudShield bridges this gap.**

## ✨ Features

### 🕸️ Interactive Network Intelligence
Stop looking at spreadsheets. FraudShield dynamically maps connections between scammers, victims, and digital assets (Bank Accounts, Crypto Wallets, UPI IDs) using a massive **React Flow** powered intelligence canvas. 

### 🧠 Multi-Modal AI Extraction
Upload a screenshot of a WhatsApp scam, or forward a voice note to our Telegram bot. FraudShield handles the rest:
- **Vision:** Extracts OCR text and context using **Qwen Vision**.
- **Audio:** Transcribes scam calls instantly via **Whisper-Large**.
- **NLP:** Classifies the fraud type, severity, and targets using **Llama 3**.

### 🛡️ Zero-Trust PII Redaction
Citizen privacy is paramount. Integrated with **Microsoft Presidio**, FraudShield automatically redacts all Personally Identifiable Information (PII) before it ever hits the LLMs or analyst dashboards, complete with strict regex parsing to prevent misclassification.

### ⚡ Live AI Investigation Summaries
Click on any node in the graph, and our backend dynamically aggregates its true financial exposure, victim count, and edge connections, prompting Groq to generate a professional, actionable **Law Enforcement Intelligence Summary** on the fly.

### 📍 Geo-Spatial Threat Mapping
Visualize the physical operational hotspots of threat actors across the country using interactive Leaflet-powered heatmaps.

---

## 🏗️ Architecture & Tech Stack

FraudShield is built for extreme performance and scalability.

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 14, React 18, TailwindCSS, React Flow, Recharts |
| **Backend** | Python, FastAPI, WebSockets, Uvicorn, SQLAlchemy |
| **AI Models** | Groq API (Llama 3.1, Whisper-v3, Qwen-Vision), Microsoft Presidio |
| **Database** | PostgreSQL (Asyncpg) + Alembic Migrations |

---

## 🚀 Getting Started

> [!TIP]
> Ensure you have PostgreSQL, Python 3.12+, and Node 18+ installed before beginning.

### 1️⃣ Backend Setup
```bash
git clone https://github.com/nandiprasadkm18/FraudShield.git
cd FraudShield/backend

# Initialize virtual environment
python -m venv venv
source venv/bin/activate  # (Windows: venv\Scripts\activate)

# Install requirements
pip install -r requirements.txt

# Configure environment variables (Add GROQ_API_KEY and TELEGRAM_BOT_TOKEN)
# Copy the structure from your environment to a .env file

# Run database migrations
alembic upgrade head

# Start the intelligence engine
uvicorn app.main:app --reload --port 8000
```

### 2️⃣ Frontend Setup
```bash
cd ../frontend

# Install Node dependencies
npm install

# Start the dashboard
npm run dev
```
> The dashboard will be live at `http://localhost:3000`

---

## 🤝 Contributing
Built with passion for the **ET Hackathon**. If you are a developer, security analyst, or law enforcement officer, we welcome your PRs! 

<div align="center">
  <i>"Connecting the dots, breaking the rings."</i>
</div>