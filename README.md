# StudySpark AI ⚡
> **Tagline:** Learn Smarter, Not Harder. 📚
> 
🧩 The Problem

Students don't struggle for lack of material. They struggle with turning it into understanding. Textbooks are dense, notes are messy, and exam deadlines sneak up. Most students end up re-reading passively, which is one of the least effective ways to study.

💡 Our Solution

StudySpark AI is an AI study companion that turns any topic or set of notes into four things students actually need: a clear explanation, a tight summary, a practice quiz, and a realistic study schedule. All in one place, powered by Gemma 4 through the Gemini API.
StudySpark AI is an AI-powered study assistant built with FastAPI, Gemma 4 (via Google GenAI SDK / Gemini API), and Vite + React with Tailwind CSS.

## Features
- 💡 **Explain a Topic**: Multi-level conceptual explanations with worked real-world examples.
- 📝 **Summarize Notes**: Extractive, accurate note summaries with key concepts and definitions.
- 🎯 **Generate Quiz**: 5 interactive multiple-choice questions with answer shuffling and explanations.
- 📅 **Generate Study Plan**: Day-by-day deadline-aware schedule with activity tags.

## Project Structure
```text
StudySparkAI/
├── AGENTS.md                  # Autonomous agent instructions & strict rules
├── docs/spec/                 # Project specifications (PRD, TRD, API, Prompts, UI/UX)
├── backend/                   # FastAPI backend
│   ├── main.py                # FastAPI entry point & routes
│   ├── config.py              # Environment settings (Pydantic Settings)
│   ├── gemma_service.py       # Gemma AI model service wrapper
│   ├── smoke_test.py          # Model verification script
│   ├── requirements.txt       # Python dependencies
│   ├── .env.example           # Backend environment template
│   └── tests/                 # Backend test suite
├── frontend/                  # Vite + React frontend
│   ├── src/                   # React components, hooks, services
│   ├── package.json           # Frontend dependencies
│   └── .env.example           # Frontend environment template
└── README.md
```

## Quick Start (Windows PowerShell)

### Backend Setup
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
# Edit .env and supply GEMINI_API_KEY
uvicorn main:app --reload --port 8000
```
Health endpoint: [http://localhost:8000/api/health](http://localhost:8000/api/health)

### Frontend Setup
```powershell
cd frontend
npm install
Copy-Item .env.example .env
# Default runs in mock mode (VITE_USE_MOCKS=true)
npm run dev
```
Access the frontend at: [http://localhost:5173](http://localhost:5173)

### Verification Commands
- Backend Tests: `pytest` inside `backend/`
- Gemma Live Smoke Test: `python smoke_test.py` inside `backend/`
