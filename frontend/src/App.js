import { useState, useEffect, useCallback } from "react";
import "@/App.css";
import axios from "axios";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import Dashboard from "@/components/Dashboard";
import AddTaskDialog from "@/components/AddTaskDialog";
import SettingsDialog from "@/components/SettingsDialog";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

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
  });
  const [loading, setLoading] = useState(true);
  const [isPrioritizing, setIsPrioritizing] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTask, setActiveTask] = useState(null);
  const [currentSession, setCurrentSession] = useState(null);

  // Fetch data
  const fetchTodayTasks = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/today`);
      setTodayTasks(response.data.tasks || []);
      setPrioritizationReason(response.data.reason || "");
    } catch (e) {
      console.error("Error fetching today's tasks:", e);
    }
  }, []);

  const fetchAllTasks = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/tasks`);
      setTasks(response.data || []);
    } catch (e) {
      console.error("Error fetching tasks:", e);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/stats`);
      setStats(response.data);
    } catch (e) {
      console.error("Error fetching stats:", e);
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/settings`);
      setSettings(response.data);
    } catch (e) {
      console.error("Error fetching settings:", e);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchTodayTasks(),
        fetchAllTasks(),
        fetchStats(),
        fetchSettings(),
      ]);
      setLoading(false);
    };
    loadData();
  }, [fetchTodayTasks, fetchAllTasks, fetchStats, fetchSettings]);

  // Task actions
  const addTask = async (taskData) => {
    try {
      await axios.post(`${API}/tasks`, taskData);
      toast.success("Task added successfully");
      await fetchAllTasks();
      setShowAddTask(false);
    } catch (e) {
      toast.error("Failed to add task");
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
      toast.error("Failed to complete task");
      console.error(e);
    }
  };

  const deleteTask = async (taskId) => {
    try {
      await axios.delete(`${API}/tasks/${taskId}`);
      toast.success("Task deleted");
      await Promise.all([fetchTodayTasks(), fetchAllTasks(), fetchStats()]);
    } catch (e) {
      toast.error("Failed to delete task");
      console.error(e);
    }
  };

  const prioritizeTasks = async () => {
    setIsPrioritizing(true);
    try {
      const response = await axios.post(`${API}/prioritize`);
      setTodayTasks(response.data.tasks || []);
      setPrioritizationReason(response.data.reason || "");
      toast.success("Tasks prioritized by AI");
    } catch (e) {
      toast.error("Failed to prioritize tasks");
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
      toast.error("Failed to start timer");
      console.error(e);
    }
  };

  const completePomodoro = async (durationSeconds) => {
    if (!currentSession) return;
    
    try {
      await axios.post(`${API}/pomodoro/complete?session_id=${currentSession.id}&duration_seconds=${durationSeconds}`);
      await fetchStats();
      
      // Send browser notification
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
      toast.error("Failed to update settings");
      console.error(e);
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
      />

      <Toaster 
        position="bottom-right" 
        toastOptions={{
          style: {
            background: 'white',
            border: '1px solid hsl(263 20% 90%)',
            borderRadius: '12px',
          },
        }}
      />
    </div>
  );
}

export default App;
