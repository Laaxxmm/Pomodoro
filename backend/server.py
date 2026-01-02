from fastapi import FastAPI, APIRouter, HTTPException, Query
from fastapi.responses import RedirectResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from emergentintegrations.llm.chat import LlmChat, UserMessage
import httpx
import base64

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Emergent LLM Key
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

# Google OAuth Config
GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID', '')
GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET', '')
GOOGLE_REDIRECT_URI = os.environ.get('GOOGLE_REDIRECT_URI', '')
GOOGLE_SCOPES = [
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile"
]

app = FastAPI(title="FocusFlow - AI Task Prioritizer")
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============ MODELS ============

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    deadline: Optional[str] = None
    estimated_minutes: Optional[int] = 25
    category: Optional[str] = "general"
    source: str = "manual"

class Task(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str = ""
    deadline: Optional[str] = None
    estimated_minutes: int = 25
    category: str = "general"
    source: str = "manual"
    priority_score: int = 0
    priority_reason: str = ""
    completed: bool = False
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    time_spent_seconds: int = 0
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    scheduled_date: str = Field(default_factory=lambda: datetime.now(timezone.utc).date().isoformat())
    rollover_count: int = 0

class DailyPlan(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    date: str
    task_ids: List[str] = []
    prioritization_reason: str = ""
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class PomodoroSession(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    task_id: str
    started_at: str
    ended_at: Optional[str] = None
    duration_seconds: int = 0
    session_type: str = "work"
    completed: bool = False

class Settings(BaseModel):
    id: str = "user_settings"
    pomodoro_work_minutes: int = 25
    pomodoro_short_break: int = 5
    pomodoro_long_break: int = 15
    daily_task_limit: int = 4
    auto_rollover: bool = True
    google_calendar_connected: bool = False
    gmail_connected: bool = False
    google_access_token: Optional[str] = None
    google_refresh_token: Optional[str] = None
    google_token_expiry: Optional[str] = None
    google_email: Optional[str] = None
    dark_mode: bool = False

# ============ HELPER FUNCTIONS ============

async def get_settings():
    """Get user settings or create defaults"""
    settings = await db.settings.find_one({"id": "user_settings"}, {"_id": 0})
    if not settings:
        default_settings = Settings().model_dump()
        await db.settings.insert_one(default_settings)
        return default_settings
    return settings

async def refresh_google_token():
    """Refresh Google access token if expired"""
    settings = await get_settings()
    if not settings.get("google_refresh_token"):
        return None
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "client_id": GOOGLE_CLIENT_ID,
                    "client_secret": GOOGLE_CLIENT_SECRET,
                    "refresh_token": settings["google_refresh_token"],
                    "grant_type": "refresh_token"
                }
            )
            if response.status_code == 200:
                token_data = response.json()
                await db.settings.update_one(
                    {"id": "user_settings"},
                    {"$set": {
                        "google_access_token": token_data["access_token"],
                        "google_token_expiry": (datetime.now(timezone.utc) + timedelta(seconds=token_data.get("expires_in", 3600))).isoformat()
                    }}
                )
                return token_data["access_token"]
    except Exception as e:
        logger.error(f"Token refresh error: {e}")
    return None

async def get_valid_google_token():
    """Get a valid Google access token, refreshing if needed"""
    settings = await get_settings()
    if not settings.get("google_access_token"):
        return None
    
    # Check if token is expired
    if settings.get("google_token_expiry"):
        expiry = datetime.fromisoformat(settings["google_token_expiry"].replace("Z", "+00:00"))
        if datetime.now(timezone.utc) >= expiry:
            return await refresh_google_token()
    
    return settings.get("google_access_token")

async def prioritize_tasks_with_ai(tasks: List[dict]) -> dict:
    """Use AI to prioritize tasks and select top 3-4 for today"""
    if not tasks:
        return {"selected_task_ids": [], "reason": "No tasks available"}
    
    if not EMERGENT_LLM_KEY:
        sorted_tasks = sorted(tasks, key=lambda x: (
            -x.get('rollover_count', 0),
            x.get('deadline') or '9999-12-31',
            -x.get('estimated_minutes', 25)
        ))
        selected = sorted_tasks[:4]
        return {
            "selected_task_ids": [t['id'] for t in selected],
            "reason": "Prioritized by deadline and urgency (AI unavailable)",
            "task_priorities": {t['id']: {"score": 100 - i*20, "reason": f"Priority #{i+1}"} for i, t in enumerate(selected)}
        }
    
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"prioritize_{datetime.now().isoformat()}",
            system_message="""You are a productivity expert. Analyze the given tasks and select the 3-4 MOST IMPORTANT tasks for today.
            
Consider:
1. Deadlines (urgent tasks first)
2. Revenue/business impact
3. Dependencies (what unblocks other work)
4. Rollover count (tasks repeatedly postponed need attention)
5. Estimated time vs available work hours

Respond in JSON format:
{
    "selected_task_ids": ["id1", "id2", "id3"],
    "reason": "Brief explanation of prioritization logic",
    "task_priorities": {
        "id1": {"score": 95, "reason": "Critical deadline today"},
        "id2": {"score": 85, "reason": "High revenue impact"}
    }
}"""
        )
        chat.with_model("openai", "gpt-5.2")
        
        task_list = "\n".join([
            f"- ID: {t['id']}, Title: {t['title']}, Deadline: {t.get('deadline', 'None')}, "
            f"Est: {t.get('estimated_minutes', 25)}min, Category: {t.get('category', 'general')}, "
            f"Source: {t.get('source', 'manual')}, Rollover: {t.get('rollover_count', 0)}, Desc: {t.get('description', '')[:100]}"
            for t in tasks
        ])
        
        message = UserMessage(text=f"Today's date: {datetime.now().date().isoformat()}\n\nTasks to prioritize:\n{task_list}")
        response = await chat.send_message(message)
        
        import json
        try:
            json_start = response.find('{')
            json_end = response.rfind('}') + 1
            if json_start != -1 and json_end > json_start:
                result = json.loads(response[json_start:json_end])
                return result
        except json.JSONDecodeError:
            pass
        
        sorted_tasks = sorted(tasks, key=lambda x: (-x.get('rollover_count', 0), x.get('deadline') or '9999-12-31'))
        return {
            "selected_task_ids": [t['id'] for t in sorted_tasks[:4]],
            "reason": "Prioritized by deadline and urgency",
            "task_priorities": {}
        }
        
    except Exception as e:
        logger.error(f"AI prioritization error: {e}")
        sorted_tasks = sorted(tasks, key=lambda x: (-x.get('rollover_count', 0), x.get('deadline') or '9999-12-31'))
        return {
            "selected_task_ids": [t['id'] for t in sorted_tasks[:4]],
            "reason": f"Prioritized by deadline (AI error: {str(e)[:50]})",
            "task_priorities": {}
        }

# ============ GOOGLE OAUTH ROUTES ============

@api_router.get("/auth/google/login")
async def google_login():
    """Initiate Google OAuth flow"""
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(status_code=400, detail="Google OAuth not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to backend/.env")
    
    scope = " ".join(GOOGLE_SCOPES)
    auth_url = (
        f"https://accounts.google.com/o/oauth2/v2/auth?"
        f"client_id={GOOGLE_CLIENT_ID}&"
        f"redirect_uri={GOOGLE_REDIRECT_URI}&"
        f"response_type=code&"
        f"scope={scope}&"
        f"access_type=offline&"
        f"prompt=consent"
    )
    return {"authorization_url": auth_url}

@api_router.get("/auth/google/callback")
async def google_callback(code: str, error: Optional[str] = None):
    """Handle Google OAuth callback"""
    if error:
        return RedirectResponse(url=f"/?error={error}")
    
    try:
        # Exchange code for tokens
        async with httpx.AsyncClient() as http_client:
            token_response = await http_client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "code": code,
                    "client_id": GOOGLE_CLIENT_ID,
                    "client_secret": GOOGLE_CLIENT_SECRET,
                    "redirect_uri": GOOGLE_REDIRECT_URI,
                    "grant_type": "authorization_code"
                }
            )
            
            if token_response.status_code != 200:
                logger.error(f"Token exchange failed: {token_response.text}")
                return RedirectResponse(url="/?error=token_exchange_failed")
            
            token_data = token_response.json()
            
            # Get user info
            user_response = await http_client.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {token_data['access_token']}"}
            )
            user_info = user_response.json()
            
            # Save tokens to settings
            expiry = datetime.now(timezone.utc) + timedelta(seconds=token_data.get("expires_in", 3600))
            await db.settings.update_one(
                {"id": "user_settings"},
                {"$set": {
                    "google_access_token": token_data["access_token"],
                    "google_refresh_token": token_data.get("refresh_token"),
                    "google_token_expiry": expiry.isoformat(),
                    "google_email": user_info.get("email"),
                    "google_calendar_connected": True,
                    "gmail_connected": True
                }},
                upsert=True
            )
            
            return RedirectResponse(url="/?google_connected=true")
            
    except Exception as e:
        logger.error(f"Google callback error: {e}")
        return RedirectResponse(url=f"/?error={str(e)[:50]}")

@api_router.post("/auth/google/disconnect")
async def google_disconnect():
    """Disconnect Google account"""
    await db.settings.update_one(
        {"id": "user_settings"},
        {"$set": {
            "google_access_token": None,
            "google_refresh_token": None,
            "google_token_expiry": None,
            "google_email": None,
            "google_calendar_connected": False,
            "gmail_connected": False
        }}
    )
    return {"success": True}

# ============ GOOGLE CALENDAR ROUTES ============

@api_router.get("/calendar/events")
async def get_calendar_events(days: int = 7):
    """Get upcoming calendar events"""
    token = await get_valid_google_token()
    if not token:
        raise HTTPException(status_code=401, detail="Google not connected")
    
    try:
        time_min = datetime.now(timezone.utc).isoformat()
        time_max = (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()
        
        async with httpx.AsyncClient() as http_client:
            response = await http_client.get(
                "https://www.googleapis.com/calendar/v3/calendars/primary/events",
                headers={"Authorization": f"Bearer {token}"},
                params={
                    "timeMin": time_min,
                    "timeMax": time_max,
                    "singleEvents": "true",
                    "orderBy": "startTime",
                    "maxResults": 50
                }
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail="Failed to fetch calendar events")
            
            data = response.json()
            events = []
            for item in data.get("items", []):
                start = item.get("start", {})
                events.append({
                    "id": item.get("id"),
                    "title": item.get("summary", "Untitled"),
                    "description": item.get("description", ""),
                    "start": start.get("dateTime") or start.get("date"),
                    "end": item.get("end", {}).get("dateTime") or item.get("end", {}).get("date"),
                    "location": item.get("location"),
                    "all_day": "date" in start
                })
            
            return {"events": events}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Calendar fetch error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/calendar/import")
async def import_calendar_events(days: int = 7):
    """Import calendar events as tasks"""
    events_response = await get_calendar_events(days)
    events = events_response["events"]
    
    imported = 0
    for event in events:
        # Skip all-day events or events without clear action items
        if event.get("all_day"):
            continue
        
        # Check if already imported
        existing = await db.tasks.find_one({"source_id": event["id"], "source": "calendar"})
        if existing:
            continue
        
        # Parse deadline from event start
        deadline = None
        if event.get("start"):
            try:
                if "T" in event["start"]:
                    deadline = event["start"][:10]
                else:
                    deadline = event["start"]
            except:
                pass
        
        task = Task(
            title=event["title"],
            description=event.get("description", "")[:500] if event.get("description") else f"Calendar event: {event.get('location', '')}",
            deadline=deadline,
            estimated_minutes=30,
            category="meeting",
            source="calendar"
        )
        task_dict = task.model_dump()
        task_dict["source_id"] = event["id"]
        await db.tasks.insert_one(task_dict)
        imported += 1
    
    return {"imported": imported, "total_events": len(events)}

# ============ GMAIL ROUTES ============

@api_router.get("/gmail/messages")
async def get_gmail_messages(max_results: int = 10, query: str = "is:unread"):
    """Get recent Gmail messages"""
    token = await get_valid_google_token()
    if not token:
        raise HTTPException(status_code=401, detail="Google not connected")
    
    try:
        async with httpx.AsyncClient() as http_client:
            # List messages
            list_response = await http_client.get(
                "https://gmail.googleapis.com/gmail/v1/users/me/messages",
                headers={"Authorization": f"Bearer {token}"},
                params={"q": query, "maxResults": max_results}
            )
            
            if list_response.status_code != 200:
                raise HTTPException(status_code=list_response.status_code, detail="Failed to fetch Gmail messages")
            
            messages_data = list_response.json()
            messages = []
            
            for msg in messages_data.get("messages", [])[:max_results]:
                # Get full message
                msg_response = await http_client.get(
                    f"https://gmail.googleapis.com/gmail/v1/users/me/messages/{msg['id']}",
                    headers={"Authorization": f"Bearer {token}"},
                    params={"format": "full"}
                )
                
                if msg_response.status_code == 200:
                    msg_data = msg_response.json()
                    headers = {h["name"]: h["value"] for h in msg_data.get("payload", {}).get("headers", [])}
                    
                    # Extract body
                    body = ""
                    payload = msg_data.get("payload", {})
                    if "parts" in payload:
                        for part in payload["parts"]:
                            if part.get("mimeType") == "text/plain" and part.get("body", {}).get("data"):
                                body = base64.urlsafe_b64decode(part["body"]["data"]).decode("utf-8", errors="ignore")
                                break
                    elif payload.get("body", {}).get("data"):
                        body = base64.urlsafe_b64decode(payload["body"]["data"]).decode("utf-8", errors="ignore")
                    
                    messages.append({
                        "id": msg["id"],
                        "subject": headers.get("Subject", "(No Subject)"),
                        "from": headers.get("From", "Unknown"),
                        "date": headers.get("Date", ""),
                        "snippet": msg_data.get("snippet", ""),
                        "body": body[:2000] if body else msg_data.get("snippet", "")
                    })
            
            return {"messages": messages}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Gmail fetch error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/gmail/extract-tasks")
async def extract_tasks_from_email(email_id: str):
    """Extract action items from an email using AI"""
    # Get the email
    token = await get_valid_google_token()
    if not token:
        raise HTTPException(status_code=401, detail="Google not connected")
    
    try:
        async with httpx.AsyncClient() as http_client:
            msg_response = await http_client.get(
                f"https://gmail.googleapis.com/gmail/v1/users/me/messages/{email_id}",
                headers={"Authorization": f"Bearer {token}"},
                params={"format": "full"}
            )
            
            if msg_response.status_code != 200:
                raise HTTPException(status_code=404, detail="Email not found")
            
            msg_data = msg_response.json()
            headers = {h["name"]: h["value"] for h in msg_data.get("payload", {}).get("headers", [])}
            
            # Extract body
            body = ""
            payload = msg_data.get("payload", {})
            if "parts" in payload:
                for part in payload["parts"]:
                    if part.get("mimeType") == "text/plain" and part.get("body", {}).get("data"):
                        body = base64.urlsafe_b64decode(part["body"]["data"]).decode("utf-8", errors="ignore")
                        break
            elif payload.get("body", {}).get("data"):
                body = base64.urlsafe_b64decode(payload["body"]["data"]).decode("utf-8", errors="ignore")
            
            subject = headers.get("Subject", "")
            sender = headers.get("From", "")
            
            if not body:
                body = msg_data.get("snippet", "")
        
        # Use AI to extract tasks
        if not EMERGENT_LLM_KEY:
            return {"tasks": [], "message": "AI not configured"}
        
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"email_extract_{datetime.now().isoformat()}",
            system_message="""Extract actionable tasks from this email. Return JSON:
{
    "tasks": [
        {"title": "Task description", "deadline": "YYYY-MM-DD or null", "priority": "high/medium/low", "category": "work/personal/follow-up"}
    ]
}
Only include clear action items. If no tasks found, return empty tasks array."""
        )
        chat.with_model("openai", "gpt-5.2")
        
        message = UserMessage(text=f"Subject: {subject}\nFrom: {sender}\n\nEmail body:\n{body[:3000]}")
        response = await chat.send_message(message)
        
        import json
        try:
            json_start = response.find('{')
            json_end = response.rfind('}') + 1
            if json_start != -1 and json_end > json_start:
                result = json.loads(response[json_start:json_end])
                
                # Create tasks from extracted items
                created_tasks = []
                for item in result.get("tasks", []):
                    task = Task(
                        title=item.get("title", ""),
                        description=f"From email: {subject[:100]}",
                        deadline=item.get("deadline"),
                        estimated_minutes=25,
                        category=item.get("category", "email"),
                        source="email"
                    )
                    task_dict = task.model_dump()
                    task_dict["source_id"] = email_id
                    task_dict["priority_score"] = 80 if item.get("priority") == "high" else 50 if item.get("priority") == "medium" else 30
                    await db.tasks.insert_one(task_dict)
                    created_tasks.append(task_dict)
                
                return {"tasks": created_tasks, "extracted": len(created_tasks)}
        except json.JSONDecodeError:
            pass
        
        return {"tasks": [], "message": "Could not extract tasks"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Email extraction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============ TASK ROUTES ============

@api_router.get("/")
async def root():
    return {"message": "FocusFlow API - AI Task Prioritizer"}

@api_router.get("/health")
async def health():
    return {"status": "healthy", "ai_enabled": bool(EMERGENT_LLM_KEY), "google_configured": bool(GOOGLE_CLIENT_ID)}

@api_router.post("/tasks", response_model=Task)
async def create_task(task_input: TaskCreate):
    """Create a new task"""
    task = Task(
        title=task_input.title,
        description=task_input.description or "",
        deadline=task_input.deadline,
        estimated_minutes=task_input.estimated_minutes or 25,
        category=task_input.category or "general",
        source=task_input.source
    )
    await db.tasks.insert_one(task.model_dump())
    return task

@api_router.get("/tasks", response_model=List[Task])
async def get_tasks(include_completed: bool = False, date: Optional[str] = None):
    """Get all tasks, optionally filtered"""
    query = {}
    if not include_completed:
        query["completed"] = False
    if date:
        query["scheduled_date"] = date
    
    tasks = await db.tasks.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return tasks

@api_router.get("/tasks/{task_id}", response_model=Task)
async def get_task(task_id: str):
    """Get a specific task"""
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

@api_router.put("/tasks/{task_id}")
async def update_task(task_id: str, updates: dict):
    """Update a task"""
    allowed_fields = ["title", "description", "deadline", "estimated_minutes", "category", "priority_score"]
    update_data = {k: v for k, v in updates.items() if k in allowed_fields}
    
    result = await db.tasks.update_one({"id": task_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"success": True}

@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str):
    """Delete a task"""
    result = await db.tasks.delete_one({"id": task_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"success": True}

@api_router.put("/tasks/{task_id}/complete")
async def complete_task(task_id: str, time_spent_seconds: int = 0):
    """Mark a task as completed"""
    result = await db.tasks.update_one(
        {"id": task_id},
        {"$set": {
            "completed": True,
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "time_spent_seconds": time_spent_seconds
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"success": True}

@api_router.put("/tasks/{task_id}/start")
async def start_task(task_id: str):
    """Start working on a task"""
    result = await db.tasks.update_one(
        {"id": task_id},
        {"$set": {"started_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"success": True, "started_at": datetime.now(timezone.utc).isoformat()}

# Today's Prioritized Tasks
@api_router.get("/today")
async def get_today_tasks():
    """Get AI-prioritized tasks for today"""
    today = datetime.now(timezone.utc).date().isoformat()
    
    plan = await db.daily_plans.find_one({"date": today}, {"_id": 0})
    
    if plan:
        tasks = await db.tasks.find(
            {"id": {"$in": plan["task_ids"]}, "completed": False},
            {"_id": 0}
        ).to_list(10)
        return {
            "date": today,
            "tasks": tasks,
            "reason": plan.get("prioritization_reason", ""),
            "plan_id": plan["id"]
        }
    
    return await prioritize_today()

@api_router.post("/prioritize")
async def prioritize_today():
    """Run AI prioritization for today's tasks"""
    today = datetime.now(timezone.utc).date().isoformat()
    settings = await get_settings()
    
    all_tasks = await db.tasks.find({"completed": False}, {"_id": 0}).to_list(100)
    
    if not all_tasks:
        return {"date": today, "tasks": [], "reason": "No tasks to prioritize"}
    
    result = await prioritize_tasks_with_ai(all_tasks)
    
    task_priorities = result.get("task_priorities", {})
    for task_id, priority_info in task_priorities.items():
        await db.tasks.update_one(
            {"id": task_id},
            {"$set": {
                "priority_score": priority_info.get("score", 0),
                "priority_reason": priority_info.get("reason", "")
            }}
        )
    
    plan = DailyPlan(
        date=today,
        task_ids=result["selected_task_ids"][:settings["daily_task_limit"]],
        prioritization_reason=result["reason"]
    )
    
    await db.daily_plans.update_one(
        {"date": today},
        {"$set": plan.model_dump()},
        upsert=True
    )
    
    tasks = await db.tasks.find(
        {"id": {"$in": plan.task_ids}, "completed": False},
        {"_id": 0}
    ).to_list(10)
    
    tasks.sort(key=lambda x: -x.get("priority_score", 0))
    
    return {
        "date": today,
        "tasks": tasks,
        "reason": result["reason"],
        "plan_id": plan.id
    }

# Rollover unfinished tasks
@api_router.post("/rollover")
async def rollover_tasks():
    """Move unfinished tasks to the next day"""
    today = datetime.now(timezone.utc).date().isoformat()
    tomorrow = (datetime.now(timezone.utc).date() + timedelta(days=1)).isoformat()
    
    result = await db.tasks.update_many(
        {"completed": False, "scheduled_date": {"$lte": today}},
        {
            "$set": {"scheduled_date": tomorrow},
            "$inc": {"rollover_count": 1}
        }
    )
    
    return {
        "rolled_over": result.modified_count,
        "new_date": tomorrow
    }

# Pomodoro Sessions
@api_router.post("/pomodoro/start")
async def start_pomodoro(task_id: str, session_type: str = "work"):
    """Start a pomodoro session"""
    session = PomodoroSession(
        task_id=task_id,
        started_at=datetime.now(timezone.utc).isoformat(),
        session_type=session_type
    )
    await db.pomodoro_sessions.insert_one(session.model_dump())
    
    await db.tasks.update_one(
        {"id": task_id, "started_at": None},
        {"$set": {"started_at": session.started_at}}
    )
    
    return session

@api_router.post("/pomodoro/complete")
async def complete_pomodoro(session_id: str, duration_seconds: int):
    """Complete a pomodoro session"""
    ended_at = datetime.now(timezone.utc).isoformat()
    
    result = await db.pomodoro_sessions.update_one(
        {"id": session_id},
        {"$set": {
            "ended_at": ended_at,
            "duration_seconds": duration_seconds,
            "completed": True
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = await db.pomodoro_sessions.find_one({"id": session_id}, {"_id": 0})
    if session and session["session_type"] == "work":
        await db.tasks.update_one(
            {"id": session["task_id"]},
            {"$inc": {"time_spent_seconds": duration_seconds}}
        )
    
    return {"success": True, "ended_at": ended_at}

@api_router.get("/pomodoro/stats")
async def get_pomodoro_stats():
    """Get pomodoro statistics"""
    today = datetime.now(timezone.utc).date().isoformat()
    
    sessions = await db.pomodoro_sessions.find({
        "session_type": "work",
        "completed": True,
        "started_at": {"$gte": today}
    }, {"_id": 0}).to_list(100)
    
    total_focus_time = sum(s.get("duration_seconds", 0) for s in sessions)
    
    return {
        "today_sessions": len(sessions),
        "today_focus_minutes": total_focus_time // 60,
        "sessions": sessions
    }

# Settings
@api_router.get("/settings")
async def get_user_settings():
    """Get user settings"""
    return await get_settings()

@api_router.put("/settings")
async def update_settings(updates: dict):
    """Update user settings"""
    allowed_fields = ["pomodoro_work_minutes", "pomodoro_short_break", "pomodoro_long_break", 
                      "daily_task_limit", "auto_rollover", "dark_mode"]
    update_data = {k: v for k, v in updates.items() if k in allowed_fields}
    
    await db.settings.update_one(
        {"id": "user_settings"},
        {"$set": update_data},
        upsert=True
    )
    return await get_settings()

# Stats
@api_router.get("/stats")
async def get_stats():
    """Get productivity statistics"""
    today = datetime.now(timezone.utc).date().isoformat()
    
    completed_today = await db.tasks.count_documents({
        "completed": True,
        "completed_at": {"$gte": today}
    })
    
    pending = await db.tasks.count_documents({"completed": False})
    
    sessions = await db.pomodoro_sessions.find({
        "session_type": "work",
        "completed": True,
        "started_at": {"$gte": today}
    }, {"_id": 0}).to_list(100)
    
    total_focus = sum(s.get("duration_seconds", 0) for s in sessions)
    
    return {
        "completed_today": completed_today,
        "pending_tasks": pending,
        "focus_minutes_today": total_focus // 60,
        "pomodoros_today": len(sessions)
    }

# Weekly Report
@api_router.get("/report/weekly")
async def get_weekly_report():
    """Get weekly productivity report"""
    today = datetime.now(timezone.utc).date()
    week_ago = (today - timedelta(days=7)).isoformat()
    two_weeks_ago = (today - timedelta(days=14)).isoformat()
    today_str = today.isoformat()
    
    completed_tasks = await db.tasks.find({
        "completed": True,
        "completed_at": {"$gte": week_ago}
    }, {"_id": 0}).to_list(500)
    
    sessions = await db.pomodoro_sessions.find({
        "session_type": "work",
        "completed": True,
        "started_at": {"$gte": week_ago}
    }, {"_id": 0}).to_list(500)
    
    total_focus = sum(s.get("duration_seconds", 0) for s in sessions) // 60
    
    prev_completed = await db.tasks.count_documents({
        "completed": True,
        "completed_at": {"$gte": two_weeks_ago, "$lt": week_ago}
    })
    
    prev_sessions = await db.pomodoro_sessions.find({
        "session_type": "work",
        "completed": True,
        "started_at": {"$gte": two_weeks_ago, "$lt": week_ago}
    }, {"_id": 0}).to_list(500)
    
    prev_focus = sum(s.get("duration_seconds", 0) for s in prev_sessions) // 60
    
    total_created = await db.tasks.count_documents({
        "created_at": {"$gte": week_ago}
    })
    completion_rate = round((len(completed_tasks) / max(total_created, 1)) * 100)
    
    daily_breakdown = []
    for i in range(7):
        day = (today - timedelta(days=i)).isoformat()
        day_tasks = len([t for t in completed_tasks if t.get("completed_at", "").startswith(day)])
        day_sessions = [s for s in sessions if s.get("started_at", "").startswith(day)]
        day_focus = sum(s.get("duration_seconds", 0) for s in day_sessions) // 60
        
        daily_breakdown.append({
            "date": day,
            "tasks_done": day_tasks,
            "focus_minutes": day_focus,
            "pomodoros": len(day_sessions)
        })
    
    daily_breakdown.reverse()
    
    category_breakdown = {}
    for task in completed_tasks:
        cat = task.get("category", "general")
        mins = task.get("time_spent_seconds", 0) // 60
        category_breakdown[cat] = category_breakdown.get(cat, 0) + max(mins, task.get("estimated_minutes", 25))
    
    insights = await db.weekly_insights.find_one({"week_start": week_ago}, {"_id": 0})
    
    return {
        "period": f"{week_ago} to {today_str}",
        "tasks_completed": len(completed_tasks),
        "total_focus_minutes": total_focus,
        "total_pomodoros": len(sessions),
        "completion_rate": min(completion_rate, 100),
        "daily_breakdown": daily_breakdown,
        "category_breakdown": category_breakdown,
        "previous_week": {
            "tasks_completed": prev_completed,
            "total_focus_minutes": prev_focus
        },
        "ai_insights": insights.get("insights") if insights else None
    }

@api_router.post("/report/generate-insights")
async def generate_weekly_insights():
    """Generate AI insights for weekly report"""
    today = datetime.now(timezone.utc).date()
    week_ago = (today - timedelta(days=7)).isoformat()
    
    completed_tasks = await db.tasks.find({
        "completed": True,
        "completed_at": {"$gte": week_ago}
    }, {"_id": 0}).to_list(500)
    
    sessions = await db.pomodoro_sessions.find({
        "session_type": "work",
        "completed": True,
        "started_at": {"$gte": week_ago}
    }, {"_id": 0}).to_list(500)
    
    pending_tasks = await db.tasks.find({"completed": False}, {"_id": 0}).to_list(100)
    
    total_focus = sum(s.get("duration_seconds", 0) for s in sessions) // 60
    
    categories = {}
    for t in completed_tasks:
        cat = t.get("category", "general")
        categories[cat] = categories.get(cat, 0) + 1
    
    if not EMERGENT_LLM_KEY:
        insights = {
            "summary": f"This week you completed {len(completed_tasks)} tasks with {total_focus} minutes of focused work.",
            "strengths": ["You're making progress on your tasks"],
            "improvements": ["Try to maintain consistent daily focus time"],
            "recommendation": "Keep up the momentum and prioritize high-impact tasks."
        }
    else:
        try:
            chat = LlmChat(
                api_key=EMERGENT_LLM_KEY,
                session_id=f"insights_{datetime.now().isoformat()}",
                system_message="""You are a productivity coach analyzing weekly work patterns.
Provide actionable, specific insights based on the data.
Be encouraging but honest. Focus on patterns and actionable advice.

Respond in JSON format:
{
    "summary": "2-3 sentence overview of the week",
    "strengths": ["strength 1", "strength 2"],
    "improvements": ["area 1", "area 2"],
    "recommendation": "One specific actionable recommendation for next week"
}"""
            )
            chat.with_model("openai", "gpt-5.2")
            
            data_summary = f"""
Weekly productivity data:
- Tasks completed: {len(completed_tasks)}
- Total focus time: {total_focus} minutes
- Pomodoro sessions: {len(sessions)}
- Pending tasks: {len(pending_tasks)}
- Categories worked on: {categories}
- Average daily focus: {total_focus // 7} minutes

Task details:
{chr(10).join([f"- {t.get('title', 'Untitled')} ({t.get('category', 'general')}, source: {t.get('source', 'manual')})" for t in completed_tasks[:10]])}
"""
            
            message = UserMessage(text=data_summary)
            response = await chat.send_message(message)
            
            import json
            try:
                json_start = response.find('{')
                json_end = response.rfind('}') + 1
                if json_start != -1 and json_end > json_start:
                    insights = json.loads(response[json_start:json_end])
                else:
                    raise ValueError("No JSON found")
            except:
                insights = {
                    "summary": f"This week you completed {len(completed_tasks)} tasks with {total_focus} minutes of focused work across {len(sessions)} pomodoro sessions.",
                    "strengths": ["Consistent task completion", "Using pomodoro technique effectively"],
                    "improvements": ["Consider time-blocking for deep work", "Review pending tasks weekly"],
                    "recommendation": "Focus on your top 3 priorities each morning before checking emails."
                }
        except Exception as e:
            logger.error(f"AI insights error: {e}")
            insights = {
                "summary": f"This week you completed {len(completed_tasks)} tasks with {total_focus} minutes of focused work.",
                "strengths": ["Making progress on your goals"],
                "improvements": ["Maintain consistent daily focus sessions"],
                "recommendation": "Start each day by reviewing your prioritized tasks."
            }
    
    await db.weekly_insights.update_one(
        {"week_start": week_ago},
        {"$set": {"week_start": week_ago, "insights": insights, "generated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    
    return {"insights": insights}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
