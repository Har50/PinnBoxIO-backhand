import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Input } from "./ui/input";
import { Switch } from "./ui/switch";
import { Zap, Plus, Trash2, ChevronRight, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";

type TriggerType = "from" | "subject_contains" | "has_attachment" | "any";
type ActionType = "label" | "star" | "mark_read" | "forward" | "delete";

interface WorkflowRule {
  id: number;
  name: string;
  isEnabled: boolean;
  triggerType: TriggerType;
  triggerValue: string | null;
  actionType: ActionType;
  actionValue: string | null;
  createdAt: string;
}

const TRIGGER_LABELS: Record<TriggerType, string> = {
  from: "From contains",
  subject_contains: "Subject contains",
  has_attachment: "Has attachment",
  any: "Any email",
};

const ACTION_LABELS: Record<ActionType, string> = {
  label: "Add label",
  star: "Star message",
  mark_read: "Mark as read",
  forward: "Forward to",
  delete: "Delete",
};

const TRIGGER_NEEDS_VALUE: TriggerType[] = ["from", "subject_contains"];
const ACTION_NEEDS_VALUE: ActionType[] = ["label", "forward"];

interface EditingRule {
  id?: number;
  name: string;
  triggerType: TriggerType;
  triggerValue: string;
  actionType: ActionType;
  actionValue: string;
}

const DEFAULT_EDITING: EditingRule = {
  name: "",
  triggerType: "from",
  triggerValue: "",
  actionType: "label",
  actionValue: "",
};

export function WorkflowBuilderSection() {
  const { toast } = useToast();
  const [rules, setRules] = useState<WorkflowRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<EditingRule | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<WorkflowRule[]>("/api/automation/workflows")
      .then((data) => setRules(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function toggleRule(rule: WorkflowRule) {
    const prev = rule.isEnabled;
    setRules((rs) => rs.map((r) => (r.id === rule.id ? { ...r, isEnabled: !prev } : r)));
    try {
      await apiFetch(`/api/automation/workflows/${rule.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isEnabled: !prev }),
      });
    } catch {
      setRules((rs) => rs.map((r) => (r.id === rule.id ? { ...r, isEnabled: prev } : r)));
      toast({ title: "Failed to update rule", variant: "destructive" });
    }
  }

  async function deleteRule(id: number) {
    setRules((rs) => rs.filter((r) => r.id !== id));
    try {
      await apiFetch(`/api/automation/workflows/${id}`, { method: "DELETE" });
    } catch {
      toast({ title: "Failed to delete rule", variant: "destructive" });
    }
  }

  const startNew = () => {
    setEditing(DEFAULT_EDITING);
    setError("");
  };

  const startEdit = (r: WorkflowRule) => {
    setEditing({
      id: r.id,
      name: r.name,
      triggerType: r.triggerType,
      triggerValue: r.triggerValue ?? "",
      actionType: r.actionType,
      actionValue: r.actionValue ?? "",
    });
    setError("");
  };

  async function handleSave() {
    if (!editing) return;
    if (!editing.name.trim()) { setError("Please give this rule a name."); return; }
    if (TRIGGER_NEEDS_VALUE.includes(editing.triggerType) && !editing.triggerValue.trim()) {
      setError("Please fill in the trigger value."); return;
    }
    if (ACTION_NEEDS_VALUE.includes(editing.actionType) && !editing.actionValue.trim()) {
      setError("Please fill in the action value."); return;
    }
    setError("");
    setSaving(true);
    try {
      const body = {
        name: editing.name.trim(),
        triggerType: editing.triggerType,
        triggerValue: editing.triggerValue.trim() || null,
        actionType: editing.actionType,
        actionValue: editing.actionValue.trim() || null,
        isEnabled: true,
      };

      if (editing.id !== undefined) {
        const updated = await apiFetch<WorkflowRule>(`/api/automation/workflows/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
        setRules((rs) => rs.map((r) => (r.id === editing.id ? updated : r)));
        toast({ title: "Rule updated" });
      } else {
        const created = await apiFetch<WorkflowRule>("/api/automation/workflows", {
          method: "POST",
          body: JSON.stringify(body),
        });
        setRules((rs) => [created, ...rs]);
        toast({ title: "Rule created" });
      }
      setEditing(null);
    } catch {
      toast({ title: "Failed to save rule", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  const activeCount = rules.filter((r) => r.isEnabled).length;

  return (
    <Card data-testid="section-workflows">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-muted-foreground" />
          <CardTitle className="text-sm font-semibold">Email Workflows</CardTitle>
          {activeCount > 0 && (
            <Badge variant="secondary" className="text-[10px] ml-1">
              {activeCount} active
            </Badge>
          )}
        </div>
        <CardDescription className="text-xs">Automate actions when emails arrive</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {editing !== null ? (
          <div className="flex flex-col gap-3 p-3 rounded-xl border border-border/60 bg-muted/10">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Rule name</label>
              <Input
                autoFocus
                value={editing.name}
                onChange={(e) => setEditing((p) => p && { ...p, name: e.target.value })}
                placeholder="e.g. Label newsletters"
                className="h-8 text-xs"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-muted-foreground shrink-0">When</span>
              <Select
                value={editing.triggerType}
                onValueChange={(v) => setEditing((p) => p && { ...p, triggerType: v as TriggerType, triggerValue: "" })}
              >
                <SelectTrigger className="h-7 text-xs flex-1 min-w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(TRIGGER_LABELS) as TriggerType[]).map((k) => (
                    <SelectItem key={k} value={k} className="text-xs">{TRIGGER_LABELS[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {TRIGGER_NEEDS_VALUE.includes(editing.triggerType) && (
                <Input
                  value={editing.triggerValue}
                  onChange={(e) => setEditing((p) => p && { ...p, triggerValue: e.target.value })}
                  placeholder="value…"
                  className="h-7 text-xs flex-1 min-w-[100px]"
                />
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <Select
                value={editing.actionType}
                onValueChange={(v) => setEditing((p) => p && { ...p, actionType: v as ActionType, actionValue: "" })}
              >
                <SelectTrigger className="h-7 text-xs flex-1 min-w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ACTION_LABELS) as ActionType[]).map((k) => (
                    <SelectItem key={k} value={k} className="text-xs">{ACTION_LABELS[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {ACTION_NEEDS_VALUE.includes(editing.actionType) && (
                <Input
                  value={editing.actionValue}
                  onChange={(e) => setEditing((p) => p && { ...p, actionValue: e.target.value })}
                  placeholder="value…"
                  className="h-7 text-xs flex-1 min-w-[100px]"
                />
              )}
            </div>

            {error && (
              <div className="flex items-center gap-1.5 text-xs text-destructive">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {error}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button size="sm" className="flex-1 h-7 text-xs gap-1.5" onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="w-3 h-3 animate-spin" />}
                Save rule
              </Button>
              <Button size="sm" variant="ghost" className="px-3 h-7 text-xs" onClick={() => { setEditing(null); setError(""); }}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            {loading ? (
              <div className="flex flex-col gap-2">
                {[0, 1].map((i) => (
                  <div key={i} className="h-12 rounded-lg bg-muted/40 animate-pulse" />
                ))}
              </div>
            ) : rules.length === 0 ? (
              <div className="flex flex-col items-center py-6 text-center">
                <Zap className="w-8 h-8 text-muted-foreground/20 mb-2" />
                <p className="text-sm font-medium text-muted-foreground">No workflow rules yet</p>
                <p className="text-xs text-muted-foreground mt-1">Automate labeling, forwarding, or starring emails.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {rules.map((r) => (
                  <div
                    key={r.id}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors cursor-pointer group hover:bg-muted/30",
                      r.isEnabled ? "border-border/50 bg-muted/10" : "border-border/30 opacity-60"
                    )}
                    onClick={() => startEdit(r)}
                  >
                    <Switch
                      checked={r.isEnabled}
                      onCheckedChange={() => toggleRule(r)}
                      onClick={(e) => e.stopPropagation()}
                      className="shrink-0"
                      aria-label={`Toggle ${r.name}`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{r.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {TRIGGER_LABELS[r.triggerType]}{r.triggerValue ? ` "${r.triggerValue}"` : ""} → {ACTION_LABELS[r.actionType]}{r.actionValue ? ` "${r.actionValue}"` : ""}
                      </p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteRule(r.id); }}
                      className="p-1.5 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-all shrink-0"
                      title="Delete rule"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <Button size="sm" variant="outline" className="w-full gap-2 h-8 text-xs mt-1" onClick={startNew}>
              <Plus className="w-3.5 h-3.5" />
              Add workflow rule
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
