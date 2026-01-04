import { useState, useEffect, useCallback } from "react";
import "@/App.css";
import axios from "axios";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import Dashboard from "@/components/Dashboard";
import AddTaskDialog from "@/components/AddTaskDialog";
import SettingsDialog from "@/components/SettingsDialog";
import WeeklyReportDialog from "@/components/WeeklyReportDialog";
import GoogleIntegrationDialog from "@/components/GoogleIntegrationDialog";
import LoginPage from "@/components/LoginPage";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";
const API = BACKEND_URL ? `${BACKEND_URL}/api` : "/api";

function App() {
  const [tasks, setTasks] = useState([]);
  const [todayTasks, setTodayTasks] = useState([]);
  const [prioritizationReason, setPrioritizationReason] = useState("");
  const [stats, setStats] = useState({
    completed_today: 0,
    pending_tasks: 0,
    focus_minutes_today: 0,
    pomodoros_today: 0,
  });
  const [settings, setSettings] = useState({
    pomodoro_work_minutes: 25,
    pomodoro_short_break: 5,
    pomodoro_long_break: 15,
    daily_task_limit: 4,
    auto_rollover: true,
    dark_mode: false,
    google_calendar_connected: false,
    gmail_connected: false,
    google_email: null,
  });
  const [loading, setLoading] = useState(true);
  const [isPrioritizing, setIsPrioritizing] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showGoogleIntegration, setShowGoogleIntegration] = useState(false);
  const [activeTask, setActiveTask] = useState(null);
  const [currentSession, setCurrentSession] = useState(null);
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("focus_user");
    return saved ? JSON.parse(saved) : null;
  });

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem("focus_user", JSON.stringify(userData));
    toast.success(`Welcome back, ${userData.name}!`);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("focus_user");
  };

  // Apply dark mode
  useEffect(() => {
    if (settings.dark_mode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [settings.dark_mode]);

  // Check for Google OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("google_connected") === "true") {
      toast.success("Google account connected successfully!");
      window.history.replaceState({}, document.title, "/");
      fetchSettings();
    }
    if (params.get("error")) {
      toast.error(`Google connection failed: ${params.get("error")}`);
      window.history.replaceState({}, document.title, "/");
    }
  }, []);

  // Fetch data
  const fetchTodayTasks = useCallback(async (currentUser) => {
    try {
      const u = currentUser || user;
      let url = `${API}/today`;
      if (u?.id) {
        url += `?user_id=${u.id}`;
      }
      const response = await axios.get(url);
      setTodayTasks(response.data.tasks || []);
      setPrioritizationReason(response.data.reason || "");
    } catch (e) {
      console.error("Error fetching today's tasks:", e);
    }
  }, [user]);

  const fetchAllTasks = useCallback(async (currentUser) => {
    try {
      const u = currentUser || user;
      let url = `${API}/tasks`;
      if (u?.id) {
        url += `?user_id=${u.id}`;
      }
      const response = await axios.get(url);
      setTasks(response.data || []);
    } catch (e) {
      console.error("Error fetching tasks:", e);
    }
  }, [user]);

  const fetchStats = useCallback(async (currentUser) => {
    try {
      const u = currentUser || user;
      let url = `${API}/stats`;
      if (u?.id) {
        url += `?user_id=${u.id}`;
      }
      const response = await axios.get(url);
      setStats(response.data);
    } catch (e) {
      console.error("Error fetching stats:", e);
    }
  }, [user]);

  const fetchSettings = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/settings`);
      setSettings(response.data);
    } catch (e) {
      console.error("Error fetching settings:", e);
    }
  }, []);

  useEffect(() => {
    if (user) {
      const loadData = async () => {
        setLoading(true);
        // Pass user explicitly to avoid any race conditions with state updates
        await Promise.all([
          fetchTodayTasks(user),
          fetchAllTasks(user),
          fetchStats(user),
          fetchSettings(),
        ]);
        setLoading(false);
      };
      loadData();
    }
  }, [fetchTodayTasks, fetchAllTasks, fetchStats, fetchSettings, user]);

  // Task actions
  // Task actions
  const addTask = async (taskData) => {
    try {
      // Create new task with user_id attached
      const payload = { ...taskData, user_id: user?.id };
      await axios.post(`${API}/tasks`, payload);

      toast.success("Task added successfully");
      await fetchAllTasks();
      setShowAddTask(false);
    } catch (e) {
      const errorMsg = e.response?.data?.detail || e.message;
      toast.error(`Failed to add task: ${errorMsg}`);
      console.error(e);
    }
  };

  const completeTask = async (taskId, timeSpent = 0) => {
    try {
      await axios.put(`${API}/tasks/${taskId}/complete?time_spent_seconds=${timeSpent}`);
      toast.success("Task completed!");
      if (activeTask?.id === taskId) {
        setActiveTask(null);
        setCurrentSession(null);
      }
      await Promise.all([fetchTodayTasks(), fetchAllTasks(), fetchStats()]);
    } catch (e) {
      const errorMsg = e.response?.data?.detail || e.message;
      toast.error(`Failed to complete task: ${errorMsg}`);
      console.error(e);
    }
  };

  const deleteTask = async (taskId) => {
    try {
      await axios.delete(`${API}/tasks/${taskId}`);
      toast.success("Task deleted");
      await Promise.all([fetchTodayTasks(), fetchAllTasks(), fetchStats()]);
    } catch (e) {
      const errorMsg = e.response?.data?.detail || e.message;
      toast.error(`Failed to delete task: ${errorMsg}`);
      console.error(e);
    }
  };

  const prioritizeTasks = async () => {
    setIsPrioritizing(true);
    try {
      const response = await axios.post(`${API}/prioritize?user_id=${user?.id}`);
      setTodayTasks(response.data.tasks || []);
      setPrioritizationReason(response.data.reason || "");
      toast.success("Tasks prioritized by AI");
    } catch (e) {
      const errorMsg = e.response?.data?.detail || e.message;
      toast.error(`Failed to prioritize: ${errorMsg}`);
      console.error(e);
    } finally {
      setIsPrioritizing(false);
    }
  };

  // Pomodoro actions
  const startPomodoro = async (task) => {
    try {
      const response = await axios.post(`${API}/pomodoro/start?task_id=${task.id}&session_type=work`);
      setActiveTask(task);
      setCurrentSession(response.data);
      toast.success(`Starting work on: ${task.title}`);
    } catch (e) {
      const errorMsg = e.response?.data?.detail || e.message;
      toast.error(`Failed to start timer: ${errorMsg}`);
      console.error(e);
    }
  };

  const completePomodoro = async (durationSeconds) => {
    if (!currentSession) return;

    try {
      await axios.post(`${API}/pomodoro/complete?session_id=${currentSession.id}&duration_seconds=${durationSeconds}`);
      await fetchStats();

      if (Notification.permission === "granted") {
        new Notification("Pomodoro Complete!", {
          body: `Great work! Time for a break.`,
          icon: "/favicon.ico",
        });
      }
    } catch (e) {
      console.error("Error completing pomodoro:", e);
    }
  };

  // Settings
  const updateSettings = async (newSettings) => {
    try {
      const response = await axios.put(`${API}/settings`, newSettings);
      setSettings(response.data);
      toast.success("Settings updated");
      setShowSettings(false);
    } catch (e) {
      const errorMsg = e.response?.data?.detail || e.message;
      toast.error(`Failed to update settings: ${errorMsg}`);
      console.error(e);
    }
  };

  const toggleDarkMode = async () => {
    // Optimistically toggle locally first
    const newDarkMode = !settings.dark_mode;
    setSettings(prev => ({ ...prev, dark_mode: newDarkMode }));

    try {
      await axios.put(`${API}/settings`, { dark_mode: newDarkMode });
    } catch (e) {
      const errorMsg = e.response?.data?.detail || e.message;
      toast.error(`Failed to save dark mode: ${errorMsg}`);
      console.error("Failed to toggle dark mode:", e);
      // Revert if failed? No, keep local state for better UX, but warn.
    }
  };

  // Request notification permission
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  return (
    <div className="app-container">
      {!user ? (
        <LoginPage onLogin={handleLogin} />
      ) : (
        <>
          <Dashboard
            todayTasks={todayTasks}
            allTasks={tasks}
            stats={stats}
            settings={settings}
            loading={loading}
            isPrioritizing={isPrioritizing}
            prioritizationReason={prioritizationReason}
            activeTask={activeTask}
            currentSession={currentSession}
            onAddTask={() => setShowAddTask(true)}
            onCompleteTask={completeTask}
            onDeleteTask={deleteTask}
            onPrioritize={prioritizeTasks}
            onStartPomodoro={startPomodoro}
            onCompletePomodoro={completePomodoro}
            onStopPomodoro={() => {
              setActiveTask(null);
              setCurrentSession(null);
            }}
            onOpenSettings={() => setShowSettings(true)}
            onOpenReport={() => setShowReport(true)}
            onOpenGoogleIntegration={() => setShowGoogleIntegration(true)}
            onToggleDarkMode={toggleDarkMode}
            user={user}
            onLogout={handleLogout}
          />

          <AddTaskDialog
            open={showAddTask}
            onClose={() => setShowAddTask(false)}
            onAdd={addTask}
          />

          <SettingsDialog
            open={showSettings}
            onClose={() => setShowSettings(false)}
            settings={settings}
            onSave={updateSettings}
            onOpenGoogleIntegration={() => {
              setShowSettings(false);
              setShowGoogleIntegration(true);
            }}
          />

          <WeeklyReportDialog
            open={showReport}
            onClose={() => setShowReport(false)}
          />

          <GoogleIntegrationDialog
            open={showGoogleIntegration}
            onClose={() => setShowGoogleIntegration(false)}
            settings={settings}
            onRefresh={fetchSettings}
            onTasksImported={() => {
              fetchAllTasks();
              fetchTodayTasks();
            }}
          />
        </>
      )}

      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: settings.dark_mode ? 'hsl(240 10% 10%)' : 'white',
            color: settings.dark_mode ? 'hsl(0 0% 95%)' : 'inherit',
            border: `1px solid ${settings.dark_mode ? 'hsl(240 5% 20%)' : 'hsl(263 20% 90%)'}`,
            borderRadius: '12px',
          },
        }}
      />
    </div>
  );
}

export default App;
