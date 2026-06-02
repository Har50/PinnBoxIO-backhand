import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { ScrollArea } from "./ui/scroll-area";
import { FileText, Plus, Trash2, Edit2, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  createdAt: string;
}

const STORAGE_KEY = "pinnbox_email_templates";

function loadTemplates(): EmailTemplate[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveTemplates(templates: EmailTemplate[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

export function useEmailTemplates() {
  const [templates, setTemplates] = useState<EmailTemplate[]>(() => loadTemplates());

  const save = (t: EmailTemplate) => {
    setTemplates((prev) => {
      const updated = prev.some((p) => p.id === t.id)
        ? prev.map((p) => (p.id === t.id ? t : p))
        : [t, ...prev];
      saveTemplates(updated);
      return updated;
    });
  };

  const remove = (id: string) => {
    setTemplates((prev) => {
      const updated = prev.filter((t) => t.id !== id);
      saveTemplates(updated);
      return updated;
    });
  };

  const add = (name: string, subject: string, body: string): EmailTemplate => {
    const t: EmailTemplate = {
      id: crypto.randomUUID(),
      name,
      subject,
      body,
      createdAt: new Date().toISOString(),
    };
    save(t);
    return t;
  };

  return { templates, save, remove, add };
}

interface EmailTemplatesDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (template: EmailTemplate) => void;
}

export function EmailTemplatesDialog({ open, onClose, onSelect }: EmailTemplatesDialogProps) {
  const { templates, remove, add, save } = useEmailTemplates();
  const [editing, setEditing] = useState<Partial<EmailTemplate> | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleSave = () => {
    if (!editing?.name?.trim() || !editing?.subject?.trim()) return;
    if (editing.id) {
      save({ ...editing, id: editing.id, name: editing.name, subject: editing.subject, body: editing.body ?? "", createdAt: editing.createdAt ?? new Date().toISOString() });
    } else {
      add(editing.name.trim(), editing.subject.trim(), editing.body ?? "");
    }
    setEditing(null);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { onClose(); setEditing(null); } }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <FileText className="w-4 h-4 text-muted-foreground" />
            Email Templates
          </DialogTitle>
        </DialogHeader>

        {editing !== null ? (
          <div className="flex flex-col gap-3 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Template name</label>
              <Input
                autoFocus
                value={editing.name ?? ""}
                onChange={(e) => setEditing((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Follow-up, Introduction…"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Subject line</label>
              <Input
                value={editing.subject ?? ""}
                onChange={(e) => setEditing((p) => ({ ...p, subject: e.target.value }))}
                placeholder="Email subject"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Body</label>
              <Textarea
                value={editing.body ?? ""}
                onChange={(e) => setEditing((p) => ({ ...p, body: e.target.value }))}
                placeholder="Write your template here…"
                className="text-sm resize-none min-h-[100px]"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button size="sm" className="flex-1 gap-1.5" onClick={handleSave} disabled={!editing.name?.trim() || !editing.subject?.trim()}>
                <Check className="w-3.5 h-3.5" />
                Save template
              </Button>
              <Button size="sm" variant="ghost" className="px-3" onClick={() => setEditing(null)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">{templates.length} template{templates.length !== 1 ? "s" : ""}</p>
              <Button size="sm" variant="outline" className="gap-1.5 h-7 px-2.5 text-xs" onClick={() => setEditing({ name: "", subject: "", body: "" })}>
                <Plus className="w-3.5 h-3.5" />
                New template
              </Button>
            </div>

            {templates.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <FileText className="w-10 h-10 text-muted-foreground/20 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No templates yet</p>
                <p className="text-xs text-muted-foreground mt-1">Create a template to reuse common email drafts quickly.</p>
              </div>
            ) : (
              <ScrollArea className="max-h-64">
                <div className="space-y-1.5 pr-1">
                  {templates.map((t) => (
                    <div key={t.id} className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border border-border/40 hover:bg-muted/30 cursor-pointer group transition-colors",
                      confirmDelete === t.id && "border-destructive/40 bg-destructive/5"
                    )}>
                      {confirmDelete === t.id ? (
                        <div className="flex-1 flex items-center justify-between">
                          <span className="text-xs text-destructive font-medium">Delete "{t.name}"?</span>
                          <div className="flex gap-1">
                            <Button size="sm" variant="destructive" className="h-6 px-2 text-xs gap-1" onClick={() => { remove(t.id); setConfirmDelete(null); }}>
                              <Trash2 className="w-3 h-3" />Delete
                            </Button>
                            <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setConfirmDelete(null)}>Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex-1 min-w-0" onClick={() => onSelect(t)}>
                            <p className="text-sm font-medium truncate">{t.name}</p>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">{t.subject}</p>
                          </div>
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <button
                              onClick={() => setEditing(t)}
                              className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setConfirmDelete(t.id)}
                              className="p-1.5 rounded hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                              title="Delete"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}

            <DialogFooter className="pt-2">
              <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface SaveTemplateDialogProps {
  open: boolean;
  onClose: () => void;
  subject?: string;
  body?: string;
}

export function SaveTemplateDialog({ open, onClose, subject = "", body = "" }: SaveTemplateDialogProps) {
  const { add } = useEmailTemplates();
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (open) { setName(""); setSaved(false); }
  }, [open]);

  const handleSave = () => {
    if (!name.trim()) return;
    add(name.trim(), subject, body);
    setSaved(true);
    setTimeout(onClose, 800);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">Save as template</DialogTitle>
        </DialogHeader>
        {saved ? (
          <div className="flex flex-col items-center py-4 text-center gap-2">
            <Check className="w-8 h-8 text-emerald-500" />
            <p className="text-sm font-medium">Template saved!</p>
          </div>
        ) : (
          <>
            <div className="py-2 space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Template name</label>
                <Input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
                  placeholder="Give this template a name…"
                  className="h-8 text-sm"
                />
              </div>
              {subject && (
                <div className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                  <span className="font-medium">Subject:</span> {subject}
                </div>
              )}
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
              <Button size="sm" onClick={handleSave} disabled={!name.trim()}>Save template</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
