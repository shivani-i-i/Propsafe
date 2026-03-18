# 🏠 PropSafe — AI-Powered Property Fraud Detection Platform

> Protecting Indian families from property fraud — one verification at a time.

[![SDG 11](https://img.shields.io/badge/SDG%2011-Sustainable%20Cities-orange)](https://sdgs.un.org/goals/goal11)
[![SDG 16](https://img.shields.io/badge/SDG%2016-Peace%20%26%20Justice-blue)](https://sdgs.un.org/goals/goal16)
[![SDG 10](https://img.shields.io/badge/SDG%2010-Reduced%20Inequalities-red)](https://sdgs.un.org/goals/goal10)

---

## 🔴 The Problem

Every year, thousands of Indian middle-class families lose their life savings to property fraud:

- **Fake ownership documents** — forged title deeds sold to unsuspecting buyers
- **Benami properties** — real ownership hidden under different names
- **Hidden loans & disputes** — properties sold with undisclosed mortgages
- **Unauthorized constructions** — buildings with no legal permits
- **No right to sell** — sellers who don't legally own the property

Property records in India are scattered across municipalities, revenue departments, and registrar offices — making it nearly impossible for ordinary buyers to verify anything.

---

## 💡 Our Solution

PropSafe is a full-stack AI-powered platform that combines fraud detection, verified legal access, and price intelligence into one ecosystem.

> "Not just a document scanner — a complete property fraud prevention ecosystem."

---

## ⚙️ Core Features

### 🤖 Feature 1 — AI Fraud Detection Engine
- Buyer fills in property details — type, city, seller name, ownership history, income vs value
- Claude AI analyzes for red flags: benami patterns, rapid transfers, income mismatch
- Returns a **Fraud Risk Score (0–100)** with LOW / MEDIUM / HIGH risk level
- Shows red flags, positive signs, recommendation, and immediate action
- HIGH risk auto-connects buyer to a verified lawyer

### ⚖️ Feature 2 — Verified Lawyer Marketplace
- 8 Bar Council verified property lawyers across Indian cities
- Cost: **₹500–₹1,000** vs ₹5,000+ traditional rate — **80% cheaper**
- Filter by city and specialization
- AI Legal Chat powered by Claude — ask any property law question instantly

### 📈 Feature 3 — Price Appreciation Predictor
- Historical price data 2015–2024 + predicted 2025–2026
- Chart.js visualization with teal historical and amber predicted lines
- Negotiation intelligence: "Property overpriced by ₹X — negotiate to ₹Y"
- Infrastructure tags showing upcoming metro, roads, hospitals boosting area value

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML, CSS, JavaScript |
| Backend | Node.js, Express |
| AI Engine | Anthropic Claude API (claude-sonnet-4-20250514) |
| Charts | Chart.js |
| Styling | Custom CSS, Google Fonts (Syne + DM Sans) |

---

## 🚀 Getting Started

### 1. Clone the repo
```bash
git clone https://github.com/shivani-i-i/Propsafe.git
cd Propsafe
```

### 2. Setup Backend
```bash
cd backend
npm install
```

### 3. Add your API key
Open `backend/.env` and add:
```
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```
Get your key at [console.anthropic.com](https://console.anthropic.com)

### 4. Start the backend
```bash
node server.js
```
Server runs at http://localhost:3000

### 5. Open the frontend
Open `frontend/index.html` in your browser or use Live Server in VS Code.

---

## 📁 Project Structure
```
PropSafe/
├── backend/
│   ├── controllers/
│   │   ├── fraudController.js
│   │   ├── lawyerController.js
│   │   ├── priceController.js
│   │   └── chatController.js
│   ├── routes/
│   │   ├── fraud.js
│   │   ├── lawyers.js
│   │   ├── price.js
│   │   └── chat.js
│   ├── data/
│   │   └── lawyers.json
│   ├── .env
│   ├── server.js
│   └── package.json
├── frontend/
│   ├── css/
│   │   ├── style.css
│   │   └── animations.css
│   ├── js/
│   │   ├── api.js
│   │   ├── app.js
│   │   ├── fraudDetection.js
│   │   ├── lawyerMarketplace.js
│   │   └── pricePredictor.js
│   └── index.html
└── README.md
```

---

## 🌍 SDG Alignment

| SDG | How PropSafe Helps |
|---|---|
| **SDG 11** — Sustainable Cities | Safer verified urban property markets |
| **SDG 16** — Peace & Justice | Fighting fraud with blockchain-backed AI records |
| **SDG 10** — Reduced Inequalities | Legal-grade verification at ₹500 instead of ₹5,000+ |

---

## 👩‍💻 Built for Hackathon

PropSafe was built as a hackathon project to demonstrate how AI can make property verification fast, affordable, and accessible for every Indian family.

---

*PropSafe — Protecting Indian families, one property at a time. 🏠*