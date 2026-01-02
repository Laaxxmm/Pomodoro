import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Clock, CalendarDays, Mail, Save, Moon, Link2, CheckCircle2 } from "lucide-react";

const SettingsDialog = ({ open, onClose, settings, onSave, onOpenGoogleIntegration }) => {
  const [localSettings, setLocalSettings] = useState(settings);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleSave = async () => {
    setIsSaving(true);
    await onSave(localSettings);
    setIsSaving(false);
  };

  const updateSetting = (key, value) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
  };

  const isGoogleConnected = settings.google_calendar_connected || settings.gmail_connected;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] rounded-2xl border-border/40">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">Settings</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Customize your FocusFlow experience
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Pomodoro Settings */}
          <div>
            <h3 className="text-sm font-medium flex items-center gap-2 mb-4">
              <Clock className="h-4 w-4 text-violet-500" />
              Pomodoro Timer
            </h3>
            <div className="space-y-4 pl-6">
              <div className="flex items-center justify-between">
                <Label htmlFor="work-duration" className="text-sm">
                  Work Duration (minutes)
                </Label>
                <Input
                  id="work-duration"
                  type="number"
                  value={localSettings.pomodoro_work_minutes}
                  onChange={(e) =>
                    updateSetting(
                      "pomodoro_work_minutes",
                      parseInt(e.target.value) || 25
                    )
                  }
                  className="w-20 text-center rounded-lg"
                  min={1}
                  max={60}
                  data-testid="work-duration-input"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="short-break" className="text-sm">
                  Short Break (minutes)
                </Label>
                <Input
                  id="short-break"
                  type="number"
                  value={localSettings.pomodoro_short_break}
                  onChange={(e) =>
                    updateSetting(
                      "pomodoro_short_break",
                      parseInt(e.target.value) || 5
                    )
                  }
                  className="w-20 text-center rounded-lg"
                  min={1}
                  max={30}
                  data-testid="short-break-input"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="long-break" className="text-sm">
                  Long Break (minutes)
                </Label>
                <Input
                  id="long-break"
                  type="number"
                  value={localSettings.pomodoro_long_break}
                  onChange={(e) =>
                    updateSetting(
                      "pomodoro_long_break",
                      parseInt(e.target.value) || 15
                    )
                  }
                  className="w-20 text-center rounded-lg"
                  min={1}
                  max={60}
                  data-testid="long-break-input"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Task Settings */}
          <div>
            <h3 className="text-sm font-medium mb-4">Task Management</h3>
            <div className="space-y-4 pl-6">
              <div className="flex items-center justify-between">
                <Label htmlFor="daily-limit" className="text-sm">
                  Daily Focus Tasks Limit
                </Label>
                <Input
                  id="daily-limit"
                  type="number"
                  value={localSettings.daily_task_limit}
                  onChange={(e) =>
                    updateSetting(
                      "daily_task_limit",
                      parseInt(e.target.value) || 4
                    )
                  }
                  className="w-20 text-center rounded-lg"
                  min={1}
                  max={10}
                  data-testid="daily-limit-input"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">Auto Rollover</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Move unfinished tasks to next day
                  </p>
                </div>
                <Switch
                  checked={localSettings.auto_rollover}
                  onCheckedChange={(checked) =>
                    updateSetting("auto_rollover", checked)
                  }
                  data-testid="auto-rollover-switch"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Appearance */}
          <div>
            <h3 className="text-sm font-medium flex items-center gap-2 mb-4">
              <Moon className="h-4 w-4 text-violet-500" />
              Appearance
            </h3>
            <div className="space-y-4 pl-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">Dark Mode</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Night-friendly dark theme
                  </p>
                </div>
                <Switch
                  checked={localSettings.dark_mode}
                  onCheckedChange={(checked) =>
                    updateSetting("dark_mode", checked)
                  }
                  data-testid="dark-mode-switch"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Integrations */}
          <div>
            <h3 className="text-sm font-medium flex items-center gap-2 mb-4">
              <Link2 className="h-4 w-4 text-violet-500" />
              Integrations
            </h3>
            <div className="space-y-4 pl-6">
              <div
                className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors ${
                  isGoogleConnected
                    ? "bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800"
                    : "bg-muted/30 hover:bg-muted/50"
                }`}
                onClick={onOpenGoogleIntegration}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isGoogleConnected ? "bg-green-100 dark:bg-green-900" : "bg-violet-100 dark:bg-violet-900"}`}>
                    {isGoogleConnected ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                    ) : (
                      <Link2 className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">Google Account</p>
                    <p className="text-xs text-muted-foreground">
                      {isGoogleConnected
                        ? `Connected: ${settings.google_email || "Calendar & Gmail"}`
                        : "Calendar & Gmail integration"}
                    </p>
                  </div>
                </div>
                <Badge
                  variant={isGoogleConnected ? "default" : "secondary"}
                  className={`text-xs ${isGoogleConnected ? "bg-green-600" : ""}`}
                >
                  {isGoogleConnected ? "Connected" : "Connect"}
                </Badge>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 rounded-full"
              data-testid="settings-cancel-btn"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 btn-primary"
              data-testid="settings-save-btn"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;
