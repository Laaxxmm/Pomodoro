import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Sparkles,
  CheckCircle2,
  Clock,
  Target,
  Flame,
  Settings,
  ListTodo,
  Trash2,
  BarChart3,
  Menu,
  X,
} from "lucide-react";
import PomodoroTimer from "./PomodoroTimer";

const Dashboard = ({
  todayTasks,
  allTasks,
  stats,
  settings,
  loading,
  isPrioritizing,
  prioritizationReason,
  activeTask,
  currentSession,
  onAddTask,
  onCompleteTask,
  onDeleteTask,
  onPrioritize,
  onStartPomodoro,
  onCompletePomodoro,
  onStopPomodoro,
  onOpenSettings,
  onOpenReport,
}) => {
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const formatDate = () => {
    return new Date().toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  };

  const getPriorityBadge = (score) => {
    if (score >= 80) return { label: "Critical", class: "priority-high" };
    if (score >= 50) return { label: "Important", class: "priority-medium" };
    return { label: "Normal", class: "priority-low" };
  };

  if (loading) {
    return (
      <div className="p-4 md:p-8">
        <div className="bento-grid">
          <div className="space-y-6 hidden lg:block">
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-48 rounded-2xl" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-20 rounded-2xl" />
            <Skeleton className="h-[400px] rounded-2xl" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-48 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 pb-24 md:pb-8">
      {/* Header */}
      <header className="flex items-center justify-between mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-foreground font-heading">
            FocusFlow
          </h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">{formatDate()}</p>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="rounded-full lg:hidden"
            data-testid="mobile-menu-btn"
          >
            {showMobileMenu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onOpenReport}
            className="rounded-full hidden md:flex"
            data-testid="report-btn"
          >
            <BarChart3 className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onOpenSettings}
            className="rounded-full"
            data-testid="settings-btn"
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Mobile Quick Actions Dropdown */}
      {showMobileMenu && (
        <div className="lg:hidden mb-6 p-4 bg-card rounded-2xl border border-border/40 shadow-lg animate-fade-in">
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => { onAddTask(); setShowMobileMenu(false); }}
              className="btn-primary text-sm"
              data-testid="mobile-add-task-btn"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Task
            </Button>
            <Button
              onClick={() => { onPrioritize(); setShowMobileMenu(false); }}
              disabled={isPrioritizing || allTasks.length === 0}
              className="btn-gold text-sm"
              data-testid="mobile-prioritize-btn"
            >
              <Sparkles className={`h-4 w-4 mr-2 ${isPrioritizing ? "animate-spin" : ""}`} />
              Prioritize
            </Button>
          </div>
          <div className="grid grid-cols-4 gap-2 mt-4">
            <div className="text-center p-2 bg-violet-50 rounded-lg">
              <p className="text-lg font-bold font-mono">{stats.completed_today}</p>
              <p className="text-xs text-muted-foreground">Done</p>
            </div>
            <div className="text-center p-2 bg-amber-50 rounded-lg">
              <p className="text-lg font-bold font-mono">{stats.focus_minutes_today}</p>
              <p className="text-xs text-muted-foreground">Mins</p>
            </div>
            <div className="text-center p-2 bg-rose-50 rounded-lg">
              <p className="text-lg font-bold font-mono">{stats.pomodoros_today}</p>
              <p className="text-xs text-muted-foreground">Pomo</p>
            </div>
            <div className="text-center p-2 bg-slate-50 rounded-lg">
              <p className="text-lg font-bold font-mono">{stats.pending_tasks}</p>
              <p className="text-xs text-muted-foreground">Backlog</p>
            </div>
          </div>
        </div>
      )}

      {/* Bento Grid Layout */}
      <div className="bento-grid">
        {/* Left Column - Stats & Quick Actions (Desktop) */}
        <aside className="sidebar space-y-6 hidden lg:block">
          {/* Stats */}
          <Card className="card-premium p-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-4">
              Today's Progress
            </h3>
            <div className="space-y-4">
              <div className="stat-card">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-violet-100 rounded-lg">
                    <CheckCircle2 className="h-5 w-5 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold font-mono">
                      {stats.completed_today}
                    </p>
                    <p className="text-xs text-muted-foreground">Completed</p>
                  </div>
                </div>
              </div>

              <div className="stat-card">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <Clock className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold font-mono">
                      {stats.focus_minutes_today}
                    </p>
                    <p className="text-xs text-muted-foreground">Focus mins</p>
                  </div>
                </div>
              </div>

              <div className="stat-card">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-rose-100 rounded-lg">
                    <Flame className="h-5 w-5 text-rose-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold font-mono">
                      {stats.pomodoros_today}
                    </p>
                    <p className="text-xs text-muted-foreground">Pomodoros</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Quick Actions */}
          <Card className="card-premium p-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-4">
              Quick Actions
            </h3>
            <div className="space-y-3">
              <Button
                onClick={onAddTask}
                className="w-full btn-primary"
                data-testid="add-task-btn"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Task
              </Button>
              <Button
                onClick={onPrioritize}
                disabled={isPrioritizing || allTasks.length === 0}
                className="w-full btn-gold"
                data-testid="prioritize-btn"
              >
                <Sparkles
                  className={`h-4 w-4 mr-2 ${isPrioritizing ? "animate-spin" : ""}`}
                />
                {isPrioritizing ? "AI Thinking..." : "AI Prioritize"}
              </Button>
              <Button
                onClick={onOpenReport}
                variant="outline"
                className="w-full rounded-full"
                data-testid="weekly-report-btn"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Weekly Report
              </Button>
            </div>
          </Card>

          {/* Pending Tasks Count */}
          <Card className="card-premium p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg">
                <ListTodo className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="text-2xl font-bold font-mono">
                  {stats.pending_tasks}
                </p>
                <p className="text-xs text-muted-foreground">
                  Tasks in backlog
                </p>
              </div>
            </div>
          </Card>
        </aside>

        {/* Center - Today's Tasks */}
        <main className="space-y-4 md:space-y-6 min-w-0">
          {/* AI Prioritization Banner */}
          {prioritizationReason && (
            <Card
              className={`card-premium p-3 md:p-4 border-amber-200/50 bg-gradient-to-r from-amber-50/50 to-white ${isPrioritizing ? "ai-thinking" : ""}`}
            >
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-amber-800">
                    AI Recommendation
                  </p>
                  <p className="text-xs md:text-sm text-amber-700/80 mt-1 break-words">
                    {prioritizationReason}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Today's Focus Tasks */}
          <Card className="card-premium">
            <CardHeader className="pb-3 md:pb-4 px-4 md:px-6">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                  <Target className="h-5 w-5 text-violet-600" />
                  Today's Focus
                </CardTitle>
                <Badge variant="secondary" className="font-mono text-xs">
                  {todayTasks.length} / {settings.daily_task_limit}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="px-4 md:px-6">
              {todayTasks.length === 0 ? (
                <div className="empty-state py-8 md:py-12">
                  <Target className="empty-state-icon" />
                  <h3 className="text-base md:text-lg font-medium text-muted-foreground">
                    No tasks prioritized yet
                  </h3>
                  <p className="text-sm text-muted-foreground/70 mt-1">
                    Add tasks and let AI prioritize them for you
                  </p>
                  <Button
                    onClick={onAddTask}
                    className="btn-primary mt-4"
                    data-testid="add-first-task-btn"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Task
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {todayTasks.map((task, index) => {
                    const priority = getPriorityBadge(task.priority_score);
                    const isActive = activeTask?.id === task.id;

                    return (
                      <div
                        key={task.id}
                        className={`task-card p-3 md:p-4 rounded-xl border transition-all animate-fade-in ${
                          isActive
                            ? "ring-2 ring-violet-500/30 border-violet-300 bg-violet-50/50"
                            : "border-border/40 bg-card hover:bg-muted/30"
                        }`}
                        style={{ animationDelay: `${index * 100}ms` }}
                        data-testid={`task-card-${task.id}`}
                      >
                        <div className="flex items-start justify-between gap-3 md:gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1 md:gap-2 mb-1">
                              <span className="text-xs md:text-sm font-mono text-muted-foreground">
                                #{index + 1}
                              </span>
                              <Badge
                                variant="outline"
                                className={`${priority.class} text-xs`}
                              >
                                {priority.label}
                              </Badge>
                              {task.category && (
                                <Badge variant="secondary" className="text-xs hidden sm:inline-flex">
                                  {task.category}
                                </Badge>
                              )}
                            </div>
                            <h4 className="font-medium text-sm md:text-base text-foreground line-clamp-2">
                              {task.title}
                            </h4>
                            {task.description && (
                              <p className="text-xs md:text-sm text-muted-foreground mt-1 line-clamp-2">
                                {task.description}
                              </p>
                            )}
                            {task.priority_reason && (
                              <p className="text-xs text-amber-600 mt-2 flex items-start gap-1 line-clamp-2">
                                <Sparkles className="h-3 w-3 flex-shrink-0 mt-0.5" />
                                <span>{task.priority_reason}</span>
                              </p>
                            )}
                            <div className="flex flex-wrap items-center gap-2 md:gap-4 mt-2 md:mt-3 text-xs text-muted-foreground">
                              {task.deadline && (
                                <span>Due: {task.deadline}</span>
                              )}
                              <span>{task.estimated_minutes} min</span>
                            </div>
                          </div>

                          <div className="flex flex-col gap-2 flex-shrink-0">
                            {!isActive ? (
                              <Button
                                size="sm"
                                onClick={() => onStartPomodoro(task)}
                                className="btn-primary text-xs px-3 md:px-4"
                                data-testid={`start-task-${task.id}`}
                              >
                                Start
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  onCompleteTask(task.id, task.time_spent_seconds)
                                }
                                className="text-xs"
                                data-testid={`complete-task-${task.id}`}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                Done
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onDeleteTask(task.id)}
                              className="text-xs text-muted-foreground hover:text-destructive"
                              data-testid={`delete-task-${task.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* All Tasks */}
          {allTasks.length > 0 && (
            <Card className="card-premium">
              <CardHeader className="pb-3 md:pb-4 px-4 md:px-6">
                <CardTitle className="text-base md:text-lg">Task Backlog</CardTitle>
              </CardHeader>
              <CardContent className="px-4 md:px-6">
                <ScrollArea className="h-[150px] md:h-[200px] pr-4">
                  <div className="space-y-2">
                    {allTasks
                      .filter(
                        (t) => !todayTasks.find((tt) => tt.id === t.id)
                      )
                      .map((task) => (
                        <div
                          key={task.id}
                          className="flex items-center justify-between p-2 md:p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                          data-testid={`backlog-task-${task.id}`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-xs md:text-sm font-medium truncate">
                              {task.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {task.category} • {task.estimated_minutes} min
                              {task.rollover_count > 0 && (
                                <span className="text-amber-600 ml-2">
                                  Rolled over {task.rollover_count}x
                                </span>
                              )}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onDeleteTask(task.id)}
                            className="text-muted-foreground hover:text-destructive flex-shrink-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </main>

        {/* Right Column - Timer */}
        <aside className="space-y-6">
          <PomodoroTimer
            activeTask={activeTask}
            settings={settings}
            onComplete={onCompletePomodoro}
            onStop={onStopPomodoro}
            onTaskComplete={(timeSpent) =>
              onCompleteTask(activeTask?.id, timeSpent)
            }
          />
        </aside>
      </div>

      {/* Mobile Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-[100] bg-white/95 backdrop-blur-lg border-t border-border/40 p-3 lg:hidden">
        <div className="flex items-center justify-around gap-2 max-w-md mx-auto">
          <Button
            onClick={onAddTask}
            size="sm"
            className="btn-primary flex-1 max-w-[140px]"
            data-testid="mobile-bottom-add-btn"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
          <Button
            onClick={onPrioritize}
            disabled={isPrioritizing || allTasks.length === 0}
            size="sm"
            className="btn-gold flex-1 max-w-[140px]"
            data-testid="mobile-bottom-prioritize-btn"
          >
            <Sparkles className={`h-4 w-4 mr-1 ${isPrioritizing ? "animate-spin" : ""}`} />
            AI
          </Button>
          <Button
            onClick={onOpenReport}
            size="sm"
            variant="outline"
            className="rounded-full px-4"
            data-testid="mobile-bottom-report-btn"
          >
            <BarChart3 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
