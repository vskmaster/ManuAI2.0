# MANU AI — Production-Ready Full-Stack AI Web Application

**Tagline:** *From Your Voice to an Official Government Document.*

MANU AI is an AI-powered portal designed to help citizens generate formal, professional, and compliant government document drafts (Police Complaints, Public Grievances, Resignations, etc.) directly from informal natural speech (Tamil/English).

---

## Technical Architecture

The codebase contains a clean dual structure:
1. **Live Preview App (NodeJS/Express + Vite/React):** Configured to run out-of-the-box inside the Google AI Studio Development Workspace on Port 3000.
2. **Production Suite (FastAPI + React/Nginx + MongoDB + Docker Compose):** Prepackaged, clean-architecture structured directories (`/backend`, `/frontend`) designed for seamless production container deployment.

### Service Modules (Clean Architecture)

- **Frontend (`/frontend/`):** React 18 SPA powered by Tailwind CSS, Lucide-react, and Motion layout animations.
  - Features real-time voice speech-to-text recording with canvas wave visuals.
  - High-fidelity editable draft editors.
- **Backend (`/backend/`):** Python FastAPI application managing document rendering, database states, and AI prompt engineering.
  - **AI Model:** `mradermacher/oh-dcft-v3.1-gemini-1.5-flash-GGUF` powered by Serverless Inference or Google Gemini Fallback.
  - **Document Generation:** Uses ReportLab to compile high-quality PDF files (embedding uploaded image evidence) and `python-docx` for structured MS Word files.
  - **Database:** MongoDB Atlas or localized docker container instance for record persistence.

---

## Local Development & Docker Deployment

You can bring up the entire unified database, backend, and frontend stack in one command:

```bash
docker compose up --build
```

### Environment Variables (.env)

Define the following keys in your `.env` file before running the containers:

```env
GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
HUGGINGFACE_API_KEY="YOUR_HF_API_KEY"
MONGODB_URI="mongodb://mongodb:27017"
DATABASE_NAME="manu_ai"
```

### Direct Production Runs

#### 1. Backend (Python FastAPI)
```bash
cd backend
pip install -r requirements.txt
python main.py
```
Open Swagger API Docs: `http://localhost:8000/docs`

#### 2. Frontend (Vite + React)
```bash
cd frontend
npm install
npm run dev
```
Open App: `http://localhost:5173`
