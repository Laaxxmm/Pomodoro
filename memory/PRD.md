# FocusFlow - AI Task Prioritizer PRD

## Original Problem Statement
Build a web app to daily provide 3-4 main tasks, automated AI prioritization to decide what to do first, automatic rollover of unfinished tasks, Pomodoro timer, distraction-free design with violet/white/golden yellow theme.

## User Choices
- AI: Emergent LLM key (OpenAI GPT-5.2)
- Task Input: Manual + future Google Calendar/Gmail integration
- Timer: Pomodoro (25 min work, 5 min break)
- Notifications: Browser notifications for timer/summary
- Auth: None (single user)

## Architecture
- Frontend: React + Tailwind CSS + Shadcn UI
- Backend: FastAPI + Python
- Database: MongoDB
- AI: OpenAI GPT-5.2 via Emergent integrations

## Core Requirements
1. AI-powered daily task selection (3-4 tasks max)
2. Automatic task prioritization with reasoning
3. Pomodoro timer with work/break modes
4. Unfinished tasks rollover to next day
5. Distraction-free minimal interface
6. Premium violet/white/gold theme

## What's Been Implemented (Jan 2, 2025)
### Phase 1 - MVP
- [x] Task CRUD operations (add, view, complete, delete)
- [x] AI prioritization using GPT-5.2 with detailed reasoning
- [x] Priority scoring (Critical/Important/Normal badges)
- [x] Pomodoro timer with circular progress
- [x] Focus/Short Break/Long Break session modes
- [x] Real-time stats (completed, focus mins, pomodoros)
- [x] Settings dialog for timer configuration
- [x] Task rollover endpoint for next day
- [x] Browser notifications support
- [x] Premium Violet/Gold/White theme (Outfit + Plus Jakarta Sans fonts)

### Phase 2 - Weekly Report & Responsive
- [x] Weekly productivity report dialog
- [x] Tasks completed, focus time, pomodoros, completion rate metrics
- [x] Daily activity breakdown chart (7 days)
- [x] Week-over-week comparison (vs last week)
- [x] AI-generated insights (strengths, improvements, recommendations)
- [x] Category breakdown by time spent
- [x] Fully responsive design (mobile, tablet, desktop)
- [x] Mobile bottom action bar with Add/AI/Report buttons
- [x] Mobile hamburger menu with stats overview

## P0 Features (Complete)
- Task management with AI prioritization ✓
- Pomodoro timer with session tracking ✓
- Daily task limit (configurable, default 4) ✓
- Weekly report with AI insights ✓
- Responsive design ✓

## P1 Features (Planned)
- Google Calendar integration (OAuth flow)
- Gmail task extraction (read emails, extract action items)
- Dark mode support

## P2 Features (Backlog)
- Task categories filtering view
- Monthly statistics dashboard
- Export data (CSV/PDF)
- Task dependencies
- Custom notification sounds

## API Endpoints
- POST /api/tasks - Create task
- GET /api/tasks - List all tasks
- PUT /api/tasks/{id}/complete - Mark complete
- DELETE /api/tasks/{id} - Delete task
- GET /api/today - Get prioritized tasks
- POST /api/prioritize - Run AI prioritization
- POST /api/rollover - Move tasks to next day
- POST /api/pomodoro/start - Start session
- POST /api/pomodoro/complete - End session
- GET /api/stats - Daily statistics
- GET /api/report/weekly - Weekly report data
- POST /api/report/generate-insights - AI insights
- GET /api/settings - User settings
- PUT /api/settings - Update settings

## Next Tasks
1. Implement Google Calendar OAuth integration
2. Build Gmail task extraction feature
3. Add dark mode toggle
