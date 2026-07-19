# FraudShield (Raksha-Setu)

FraudShield is an advanced AI-powered fraud investigation and network analysis platform designed for law enforcement to track, visualize, and analyze cybercrime networks. By aggregating data across multiple dimensions (UPI, Crypto, Emails, Devices, Telegram, Bank Accounts, etc.), FraudShield empowers investigators and citizens to combat organized digital fraud effectively.

## 🚀 Key Features

- **Interactive Network Graph Analysis**: Visually track and investigate relationships between scammers, victims, kingpins, devices, bank accounts, and crypto wallets using dynamic React Flow graphs.
- **AI-Powered Intelligence Generation**: Automatically generate highly professional and actionable Law Enforcement investigation summaries in real-time for any suspicious entity using the Groq AI model.
- **Geo-Spatial Threat Mapping**: Pinpoint the physical locations and operational hotspots of threat actors on interactive Leaflet map views.
- **Automated Evidence Extraction**: 
  - **Text & NLP Analysis**: Integrated with Groq LLMs to automatically extract malicious entities and insights from unstructured text and citizen reports.
  - **Multimedia Processing**: Transcribe scam voice notes via Whisper and extract text/context from screenshots seamlessly using Qwen Vision.
  - **Data Privacy**: Automatic PII (Personally Identifiable Information) anonymization using Microsoft Presidio to protect victim data, with strict regex mapping to avoid miscategorizing entities (e.g. 10-digit Indian mobile numbers vs Bank Accounts).
- **Citizen Reporting Portal**: A dedicated portal for citizens to securely report fraud incidents and submit evidence directly into the system.
- **Telegram Bot Integration**: Ingest real-time threat intelligence, analyze forwarded voice notes/images, and check number reputations instantly via Telegram.
- **Comprehensive Analytics Dashboards**: Live dashboards and analytics that visualize the real-time financial exposure, active fraud rings, and threat volume across the intelligence network.

## 🛠️ Technology Stack

- **Frontend**: Next.js (React), TypeScript, Tailwind CSS, React Flow (for network graphs), Leaflet (for maps), Recharts (for analytics).
- **Backend**: Python, FastAPI, SQLAlchemy (Backend ORM), Alembic (Migrations).
- **AI & ML Pipelines**: Groq API (LLM inference & Vision), Whisper (Audio Transcription), Microsoft Presidio (PII Anonymization).
- **Database**: PostgreSQL (with asyncpg).

## 🏁 Getting Started

### Prerequisites
- Node.js (v18+)
- Python (v3.12+)
- PostgreSQL (running locally or a remote instance)

### 1. Backend Setup (FastAPI)
Navigate to the `backend` directory and set up your Python environment:
```bash
cd backend
python -m venv venv

# Activate virtual environment (Windows)
venv\Scripts\activate
# Activate virtual environment (Mac/Linux)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure your environment variables (.env)
# Required keys: GROQ_API_KEY, TELEGRAM_BOT_TOKEN
# Example: DATABASE_URL="postgresql+asyncpg://postgres:password@localhost:5432/eth_db"

# Run database migrations
alembic upgrade head

# Start the development server
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend Setup (Next.js)
Open a new terminal, navigate to the `frontend` directory, and start the Next.js app:
```bash
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```
The frontend will be accessible at [http://localhost:3000](http://localhost:3000).

### 3. Running the Telegram Bot
The Telegram bot is now tightly integrated into the backend lifecycle and can run alongside the main application. You can manage Webhook configurations through the `.env` settings.

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the issues page.