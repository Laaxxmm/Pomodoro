import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  Flame,
  Target,
  Sparkles,
  Calendar,
  RefreshCw,
} from "lucide-react";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const WeeklyReportDialog = ({ open, onClose }) => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/report/weekly`);
      setReport(response.data);
    } catch (e) {
      console.error("Error fetching report:", e);
    } finally {
      setLoading(false);
    }
  };

  const generateInsights = async () => {
    setGenerating(true);
    try {
      const response = await axios.post(`${API}/report/generate-insights`);
      setReport((prev) => ({ ...prev, ai_insights: response.data.insights }));
    } catch (e) {
      console.error("Error generating insights:", e);
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchReport();
    }
  }, [open]);

  const getTrend = (current, previous) => {
    if (previous === 0) return current > 0 ? "up" : "neutral";
    const change = ((current - previous) / previous) * 100;
    if (change > 5) return "up";
    if (change < -5) return "down";
    return "neutral";
  };

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] rounded-2xl border-border/40">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold flex items-center gap-2">
            <Calendar className="h-6 w-6 text-violet-500" />
            Weekly Report
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Your productivity insights for the past 7 days
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          {loading ? (
            <div className="space-y-4 py-4">
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-32 rounded-xl" />
              <Skeleton className="h-48 rounded-xl" />
            </div>
          ) : report ? (
            <div className="space-y-6 py-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 gap-3">
                <Card className="p-4 bg-gradient-to-br from-violet-50 to-white border-violet-100">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Tasks Completed</p>
                      <p className="text-3xl font-bold font-mono text-violet-700">
                        {report.tasks_completed}
                      </p>
                    </div>
                    <div className="p-2 bg-violet-100 rounded-lg">
                      <CheckCircle2 className="h-5 w-5 text-violet-600" />
                    </div>
                  </div>
                  {report.previous_week && (
                    <div className="mt-2 flex items-center gap-1">
                      {getTrend(report.tasks_completed, report.previous_week.tasks_completed) === "up" ? (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      ) : getTrend(report.tasks_completed, report.previous_week.tasks_completed) === "down" ? (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      ) : null}
                      <span className="text-xs text-muted-foreground">
                        vs {report.previous_week.tasks_completed} last week
                      </span>
                    </div>
                  )}
                </Card>

                <Card className="p-4 bg-gradient-to-br from-amber-50 to-white border-amber-100">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Focus Time</p>
                      <p className="text-3xl font-bold font-mono text-amber-700">
                        {formatDuration(report.total_focus_minutes)}
                      </p>
                    </div>
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <Clock className="h-5 w-5 text-amber-600" />
                    </div>
                  </div>
                  {report.previous_week && (
                    <div className="mt-2 flex items-center gap-1">
                      {getTrend(report.total_focus_minutes, report.previous_week.total_focus_minutes) === "up" ? (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      ) : getTrend(report.total_focus_minutes, report.previous_week.total_focus_minutes) === "down" ? (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      ) : null}
                      <span className="text-xs text-muted-foreground">
                        vs {formatDuration(report.previous_week.total_focus_minutes)} last week
                      </span>
                    </div>
                  )}
                </Card>

                <Card className="p-4 bg-gradient-to-br from-rose-50 to-white border-rose-100">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Pomodoros</p>
                      <p className="text-3xl font-bold font-mono text-rose-600">
                        {report.total_pomodoros}
                      </p>
                    </div>
                    <div className="p-2 bg-rose-100 rounded-lg">
                      <Flame className="h-5 w-5 text-rose-500" />
                    </div>
                  </div>
                </Card>

                <Card className="p-4 bg-gradient-to-br from-green-50 to-white border-green-100">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Completion Rate</p>
                      <p className="text-3xl font-bold font-mono text-green-600">
                        {report.completion_rate}%
                      </p>
                    </div>
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Target className="h-5 w-5 text-green-600" />
                    </div>
                  </div>
                  <Progress value={report.completion_rate} className="mt-2 h-2" />
                </Card>
              </div>

              {/* Daily Breakdown */}
              {report.daily_breakdown && report.daily_breakdown.length > 0 && (
                <Card className="p-4">
                  <h3 className="text-sm font-medium mb-3">Daily Activity</h3>
                  <div className="space-y-2">
                    {report.daily_breakdown.map((day, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-16">
                          {new Date(day.date).toLocaleDateString("en-US", { weekday: "short" })}
                        </span>
                        <div className="flex-1 h-6 bg-muted/30 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-violet-500 to-amber-500 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min((day.focus_minutes / 180) * 100, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono w-12 text-right">
                          {day.tasks_done} tasks
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* AI Insights */}
              <Card className="p-4 border-amber-200/50 bg-gradient-to-br from-amber-50/30 to-white">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    AI Insights
                  </h3>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={generateInsights}
                    disabled={generating}
                    className="text-xs"
                    data-testid="generate-insights-btn"
                  >
                    <RefreshCw className={`h-3 w-3 mr-1 ${generating ? "animate-spin" : ""}`} />
                    {generating ? "Analyzing..." : "Refresh"}
                  </Button>
                </div>
                
                {report.ai_insights ? (
                  <div className="space-y-3">
                    {report.ai_insights.summary && (
                      <p className="text-sm text-foreground">{report.ai_insights.summary}</p>
                    )}
                    {report.ai_insights.strengths && report.ai_insights.strengths.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-green-700 mb-1">Strengths</p>
                        <ul className="space-y-1">
                          {report.ai_insights.strengths.map((s, i) => (
                            <li key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                              <span className="text-green-500">•</span> {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {report.ai_insights.improvements && report.ai_insights.improvements.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-amber-700 mb-1">Areas to Improve</p>
                        <ul className="space-y-1">
                          {report.ai_insights.improvements.map((s, i) => (
                            <li key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                              <span className="text-amber-500">•</span> {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {report.ai_insights.recommendation && (
                      <div className="p-3 bg-violet-50 rounded-lg mt-2">
                        <p className="text-xs font-medium text-violet-700 mb-1">Recommendation</p>
                        <p className="text-sm text-violet-800">{report.ai_insights.recommendation}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground mb-2">
                      Get personalized insights based on your work patterns
                    </p>
                    <Button
                      onClick={generateInsights}
                      disabled={generating}
                      className="btn-gold text-sm"
                      data-testid="first-insights-btn"
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate AI Insights
                    </Button>
                  </div>
                )}
              </Card>

              {/* Top Categories */}
              {report.category_breakdown && Object.keys(report.category_breakdown).length > 0 && (
                <Card className="p-4">
                  <h3 className="text-sm font-medium mb-3">Time by Category</h3>
                  <div className="space-y-2">
                    {Object.entries(report.category_breakdown)
                      .sort(([, a], [, b]) => b - a)
                      .map(([category, minutes], idx) => (
                        <div key={category} className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs capitalize">
                            {category}
                          </Badge>
                          <div className="flex-1 h-2 bg-muted/30 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-violet-500 rounded-full"
                              style={{
                                width: `${(minutes / Math.max(...Object.values(report.category_breakdown))) * 100}%`,
                              }}
                            />
                          </div>
                          <span className="text-xs font-mono text-muted-foreground">
                            {formatDuration(minutes)}
                          </span>
                        </div>
                      ))}
                  </div>
                </Card>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No data available yet</p>
            </div>
          )}
        </ScrollArea>

        <div className="pt-4 border-t">
          <Button
            onClick={onClose}
            variant="outline"
            className="w-full rounded-full"
            data-testid="close-report-btn"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WeeklyReportDialog;
