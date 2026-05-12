import { useGetContacts, useGetContactMessages } from "@workspace/api-client-react";
import { useState } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { Input } from "@/components/ui/input";
import { Search, Mail, Phone, Building2, MessageSquare, Clock, Users, ArrowLeft, Inbox } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";

function ContactMessages({ contactId }: { contactId: number }) {
  const [emailSearch, setEmailSearch] = useState("");
  const debouncedEmailSearch = useDebounce(emailSearch, 300);

  const { data, isLoading } = useGetContactMessages(contactId, {
    q: debouncedEmailSearch || undefined,
  });

  const messages = data?.messages ?? [];

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search emails from this contact..."
          value={emailSearch}
          onChange={(e) => setEmailSearch(e.target.value)}
          className="pl-9 bg-background shadow-sm border-muted-foreground/20 text-sm"
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      ) : messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-3">
          <Inbox className="w-10 h-10 opacity-20" />
          <p className="text-sm">
            {debouncedEmailSearch ? "No emails match your search." : "No emails from this contact yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className="border border-border rounded-lg p-3.5 hover:bg-muted/40 transition-colors"
            >
              <div className="flex items-start justify-between gap-3 mb-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: msg.accountColor || "#ccc" }}
                    title={msg.accountName}
                  />
                  <span className={`text-sm truncate ${msg.isRead ? "text-foreground/70" : "font-semibold text-foreground"}`}>
                    {msg.subject || "(No subject)"}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                  {formatDistanceToNow(new Date(msg.receivedAt), { addSuffix: true })}
                </span>
              </div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs text-muted-foreground truncate">
                  {msg.accountName} ({msg.accountEmail})
                </span>
              </div>
              {msg.bodyText && (
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                  {msg.bodyText.trim()}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Contacts() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [selectedContactId, setSelectedContactId] = useState<number | null>(null);

  const { data: contacts, isLoading } = useGetContacts({ q: debouncedSearch || undefined });

  const selectedContact = contacts?.find(c => c.id === selectedContactId);

  return (
    <div className="h-full flex overflow-hidden bg-background">
      {/* List Column */}
      <div className={`${selectedContact ? "hidden md:flex" : "flex"} w-full md:w-[350px] md:shrink-0 border-r flex-col bg-muted/10`}>
        <div className="p-4 border-b space-y-3">
          <h1 className="text-xl font-semibold tracking-tight">Contacts</h1>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search contacts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-background shadow-sm border-muted-foreground/20"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-3 space-y-2">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-2"><Skeleton className="h-10 w-10 rounded-full" /><div className="space-y-2 flex-1"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-3 w-1/2" /></div></div>
              ))
            ) : contacts?.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground text-sm">No contacts found.</div>
            ) : (
              contacts?.map((contact) => (
                <div
                  key={contact.id}
                  onClick={() => setSelectedContactId(contact.id)}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${selectedContactId === contact.id ? 'bg-primary/10 border border-primary/20' : 'hover:bg-muted/50 border border-transparent'}`}
                >
                  <Avatar className="h-10 w-10 border border-border bg-background">
                    <AvatarImage src={contact.avatarUrl || ''} />
                    <AvatarFallback className="bg-primary/5 text-primary font-medium text-xs">
                      {contact.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate text-foreground">{contact.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{contact.company || contact.email}</div>
                  </div>
                  {contact.messageCount > 0 && (
                    <span className="text-xs text-muted-foreground flex-shrink-0">{contact.messageCount}</span>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Detail Column */}
      <div className={`${selectedContact ? "flex" : "hidden md:flex"} flex-1 min-w-0 bg-background flex-col`}>
        {!selectedContact ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground flex-col gap-4 bg-muted/5">
            <Users className="w-16 h-16 opacity-20" />
            <p className="text-sm font-medium">Select a contact to view details</p>
          </div>
        ) : (
          <ScrollArea className="flex-1">
            <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto space-y-6 sm:space-y-8">
              <button
                type="button"
                onClick={() => setSelectedContactId(null)}
                className="md:hidden inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to contacts
              </button>

              {/* Contact header */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 pb-6 sm:pb-8 border-b">
                <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-2 border-border bg-muted shadow-sm">
                  <AvatarImage src={selectedContact.avatarUrl || ''} />
                  <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
                    {selectedContact.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-1 break-words">{selectedContact.name}</h2>
                  {selectedContact.company && (
                    <div className="flex items-center gap-2 text-muted-foreground font-medium min-w-0">
                      <Building2 className="w-4 h-4 shrink-0" />
                      <span className="truncate">{selectedContact.company}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Info cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="shadow-none border-border">
                  <CardHeader className="pb-3 pt-4 px-5 bg-muted/30">
                    <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Contact Info</h3>
                  </CardHeader>
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
                        <Mail className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs text-muted-foreground">Email</div>
                        <div className="text-sm font-medium break-all">{selectedContact.email}</div>
                      </div>
                    </div>
                    {selectedContact.phone && (
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 shrink-0 rounded-full bg-emerald-500/10 flex items-center justify-center">
                          <Phone className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs text-muted-foreground">Phone</div>
                          <div className="text-sm font-medium break-words">{selectedContact.phone}</div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="shadow-none border-border">
                  <CardHeader className="pb-3 pt-4 px-5 bg-muted/30">
                    <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Activity</h3>
                  </CardHeader>
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 shrink-0 rounded-full bg-indigo-500/10 flex items-center justify-center">
                        <MessageSquare className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs text-muted-foreground">Total Messages</div>
                        <div className="text-sm font-medium">{selectedContact.messageCount}</div>
                      </div>
                    </div>
                    {selectedContact.lastMessageAt && (
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 shrink-0 rounded-full bg-amber-500/10 flex items-center justify-center">
                          <Clock className="w-4 h-4 text-amber-600" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs text-muted-foreground">Last Message</div>
                          <div className="text-sm font-medium">{formatDistanceToNow(new Date(selectedContact.lastMessageAt), { addSuffix: true })}</div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {selectedContact.notes && (
                <Card className="shadow-none border-border">
                  <CardHeader className="pb-3 pt-4 px-5 bg-muted/30">
                    <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Notes</h3>
                  </CardHeader>
                  <CardContent className="p-5">
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{selectedContact.notes}</p>
                  </CardContent>
                </Card>
              )}

              {/* Emails from this contact */}
              <div className="space-y-3">
                <div>
                  <h3 className="text-base font-semibold tracking-tight">Emails</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">All messages received from this contact</p>
                </div>
                <ContactMessages contactId={selectedContact.id} />
              </div>
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
