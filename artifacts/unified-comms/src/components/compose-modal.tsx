import { useEffect, useRef, useState, useCallback } from "react";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "./ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useCreateMessage, useGetAccounts } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Send, Paperclip, Image, Bold, Italic, Underline,
  Strikethrough, AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered, Link, X, File, Clock, MoreHorizontal,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

const composeSchema = z.object({
  accountId: z.string().min(1, "Select an account"),
  to: z.string().email("Invalid email address"),
  subject: z.string().min(1, "Subject is required"),
});

type ComposeValues = z.infer<typeof composeSchema>;
type ComposeDraft = Partial<ComposeValues & { body: string }>;

const FONT_FAMILIES = [
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Times New Roman", value: "'Times New Roman', serif" },
  { label: "Courier New", value: "'Courier New', monospace" },
  { label: "Verdana", value: "Verdana, sans-serif" },
  { label: "Trebuchet MS", value: "'Trebuchet MS', sans-serif" },
];

const FONT_SIZES = ["10", "12", "14", "16", "18", "20", "24", "28", "32"];

interface AttachedFile {
  name: string;
  size: number;
  type: string;
  file: File;
}

export function ComposeModal({
  open,
  onOpenChange,
  initialDraft,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDraft?: ComposeDraft;
}) {
  const { data: accounts } = useGetAccounts();
  const createMessage = useCreateMessage();
  const { toast } = useToast();

  const bodyRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const [fontFamily, setFontFamily] = useState("Arial, sans-serif");
  const [fontSize, setFontSize] = useState("14");
  const [showFontFamily, setShowFontFamily] = useState(false);
  const [showFontSize, setShowFontSize] = useState(false);
  const [showScheduled, setShowScheduled] = useState(false);
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());

  const form = useForm<ComposeValues>({
    resolver: zodResolver(composeSchema),
    defaultValues: { accountId: "", to: "", subject: "" },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      accountId: initialDraft?.accountId ?? "",
      to: initialDraft?.to ?? "",
      subject: initialDraft?.subject ?? "",
    });
    if (bodyRef.current) {
      bodyRef.current.innerHTML = initialDraft?.body ?? "";
    }
    setAttachments([]);
    setFontFamily("Arial, sans-serif");
    setFontSize("14");
  }, [form, initialDraft, open]);

  const updateActiveFormats = useCallback(() => {
    const formats = new Set<string>();
    if (document.queryCommandState("bold")) formats.add("bold");
    if (document.queryCommandState("italic")) formats.add("italic");
    if (document.queryCommandState("underline")) formats.add("underline");
    if (document.queryCommandState("strikeThrough")) formats.add("strikeThrough");
    setActiveFormats(formats);
  }, []);

  const execFormat = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    bodyRef.current?.focus();
    updateActiveFormats();
  }, [updateActiveFormats]);

  const applyFontFamily = useCallback((family: string) => {
    setFontFamily(family);
    setShowFontFamily(false);
    document.execCommand("fontName", false, family.split(",")[0].replace(/'/g, "").trim());
    bodyRef.current?.focus();
  }, []);

  const applyFontSize = useCallback((size: string) => {
    setFontSize(size);
    setShowFontSize(false);
    const sizeMap: Record<string, string> = {
      "10": "1", "12": "2", "14": "3", "16": "4",
      "18": "5", "20": "6", "24": "7", "28": "7", "32": "7",
    };
    document.execCommand("fontSize", false, sizeMap[size] || "3");
    bodyRef.current?.focus();
  }, []);

  const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    setAttachments((prev) => [
      ...prev,
      ...files.map((f) => ({ name: f.name, size: f.size, type: f.type, file: f })),
    ]);
    e.target.value = "";
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const onSubmit = (data: ComposeValues) => {
    const bodyHtml = bodyRef.current?.innerHTML ?? "";
    const bodyText = bodyRef.current?.innerText ?? "";
    if (!bodyText.trim()) {
      toast({ title: "Message body is required", variant: "destructive" });
      return;
    }
    createMessage.mutate(
      {
        data: {
          accountId: parseInt(data.accountId, 10),
          toList: data.to,
          subject: data.subject,
          bodyText: bodyHtml || bodyText,
          folder: "Sent",
          fromName: "Me",
          fromEmail:
            accounts?.find((a) => a.id === parseInt(data.accountId, 10))?.email ?? "me@example.com",
          receivedAt: new Date().toISOString(),
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Message sent successfully" });
          onOpenChange(false);
          form.reset();
        },
        onError: () => {
          toast({ title: "Failed to send message", variant: "destructive" });
        },
      }
    );
  };

  const isActive = (fmt: string) => activeFormats.has(fmt);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[680px] p-0 overflow-hidden border-0 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-muted/30 px-6 py-4 border-b flex items-center justify-between shrink-0">
          <DialogTitle className="text-lg font-semibold">
            {initialDraft?.subject?.startsWith("Re:") ? "Reply" : initialDraft?.subject?.startsWith("Fwd:") ? "Forward" : "New Message"}
          </DialogTitle>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
            {/* Fields */}
            <div className="overflow-y-auto px-6 py-4 space-y-0 shrink-0">
              {/* From */}
              <FormField
                control={form.control}
                name="accountId"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-4 space-y-0 border-b pb-3 mb-3">
                    <FormLabel className="w-16 text-right text-muted-foreground font-normal shrink-0">From</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="border-0 shadow-none focus:ring-0 bg-transparent flex-1 px-0 h-auto">
                          <SelectValue placeholder="Select an account" />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts?.map((acc) => (
                            <SelectItem key={acc.id} value={acc.id.toString()}>
                              {acc.email}{" "}
                              <span className="text-muted-foreground ml-2">({acc.provider})</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* To */}
              <FormField
                control={form.control}
                name="to"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-4 space-y-0 border-b pb-3 mb-3">
                    <FormLabel className="w-16 text-right text-muted-foreground font-normal shrink-0">To</FormLabel>
                    <FormControl>
                      <Input {...field} className="border-0 shadow-none focus-visible:ring-0 px-0 rounded-none bg-transparent" placeholder="Recipient email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Subject */}
              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-4 space-y-0 border-b pb-3 mb-3">
                    <FormLabel className="w-16 text-right text-muted-foreground font-normal shrink-0">Subject</FormLabel>
                    <FormControl>
                      <Input {...field} className="border-0 shadow-none focus-visible:ring-0 px-0 rounded-none bg-transparent font-medium" placeholder="Message subject" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Formatting Toolbar */}
            <div className="border-b border-t bg-muted/10 px-4 py-2 flex items-center gap-1 flex-wrap shrink-0">
              {/* Font Family */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => { setShowFontFamily((v) => !v); setShowFontSize(false); }}
                  className="flex items-center gap-1 text-xs px-2 py-1.5 rounded hover:bg-muted border border-transparent hover:border-border transition-colors min-w-[110px] justify-between"
                >
                  <span style={{ fontFamily }}>{FONT_FAMILIES.find((f) => f.value === fontFamily)?.label ?? "Arial"}</span>
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </button>
                {showFontFamily && (
                  <div className="absolute top-full left-0 mt-1 bg-popover border rounded-md shadow-lg z-50 min-w-[150px]">
                    {FONT_FAMILIES.map((f) => (
                      <button
                        key={f.value}
                        type="button"
                        onClick={() => applyFontFamily(f.value)}
                        className={cn(
                          "w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors",
                          fontFamily === f.value && "bg-muted font-medium"
                        )}
                        style={{ fontFamily: f.value }}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="w-px h-5 bg-border mx-1" />

              {/* Font Size */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => { setShowFontSize((v) => !v); setShowFontFamily(false); }}
                  className="flex items-center gap-1 text-xs px-2 py-1.5 rounded hover:bg-muted border border-transparent hover:border-border transition-colors w-[54px] justify-between"
                >
                  <span>{fontSize}</span>
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </button>
                {showFontSize && (
                  <div className="absolute top-full left-0 mt-1 bg-popover border rounded-md shadow-lg z-50 w-[70px] max-h-48 overflow-y-auto">
                    {FONT_SIZES.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => applyFontSize(s)}
                        className={cn(
                          "w-full text-left px-3 py-1.5 text-sm hover:bg-muted transition-colors",
                          fontSize === s && "bg-muted font-medium"
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="w-px h-5 bg-border mx-1" />

              {/* Bold */}
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); execFormat("bold"); }}
                className={cn("p-1.5 rounded hover:bg-muted transition-colors", isActive("bold") && "bg-muted text-foreground")}
                title="Bold (Ctrl+B)"
              >
                <Bold className="h-4 w-4" />
              </button>
              {/* Italic */}
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); execFormat("italic"); }}
                className={cn("p-1.5 rounded hover:bg-muted transition-colors", isActive("italic") && "bg-muted text-foreground")}
                title="Italic (Ctrl+I)"
              >
                <Italic className="h-4 w-4" />
              </button>
              {/* Underline */}
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); execFormat("underline"); }}
                className={cn("p-1.5 rounded hover:bg-muted transition-colors", isActive("underline") && "bg-muted text-foreground")}
                title="Underline (Ctrl+U)"
              >
                <Underline className="h-4 w-4" />
              </button>
              {/* Strikethrough */}
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); execFormat("strikeThrough"); }}
                className={cn("p-1.5 rounded hover:bg-muted transition-colors", isActive("strikeThrough") && "bg-muted text-foreground")}
                title="Strikethrough"
              >
                <Strikethrough className="h-4 w-4" />
              </button>

              <div className="w-px h-5 bg-border mx-1" />

              {/* Alignment */}
              <button type="button" onMouseDown={(e) => { e.preventDefault(); execFormat("justifyLeft"); }} className="p-1.5 rounded hover:bg-muted transition-colors" title="Align Left">
                <AlignLeft className="h-4 w-4" />
              </button>
              <button type="button" onMouseDown={(e) => { e.preventDefault(); execFormat("justifyCenter"); }} className="p-1.5 rounded hover:bg-muted transition-colors" title="Align Center">
                <AlignCenter className="h-4 w-4" />
              </button>
              <button type="button" onMouseDown={(e) => { e.preventDefault(); execFormat("justifyRight"); }} className="p-1.5 rounded hover:bg-muted transition-colors" title="Align Right">
                <AlignRight className="h-4 w-4" />
              </button>

              <div className="w-px h-5 bg-border mx-1" />

              {/* Lists */}
              <button type="button" onMouseDown={(e) => { e.preventDefault(); execFormat("insertUnorderedList"); }} className="p-1.5 rounded hover:bg-muted transition-colors" title="Bullet List">
                <List className="h-4 w-4" />
              </button>
              <button type="button" onMouseDown={(e) => { e.preventDefault(); execFormat("insertOrderedList"); }} className="p-1.5 rounded hover:bg-muted transition-colors" title="Numbered List">
                <ListOrdered className="h-4 w-4" />
              </button>

              <div className="w-px h-5 bg-border mx-1" />

              {/* Link */}
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  const url = window.prompt("Enter URL:");
                  if (url) execFormat("createLink", url);
                }}
                className="p-1.5 rounded hover:bg-muted transition-colors"
                title="Insert Link"
              >
                <Link className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4 min-h-[160px]">
              <div
                ref={bodyRef}
                contentEditable
                suppressContentEditableWarning
                onKeyUp={updateActiveFormats}
                onMouseUp={updateActiveFormats}
                className="min-h-[140px] h-full outline-none text-sm leading-relaxed text-foreground"
                style={{ fontFamily, fontSize: `${fontSize}px` }}
                data-placeholder="Write your message here…"
                onFocus={() => setShowFontFamily(false) || setShowFontSize(false)}
              />
            </div>

            {/* Attachments list */}
            {attachments.length > 0 && (
              <div className="px-6 pb-2 flex flex-wrap gap-2 shrink-0 border-t pt-3">
                {attachments.map((att, i) => (
                  <div key={i} className="flex items-center gap-1.5 bg-muted rounded-md px-2 py-1.5 text-xs max-w-[200px]">
                    <File className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate font-medium">{att.name}</span>
                    <span className="text-muted-foreground shrink-0">({formatBytes(att.size)})</span>
                    <button type="button" onClick={() => removeAttachment(i)} className="ml-1 text-muted-foreground hover:text-foreground shrink-0">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Bottom Toolbar */}
            <div className="bg-muted/20 px-4 py-3 border-t flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1">
                {/* Attach file */}
                <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileAttach} />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 rounded hover:bg-muted text-muted-foreground transition-colors"
                  title="Attach file"
                >
                  <Paperclip className="h-4 w-4" />
                </button>

                {/* Attach photo */}
                <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileAttach} />
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="p-2 rounded hover:bg-muted text-muted-foreground transition-colors"
                  title="Attach photo"
                >
                  <Image className="h-4 w-4" />
                </button>

                {/* Scheduled send */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowScheduled((v) => !v)}
                    className="p-2 rounded hover:bg-muted text-muted-foreground transition-colors"
                    title="Schedule send"
                  >
                    <Clock className="h-4 w-4" />
                  </button>
                  {showScheduled && (
                    <div className="absolute bottom-full left-0 mb-2 bg-popover border rounded-md shadow-lg z-50 p-3 w-56">
                      <p className="text-xs font-medium mb-2">Schedule send</p>
                      <div className="space-y-1">
                        {[
                          { label: "Tomorrow morning", desc: "8:00 AM" },
                          { label: "Tomorrow afternoon", desc: "1:00 PM" },
                          { label: "Monday morning", desc: "8:00 AM" },
                        ].map((opt) => (
                          <button
                            key={opt.label}
                            type="button"
                            onClick={() => { setShowScheduled(false); toast({ title: `Scheduled: ${opt.label}` }); }}
                            className="w-full text-left px-2 py-1.5 rounded hover:bg-muted text-sm transition-colors flex justify-between"
                          >
                            <span>{opt.label}</span>
                            <span className="text-muted-foreground text-xs">{opt.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* More options */}
                <button type="button" className="p-2 rounded hover:bg-muted text-muted-foreground transition-colors" title="More options">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </div>

              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMessage.isPending} className="gap-2">
                  {createMessage.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Send
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
