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
import { Clock, CalendarDays, Mail, Save } from "lucide-react";

const SettingsDialog = ({ open, onClose, settings, onSave }) => {
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

          {/* Integrations */}
          <div>
            <h3 className="text-sm font-medium mb-4">Integrations</h3>
            <div className="space-y-4 pl-6">
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-violet-100 rounded-lg">
                    <CalendarDays className="h-4 w-4 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Google Calendar</p>
                    <p className="text-xs text-muted-foreground">
                      Import events as tasks
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs">
                  Coming Soon
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-rose-100 rounded-lg">
                    <Mail className="h-4 w-4 text-rose-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Gmail</p>
                    <p className="text-xs text-muted-foreground">
                      Extract tasks from emails
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs">
                  Coming Soon
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
