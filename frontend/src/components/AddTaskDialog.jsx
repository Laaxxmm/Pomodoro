import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Plus } from "lucide-react";
import { format } from "date-fns";

const AddTaskDialog = ({ open, onClose, onAdd }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState(null);
  const [estimatedMinutes, setEstimatedMinutes] = useState(25);
  const [category, setCategory] = useState("general");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    await onAdd({
      title: title.trim(),
      description: description.trim(),
      deadline: deadline ? format(deadline, "yyyy-MM-dd") : null,
      estimated_minutes: estimatedMinutes,
      category,
      source: "manual",
    });
    setIsSubmitting(false);

    // Reset form
    setTitle("");
    setDescription("");
    setDeadline(null);
    setEstimatedMinutes(25);
    setCategory("general");
  };

  const categories = [
    { value: "general", label: "General" },
    { value: "work", label: "Work" },
    { value: "personal", label: "Personal" },
    { value: "health", label: "Health" },
    { value: "finance", label: "Finance" },
    { value: "learning", label: "Learning" },
  ];

  const timeOptions = [
    { value: 15, label: "15 min" },
    { value: 25, label: "25 min (1 pomodoro)" },
    { value: 50, label: "50 min (2 pomodoros)" },
    { value: 75, label: "75 min (3 pomodoros)" },
    { value: 120, label: "2 hours" },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px] rounded-2xl border-border/40">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">
            Add New Task
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Create a task and let AI prioritize it for you
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium">
              Task Title
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What do you need to do?"
              className="input-minimal border-b border-border focus:border-violet-500 rounded-lg px-4"
              required
              data-testid="task-title-input"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              Description (optional)
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add more details..."
              className="min-h-[80px] rounded-xl border-border/40 focus:border-violet-500"
              data-testid="task-description-input"
            />
          </div>

          {/* Two column layout */}
          <div className="grid grid-cols-2 gap-4">
            {/* Category */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger
                  className="rounded-xl border-border/40"
                  data-testid="category-select"
                >
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Estimated Time */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Estimated Time</Label>
              <Select
                value={estimatedMinutes.toString()}
                onValueChange={(v) => setEstimatedMinutes(parseInt(v))}
              >
                <SelectTrigger
                  className="rounded-xl border-border/40"
                  data-testid="time-select"
                >
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent>
                  {timeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value.toString()}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Deadline */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Deadline (optional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal rounded-xl border-border/40"
                  data-testid="deadline-picker"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {deadline ? (
                    format(deadline, "PPP")
                  ) : (
                    <span className="text-muted-foreground">Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={deadline}
                  onSelect={setDeadline}
                  initialFocus
                  disabled={(date) => date < new Date()}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 rounded-full"
              data-testid="cancel-btn"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!title.trim() || isSubmitting}
              className="flex-1 btn-primary"
              data-testid="submit-task-btn"
            >
              <Plus className="h-4 w-4 mr-2" />
              {isSubmitting ? "Adding..." : "Add Task"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddTaskDialog;
