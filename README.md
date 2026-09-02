# MANU AI — Production-Ready Full-Stack AI Web Application

**Tagline:** *From Your Voice to an Official Government Document.*

MANU AI is an AI-powered portal designed to help citizens generate formal, professional, and compliant government document drafts directly from informal natural speech.

---

## Technical Architecture

- **Frontend:** React + Vite, deployed on Vercel.
- **Backend:** Python FastAPI, deployed on Render.
- **Database:** MongoDB Atlas.
- **Auth:** Supabase Authentication.

---

## Local Development

### Prerequisites
- Node.js (v18+)
- Python 3.9+
- MongoDB instance (or Atlas)

### Environment Variables (.env)
Create an `.env` file in the root directory based on `.env.example` and add your API keys:
- `GEMINI_API_KEY_VOICE`: Used for Audio-to-Text transcription.
- `GEMINI_API_KEY_STRUCTURING`: Used for text structuring and document generation.

### 1. Start Backend (Python FastAPI)
Open a new terminal window:
```bash
cd backend
pip install -r requirements.txt
python.exe -m pip install --upgrade pip (if needed)
python -m uvicorn main:app --reload --port 8000
```

### 2. Start Frontend (Vite + React)
Open a new terminal window at the root:
```bash
npm install
npm run dev
```
The application will be accessible at `http://localhost:5173`.
