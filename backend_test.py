import requests
import sys
import json
from datetime import datetime, timedelta
import uuid

class TaskPrioritizerAPITester:
    def __init__(self, base_url="https://priority-planner-195.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.created_task_ids = []

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, params=params)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, params=params)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if isinstance(response_data, dict) and len(str(response_data)) < 500:
                        print(f"   Response: {response_data}")
                    elif isinstance(response_data, list):
                        print(f"   Response: List with {len(response_data)} items")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test health endpoint"""
        success, response = self.run_test(
            "Health Check",
            "GET",
            "health",
            200
        )
        if success:
            ai_enabled = response.get('ai_enabled', False)
            print(f"   AI Enabled: {ai_enabled}")
        return success

    def test_get_settings(self):
        """Test get settings"""
        success, response = self.run_test(
            "Get Settings",
            "GET", 
            "settings",
            200
        )
        return success, response

    def test_update_settings(self):
        """Test update settings"""
        success, response = self.run_test(
            "Update Settings",
            "PUT",
            "settings",
            200,
            data={
                "pomodoro_work_minutes": 25,
                "pomodoro_short_break": 5,
                "daily_task_limit": 4
            }
        )
        return success

    def test_create_task(self, title, description="", category="general", estimated_minutes=25):
        """Create a task"""
        success, response = self.run_test(
            f"Create Task: {title}",
            "POST",
            "tasks",
            200,
            data={
                "title": title,
                "description": description,
                "category": category,
                "estimated_minutes": estimated_minutes,
                "source": "manual"
            }
        )
        if success and 'id' in response:
            self.created_task_ids.append(response['id'])
            return response['id']
        return None

    def test_get_tasks(self):
        """Get all tasks"""
        success, response = self.run_test(
            "Get All Tasks",
            "GET",
            "tasks",
            200
        )
        return success, response

    def test_get_task_by_id(self, task_id):
        """Get specific task"""
        success, response = self.run_test(
            f"Get Task by ID",
            "GET",
            f"tasks/{task_id}",
            200
        )
        return success

    def test_update_task(self, task_id):
        """Update a task"""
        success, response = self.run_test(
            "Update Task",
            "PUT",
            f"tasks/{task_id}",
            200,
            data={
                "title": "Updated Task Title",
                "description": "Updated description"
            }
        )
        return success

    def test_start_task(self, task_id):
        """Start working on a task"""
        success, response = self.run_test(
            "Start Task",
            "PUT",
            f"tasks/{task_id}/start",
            200
        )
        return success

    def test_complete_task(self, task_id, time_spent=1500):
        """Complete a task"""
        success, response = self.run_test(
            "Complete Task",
            "PUT",
            f"tasks/{task_id}/complete",
            200,
            params={"time_spent_seconds": time_spent}
        )
        return success

    def test_ai_prioritize(self):
        """Test AI prioritization"""
        print(f"\n🤖 Testing AI Prioritization (this may take a few seconds)...")
        success, response = self.run_test(
            "AI Prioritize Tasks",
            "POST",
            "prioritize",
            200
        )
        if success:
            print(f"   Prioritization reason: {response.get('reason', 'N/A')}")
            tasks = response.get('tasks', [])
            print(f"   Prioritized {len(tasks)} tasks")
            for i, task in enumerate(tasks[:3]):  # Show first 3
                score = task.get('priority_score', 0)
                reason = task.get('priority_reason', 'N/A')
                print(f"   #{i+1}: {task.get('title', 'N/A')} (Score: {score}) - {reason}")
        return success

    def test_get_today_tasks(self):
        """Get today's prioritized tasks"""
        success, response = self.run_test(
            "Get Today's Tasks",
            "GET",
            "today",
            200
        )
        return success, response

    def test_get_stats(self):
        """Get productivity statistics"""
        success, response = self.run_test(
            "Get Stats",
            "GET",
            "stats",
            200
        )
        if success:
            print(f"   Completed today: {response.get('completed_today', 0)}")
            print(f"   Pending tasks: {response.get('pending_tasks', 0)}")
            print(f"   Focus minutes: {response.get('focus_minutes_today', 0)}")
        return success

    def test_pomodoro_session(self, task_id):
        """Test pomodoro session workflow"""
        # Start pomodoro
        success, response = self.run_test(
            "Start Pomodoro Session",
            "POST",
            "pomodoro/start",
            200,
            params={"task_id": task_id, "session_type": "work"}
        )
        
        if not success:
            return False
            
        session_id = response.get('id')
        if not session_id:
            print("❌ No session ID returned")
            return False

        # Complete pomodoro
        success, response = self.run_test(
            "Complete Pomodoro Session",
            "POST",
            "pomodoro/complete",
            200,
            params={"session_id": session_id, "duration_seconds": 1500}
        )
        
        return success

    def test_pomodoro_stats(self):
        """Get pomodoro statistics"""
        success, response = self.run_test(
            "Get Pomodoro Stats",
            "GET",
            "pomodoro/stats",
            200
        )
        return success

    def test_delete_task(self, task_id):
        """Delete a task"""
        success, response = self.run_test(
            "Delete Task",
            "DELETE",
            f"tasks/{task_id}",
            200
        )
        return success

    def test_weekly_report(self):
        """Test weekly report endpoint"""
        success, response = self.run_test(
            "Get Weekly Report",
            "GET",
            "report/weekly",
            200
        )
        if success:
            print(f"   Period: {response.get('period', 'N/A')}")
            print(f"   Tasks completed: {response.get('tasks_completed', 0)}")
            print(f"   Focus minutes: {response.get('total_focus_minutes', 0)}")
            print(f"   Completion rate: {response.get('completion_rate', 0)}%")
            daily_breakdown = response.get('daily_breakdown', [])
            print(f"   Daily breakdown: {len(daily_breakdown)} days")
        return success, response

    def test_generate_insights(self):
        """Test AI insights generation"""
        print(f"\n🤖 Testing AI Insights Generation (this may take a few seconds)...")
        success, response = self.run_test(
            "Generate AI Insights",
            "POST",
            "report/generate-insights",
            200
        )
        if success:
            insights = response.get('insights', {})
            print(f"   Summary: {insights.get('summary', 'N/A')[:100]}...")
            strengths = insights.get('strengths', [])
            improvements = insights.get('improvements', [])
            print(f"   Strengths: {len(strengths)} items")
            print(f"   Improvements: {len(improvements)} items")
            print(f"   Recommendation: {insights.get('recommendation', 'N/A')[:100]}...")
        return success

    def test_google_oauth_login(self):
        """Test Google OAuth login endpoint (should return error since not configured)"""
        success, response = self.run_test(
            "Google OAuth Login (Not Configured)",
            "GET",
            "auth/google/login",
            400  # Expecting 400 since Google OAuth not configured
        )
        if success:
            detail = response.get('detail', '')
            print(f"   Expected error: {detail}")
            if 'not configured' in detail.lower():
                print("   ✅ Correct error message for unconfigured OAuth")
            else:
                print("   ⚠️  Unexpected error message")
        return success

    def test_settings_dark_mode(self):
        """Test dark mode settings functionality"""
        # First get current settings
        success, current_settings = self.run_test(
            "Get Settings (Check Dark Mode Field)",
            "GET",
            "settings",
            200
        )
        
        if not success:
            return False
            
        # Check if dark_mode field exists
        has_dark_mode = 'dark_mode' in current_settings
        has_google_connected = 'google_calendar_connected' in current_settings
        print(f"   Dark mode field present: {has_dark_mode}")
        print(f"   Google calendar connected field present: {has_google_connected}")
        
        if not has_dark_mode:
            print("   ❌ Missing dark_mode field in settings")
            return False
            
        # Test updating dark mode
        current_dark_mode = current_settings.get('dark_mode', False)
        new_dark_mode = not current_dark_mode
        
        success, response = self.run_test(
            f"Update Dark Mode Setting (to {new_dark_mode})",
            "PUT",
            "settings",
            200,
            data={"dark_mode": new_dark_mode}
        )
        
        if success:
            updated_dark_mode = response.get('dark_mode')
            print(f"   Dark mode updated to: {updated_dark_mode}")
            if updated_dark_mode == new_dark_mode:
                print("   ✅ Dark mode setting updated correctly")
            else:
                print("   ❌ Dark mode setting not updated correctly")
                return False
                
        return success

    def cleanup_created_tasks(self):
        """Clean up tasks created during testing"""
        print(f"\n🧹 Cleaning up {len(self.created_task_ids)} created tasks...")
        for task_id in self.created_task_ids:
            try:
                self.test_delete_task(task_id)
            except:
                pass

def main():
    print("🚀 Starting FocusFlow API Testing...")
    print("=" * 60)
    
    tester = TaskPrioritizerAPITester()
    
    # Test basic connectivity
    if not tester.test_health_check():
        print("❌ Health check failed, stopping tests")
        return 1

    # Test settings
    print(f"\n📋 Testing Settings Management...")
    tester.test_get_settings()
    tester.test_update_settings()

    # Test task CRUD operations
    print(f"\n📝 Testing Task Management...")
    
    # Create test tasks
    task1_id = tester.test_create_task(
        "Complete project proposal", 
        "Write and review the Q1 project proposal",
        "work",
        60
    )
    
    task2_id = tester.test_create_task(
        "Buy groceries",
        "Get milk, bread, and vegetables", 
        "personal",
        30
    )
    
    task3_id = tester.test_create_task(
        "Review code changes",
        "Review pull requests and provide feedback",
        "work", 
        45
    )

    if not any([task1_id, task2_id, task3_id]):
        print("❌ Failed to create any tasks, stopping tests")
        return 1

    # Test getting tasks
    tester.test_get_tasks()
    
    if task1_id:
        tester.test_get_task_by_id(task1_id)
        tester.test_update_task(task1_id)
        tester.test_start_task(task1_id)

    # Test AI prioritization
    print(f"\n🤖 Testing AI Features...")
    tester.test_ai_prioritize()
    tester.test_get_today_tasks()

    # Test pomodoro functionality
    print(f"\n⏰ Testing Pomodoro Features...")
    if task1_id:
        tester.test_pomodoro_session(task1_id)
    tester.test_pomodoro_stats()

    # Test statistics
    print(f"\n📊 Testing Statistics...")
    tester.test_get_stats()

    # Test weekly report features
    print(f"\n📈 Testing Weekly Report Features...")
    tester.test_weekly_report()
    tester.test_generate_insights()

    # Test new Google OAuth and Dark Mode features
    print(f"\n🔗 Testing Google OAuth & Dark Mode Features...")
    tester.test_google_oauth_login()
    tester.test_settings_dark_mode()

    # Test task completion
    print(f"\n✅ Testing Task Completion...")
    if task2_id:
        tester.test_complete_task(task2_id)

    # Clean up
    tester.cleanup_created_tasks()

    # Print results
    print(f"\n" + "=" * 60)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        failed = tester.tests_run - tester.tests_passed
        print(f"❌ {failed} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())