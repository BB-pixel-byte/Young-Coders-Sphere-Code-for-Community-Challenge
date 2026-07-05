# ChoreMap

Connecting seniors with nearby volunteers for everyday chore help — and building community skill resilience along the way.

## What It Does

- **Seniors** request help with a chore using guided room capture (photos + optional short video). AI analyzes the space and generates a step-by-step plan, tools list, and safety notes.
- **Volunteers** set up a community profile with skills and availability, get matched to nearby open chores, and earn points redeemable at local businesses.
- **Coordinators** see a dashboard of community skill coverage, retention forecasts, and risk alerts to spot capability gaps before they become problems.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vite + React 18 (Tailwind CSS) |
| Backend | FastAPI (Python) |
| Database | SQLite |
| AI / Spatial Analysis | NVIDIA meta/llama-3.2-90b-vision-instruct (image + text inference) |

## Quick Start

### Backend

```bash
cd backend
pip install -r requirements.txt
.\venv\Scripts\Activate.ps1
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The React app opens at `http://localhost:5173` and expects the backend at `http://localhost:8000`.

## Project Structure

```
├── backend/
│   ├── main.py              # FastAPI application entry
│   ├── models/
│   │   └── database.py      # SQLite schema and init
│   ├── routes/              # API route modules
│   │   ├── users.py
│   │   ├── chores.py
│   │   ├── volunteers.py
│   │   ├── skills.py
│   │   └── profiles.py
│   └── services/
│       ├── ai_analyzer.py   # Local Gemma 4 inference adapter
│       └── matcher.py       # Volunteer scoring and ranking
├── frontend/
│   ├── index.html           # Vite entry HTML
│   ├── src/
│   │   ├── main.jsx         # React entry point
│   │   ├── App.jsx          # Root component with tab navigation
│   │   └── pages/           # Role-specific page components
│   ├── package.json
│   └── vite.config.js
├── ticket.md                # Canonical implementation backlog
└── AGENT.md                 # Agent working agreement
```

## MVP Scope

- Three role experiences: Senior, Volunteer, Coordinator
- Guided room capture via photo/video upload + AI spatial analysis
- Ranked volunteer matching by skill overlap and availability
- Points and mock rewards for completed chores
- Community skill resilience dashboard with risk forecasting

True AR/3D reconstruction, live partner integrations, and external AI APIs are out of MVP scope.
