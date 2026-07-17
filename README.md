# FraudShield

FraudShield is an advanced AI-powered fraud investigation and network analysis platform designed to track, visualize, and analyze cybercrime networks. By aggregating data across multiple dimensions (UPI, Crypto, Emails, Devices, Telegram, etc.), FraudShield empowers investigators and citizens to combat organized digital fraud effectively.

## 🚀 Key Features

- **Interactive Network Graph Analysis**: Visually track the relationships between scammers, victims, kingpins, devices, bank accounts, and crypto wallets using dynamic React Flow graphs.
- **Geo-Spatial Threat Mapping**: Pinpoint the physical locations and operational hotspots of threat actors using interactive map views.
- **AI-Powered Threat Intelligence**: Integrated with Groq to automatically extract entities and insights from unstructured data, citizen reports, and multimedia.
- **Citizen Reporting Portal**: A dedicated portal for citizens to securely report fraud incidents and submit evidence.
- **Telegram Bot Integration**: Ingest real-time threat intelligence and reports directly via Telegram.
- **Comprehensive Dashboards**: Dedicated views for investigating specific entity types (Emails, Websites, UPIs, Crypto, Rings, and Kingpins).

## 🛠️ Technology Stack

- **Frontend**: Next.js (React), TypeScript, Tailwind CSS, React Flow (for network graphs), Leaflet (for maps), Recharts.
- **Backend**: Python, FastAPI, WebSockets (real-time updates), Groq API (LLM inference), Microsoft Presidio (PII Anonymization), SpaCy.
- **Database**: PostgreSQL, SQLAlchemy (Backend ORM), Alembic (Migrations), Prisma (Frontend ORM).

## 🏁 Getting Started

### Prerequisites
- Node.js (v18+)
- Python (v3.9+)
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

# Create a .env file and configure your keys and database
# Ensure your DATABASE_URL points to your PostgreSQL database
# Example: DATABASE_URL="postgresql+asyncpg://postgres:password@localhost:5432/eth_db"

# Run database migrations
alembic upgrade head

# Start the development server
uvicorn app.main:app --reload --port 8000
```
*(Make sure to configure your `.env` file in the backend directory with necessary API keys such as your Groq API key and Telegram token).*

### 2. Frontend Setup (Next.js)
Open a new terminal, navigate to the `frontend` directory, and start the Next.js app:
```bash
cd frontend

# Install dependencies
npm install

# Copy the .env file from the backend (so the frontend has your keys)
cp ../backend/.env .env

# Generate Prisma Client (if applicable)
npx prisma generate

# Start the development server
npm run dev
```
The frontend will be accessible at [http://localhost:3000](http://localhost:3000).

### 3. Running the Telegram Bot
To run the Telegram bot, open another terminal, navigate to the `frontend` directory, and start the script:
```bash
cd frontend
npm run telegram-bot
```

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the issues page.