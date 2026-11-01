# WebGuard AI 🛡️

> **"Don't Just Monitor Your Website. Understand Everything Happening Around It."**

WebGuard AI is an intelligent website monitoring and competitive intelligence SaaS platform. It combines automated HTTP health checks with **TinyFish API** web intelligence (Search, Fetch, and Agent browser automation) to detect website failures, monitor competitors, identify unexpected website changes, and automate functional user workflows.

---

## 🚀 Key Features & Core Modules

### 1. Website Health Monitoring Fleet
- Continuous HTTP availability monitoring with roundtrip latency (ms) benchmarking.
- HTTP status code inspection and redirect chain validation.
- Uptime calculations and status classifications (`healthy`, `degraded`, `down`).
- **SSRF Protection:** Built-in network isolation restricting access to loopback (`127.0.0.1`), private RFC1918 subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), and cloud metadata (`169.254.169.254`).

### 2. Autonomous Functional Testing Agent (TinyFish Agent)
- Headless browser automation powered by **TinyFish Agent API**.
- Executes goal-based functional smoke tests (e.g., Homepage hero verification, navigation & submenu audits, lead/signup forms, add-to-cart funnel tests).
- **Safety Policy:** Non-destructive automation with strict stopping guardrails prior to payment steps or irreversible transactions.

### 3. Competitor Intelligence & Price Surveillance (TinyFish Search & Fetch)
- Automated competitor website surveillance and pricing extraction.
- **AI Competitor Discovery:** Leverage **TinyFish Search** to discover market alternatives and competing domains.
- Automated extraction of product price points, promotional discounts, and availability statuses.
- Historical price comparison charts and alerts when competitors discount rates (>10%).

### 4. Website Change Detection & Diff Viewer (TinyFish Fetch)
- Webpage snapshots powered by **TinyFish Fetch**.
- Cryptographic SHA-256 baseline hashing and unified line-by-line diff generation.
- Classification engine distinguishing pricing modifications, error content introduction, and copy updates.

### 5. AI Incident Intelligence & Triage
- Automated anomaly correlation and severity scoring (`Critical`, `High`, `Medium`, `Low`, `Informational`).
- Distinguishes **confirmed observations** from **potential explanations**.
- Generates recommended corrective action plans with evidence extraction.

---

## 🛠️ Architecture & Tech Stack

```text
React 19 + TypeScript + Vite + Tailwind CSS
                   │
                   ▼ (HTTP/REST)
FastAPI Backend (Python 3.13)
  ├── Security Layer (SSRF Validator, JWT, Bcrypt)
  ├── Services (HealthMonitor, ChangeDetector, CompetitorService, AIAnalyzer)
  └── TinyFish Service (Search, Fetch, Agent, Monitor)
         │
         ├──► TinyFish Search API (https://api.search.tinyfish.ai)
         ├──► TinyFish Fetch API (https://api.fetch.tinyfish.ai)
         └──► TinyFish Agent API (https://agent.tinyfish.ai)
                   │
                   ▼
Database: PostgreSQL / SQLite (with auto-fallback for seamless local testing)
Cache & Workers: Redis + Celery
```

---

## 🔐 Credential Security Policy

- **Backend-Only Storage:** The `TINYFISH_API_KEY` is loaded exclusively inside `backend/.env`.
- **Zero Frontend Exposure:** The key is never exposed to the browser, JavaScript bundles, or client logs.
- **Git Protection:** `.env` files are ignored in `.gitignore`. A sanitized `.env.example` is provided.

---

## 🏃 Local Quickstart (Zero-Setup)

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### 1. Backend Setup
```bash
# Navigate to backend and create virtual environment
python -m venv backend/venv

# Activate virtual environment
# Windows:
.\backend\venv\Scripts\activate
# Linux/macOS:
source backend/venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt

# Configure backend/.env with your TinyFish API key:
# TINYFISH_API_KEY=sk-tinyfish-...

# Start FastAPI server (Port 8000)
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

Interactive Swagger documentation is available at: `http://localhost:8000/api/v1/docs`

### 2. Frontend Setup
```bash
# Navigate to frontend
cd frontend

# Install packages
npm install

# Start Vite dev server (Port 5173 with automatic /api proxy)
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## 🐳 Docker Deployment

To spin up the complete production stack (PostgreSQL, Redis, Backend, Frontend with Nginx):

```bash
docker-compose up --build
```

- WebGuard AI Dashboard: `http://localhost:5173`
- Backend API & Swagger: `http://localhost:8000/api/v1/docs`

---

## 🧪 Automated Testing

Run the comprehensive pytest suite verifying TinyFish authentication, SSRF filters, health monitoring, competitor tracking, and dashboard metrics:

```bash
.\backend\venv\Scripts\python -m pytest backend/tests/test_webguard.py -v
```

All 9 test suites validate successfully against the live TinyFish API and security requirements.
