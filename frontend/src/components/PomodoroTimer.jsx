import React, { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, RotateCcw, Coffee, CheckCircle2 } from "lucide-react";

const PomodoroTimer = ({
  activeTask,
  settings,
  onComplete,
  onStop,
  onTaskComplete,
}) => {
  const [timeLeft, setTimeLeft] = useState(settings.pomodoro_work_minutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionType, setSessionType] = useState("work"); // work, short_break, long_break
  const [completedPomodoros, setCompletedPomodoros] = useState(0);
  const [totalTimeSpent, setTotalTimeSpent] = useState(0);
  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);
  const targetTimeRef = useRef(null);

  const getSessionDuration = useCallback(
    (type) => {
      switch (type) {
        case "work":
          // Use task specific time if available, otherwise default to settings
          if (activeTask?.estimated_minutes) {
            return activeTask.estimated_minutes * 60;
          }
          return settings.pomodoro_work_minutes * 60;
        case "short_break":
          return settings.pomodoro_short_break * 60;
        case "long_break":
          return settings.pomodoro_long_break * 60;
        default:
          return settings.pomodoro_work_minutes * 60;
      }
    },
    [settings, activeTask]
  );

  // Reset timer when task changes
  useEffect(() => {
    const duration = getSessionDuration("work");
    setTimeLeft(duration);

    // Auto-start if a task is selected
    const shouldStart = !!activeTask;
    setIsRunning(shouldStart);
    setSessionType("work");
    setTotalTimeSpent(0);

    if (shouldStart) {
      startTimeRef.current = Date.now();
      targetTimeRef.current = Date.now() + duration * 1000;
    } else {
      targetTimeRef.current = null;
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  }, [activeTask, getSessionDuration]);

  // Timer logic
  useEffect(() => {
    if (isRunning) {
      // If we just started/resumed and have no target, set it based on current timeLeft
      if (!targetTimeRef.current) {
        targetTimeRef.current = Date.now() + timeLeft * 1000;
      }

      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const difference = targetTimeRef.current - now;

        if (difference <= 0) {
          setTimeLeft(0);
          handleTimerComplete();
        } else {
          setTimeLeft(Math.ceil(difference / 1000));
        }
      }, 500); // Check frequently
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      targetTimeRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning]);

  const handleTimerComplete = () => {
    setIsRunning(false);
    targetTimeRef.current = null;

    // Calculate duration
    const duration = getSessionDuration(sessionType);

    if (sessionType === "work") {
      const newCount = completedPomodoros + 1;
      setCompletedPomodoros(newCount);
      setTotalTimeSpent((prev) => prev + duration);
      onComplete(duration);

      // Play alarm sound
      const audio = new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg");
      audio.play().catch(e => console.error("Audio play failed", e));

      // Send notification
      if (Notification.permission === "granted") {
        new Notification("Pomodoro Complete!", {
          body: "Great work! Time for a break.",
          icon: "/favicon.ico",
        });
      }

      // Switch to break
      const nextType = newCount % 4 === 0 ? "long_break" : "short_break";
      setSessionType(nextType);
      const nextDuration = getSessionDuration(nextType);
      setTimeLeft(nextDuration);
    } else {
      // Break complete
      if (Notification.permission === "granted") {
        new Notification("Break Over!", {
          body: "Ready to focus again?",
          icon: "/favicon.ico",
        });
      }
      setSessionType("work");
      setTimeLeft(getSessionDuration("work"));
    }
  };

  const toggleTimer = () => {
    if (!isRunning) {
      startTimeRef.current = Date.now();
      targetTimeRef.current = Date.now() + timeLeft * 1000;
    }
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    targetTimeRef.current = null;
    setTimeLeft(getSessionDuration(sessionType));
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  const switchSession = (type) => {
    setIsRunning(false);
    targetTimeRef.current = null;
    setSessionType(type);
    setTimeLeft(getSessionDuration(type));
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Calculate progress for circular ring
  const totalDuration = getSessionDuration(sessionType);
  const progress = ((totalDuration - timeLeft) / totalDuration) * 100;
  const circumference = 2 * Math.PI * 45; // radius = 45
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const getSessionColor = () => {
    if (sessionType === "work") return "text-amber-500";
    return "text-violet-500";
  };

  const getSessionBgColor = () => {
    if (sessionType === "work") return "stroke-amber-500";
    return "stroke-violet-500";
  };

  return (
    <Card className="card-premium overflow-hidden">
      <CardContent className="p-6">
        {/* Session Type Tabs */}
        <div className="flex gap-2 mb-6">
          <Button
            size="sm"
            variant={sessionType === "work" ? "default" : "ghost"}
            onClick={() => switchSession("work")}
            className={`flex-1 ${sessionType === "work" ? "bg-amber-500 hover:bg-amber-600" : ""}`}
            data-testid="work-session-btn"
          >
            Focus
          </Button>
          <Button
            size="sm"
            variant={sessionType === "short_break" ? "default" : "ghost"}
            onClick={() => switchSession("short_break")}
            className={`flex-1 ${sessionType === "short_break" ? "bg-violet-500 hover:bg-violet-600" : ""}`}
            data-testid="short-break-btn"
          >
            Short Break
          </Button>
          <Button
            size="sm"
            variant={sessionType === "long_break" ? "default" : "ghost"}
            onClick={() => switchSession("long_break")}
            className={`flex-1 ${sessionType === "long_break" ? "bg-violet-500 hover:bg-violet-600" : ""}`}
            data-testid="long-break-btn"
          >
            Long Break
          </Button>
        </div>

        {/* Timer Display */}
        <div className="relative flex items-center justify-center my-8">
          <svg className="w-48 h-48 timer-ring" viewBox="0 0 100 100">
            {/* Background circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              className="text-muted/20"
            />
            {/* Progress circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              strokeWidth="4"
              strokeLinecap="round"
              className={`timer-ring-progress ${getSessionBgColor()}`}
              style={{
                strokeDasharray: circumference,
                strokeDashoffset: strokeDashoffset,
              }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-5xl font-mono font-bold ${getSessionColor()}`}>
              {formatTime(timeLeft)}
            </span>
            <span className="text-sm text-muted-foreground mt-2 capitalize">
              {sessionType.replace("_", " ")}
            </span>
          </div>
        </div>

        {/* Active Task */}
        {activeTask && (
          <div className="mb-6 p-4 rounded-xl bg-muted/30">
            <p className="text-xs text-muted-foreground mb-1">Working on</p>
            <p className="font-medium text-foreground truncate">
              {activeTask.title}
            </p>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-center gap-3">
          <Button
            size="icon"
            variant="outline"
            onClick={resetTimer}
            className="rounded-full w-12 h-12"
            data-testid="reset-timer-btn"
          >
            <RotateCcw className="h-5 w-5" />
          </Button>

          <Button
            size="lg"
            onClick={toggleTimer}
            className={`rounded-full w-16 h-16 ${sessionType === "work"
              ? "bg-amber-500 hover:bg-amber-600"
              : "bg-violet-500 hover:bg-violet-600"
              }`}
            disabled={!activeTask && sessionType === "work"}
            data-testid="play-pause-btn"
          >
            {isRunning ? (
              <Pause className="h-6 w-6" />
            ) : (
              <Play className="h-6 w-6 ml-1" />
            )}
          </Button>

          {activeTask && (
            <Button
              size="icon"
              variant="outline"
              onClick={() => onTaskComplete(totalTimeSpent)}
              className="rounded-full w-12 h-12 text-green-600 hover:text-green-700 hover:border-green-300"
              data-testid="mark-done-btn"
            >
              <CheckCircle2 className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Session Info */}
        <div className="mt-6 flex items-center justify-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Coffee className="h-4 w-4" />
            <span>{completedPomodoros} pomodoros</span>
          </div>
          {activeTask && (
            <div className="flex items-center gap-1">
              <span>{Math.round(totalTimeSpent / 60)} min focused</span>
            </div>
          )}
        </div>

        {/* No Task Selected */}
        {!activeTask && sessionType === "work" && (
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Select a task to start focusing
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PomodoroTimer;
