# 🏠 PropSafe — AI-Powered Property Fraud Detection Platform

> **"Ramesh saved ₹40 lakhs for 20 years. Three years later, the real owner appeared. Ramesh lost everything."**
> PropSafe exists so this never happens again.

[![SDG 11](https://img.shields.io/badge/SDG%2011-Sustainable%20Cities-orange)](https://sdgs.un.org/goals/goal11)
[![SDG 16](https://img.shields.io/badge/SDG%2016-Peace%20%26%20Justice-blue)](https://sdgs.un.org/goals/goal16)
[![SDG 10](https://img.shields.io/badge/SDG%2010-Reduced%20Inequalities-red)](https://sdgs.un.org/goals/goal10)
[![Built by](https://img.shields.io/badge/Built%20by-Kumari%20Shivani-cyan)](https://github.com/shivani-i-i)

---

## 🔴 The Problem

Every year, thousands of Indian middle-class families lose their life savings to property fraud. Property records in India are **scattered across municipalities, revenue departments, and registrar offices** — making it nearly impossible for ordinary buyers to verify anything.

| Fraud Type | What Happens |
|---|---|
| Fake Ownership Documents | Forged title deeds sold to unsuspecting buyers |
| Benami Properties | Real ownership hidden under different names |
| Hidden Loans & Disputes | Properties sold with undisclosed mortgages |
| Unauthorized Constructions | Buildings with no legal permits or zoning approval |
| No Right to Sell | Sellers who don't legally own the property |

---

## 💡 The Solution

PropSafe is a full-stack AI-powered platform that gives every Indian buyer **legal-grade property verification in under 2 minutes** — at 80% less than traditional costs.

> *"Not just a document scanner — a complete end-to-end property fraud prevention ecosystem."*

---

## ✨ Core Features

### 🤖 Feature 1 — AI Fraud Detection Engine
- Enter property details: type, city, seller name, ownership history, income vs value
- Claude AI analyzes for red flags: benami patterns, rapid transfers, income mismatch
- Returns a **Fraud Risk Score (0–100)** — LOW / MEDIUM / HIGH
- HIGH risk auto-connects buyer to a verified lawyer instantly

### ⚖️ Feature 2 — Verified Lawyer Marketplace
- Bar Council verified property lawyers across Indian cities
- **₹500–₹1,000** vs ₹5,000+ traditional — **80% cheaper, 10x faster**
- Filter by city and specialization
- AI Legal Chat — ask any Indian property law question instantly

### 📈 Feature 3 — Price Appreciation Predictor
- Historical price data 2015–2024 with 2025–2026 forecasts
- Chart.js visualization: historical + predicted price curves
- Negotiation intelligence: *"Property overpriced by ₹X — negotiate to ₹Y"*
- Infrastructure tags: metro lines, roads, hospitals driving area value

### 🏛️ Feature 4 — Municipal Record Verification *(Phase 2)*
- Auto-verifies RERA registration, tax records, building permits
- Flags illegal constructions before purchase

### 📍 Feature 7 — GPS Property Survey *(New)*
- Browser GPS boundary survey using Geolocation API + Leaflet map
- Tap/click boundary corners to draw polygon and compute live area (sq.m / sq.ft)
- Submits to backend for server-side Shoelace verification
- Flags mismatch when surveyed area differs from registered area by more than 5%

### ⚡ Feature 5 — Dispute Resolution & Title Insurance *(Phase 2)*
- On-platform arbitration at ₹5,000–₹10,000 vs ₹2L+ in court
- One-time title insurance at ₹10,000–₹20,000

### 🏦 Feature 6 — Smart Loan & Bank Matcher *(Phase 2)*
- Tells buyer which banks will finance the property
- Live interest rate comparison across banks

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML, CSS, JavaScript |
| Backend | Node.js, Express |
| AI Engine | Anthropic Claude API (claude-sonnet-4-20250514) |
| OCR | Tesseract.js |
| Database | MongoDB (with offline fallback) |
| Charts | Chart.js |

---

## 🚀 Getting Started

### 1. Clone the repo
git clone https://github.com/shivani-i-i/Propsafe.git
cd Propsafe

### 2. Install backend dependencies
cd backend
npm install

### 2.1 Install workspace dependencies (one-time)
cd ..
npm install

### 3. Add your API keys

**For GPS Survey feature (Google Maps):**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable **Maps JavaScript API** and **Maps Embed API**
4. Create an API key with IP/HTTP referrer restrictions to your domain only
5. Copy `frontend/config.json.example` to `frontend/config.json`:
   ```bash
   cp frontend/config.json.example frontend/config.json
   ```
6. Edit `frontend/config.json` and paste your API key:
   ```json
   {
     "googleMapsApiKey": "your_actual_key_here"
   }
   ```

**For other optional features:**

Create `.env` in project root:
   ```
   # Optional: Anthropic API for AI chatbot (has fallback)
   ANTHROPIC_API_KEY=your_key_here
   
   # Optional: MongoDB for data persistence (has fallback)
   MONGODB_URI=mongodb://localhost:27017/propsafe
   
   # Optional: Backend port
   PORT=3000
   ```

⚠️ **Never commit API keys to git. Both `frontend/config.json` and `.env` are in `.gitignore`.**

### 4. Start full app (backend + frontend) with one command
npm run dev

If ports are already in use, run a clean start:
npm run dev:clean

To stop/kick old listeners on dev ports manually:
npm run stop:dev

- Backend API: http://localhost:3000
- Frontend app: http://localhost:5173
- GPS Survey page: http://localhost:5173/gps-survey.html
- GPS Survey API: POST http://localhost:3000/api/gps-survey/submit

### 5. Optional: run backend only
cd backend
node server.js

---

## 📊 Expected Impact

| Metric | Value |
|---|---|
| Fraud risk score delivery | Under 2 minutes |
| Cost savings vs traditional legal | 80% cheaper |
| Title insurance (one-time) | ₹10,000 |
| Dispute resolution vs court | 1/20th the cost |

---

## 🌍 SDG Alignment

| SDG | How PropSafe Contributes |
|---|---|
| SDG 11 — Sustainable Cities | Safer verified urban property markets |
| SDG 16 — Peace & Justice | Blockchain-backed tamper-proof records |
| SDG 10 — Reduced Inequalities | Legal-grade verification at ₹500 instead of ₹5,000+ |

---

## 👩‍💻 Built by Kumari Shivani

Built to demonstrate how AI can make property verification fast, affordable, and accessible for every Indian family.

---

## 📎 Links

- 🎥 Live Demo: https://drive.google.com/file/d/1LNbNa454cK5N0Q77z4Oaz2RLuZdRWkyY/view
- 💻 GitHub: https://github.com/shivani-i-i/Propsafe

---

*PropSafe — Protecting Indian families, one property at a time. 🏠*