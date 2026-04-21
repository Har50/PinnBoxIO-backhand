import { useState } from "react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { useGetMessages, useGetAccounts, useUpdateMessage, useGetMessage } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Mail, Star, Inbox as InboxIcon, Tag, Clock, File, Search, RefreshCw, ChevronLeft, Reply, Forward, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDebounce } from "@/hooks/use-debounce";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useIsMobile } from "@/hooks/use-mobile";
import { ComposeModal } from "@/components/compose-modal";

type MobileView = "mailboxes" | "messages" | "detail";

export default function Inbox() {
  const isMobile = useIsMobile();
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string | null>("Inbox");
  const [selectedMessageId, setSelectedMessageId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileView, setMobileView] = useState<MobileView>("mailboxes");
  const [bodyZoom, setBodyZoom] = useState(100);
  const [composeDraft, setComposeDraft] = useState<{ accountId?: string; to?: string; subject?: string; body?: string } | undefined>();
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  
  const debouncedSearch = useDebounce(searchQuery, 300);

  const { data: accounts, isLoading: accountsLoading } = useGetAccounts();
  const { data: messagesData, isLoading: messagesLoading, refetch } = useGetMessages({ 
    accountId: selectedAccountId ?? undefined,
    folder: selectedFolder ?? undefined,
    limit: 50
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

  const handleAccountSelect = (accountId: number | null) => {
    setSelectedAccountId(accountId);
    setSelectedMessageId(null);
  };

  const handleFolderSelect = (folder: string) => {
    setSelectedFolder(folder);
    setSelectedMessageId(null);
    if (isMobile) {
      setMobileView("messages");
    }
  };

  const handleMessageSelect = (messageId: number) => {
    setSelectedMessageId(messageId);
    setBodyZoom(100);
    if (isMobile) {
      setMobileView("detail");
    }
  };

  const openComposeAction = (type: "reply" | "forward") => {
    if (!activeMessage) return;
    const received = format(new Date(activeMessage.receivedAt), "MMM d, yyyy 'at' h:mm a");
    const subjectPrefix = type === "reply" ? "Re:" : "Fwd:";
    const subject = activeMessage.subject.startsWith(subjectPrefix)
      ? activeMessage.subject
      : `${subjectPrefix} ${activeMessage.subject}`;
    const body =
      type === "reply"
        ? `\n\nOn ${received}, ${activeMessage.fromName} wrote:\n${activeMessage.bodyText || ""}`
        : `\n\nForwarded message\nFrom: ${activeMessage.fromName} <${activeMessage.fromEmail}>\nDate: ${received}\nSubject: ${activeMessage.subject}\nTo: ${activeMessage.toList}\n\n${activeMessage.bodyText || ""}`;

    setComposeDraft({
      accountId: String(activeMessage.accountId),
      to: type === "reply" ? activeMessage.fromEmail : "",
      subject,
      body,
    });
    setIsComposeOpen(true);
  };

  const folders = ["Inbox", "Sent", "Drafts", "Archive", "Trash", "Spam"];

  const mailboxPanel = (
    <div className="bg-muted/10 border-r flex flex-col h-full min-w-0">
      <div className="p-4 border-b flex items-center justify-between">
        <h2 className="font-semibold text-sm tracking-tight text-foreground/80 uppercase">Mailboxes</h2>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => refetch()}>
          <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-4">
          <div className="space-y-1">
            <Button 
              variant={selectedAccountId === null ? "secondary" : "ghost"} 
              className={`w-full justify-start gap-2 h-9 px-3 ${selectedAccountId === null ? "font-semibold" : "font-normal text-muted-foreground"}`}
              onClick={() => handleAccountSelect(null)}
            >
              <InboxIcon className="w-4 h-4" />
              All Accounts
            </Button>
            {accountsLoading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8 w-full rounded" />)
            ) : accounts?.map(acc => (
              <Button 
                key={acc.id}
                variant={selectedAccountId === acc.id ? "secondary" : "ghost"} 
                className={`w-full justify-start gap-2 h-9 px-3 ${selectedAccountId === acc.id ? "font-semibold" : "font-normal text-muted-foreground"}`}
                onClick={() => handleAccountSelect(acc.id)}
              >
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: acc.color || "#ccc" }} />
                <span className="truncate">{acc.name}</span>
                {acc.unreadCount > 0 && (
                  <Badge variant="secondary" className="ml-auto px-1.5 py-0 text-xs font-semibold h-5">
                    {acc.unreadCount}
                  </Badge>
                )}
              </Button>
            ))}
          </div>
          
          <div className="pt-2 border-t">
            <h3 className="px-3 text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Folders</h3>
            <div className="space-y-1">
              {folders.map(folder => (
                <Button 
                  key={folder}
                  variant={selectedFolder === folder ? "secondary" : "ghost"} 
                  className={`w-full justify-start gap-2 h-9 px-3 ${selectedFolder === folder ? "font-semibold" : "font-normal text-muted-foreground"}`}
                  onClick={() => handleFolderSelect(folder)}
                >
                  <Tag className="w-3.5 h-3.5" />
                  {folder}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );

  const messageListPanel = (
    <div className="flex flex-col bg-background relative z-10 border-r shadow-2xl shadow-black/5 h-full min-w-0">
      <div className="p-3 border-b flex flex-col gap-2">
        {isMobile && (
          <Button variant="ghost" size="sm" className="w-fit gap-1 px-1 text-muted-foreground" onClick={() => setMobileView("mailboxes")}>
            <ChevronLeft className="h-4 w-4" />
            Mailboxes
          </Button>
        )}
        <div className="flex items-center justify-between px-1">
          <h1 className="font-semibold text-lg">{selectedFolder || "All Messages"}</h1>
          <span className="text-xs font-medium text-muted-foreground">{messagesData?.messages?.length || 0} messages</span>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search messages..." 
            className="pl-8 bg-muted/50 border-transparent shadow-none focus-visible:ring-1 h-9 rounded-md text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="divide-y divide-border">
          {messagesLoading ? (
            Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="p-4 space-y-3">
                <div className="flex items-center gap-2"><Skeleton className="h-4 w-1/2" /><Skeleton className="h-3 w-12 ml-auto" /></div>
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-3 w-full" />
              </div>
            ))
          ) : messagesData?.messages?.length === 0 ? (
            <div className="p-8 text-center flex flex-col items-center justify-center h-48">
              <Mail className="h-10 w-10 text-muted-foreground/30 mb-3" />
              {selectedAccountId === -1 ? (
                <>
                  <p className="text-sm font-medium text-muted-foreground">Gmail is connected, but inbox reading is not available yet.</p>
                  <p className="text-xs text-muted-foreground mt-2 max-w-sm">
                    The current Gmail permission allows labels and sending, but not reading mailbox messages. Outlook inbox reading is available.
                  </p>
                </>
              ) : (
                <p className="text-sm font-medium text-muted-foreground">No messages found in this view.</p>
              )}
            </div>
          ) : (
            messagesData?.messages?.map(msg => {
              if (debouncedSearch && !msg.subject.toLowerCase().includes(debouncedSearch.toLowerCase()) && !msg.fromName.toLowerCase().includes(debouncedSearch.toLowerCase())) return null;
              
              const isSelected = selectedMessageId === msg.id;
              
              return (
                <div 
                  key={msg.id} 
                  className={`p-3 cursor-pointer group transition-colors border-l-2 ${isSelected ? 'bg-primary/5 border-l-primary' : 'hover:bg-muted/40 border-l-transparent'} ${!msg.isRead ? 'bg-background' : ''}`}
                  onClick={() => handleMessageSelect(msg.id)}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${!msg.isRead ? 'bg-primary' : 'bg-transparent'}`} />
                      <span className={`text-sm truncate ${!msg.isRead ? 'font-bold text-foreground' : 'font-medium text-foreground/80'}`}>
                        {msg.fromName}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                      {formatDistanceToNow(new Date(msg.receivedAt), { addSuffix: false }).replace('about ', '')}
                    </span>
                  </div>
                  
                  <div className="pl-4 flex items-start gap-2 justify-between">
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm truncate mb-1 ${!msg.isRead ? 'font-semibold text-foreground/90' : 'text-foreground/70'}`}>
                        {msg.subject}
                      </div>
                      <div className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {msg.bodyText}
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-center gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => handleToggleStar(msg.id, msg.isStarred, e)} className="text-muted-foreground hover:text-amber-500">
                        <Star className={`h-4 w-4 ${msg.isStarred ? 'fill-amber-500 text-amber-500' : ''}`} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="pl-4 mt-2 flex gap-2">
                    {msg.hasAttachments && (
                      <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 gap-1 text-muted-foreground border-border bg-background">
                        <File className="h-2.5 w-2.5" /> Attachments
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-border bg-background" style={{ color: msg.accountColor, borderColor: msg.accountColor }}>
                      {msg.accountName}
                    </Badge>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );

  const messageDetailPanel = (
    <div className="bg-background flex flex-col h-full min-w-0">
      {isMobile && selectedMessageId && (
        <div className="h-12 px-3 border-b flex items-center shrink-0 bg-background">
          <Button variant="ghost" size="sm" className="gap-1 px-1 text-muted-foreground" onClick={() => setMobileView("messages")}>
            <ChevronLeft className="h-4 w-4" />
            Messages
          </Button>
        </div>
      )}
      {!selectedMessageId ? (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground bg-muted/5">
          <Mail className="h-16 w-16 mb-4 opacity-20" />
          <p className="font-medium text-sm">Select a message to read</p>
        </div>
      ) : messageLoading ? (
        <div className="p-8 space-y-6">
          <div className="space-y-2"><Skeleton className="h-8 w-3/4" /><Skeleton className="h-4 w-1/4" /></div>
          <div className="flex gap-4 items-center"><Skeleton className="h-10 w-10 rounded-full" /><div className="space-y-2"><Skeleton className="h-4 w-48" /><Skeleton className="h-3 w-32" /></div></div>
          <div className="space-y-3 pt-6"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-5/6" /><Skeleton className="h-4 w-full" /></div>
        </div>
      ) : activeMessage ? (
        <div className="flex flex-col h-full overflow-hidden">
          <div className="h-14 px-4 border-b flex items-center justify-between shrink-0 bg-background/95 backdrop-blur z-10 sticky top-0">
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" className="gap-1" onClick={() => openComposeAction("reply")}>
                <Reply className="h-4 w-4" />
                <span className="hidden sm:inline">Reply</span>
              </Button>
              <Button variant="ghost" size="sm" className="gap-1" onClick={() => openComposeAction("forward")}>
                <Forward className="h-4 w-4" />
                <span className="hidden sm:inline">Forward</span>
              </Button>
              <Button variant="ghost" size="icon" onClick={(e) => handleToggleStar(activeMessage.id, activeMessage.isStarred, e)}>
                <Star className={`h-4 w-4 ${activeMessage.isStarred ? 'fill-amber-500 text-amber-500' : 'text-muted-foreground'}`} />
              </Button>
              <Button variant="ghost" size="icon" onClick={(e) => handleToggleRead(activeMessage.id, activeMessage.isRead, e)}>
                <InboxIcon className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center gap-1 rounded-md border bg-background">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setBodyZoom((z) => Math.max(80, z - 10))}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <button className="text-xs font-medium text-muted-foreground min-w-10" onClick={() => setBodyZoom(100)}>
                  {bodyZoom}%
                </button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setBodyZoom((z) => Math.min(160, z + 10))}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setBodyZoom(100)}>
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{format(new Date(activeMessage.receivedAt), "MMM d, yyyy 'at' h:mm a")}</span>
                <span className="sm:hidden">{format(new Date(activeMessage.receivedAt), "MMM d")}</span>
              </div>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-6 md:p-8 max-w-4xl mx-auto">
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-foreground tracking-tight leading-tight mb-4">
                  {activeMessage.subject}
                </h1>
                
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0 border border-primary/20">
                    {activeMessage.fromName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-4">
                      <div className="font-semibold text-base truncate">{activeMessage.fromName}</div>
                    </div>
                    <div className="text-sm text-muted-foreground truncate">&lt;{activeMessage.fromEmail}&gt;</div>
                    <div className="text-xs text-muted-foreground mt-1 flex gap-2">
                      <span className="font-medium text-foreground/60">To:</span> <span className="truncate">{activeMessage.toList}</span>
                    </div>
                    {activeMessage.ccList && (
                      <div className="text-xs text-muted-foreground flex gap-2 mt-0.5">
                        <span className="font-medium text-foreground/60">Cc:</span> <span className="truncate">{activeMessage.ccList}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <Separator className="my-6 opacity-50" />

              <div className="md:hidden mb-4 flex items-center gap-1 rounded-md border bg-background w-fit">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setBodyZoom((z) => Math.max(80, z - 10))}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <button className="text-xs font-medium text-muted-foreground min-w-10" onClick={() => setBodyZoom(100)}>
                  {bodyZoom}%
                </button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setBodyZoom((z) => Math.min(160, z + 10))}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </div>

              <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none prose-p:leading-relaxed prose-headings:font-bold prose-a:text-primary" style={{ fontSize: `${bodyZoom}%` }}>
                {activeMessage.bodyHtml ? (
                  <div dangerouslySetInnerHTML={{ __html: activeMessage.bodyHtml }} />
                ) : (
                  <div className="whitespace-pre-wrap font-sans">{activeMessage.bodyText}</div>
                )}
              </div>

              {activeMessage.attachments?.length > 0 && (
                <div className="mt-10 pt-6 border-t border-border/50">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <File className="w-4 h-4 text-muted-foreground" />
                    Attachments ({activeMessage.attachments.length})
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {activeMessage.attachments.map(att => (
                      <div key={att.id} className="flex items-center gap-3 p-3 border rounded-lg bg-muted/20 hover:bg-muted/50 transition-colors max-w-[240px] cursor-pointer">
                        <div className="p-2 bg-background rounded border shadow-sm">
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
          </ScrollArea>
        </div>
      ) : null}
    </div>
  );

  if (isMobile) {
    return (
      <div className="h-full bg-background overflow-hidden">
        {mobileView === "mailboxes" && mailboxPanel}
        {mobileView === "messages" && messageListPanel}
        {mobileView === "detail" && messageDetailPanel}
        <ComposeModal open={isComposeOpen} onOpenChange={setIsComposeOpen} initialDraft={composeDraft} />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      <ResizablePanelGroup direction="horizontal" className="flex-1 w-full h-full rounded-none border-0">
        <ResizablePanel defaultSize={20} minSize={15} maxSize={30} className="bg-muted/10 border-r flex flex-col">
          {mailboxPanel}
        </ResizablePanel>

        <ResizableHandle className="w-[1px] bg-border opacity-50" />

        <ResizablePanel defaultSize={35} minSize={25} maxSize={50} className="flex flex-col bg-background relative z-10 border-r shadow-2xl shadow-black/5">
          {messageListPanel}
        </ResizablePanel>

        <ResizableHandle className="w-[1px] bg-border opacity-50" />

        <ResizablePanel defaultSize={45} minSize={30} className="bg-background flex flex-col">
          {messageDetailPanel}
        </ResizablePanel>
      </ResizablePanelGroup>
      <ComposeModal open={isComposeOpen} onOpenChange={setIsComposeOpen} initialDraft={composeDraft} />
    </div>
  );
}
