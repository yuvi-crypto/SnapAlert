# SnapAlert 🔔

**Hyper-personalised deal alert engine that WhatsApps buyers the moment their perfect home hits the market.**

> Built for the Snaphomz Hackathon Sprint · California Real Estate Markets

---

## 🚀 What It Does

SnapAlert watches California's MLS every **5 minutes** and sends a **WhatsApp alert** within 5 minutes when a listing matches a buyer's AI preference vector — with match score, AI explanation, and a one-tap booking link.

| Feature | Detail |
|---------|--------|
| ⚡ Alert Speed | < 5 minutes from listing |
| 💬 Channel | WhatsApp (98% open rate) |
| 🤖 Match Engine | 64-dim cosine similarity |
| 📅 Booking | One-tap showing link |
| 🔥 Urgency | Live buyer count signals |

---

## 🏗️ Stack

- **Backend**: FastAPI + SQLAlchemy + APScheduler
- **Frontend**: React + Vite
- **Matching**: NumPy cosine similarity (64-dim preference vectors)
- **Alerts**: Twilio WhatsApp Business API
- **Data**: RealEstateAPI.com (Property Search + PropGPT AI)
- **DB**: SQLite (MVP) → PostgreSQL + pgvector (production)

---

## 📁 Project Structure

```
Sanphomz/
├── backend/
│   ├── main.py              # FastAPI app + scheduler startup
│   ├── config.py            # Settings (pydantic-settings + .env)
│   ├── database.py          # SQLAlchemy models
│   ├── schemas.py           # Pydantic schemas
│   ├── routers/
│   │   ├── users.py         # User CRUD
│   │   └── snapalert.py     # Core alert endpoints
│   └── services/
│       ├── realestate_api.py  # RealEstateAPI wrapper
│       ├── matcher.py         # Preference vector + scoring
│       ├── sms.py             # Twilio WhatsApp sender
│       └── poller.py          # 5-min APScheduler loop
└── frontend/
    └── src/
        ├── pages/SnapAlertApp.jsx  # Main standalone UI
        ├── components/
        │   ├── AlertCard.jsx       # Listing alert card
        │   └── OptInModal.jsx      # 4-step onboarding
        ├── context/SnapAlertContext.jsx
        └── api/client.js
```

---

## ⚙️ Running Locally

### Prerequisites
- Python 3.10+
- Node.js 18+
- Twilio WhatsApp Sandbox access

### Backend

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Configure .env (copy template and add your keys)
cp .env.example .env

# Start server
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

API runs at `http://localhost:8000`  
Swagger docs at `http://localhost:8000/docs`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App runs at `http://localhost:5173`

---

## 🔑 Environment Variables

Create `backend/.env`:

```env
REALESTATE_API_BACKEND_KEY=REALAPI-xxxx-xxxx-xxxx
REALESTATE_API_FRONTEND_KEY=REALAPI-xxxx-xxxx-xxxx
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
TWILIO_WHATSAPP_TO=whatsapp:+91XXXXXXXXXX
DATABASE_URL=sqlite:///./snapalert.db
POLL_INTERVAL_SECONDS=300
MATCH_THRESHOLD=0.65
DEMO_CITY=San Jose
DEMO_STATE=CA
```

---

## 📡 Key API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/users` | Create user |
| `POST` | `/api/snapalert/enable` | Send OTP |
| `POST` | `/api/snapalert/verify` | Verify OTP, activate |
| `POST` | `/api/snapalert/preferences/{id}` | Update preference vector |
| `GET` | `/api/snapalert/alerts/{id}` | Alert history |
| `POST` | `/api/snapalert/mock-trigger` | 🎯 Fire demo alert instantly |
| `GET` | `/api/health` | Health check |

---

## 📲 WhatsApp Setup (One-time)

Join the Twilio sandbox before receiving alerts:

1. Open WhatsApp
2. Send `join <word>` to **+1 415 523 8886**
3. Receive confirmation → you're ready ✅

---

## 🎯 How Matching Works

```
New listing arrives
    → Build 64-dim listing vector (price, beds, baths, 54 keywords)
    → Compute cosine similarity vs. user's preference vector
    → If score ≥ 0.65:
        → PropGPT generates match explanation
        → Twilio fires WhatsApp alert
        → Alert logged to DB
```

Score thresholds: `≥90%` Excellent · `≥75%` Strong · `≥65%` Alert fires

---

## 🏆 Built By

**Yuvaraj Gajalajamgam** · IIIT Hyderabad  
`yuvaraj.gajalajamgam@students.iiit.ac.in`

*Powered by RealEstateAPI.com + Twilio WhatsApp + PropGPT AI*
