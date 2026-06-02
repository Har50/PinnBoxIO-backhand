import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { Bot, Save, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";

interface AutoReplyConfig {
  enabled: boolean;
  subject: string;
  message: string;
  startDate?: string;
  endDate?: string;
}

export function AutoReplySection() {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<AutoReplyConfig>({
    enabled: false,
    subject: "Out of Office",
    message: "Thank you for your message. I'm currently out of the office and will respond when I return.",
    startDate: "",
    endDate: "",
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiFetch("/api/settings/auto-reply", {
        method: "POST",
        body: JSON.stringify(config),
      });
      toast({ title: "Auto-reply settings saved" });
    } catch {
      toast({ title: "Couldn't save auto-reply settings", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card data-testid="section-auto-reply">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-muted-foreground" />
          <CardTitle className="text-sm font-semibold">Auto-Reply</CardTitle>
          {config.enabled && (
            <Badge variant="secondary" className="text-[10px] ml-1">Active</Badge>
          )}
        </div>
        <CardDescription className="text-xs">Set an automatic reply for when you're away</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium">Enable auto-reply</Label>
            <p className="text-xs text-muted-foreground">Automatically reply to incoming emails</p>
          </div>
          <Switch
            checked={config.enabled}
            onCheckedChange={(checked) => setConfig((c) => ({ ...c, enabled: checked }))}
            aria-label="Enable auto-reply"
          />
        </div>

        {config.enabled && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Start date (optional)</Label>
                <Input
                  type="date"
                  value={config.startDate}
                  onChange={(e) => setConfig((c) => ({ ...c, startDate: e.target.value }))}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">End date (optional)</Label>
                <Input
                  type="date"
                  value={config.endDate}
                  onChange={(e) => setConfig((c) => ({ ...c, endDate: e.target.value }))}
                  className="h-8 text-xs"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Reply subject</Label>
              <Input
                value={config.subject}
                onChange={(e) => setConfig((c) => ({ ...c, subject: e.target.value }))}
                className="h-8 text-xs"
                placeholder="Out of Office"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Reply message</Label>
              <Textarea
                value={config.message}
                onChange={(e) => setConfig((c) => ({ ...c, message: e.target.value }))}
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
    </Card>
  );
}
