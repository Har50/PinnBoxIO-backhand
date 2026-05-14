import { useState, useCallback } from "react";
import { useGetMessages, useGetAccounts, useUpdateMessage, useGetMessage, useGetFolderCounts } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Mail, Inbox as InboxIcon, Clock, File, Search, RefreshCw, ChevronLeft, Reply, Forward, ZoomIn, ZoomOut, RotateCcw, Paperclip, Star, Trash2 } from "lucide-react";
import { format, isToday, isThisWeek, isThisYear } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDebounce } from "@/hooks/use-debounce";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function formatEmailDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date)) return format(date, "h:mm a");
  if (isThisWeek(date, { weekStartsOn: 1 })) return format(date, "EEE");
  if (isThisYear(date)) return format(date, "MMM d");
  return format(date, "MMM d, yyyy");
}
import { useIsMobile } from "@/hooks/use-mobile";
import { ComposeModal } from "@/components/compose-modal";
import { PreviewPanel, type PreviewItem } from "@/components/preview-panel";
import { apiFetch } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";

type TabKey = "all" | "unread" | "starred" | "sent" | "drafts" | "saved" | "spam" | "trash";

const TABS: { key: TabKey; label: string; folder: string | null; filter?: string }[] = [
  { key: "all",     label: "All Mail", folder: null },
  { key: "unread",  label: "Unread",   folder: null, filter: "unread" },
  { key: "starred", label: "Starred",  folder: null, filter: "starred" },
  { key: "sent",    label: "Sent",     folder: "Sent" },
  { key: "drafts",  label: "Drafts",   folder: "Drafts" },
  { key: "saved",   label: "Saved",    folder: "Archive" },
  { key: "spam",    label: "Spam",     folder: "Spam" },
  { key: "trash",   label: "Trash",    folder: "Trash" },
];

export default function Inbox() {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [selectedMessageId, setSelectedMessageId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [bodyZoom, setBodyZoom] = useState(100);
  const [composeDraft, setComposeDraft] = useState<{ accountId?: string; to?: string; subject?: string; body?: string } | undefined>();
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState<PreviewItem | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  const handleBodyLinkClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = (e.target as HTMLElement).closest("a");
    if (!target) return;
    const href = target.getAttribute("href");
    if (!href || href.startsWith("mailto:") || href.startsWith("#")) return;
    e.preventDefault();
    e.stopPropagation();
    setPreviewItem({ kind: "link", url: href, title: target.textContent || href });
  }, []);

  const debouncedSearch = useDebounce(searchQuery, 300);

  const currentTab = TABS.find(t => t.key === activeTab)!;
  const selectedFolder = currentTab.folder ?? (currentTab.filter ? null : "Inbox");

  const { data: accounts, isLoading: accountsLoading } = useGetAccounts();
  const { data: folderCounts } = useGetFolderCounts(
    selectedAccountId != null ? { accountId: selectedAccountId } : {}
  );
  const { data: messagesData, isLoading: messagesLoading, refetch } = useGetMessages({
    accountId: selectedAccountId ?? undefined,
    folder: selectedFolder ?? undefined,
    limit: 50,
  });

  const { data: activeMessage, isLoading: messageLoading } = useGetMessage(selectedMessageId || 0, {
    query: {
      enabled: !!selectedMessageId,
      queryKey: ["message", selectedMessageId] as any,
    }
  });

  const updateMessage = useUpdateMessage();

  const handleToggleRead = (id: number, currentRead: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    updateMessage.mutate({ id, data: { isRead: !currentRead } });
  };

  const handleToggleStar = (id: number, currentStar: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    updateMessage.mutate({ id, data: { isStarred: !currentStar } });
  };

  const handleMessageSelect = (messageId: number) => {
    setSelectedMessageId(messageId);
    setBodyZoom(100);
  };

  const handleBackToList = () => {
    setSelectedMessageId(null);
  };

  const openComposeAction = (type: "reply" | "forward") => {
    if (!activeMessage) return;
    const received = format(new Date(activeMessage.receivedAt), "MMM d, yyyy 'at' h:mm a");
    const subjectPrefix = type === "reply" ? "Re:" : "Fwd:";
    const subject = activeMessage.subject.startsWith(subjectPrefix)
      ? activeMessage.subject
      : `${subjectPrefix} ${activeMessage.subject}`;
    const originalHtml = activeMessage.bodyHtml
      || (activeMessage.bodyText || "").replace(/\n/g, "<br>");
    const quoteStyle = "border-left:3px solid #94a3b8;padding-left:12px;margin-top:12px;color:#64748b;font-size:13px";
    const metaStyle = "font-size:12px;margin-bottom:6px;color:#94a3b8";
    const body = type === "reply"
      ? `<br><br><div style="${quoteStyle}"><div style="${metaStyle}">On ${received}, <b>${activeMessage.fromName}</b> &lt;${activeMessage.fromEmail}&gt; wrote:</div>${originalHtml}</div>`
      : `<br><br><div style="border-top:1px solid #e2e8f0;margin-top:16px;padding-top:12px;color:#64748b;font-size:13px"><div style="${metaStyle}">---------- Forwarded message ----------<br>From: <b>${activeMessage.fromName}</b> &lt;${activeMessage.fromEmail}&gt;<br>Date: ${received}<br>Subject: ${activeMessage.subject}<br>To: ${activeMessage.toList}</div>${originalHtml}</div>`;
    setComposeDraft({
      accountId: String(activeMessage.accountId),
      to: type === "reply" ? activeMessage.fromEmail : "",
      subject,
      body,
    });
    setIsComposeOpen(true);
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    setIsDeleting(true);
    const ids = Array.from(selectedIds);
    try {
      await Promise.all(ids.map(id => apiFetch(`/api/messages/${id}`, { method: "DELETE" })));
      setSelectedIds(new Set());
      if (selectedMessageId && selectedIds.has(selectedMessageId)) {
        setSelectedMessageId(null);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      toast({ title: `${ids.length} message${ids.length > 1 ? "s" : ""} deleted` });
    } catch {
      toast({ title: "Failed to delete some messages", variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredMessages = (messagesData?.messages ?? []).filter(msg => {
    if (debouncedSearch && !msg.subject.toLowerCase().includes(debouncedSearch.toLowerCase()) && !msg.fromName.toLowerCase().includes(debouncedSearch.toLowerCase())) return false;
    if (currentTab.filter === "unread") return !msg.isRead;
    if (currentTab.filter === "starred") return msg.isStarred;
    return true;
  });

  const allIds = filteredMessages.map(m => m.id);
  const allSelected = allIds.length > 0 && allIds.every(id => selectedIds.has(id));
  const someSelected = allIds.some(id => selectedIds.has(id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allIds));
    }
  };

  const folderCountMap = new Map(
    (folderCounts ?? []).map((fc) => [fc.folder, fc])
  );
  const inboxUnread = folderCountMap.get("Inbox")?.unread ?? 0;

  // ----- Message List -----
  const messageListView = (
    <div className="flex flex-col h-full min-w-0 bg-background">
      {/* Header */}
      <div className="px-6 pt-5 pb-0 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-foreground">Inbox</h1>
          <div className="flex items-center gap-2">
            {!accountsLoading && accounts && accounts.length > 0 && (
              <Select
                value={selectedAccountId === null ? "all" : String(selectedAccountId)}
                onValueChange={(val) => {
                  setSelectedAccountId(val === "all" ? null : Number(val));
                  setSelectedMessageId(null);
                }}
              >
                <SelectTrigger className="h-8 text-xs w-auto min-w-[120px] border-border/60 bg-muted/30">
                  <div className="flex items-center gap-1.5">
                    {selectedAccountId === null ? (
                      <><InboxIcon className="w-3 h-3 text-muted-foreground" /><SelectValue placeholder="All Accounts" /></>
                    ) : (
                      <><div className="w-2 h-2 rounded-full" style={{ backgroundColor: accounts.find(a => a.id === selectedAccountId)?.color || "#ccc" }} /><SelectValue /></>
                    )}
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center gap-2 text-xs"><InboxIcon className="w-3 h-3 text-muted-foreground" />All Accounts</div>
                  </SelectItem>
                  {accounts.map(acc => (
                    <SelectItem key={acc.id} value={String(acc.id)}>
                      <div className="flex items-center gap-2 text-xs">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: acc.color || "#ccc" }} />
                        <span className="truncate">{acc.name}</span>
                        {acc.unreadCount > 0 && <Badge variant="secondary" className="ml-1 px-1 py-0 text-[10px] h-4">{acc.unreadCount}</Badge>}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => refetch()}>
              <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search emails..."
            className="pl-9 bg-muted/30 border-border/50 focus-visible:ring-1 h-10 rounded-lg text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0">
          {TABS.map(tab => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); setSelectedMessageId(null); setSelectedIds(new Set()); }}
                className={`relative flex-shrink-0 px-3.5 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                {tab.label}
                {tab.key === "all" && inboxUnread > 0 && (
                  <span className={`ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-destructive text-destructive-foreground"}`}>
                    {inboxUnread > 99 ? "99+" : inboxUnread}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-3 border-b border-border/40" />

        {/* Select all / delete bar */}
        <div className="flex items-center gap-3 py-2.5 px-1">
          <Checkbox
            checked={allSelected}
            onCheckedChange={toggleSelectAll}
            className="border-border/60"
            aria-label="Select all messages"
          />
          <span className="text-sm text-muted-foreground">
            {someSelected ? `${selectedIds.size} selected` : "Select all"}
          </span>
          {someSelected && (
            <Button
              variant="destructive"
              size="sm"
              className="ml-2 h-7 px-3 text-xs gap-1.5"
              onClick={handleDeleteSelected}
              disabled={isDeleting}
            >
              <Trash2 className="h-3.5 w-3.5" />
              {isDeleting ? "Deleting…" : `Delete ${selectedIds.size > 1 ? `(${selectedIds.size})` : ""}`}
            </Button>
          )}
          <span className="ml-auto text-xs text-muted-foreground">{filteredMessages.length} messages</span>
        </div>
        <div className="border-b border-border/30" />
      </div>

      {/* Message list */}
      <ScrollArea className="flex-1">
        <div>
          {messagesLoading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 px-6 py-4 border-b border-border/20">
                <Skeleton className="h-4 w-4 rounded mt-0.5 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-16 ml-auto" />
                  </div>
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))
          ) : filteredMessages.length === 0 ? (
            <div className="p-10 text-center flex flex-col items-center justify-center">
              <Mail className="h-12 w-12 text-muted-foreground/20 mb-3" />
              {!accountsLoading && (!accounts || accounts.length === 0) ? (
                <>
                  <p className="text-sm font-medium text-foreground">No email accounts connected</p>
                  <p className="text-xs text-muted-foreground mt-1 mb-3 max-w-xs">Connect Gmail or Outlook to see your messages here.</p>
                  <a href="/accounts" className="text-xs font-semibold text-primary underline underline-offset-2 hover:opacity-80 transition-opacity">
                    Go to Accounts →
                  </a>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No messages found.</p>
              )}
            </div>
          ) : (
            filteredMessages.map(msg => {
              const isChecked = selectedIds.has(msg.id);
              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-3 px-6 py-4 border-b border-border/20 cursor-pointer group transition-colors border-l-2 ${
                    isChecked ? "bg-primary/5 border-l-primary" : "hover:bg-muted/30 border-l-transparent"
                  }`}
                  onClick={() => handleMessageSelect(msg.id)}
                >
                  {/* Checkbox */}
                  <div className="mt-0.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
                    <Checkbox
                      checked={isChecked}
                      className="border-border/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      aria-label={`Select message from ${msg.fromName}`}
                      onCheckedChange={() => {
                        setSelectedIds(prev => {
                          const next = new Set(prev);
                          if (next.has(msg.id)) next.delete(msg.id); else next.add(msg.id);
                          return next;
                        });
                      }}
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`text-sm truncate ${!msg.isRead ? "font-bold text-foreground" : "font-semibold text-foreground/80"}`}>
                          {msg.fromName}
                        </span>
                        {msg.hasAttachments && <Paperclip className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />}
                        {!msg.isRead && <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {msg.accountName && (
                          <span className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border border-border/40 text-muted-foreground bg-muted/30">
                            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: msg.accountColor || "#888" }} />
                            {msg.accountName}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatEmailDate(msg.receivedAt)}
                        </span>
                      </div>
                    </div>
                    <div className={`text-sm truncate mb-1 ${!msg.isRead ? "font-semibold text-foreground/90" : "font-medium text-foreground/70"}`}>
                      {msg.subject}
                    </div>
                    <div className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {msg.bodyText}
                    </div>
                  </div>

                  {/* Star */}
                  <button
                    onClick={e => handleToggleStar(msg.id, msg.isStarred, e)}
                    className={`flex-shrink-0 mt-0.5 transition-opacity ${msg.isStarred ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                  >
                    <Star className={`h-4 w-4 ${msg.isStarred ? "fill-amber-400 text-amber-400" : "text-muted-foreground hover:text-amber-400"}`} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );

  // ----- Message Detail -----
  const messageDetailView = (
    <div className="flex flex-col h-full bg-background">
      {/* Sticky top toolbar */}
      <div className="sticky top-0 z-10 px-4 py-2 border-b flex items-center gap-3 shrink-0 bg-background/95 backdrop-blur">
        <Button variant="ghost" size="sm" className="gap-1.5 px-2 text-muted-foreground hover:text-foreground" onClick={handleBackToList}>
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>
        {!messageLoading && activeMessage && (
          <div className="flex items-center gap-1 ml-auto flex-wrap">
            <Button variant="ghost" size="sm" className="gap-1" onClick={() => openComposeAction("reply")}>
              <Reply className="h-4 w-4" /><span className="hidden sm:inline">Reply</span>
            </Button>
            <Button variant="ghost" size="sm" className="gap-1" onClick={() => openComposeAction("forward")}>
              <Forward className="h-4 w-4" /><span className="hidden sm:inline">Forward</span>
            </Button>
            <Button variant="ghost" size="icon" onClick={e => handleToggleStar(activeMessage.id, activeMessage.isStarred, e)}>
              <Star className={`h-4 w-4 ${activeMessage.isStarred ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
            </Button>
            <Button variant="ghost" size="icon" onClick={e => handleToggleRead(activeMessage.id, activeMessage.isRead, e)}>
              <InboxIcon className="h-4 w-4 text-muted-foreground" />
            </Button>
            <div className="flex items-center gap-1 rounded-md border bg-background ml-2">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setBodyZoom(z => Math.max(80, z - 10))}><ZoomOut className="h-4 w-4" /></Button>
              <button className="text-xs font-medium text-muted-foreground min-w-10" onClick={() => setBodyZoom(100)}>{bodyZoom}%</button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setBodyZoom(z => Math.min(160, z + 10))}><ZoomIn className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setBodyZoom(100)}><RotateCcw className="h-3.5 w-3.5" /></Button>
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-1 ml-2">
              <Clock className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{format(new Date(activeMessage.receivedAt), "MMM d, yyyy 'at' h:mm a")}</span>
              <span className="sm:hidden">{format(new Date(activeMessage.receivedAt), "MMM d")}</span>
            </div>
          </div>
        )}
      </div>

      {messageLoading ? (
        <div className="p-8 space-y-6 overflow-y-auto flex-1">
          <div className="space-y-2"><Skeleton className="h-8 w-3/4" /><Skeleton className="h-4 w-1/4" /></div>
          <div className="flex gap-4 items-center"><Skeleton className="h-10 w-10 rounded-full" /><div className="space-y-2"><Skeleton className="h-4 w-48" /><Skeleton className="h-3 w-32" /></div></div>
          <div className="space-y-3 pt-6"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-5/6" /></div>
        </div>
      ) : activeMessage ? (
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 md:p-8 max-w-4xl mx-auto">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-foreground tracking-tight leading-tight mb-4">{activeMessage.subject}</h1>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0 border border-primary/20">
                  {activeMessage.fromName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-base truncate">{activeMessage.fromName}</div>
                  <div className="text-sm text-muted-foreground truncate">&lt;{activeMessage.fromEmail}&gt;</div>
                  <div className="text-xs text-muted-foreground mt-1 flex gap-2">
                    <span className="font-medium text-foreground/60">To:</span><span className="truncate">{activeMessage.toList}</span>
                  </div>
                  {activeMessage.ccList && (
                    <div className="text-xs text-muted-foreground flex gap-2 mt-0.5">
                      <span className="font-medium text-foreground/60">Cc:</span><span className="truncate">{activeMessage.ccList}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <Separator className="my-6 opacity-50" />

            <div className="md:hidden mb-4 flex items-center gap-1 rounded-md border bg-background w-fit">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setBodyZoom(z => Math.max(80, z - 10))}><ZoomOut className="h-4 w-4" /></Button>
              <button className="text-xs font-medium text-muted-foreground min-w-10" onClick={() => setBodyZoom(100)}>{bodyZoom}%</button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setBodyZoom(z => Math.min(160, z + 10))}><ZoomIn className="h-4 w-4" /></Button>
            </div>

            <div
              className="prose prose-sm md:prose-base dark:prose-invert max-w-none prose-p:leading-relaxed prose-headings:font-bold prose-a:text-primary"
              style={{ fontSize: `${bodyZoom}%` }}
              onClick={handleBodyLinkClick}
            >
              {activeMessage.bodyHtml ? (
                <div dangerouslySetInnerHTML={{ __html: activeMessage.bodyHtml }} />
              ) : (
                <div className="whitespace-pre-wrap font-sans">{activeMessage.bodyText}</div>
              )}
            </div>

            {/* Gmail-style reply/forward buttons at the bottom of the message */}
            <div className="mt-8 pt-5 border-t border-border/30 flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 rounded-full px-5 h-9 font-medium border-border/60 hover:bg-muted/50"
                onClick={() => openComposeAction("reply")}
              >
                <Reply className="h-4 w-4" />
                Reply
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 rounded-full px-5 h-9 font-medium border-border/60 hover:bg-muted/50"
                onClick={() => openComposeAction("forward")}
              >
                <Forward className="h-4 w-4" />
                Forward
              </Button>
            </div>

            {activeMessage.attachments?.length > 0 && (
              <div className="mt-10 pt-6 border-t border-border/50">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <File className="w-4 h-4 text-muted-foreground" />
                  Attachments ({activeMessage.attachments.length})
                </h3>
                <div className="flex flex-wrap gap-3">
                  {activeMessage.attachments.map(att => (
                    <div
                      key={att.id}
                      className="flex items-center gap-3 p-3 border rounded-lg bg-muted/20 hover:bg-muted/50 hover:border-primary/30 transition-colors max-w-[240px] cursor-pointer group"
                      onClick={() => setPreviewItem({ kind: "attachment", filename: att.filename, url: att.url ?? "", size: att.size, mimeType: att.mimeType ?? undefined })}
                    >
                      <div className="p-2 bg-background rounded border shadow-sm group-hover:border-primary/30 transition-colors">
                        <File className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate" title={att.filename}>{att.filename}</div>
                        <div className="text-xs text-muted-foreground">{(att.size / 1024).toFixed(1)} KB</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );

  // Mobile and desktop both now use the same drill-down pattern
  if (selectedMessageId) {
    return (
      <div className="h-full flex flex-col bg-background">
        {messageDetailView}
        <ComposeModal open={isComposeOpen} onOpenChange={setIsComposeOpen} initialDraft={composeDraft} />
        <PreviewPanel item={previewItem} onClose={() => setPreviewItem(null)} />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      {messageListView}
      <ComposeModal open={isComposeOpen} onOpenChange={setIsComposeOpen} initialDraft={composeDraft} />
      <PreviewPanel item={previewItem} onClose={() => setPreviewItem(null)} />
    </div>
  );
}
