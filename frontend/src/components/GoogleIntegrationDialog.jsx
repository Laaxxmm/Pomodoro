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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CalendarDays,
  Mail,
  Link2,
  Unlink,
  RefreshCw,
  Import,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const GoogleIntegrationDialog = ({ open, onClose, settings, onRefresh, onTasksImported }) => {
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [emails, setEmails] = useState([]);
  const [loadingCalendar, setLoadingCalendar] = useState(false);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [importing, setImporting] = useState(false);
  const [extracting, setExtracting] = useState({});

  const isConnected = settings.google_calendar_connected || settings.gmail_connected;

  const connectGoogle = async () => {
    try {
      const response = await axios.get(`${API}/auth/google/login`);
      window.location.href = response.data.authorization_url;
    } catch (e) {
      if (e.response?.status === 400) {
        toast.error("Google OAuth not configured. Add credentials to backend/.env");
      } else {
        toast.error("Failed to initiate Google connection");
      }
      console.error(e);
    }
  };

  const disconnectGoogle = async () => {
    try {
      await axios.post(`${API}/auth/google/disconnect`);
      toast.success("Google account disconnected");
      onRefresh();
    } catch (e) {
      toast.error("Failed to disconnect");
      console.error(e);
    }
  };

  const fetchCalendarEvents = async () => {
    setLoadingCalendar(true);
    try {
      const response = await axios.get(`${API}/calendar/events?days=7`);
      setCalendarEvents(response.data.events || []);
    } catch (e) {
      console.error("Error fetching calendar:", e);
      if (e.response?.status === 401) {
        toast.error("Google session expired. Please reconnect.");
      }
    } finally {
      setLoadingCalendar(false);
    }
  };

  const fetchEmails = async () => {
    setLoadingEmails(true);
    try {
      const response = await axios.get(`${API}/gmail/messages?max_results=10&query=is:unread`);
      setEmails(response.data.messages || []);
    } catch (e) {
      console.error("Error fetching emails:", e);
      if (e.response?.status === 401) {
        toast.error("Google session expired. Please reconnect.");
      }
    } finally {
      setLoadingEmails(false);
    }
  };

  const importCalendarEvents = async () => {
    setImporting(true);
    try {
      const response = await axios.post(`${API}/calendar/import?days=7`);
      toast.success(`Imported ${response.data.imported} events as tasks`);
      onTasksImported();
    } catch (e) {
      toast.error("Failed to import calendar events");
      console.error(e);
    } finally {
      setImporting(false);
    }
  };

  const extractTasksFromEmail = async (emailId) => {
    setExtracting((prev) => ({ ...prev, [emailId]: true }));
    try {
      const response = await axios.post(`${API}/gmail/extract-tasks?email_id=${emailId}`);
      if (response.data.extracted > 0) {
        toast.success(`Extracted ${response.data.extracted} tasks from email`);
        onTasksImported();
      } else {
        toast.info("No action items found in this email");
      }
    } catch (e) {
      toast.error("Failed to extract tasks");
      console.error(e);
    } finally {
      setExtracting((prev) => ({ ...prev, [emailId]: false }));
    }
  };

  useEffect(() => {
    if (open && isConnected) {
      fetchCalendarEvents();
      fetchEmails();
    }
  }, [open, isConnected]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[650px] max-h-[85vh] rounded-2xl border-border/40">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold flex items-center gap-2">
            <Link2 className="h-6 w-6 text-violet-500" />
            Google Integration
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Import tasks from Calendar and extract action items from Gmail
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6 py-4">
            {/* Connection Status */}
            <Card className={`p-4 ${isConnected ? "border-green-200 bg-green-50/50 dark:bg-green-950/20 dark:border-green-800" : "border-border"}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isConnected ? "bg-green-100 dark:bg-green-900" : "bg-muted"}`}>
                    {isConnected ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">
                      {isConnected ? "Google Connected" : "Not Connected"}
                    </p>
                    {settings.google_email && (
                      <p className="text-sm text-muted-foreground">{settings.google_email}</p>
                    )}
                  </div>
                </div>
                <Button
                  onClick={isConnected ? disconnectGoogle : connectGoogle}
                  variant={isConnected ? "outline" : "default"}
                  className={isConnected ? "" : "btn-primary"}
                  data-testid="google-connect-btn"
                >
                  {isConnected ? (
                    <>
                      <Unlink className="h-4 w-4 mr-2" />
                      Disconnect
                    </>
                  ) : (
                    <>
                      <Link2 className="h-4 w-4 mr-2" />
                      Connect Google
                    </>
                  )}
                </Button>
              </div>
            </Card>

            {isConnected && (
              <>
                <Separator />

                {/* Calendar Events */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-violet-500" />
                      Upcoming Calendar Events
                    </h3>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={fetchCalendarEvents}
                        disabled={loadingCalendar}
                        data-testid="refresh-calendar-btn"
                      >
                        <RefreshCw className={`h-4 w-4 ${loadingCalendar ? "animate-spin" : ""}`} />
                      </Button>
                      <Button
                        size="sm"
                        onClick={importCalendarEvents}
                        disabled={importing || calendarEvents.length === 0}
                        className="btn-gold text-xs"
                        data-testid="import-calendar-btn"
                      >
                        <Import className="h-4 w-4 mr-1" />
                        {importing ? "Importing..." : "Import All"}
                      </Button>
                    </div>
                  </div>

                  {loadingCalendar ? (
                    <div className="space-y-2">
                      <Skeleton className="h-16 rounded-lg" />
                      <Skeleton className="h-16 rounded-lg" />
                    </div>
                  ) : calendarEvents.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {calendarEvents.slice(0, 5).map((event) => (
                        <div
                          key={event.id}
                          className="p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{event.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatDate(event.start)}
                              </p>
                            </div>
                            {event.all_day && (
                              <Badge variant="secondary" className="text-xs">
                                All Day
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                      {calendarEvents.length > 5 && (
                        <p className="text-xs text-muted-foreground text-center py-2">
                          +{calendarEvents.length - 5} more events
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No upcoming events in the next 7 days
                    </p>
                  )}
                </div>

                <Separator />

                {/* Gmail Messages */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium flex items-center gap-2">
                      <Mail className="h-4 w-4 text-rose-500" />
                      Recent Unread Emails
                    </h3>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={fetchEmails}
                      disabled={loadingEmails}
                      data-testid="refresh-emails-btn"
                    >
                      <RefreshCw className={`h-4 w-4 ${loadingEmails ? "animate-spin" : ""}`} />
                    </Button>
                  </div>

                  {loadingEmails ? (
                    <div className="space-y-2">
                      <Skeleton className="h-20 rounded-lg" />
                      <Skeleton className="h-20 rounded-lg" />
                    </div>
                  ) : emails.length > 0 ? (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {emails.map((email) => (
                        <div
                          key={email.id}
                          className="p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{email.subject}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {email.from}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {email.snippet}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => extractTasksFromEmail(email.id)}
                              disabled={extracting[email.id]}
                              className="flex-shrink-0 text-xs"
                              variant="outline"
                              data-testid={`extract-email-${email.id}`}
                            >
                              <Sparkles
                                className={`h-3 w-3 mr-1 ${extracting[email.id] ? "animate-spin" : ""}`}
                              />
                              {extracting[email.id] ? "..." : "Extract"}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No unread emails found
                    </p>
                  )}
                </div>
              </>
            )}

            {!isConnected && (
              <div className="text-center py-8">
                <div className="p-4 bg-muted/30 rounded-xl inline-block mb-4">
                  <Link2 className="h-12 w-12 text-muted-foreground" />
                </div>
                <h3 className="font-medium mb-2">Connect Your Google Account</h3>
                <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
                  Import calendar events as tasks and extract action items from your emails using AI
                </p>
                <Button onClick={connectGoogle} className="btn-primary" data-testid="connect-google-cta">
                  <Link2 className="h-4 w-4 mr-2" />
                  Connect Google Account
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="pt-4 border-t">
          <Button
            onClick={onClose}
            variant="outline"
            className="w-full rounded-full"
            data-testid="close-google-dialog-btn"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GoogleIntegrationDialog;
