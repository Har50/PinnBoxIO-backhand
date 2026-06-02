import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Input } from "./ui/input";
import { Switch } from "./ui/switch";
import { Zap, Plus, Trash2, ChevronRight, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type TriggerType = "from_contains" | "subject_contains" | "has_attachment" | "to_contains";
type ActionType = "label" | "move_to" | "mark_read" | "star" | "forward_to";

interface WorkflowRule {
  id: string;
  enabled: boolean;
  name: string;
  trigger: {
    type: TriggerType;
    value: string;
  };
  action: {
    type: ActionType;
    value: string;
  };
}

const TRIGGER_LABELS: Record<TriggerType, string> = {
  from_contains: "From contains",
  subject_contains: "Subject contains",
  has_attachment: "Has attachment",
  to_contains: "To contains",
};

const ACTION_LABELS: Record<ActionType, string> = {
  label: "Add label",
  move_to: "Move to folder",
  mark_read: "Mark as read",
  star: "Star message",
  forward_to: "Forward to",
};

const TRIGGER_NEEDS_VALUE: TriggerType[] = ["from_contains", "subject_contains", "to_contains"];
const ACTION_NEEDS_VALUE: ActionType[] = ["label", "move_to", "forward_to"];

const STORAGE_KEY = "pinnbox_workflows";

function loadRules(): WorkflowRule[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveRules(rules: WorkflowRule[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
}

interface EditingRule {
  id?: string;
  name: string;
  triggerType: TriggerType;
  triggerValue: string;
  actionType: ActionType;
  actionValue: string;
}

const DEFAULT_EDITING: EditingRule = {
  name: "",
  triggerType: "from_contains",
  triggerValue: "",
  actionType: "label",
  actionValue: "",
};

export function WorkflowBuilderSection() {
  const [rules, setRules] = useState<WorkflowRule[]>(() => loadRules());
  const [editing, setEditing] = useState<EditingRule | null>(null);
  const [error, setError] = useState("");

  const persist = (updated: WorkflowRule[]) => {
    setRules(updated);
    saveRules(updated);
  };

  const toggleRule = (id: string) => {
    persist(rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)));
  };

  const deleteRule = (id: string) => {
    persist(rules.filter((r) => r.id !== id));
  };

  const startNew = () => {
    setEditing(DEFAULT_EDITING);
    setError("");
  };

  const startEdit = (r: WorkflowRule) => {
    setEditing({
      id: r.id,
      name: r.name,
      triggerType: r.trigger.type,
      triggerValue: r.trigger.value,
      actionType: r.action.type,
      actionValue: r.action.value,
    });
    setError("");
  };

  const handleSave = () => {
    if (!editing) return;
    if (!editing.name.trim()) { setError("Please give this rule a name."); return; }
    if (TRIGGER_NEEDS_VALUE.includes(editing.triggerType) && !editing.triggerValue.trim()) {
      setError("Please fill in the trigger value."); return;
    }
    if (ACTION_NEEDS_VALUE.includes(editing.actionType) && !editing.actionValue.trim()) {
      setError("Please fill in the action value."); return;
    }
    setError("");
    const rule: WorkflowRule = {
      id: editing.id ?? crypto.randomUUID(),
      enabled: true,
      name: editing.name.trim(),
      trigger: { type: editing.triggerType, value: editing.triggerValue.trim() },
      action: { type: editing.actionType, value: editing.actionValue.trim() },
    };
    if (editing.id) {
      persist(rules.map((r) => (r.id === editing.id ? rule : r)));
    } else {
      persist([rule, ...rules]);
    }
    setEditing(null);
  };

  return (
    <Card data-testid="section-workflows">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-muted-foreground" />
          <CardTitle className="text-sm font-semibold">Email Workflows</CardTitle>
          {rules.filter((r) => r.enabled).length > 0 && (
            <Badge variant="secondary" className="text-[10px] ml-1">
              {rules.filter((r) => r.enabled).length} active
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
              <Button size="sm" className="flex-1 h-7 text-xs" onClick={handleSave}>Save rule</Button>
              <Button size="sm" variant="ghost" className="px-3 h-7 text-xs" onClick={() => { setEditing(null); setError(""); }}>Cancel</Button>
            </div>
          </div>
        ) : (
          <>
            {rules.length === 0 ? (
              <div className="flex flex-col items-center py-6 text-center">
                <Zap className="w-8 h-8 text-muted-foreground/20 mb-2" />
                <p className="text-sm font-medium text-muted-foreground">No workflow rules yet</p>
                <p className="text-xs text-muted-foreground mt-1">Automate labeling, moving, or starring emails.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {rules.map((r) => (
                  <div
                    key={r.id}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors cursor-pointer group hover:bg-muted/30",
                      r.enabled ? "border-border/50 bg-muted/10" : "border-border/30 opacity-60"
                    )}
                    onClick={() => startEdit(r)}
                  >
                    <Switch
                      checked={r.enabled}
                      onCheckedChange={() => toggleRule(r.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="shrink-0"
                      aria-label={`Toggle ${r.name}`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{r.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {TRIGGER_LABELS[r.trigger.type]}{r.trigger.value ? ` "${r.trigger.value}"` : ""} → {ACTION_LABELS[r.action.type]}{r.action.value ? ` "${r.action.value}"` : ""}
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
