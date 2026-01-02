# FocusFlow - AI Task Prioritizer PRD

## Original Problem Statement
Build a web app to daily provide 3-4 main tasks, automated AI prioritization to decide what to do first, automatic rollover of unfinished tasks, Pomodoro timer, distraction-free design with violet/white/golden yellow theme.

## User Choices
- AI: Emergent LLM key (OpenAI GPT-5.2)
- Task Input: Manual + Google Calendar/Gmail integration
- Timer: Pomodoro (25 min work, 5 min break)
- Notifications: Browser notifications for timer/summary
- Auth: None (single user)

## Architecture
- Frontend: React + Tailwind CSS + Shadcn UI
- Backend: FastAPI + Python
- Database: MongoDB
- AI: OpenAI GPT-5.2 via Emergent integrations
- Google APIs: Calendar, Gmail (OAuth 2.0)

## What's Been Implemented (Jan 2, 2025)

### Phase 1 - MVP ✓
- Task CRUD operations (add, view, complete, delete)
- AI prioritization using GPT-5.2 with detailed reasoning
- Priority scoring (Critical/Important/Normal badges)
- Pomodoro timer with circular progress
- Focus/Short Break/Long Break session modes
- Real-time stats (completed, focus mins, pomodoros)
- Settings dialog for timer configuration
- Task rollover endpoint for next day
- Browser notifications support
- Premium Violet/Gold/White theme

### Phase 2 - Weekly Report & Responsive ✓
- Weekly productivity report dialog
- AI-generated insights (strengths, improvements, recommendations)
- Daily activity breakdown chart (7 days)
- Week-over-week comparison
- Category breakdown by time spent
- Fully responsive design (mobile, tablet, desktop)
- Mobile bottom action bar

### Phase 3 - Google Integration & Dark Mode ✓
- **Google OAuth 2.0 Integration** (ready for credentials)
  - Calendar events import as tasks
  - Gmail email reading
  - AI-powered task extraction from emails
  - Token refresh handling
- **Dark Mode** 
  - Toggle in header and settings
  - CSS variables for theme switching
  - Persistent setting in database
- Google Integration dialog with connection status
- Settings updated with appearance section

## API Endpoints

### Core
- POST /api/tasks - Create task
- GET /api/tasks - List tasks
- PUT /api/tasks/{id}/complete - Complete task
- DELETE /api/tasks/{id} - Delete task
- GET /api/today - Get prioritized tasks
- POST /api/prioritize - Run AI prioritization
- POST /api/rollover - Move tasks to next day

### Pomodoro
- POST /api/pomodoro/start - Start session
- POST /api/pomodoro/complete - End session
- GET /api/pomodoro/stats - Session stats

### Reports
- GET /api/stats - Daily statistics
- GET /api/report/weekly - Weekly report
- POST /api/report/generate-insights - AI insights

### Google Integration
- GET /api/auth/google/login - Initiate OAuth
- GET /api/auth/google/callback - OAuth callback
- POST /api/auth/google/disconnect - Disconnect
- GET /api/calendar/events - Fetch calendar events
- POST /api/calendar/import - Import events as tasks
- GET /api/gmail/messages - Fetch emails
- POST /api/gmail/extract-tasks - AI extract tasks from email

### Settings
- GET /api/settings - Get settings
- PUT /api/settings - Update settings

## Configuration Required
To enable Google integration, add to `/app/backend/.env`:
```
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=https://your-app-url/api/auth/google/callback
```

## P0 Features (Complete) ✓
- Task management with AI prioritization
- Pomodoro timer with session tracking
- Weekly report with AI insights
- Responsive design
- Dark mode
- Google Calendar/Gmail integration (logic ready)

## P1 Features (Backlog)
- Task categories filtering view
- Monthly statistics dashboard
- Export data (CSV/PDF)

## P2 Features (Future)
- Task dependencies
- Custom notification sounds
- Team collaboration mode
