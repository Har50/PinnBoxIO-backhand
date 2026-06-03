import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { Bot, Save, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";

interface AutoReplyData {
  id: number | null;
  isEnabled: boolean;
  subject: string;
  body: string;
  startDate: string | null;
  endDate: string | null;
}

export function AutoReplySection() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [data, setData] = useState<AutoReplyData>({
    id: null,
    isEnabled: false,
    subject: "Re: {{subject}}",
    body: "Thanks for your message. I'm currently away and will get back to you soon.",
    startDate: null,
    endDate: null,
  });

  useEffect(() => {
    apiFetch<AutoReplyData>("/api/automation/auto-reply")
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleToggle(enabled: boolean) {
    const prev = data.isEnabled;
    setData((d) => ({ ...d, isEnabled: enabled }));
    try {
      const updated = await apiFetch<AutoReplyData>("/api/automation/auto-reply", {
        method: "PUT",
        body: JSON.stringify({ isEnabled: enabled }),
      });
      setData(updated);
      toast({ title: enabled ? "Auto-reply enabled" : "Auto-reply disabled" });
    } catch {
      setData((d) => ({ ...d, isEnabled: prev }));
      toast({ title: "Failed to update auto-reply", variant: "destructive" });
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await apiFetch<AutoReplyData>("/api/automation/auto-reply", {
        method: "PUT",
        body: JSON.stringify({
          subject: data.subject,
          body: data.body,
          startDate: data.startDate || null,
          endDate: data.endDate || null,
        }),
      });
      setData(updated);
      toast({ title: "Auto-reply settings saved" });
    } catch {
      toast({ title: "Couldn't save auto-reply settings", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card data-testid="section-auto-reply">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">Auto-Reply</CardTitle>
            {!loading && data.isEnabled && (
              <Badge className="text-[10px] bg-emerald-500/15 text-emerald-600 border-emerald-500/20 dark:text-emerald-400 ml-1">
                Active
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3">
            {!loading && (
              <Switch
                checked={data.isEnabled}
                onCheckedChange={handleToggle}
                aria-label="Enable auto-reply"
              />
            )}
            <button
              onClick={() => setExpanded((e) => !e)}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label={expanded ? "Collapse auto-reply" : "Expand auto-reply"}
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <CardDescription className="text-xs">Set an automatic reply for when you're away</CardDescription>
      </CardHeader>

      {expanded && (
        <CardContent className="flex flex-col gap-4 pt-0">
          {loading ? (
            <div className="h-32 rounded-lg bg-muted/40 animate-pulse" />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Start date (optional)</Label>
                  <Input
                    type="date"
                    value={data.startDate ? data.startDate.slice(0, 10) : ""}
                    onChange={(e) => setData((d) => ({ ...d, startDate: e.target.value || null }))}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">End date (optional)</Label>
                  <Input
                    type="date"
                    value={data.endDate ? data.endDate.slice(0, 10) : ""}
                    onChange={(e) => setData((d) => ({ ...d, endDate: e.target.value || null }))}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Reply subject</Label>
                <Input
                  value={data.subject}
                  onChange={(e) => setData((d) => ({ ...d, subject: e.target.value }))}
                  className="h-8 text-xs"
                  placeholder="Re: {{subject}}"
                />
                <p className="text-[11px] text-muted-foreground">
                  Use <code className="bg-muted px-1 rounded text-[10px]">{"{{subject}}"}</code> to include the original subject
                </p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Reply message</Label>
                <Textarea
                  value={data.body}
                  onChange={(e) => setData((d) => ({ ...d, body: e.target.value }))}
                  className="text-xs resize-none min-h-[80px]"
                  placeholder="Enter your auto-reply message…"
                />
              </div>
              <Button
                size="sm"
                className="w-full gap-2"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save auto-reply
              </Button>
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}
