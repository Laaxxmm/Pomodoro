# FocusFlow (Pomodoro-main)

A productivity application combining a Pomodoro timer with AI-driven task management and Google Workspace integration.

## Setup

### 1. Prerequisites
- Python 3.11+
- Node.js & npm
- Supabase Account
- Google Gemini API Key

### 2. Backend Setup
1.  Navigate to `backend/`.
2.  Install dependencies: `pip install -r requirements.txt`
3.  Set up Supabase:
    -   Create a new project at [supabase.com](https://supabase.com).
    -   Run the SQL in `backend/supabase_schema.sql` in the Supabase SQL Editor.
4.  Configure Environment:
    -   Copy `.env.example` to `.env`.
    -   Fill in `SUPABASE_URL`, `SUPABASE_KEY`, and `GEMINI_API_KEY`.

### 3. Frontend Setup
1.  Navigate to `frontend/`.
2.  Install dependencies: `npm install`
3.  Start the app: `npm start`

## Deployment (Vercel)
The project is configured for Vercel.
1.  Install Vercel CLI: `npm i -g vercel`
2.  Run `vercel` in the root directory.
3.  Set the environment variables in the Vercel project settings.
