import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Bell, BellOff, Check, Clock, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow, isPast } from "date-fns";

export interface FollowUp {
  id: string;
  messageId: number;
  subject: string;
  remindAt: Date;
  done: boolean;
}

const STORAGE_KEY = "pinnbox_followups";

function loadFollowUps(): FollowUp[] {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return raw.map((f: any) => ({ ...f, remindAt: new Date(f.remindAt) }));
  } catch {
    return [];
  }
}

function saveFollowUps(fus: FollowUp[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(fus));
}

export function useFollowUps() {
  const [followUps, setFollowUps] = useState<FollowUp[]>(() => loadFollowUps());

  const add = (messageId: number, subject: string, remindAt: Date): FollowUp => {
    const fu: FollowUp = { id: crypto.randomUUID(), messageId, subject, remindAt, done: false };
    setFollowUps((prev) => {
      const updated = [fu, ...prev];
      saveFollowUps(updated);
      return updated;
    });
    return fu;
  };

  const markDone = (id: string) => {
    setFollowUps((prev) => {
      const updated = prev.map((f) => (f.id === id ? { ...f, done: true } : f));
      saveFollowUps(updated);
      return updated;
    });
  };

  const remove = (id: string) => {
    setFollowUps((prev) => {
      const updated = prev.filter((f) => f.id !== id);
      saveFollowUps(updated);
      return updated;
    });
  };

  const hasFollowUp = (messageId: number) =>
    followUps.some((f) => f.messageId === messageId && !f.done);

  return { followUps, add, markDone, remove, hasFollowUp };
}

interface FollowUpButtonProps {
  messageId: number;
  subject: string;
  className?: string;
}

const QUICK_TIMES: { label: string; hours: number }[] = [
  { label: "1 hour", hours: 1 },
  { label: "Tomorrow", hours: 24 },
  { label: "3 days", hours: 72 },
  { label: "1 week", hours: 168 },
];

export function FollowUpButton({ messageId, subject, className }: FollowUpButtonProps) {
  const { toast } = useToast();
  const { add, hasFollowUp, followUps, markDone, remove } = useFollowUps();
  const [open, setOpen] = useState(false);

  const existing = followUps.find((f) => f.messageId === messageId && !f.done);
  const isScheduled = !!existing;

  const handleQuick = (hours: number) => {
    const remindAt = new Date(Date.now() + hours * 3600_000);
    add(messageId, subject, remindAt);
    toast({ title: `Follow-up set for ${remindAt.toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}` });
    setOpen(false);
  };

  const handleCancel = () => {
    if (existing) remove(existing.id);
    toast({ title: "Follow-up removed" });
    setOpen(false);
  };

  return (
    <div className={cn("relative", className)}>
      <Button
        variant={isScheduled ? "secondary" : "ghost"}
        size="sm"
        className={cn("gap-1.5", isScheduled && "text-amber-500 border-amber-500/30")}
        onClick={() => setOpen((v) => !v)}
        title={isScheduled ? `Follow-up: ${existing?.remindAt.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}` : "Set follow-up reminder"}
      >
        {isScheduled ? <Bell className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> : <Bell className="h-3.5 w-3.5" />}
        <span className="hidden sm:inline">{isScheduled ? "Remind me" : "Follow up"}</span>
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 bg-popover border rounded-xl shadow-xl p-3 w-56 space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground px-1 pb-0.5">Remind me in…</p>
            {QUICK_TIMES.map((t) => (
              <button
                key={t.hours}
                onClick={() => handleQuick(t.hours)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted transition-colors text-left text-sm"
              >
                <span>{t.label}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(Date.now() + t.hours * 3600_000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </button>
            ))}
            {isScheduled && (
              <>
                <div className="border-t pt-1.5 mt-1.5">
                  <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-amber-500">
                    <Clock className="w-3 h-3" />
                    <span>
                      {isPast(existing!.remindAt)
                        ? "Overdue · "
                        : `Scheduled · `}
                      {formatDistanceToNow(existing!.remindAt, { addSuffix: true })}
                    </span>
                  </div>
                  <button
                    onClick={handleCancel}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors text-sm text-muted-foreground"
                  >
                    <BellOff className="w-3.5 h-3.5" />
                    Cancel follow-up
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export function FollowUpList() {
  const { followUps, markDone, remove } = useFollowUps();
  const pending = followUps.filter((f) => !f.done).sort((a, b) => a.remindAt.getTime() - b.remindAt.getTime());
  if (pending.length === 0) return null;

  return (
    <div className="space-y-1.5">
      {pending.map((f) => (
        <div
          key={f.id}
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg border text-sm",
            isPast(f.remindAt) ? "border-amber-500/40 bg-amber-500/5" : "border-border/40 bg-muted/20"
          )}
        >
          {isPast(f.remindAt) && <Badge variant="outline" className="text-[10px] text-amber-500 border-amber-500/40 shrink-0">Due</Badge>}
          <Clock className={cn("w-3.5 h-3.5 shrink-0", isPast(f.remindAt) ? "text-amber-500" : "text-muted-foreground")} />
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{f.subject}</p>
            <p className="text-xs text-muted-foreground">{formatDistanceToNow(f.remindAt, { addSuffix: true })}</p>
          </div>
          <button onClick={() => markDone(f.id)} className="p-1.5 rounded hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-500 transition-colors shrink-0" title="Mark done">
            <Check className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => remove(f.id)} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0" title="Remove">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
