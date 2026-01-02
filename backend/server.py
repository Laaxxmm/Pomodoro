from fastapi import FastAPI, APIRouter, HTTPException
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

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Emergent LLM Key
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

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
    source: str = "manual"  # manual, calendar, email

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
    session_type: str = "work"  # work, short_break, long_break
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

# ============ HELPER FUNCTIONS ============

async def get_settings():
    """Get user settings or create defaults"""
    settings = await db.settings.find_one({"id": "user_settings"}, {"_id": 0})
    if not settings:
        default_settings = Settings().model_dump()
        await db.settings.insert_one(default_settings)
        return default_settings
    return settings

async def prioritize_tasks_with_ai(tasks: List[dict]) -> dict:
    """Use AI to prioritize tasks and select top 3-4 for today"""
    if not tasks:
        return {"selected_task_ids": [], "reason": "No tasks available"}
    
    if not EMERGENT_LLM_KEY:
        # Fallback: sort by deadline and rollover count
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
            f"Rollover: {t.get('rollover_count', 0)}, Desc: {t.get('description', '')[:100]}"
            for t in tasks
        ])
        
        message = UserMessage(text=f"Today's date: {datetime.now().date().isoformat()}\n\nTasks to prioritize:\n{task_list}")
        response = await chat.send_message(message)
        
        # Parse AI response
        import json
        try:
            # Extract JSON from response
            json_start = response.find('{')
            json_end = response.rfind('}') + 1
            if json_start != -1 and json_end > json_start:
                result = json.loads(response[json_start:json_end])
                return result
        except json.JSONDecodeError:
            pass
        
        # Fallback if AI response parsing fails
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

# ============ ROUTES ============

@api_router.get("/")
async def root():
    return {"message": "FocusFlow API - AI Task Prioritizer"}

@api_router.get("/health")
async def health():
    return {"status": "healthy", "ai_enabled": bool(EMERGENT_LLM_KEY)}

# Tasks CRUD
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
    
    # Check if we have a plan for today
    plan = await db.daily_plans.find_one({"date": today}, {"_id": 0})
    
    if plan:
        # Get the prioritized tasks
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
    
    # No plan yet, create one
    return await prioritize_today()

@api_router.post("/prioritize")
async def prioritize_today():
    """Run AI prioritization for today's tasks"""
    today = datetime.now(timezone.utc).date().isoformat()
    settings = await get_settings()
    
    # Get all incomplete tasks
    all_tasks = await db.tasks.find({"completed": False}, {"_id": 0}).to_list(100)
    
    if not all_tasks:
        return {"date": today, "tasks": [], "reason": "No tasks to prioritize"}
    
    # Run AI prioritization
    result = await prioritize_tasks_with_ai(all_tasks)
    
    # Update task priorities
    task_priorities = result.get("task_priorities", {})
    for task_id, priority_info in task_priorities.items():
        await db.tasks.update_one(
            {"id": task_id},
            {"$set": {
                "priority_score": priority_info.get("score", 0),
                "priority_reason": priority_info.get("reason", "")
            }}
        )
    
    # Create/update daily plan
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
    
    # Get the prioritized tasks
    tasks = await db.tasks.find(
        {"id": {"$in": plan.task_ids}, "completed": False},
        {"_id": 0}
    ).to_list(10)
    
    # Sort by priority score
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
    
    # Get unfinished tasks from today and earlier
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
    
    # Also update task started_at if this is first work session
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
    
    # Update task time spent
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
    
    # Get today's completed work sessions
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
                      "daily_task_limit", "auto_rollover", "google_calendar_connected", "gmail_connected"]
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
    
    # Completed tasks today
    completed_today = await db.tasks.count_documents({
        "completed": True,
        "completed_at": {"$gte": today}
    })
    
    # Total incomplete tasks
    pending = await db.tasks.count_documents({"completed": False})
    
    # Total focus time today
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
