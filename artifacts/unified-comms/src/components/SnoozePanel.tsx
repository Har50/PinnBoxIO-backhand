import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Bell, X, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export interface SnoozeOption {
  label: string;
  sublabel: string;
  getValue: () => Date;
}

function getSnoozeOptions(): SnoozeOption[] {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(8, 0, 0, 0);

  const laterToday = new Date(now);
  laterToday.setHours(laterToday.getHours() + 3, 0, 0, 0);

  const thisEvening = new Date(now);
  thisEvening.setHours(18, 0, 0, 0);

  const tomorrowAfternoon = new Date(tomorrow);
  tomorrowAfternoon.setHours(13, 0, 0, 0);

  const nextWeek = new Date(now);
  nextWeek.setDate(nextWeek.getDate() + 7);
  nextWeek.setHours(8, 0, 0, 0);

  return [
    { label: "Later today", sublabel: laterToday.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), getValue: () => laterToday },
    { label: "This evening", sublabel: "6:00 PM", getValue: () => thisEvening },
    { label: "Tomorrow morning", sublabel: tomorrow.toLocaleDateString([], { weekday: "short" }) + " 8:00 AM", getValue: () => tomorrow },
    { label: "Tomorrow afternoon", sublabel: tomorrow.toLocaleDateString([], { weekday: "short" }) + " 1:00 PM", getValue: () => tomorrowAfternoon },
    { label: "Next week", sublabel: nextWeek.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }), getValue: () => nextWeek },
  ];
}

interface SnoozePanelProps {
  onSnooze: (until: Date) => void;
  onClose: () => void;
  className?: string;
}

export function SnoozePanel({ onSnooze, onClose, className }: SnoozePanelProps) {
  const { toast } = useToast();
  const [customDate, setCustomDate] = useState("");
  const [customTime, setCustomTime] = useState("08:00");
  const options = getSnoozeOptions();

  const handleOption = (opt: SnoozeOption) => {
    const until = opt.getValue();
    onSnooze(until);
    toast({
      title: `Snoozed until ${until.toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`,
    });
    onClose();
  };

  const handleCustom = () => {
    if (!customDate) return;
    const [hours, minutes] = customTime.split(":").map(Number);
    const until = new Date(customDate);
    until.setHours(hours, minutes, 0, 0);
    if (isNaN(until.getTime()) || until <= new Date()) {
      toast({ title: "Please pick a future date and time", variant: "destructive" });
      return;
    }
    onSnooze(until);
    toast({
      title: `Snoozed until ${until.toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`,
    });
    onClose();
  };

  return (
    <div className={cn("bg-popover border rounded-xl shadow-xl z-50 w-72 p-1 overflow-hidden", className)}>
      <div className="flex items-center justify-between px-3 py-2.5 border-b mb-1">
        <div className="flex items-center gap-2">
          <Bell className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-sm font-semibold">Snooze until…</span>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors rounded p-0.5">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="px-1 pb-1 space-y-0.5">
        {options.map((opt) => (
          <button
            key={opt.label}
            onClick={() => handleOption(opt)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted transition-colors text-left"
          >
            <span className="text-sm font-medium">{opt.label}</span>
            <span className="text-xs text-muted-foreground">{opt.sublabel}</span>
          </button>
        ))}
      </div>

      <div className="border-t mt-1 px-3 pt-3 pb-2 space-y-2">
        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <Clock className="w-3 h-3" />
          Custom date &amp; time
        </p>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Date</Label>
            <Input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="h-7 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Time</Label>
            <Input
              type="time"
              value={customTime}
              onChange={(e) => setCustomTime(e.target.value)}
              className="h-7 text-xs"
            />
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="w-full h-7 text-xs"
          onClick={handleCustom}
          disabled={!customDate}
        >
          Snooze for custom time
        </Button>
      </div>
    </div>
  );
}
