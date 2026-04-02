import { useGetContacts } from "@workspace/api-client-react";
import { useState } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { Input } from "@/components/ui/input";
import { Search, Mail, Phone, Building2, Calendar, MessageSquare, Clock } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Contacts() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [selectedContactId, setSelectedContactId] = useState<number | null>(null);

  const { data: contacts, isLoading } = useGetContacts({ q: debouncedSearch || undefined });
  
  const selectedContact = contacts?.find(c => c.id === selectedContactId);

  return (
    <div className="h-full flex overflow-hidden bg-background">
      {/* List Column */}
      <div className="w-[350px] border-r flex flex-col bg-muted/10">
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
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Detail Column */}
      <div className="flex-1 bg-background flex flex-col">
        {!selectedContact ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground flex-col gap-4 bg-muted/5">
            <Users className="w-16 h-16 opacity-20" />
            <p className="text-sm font-medium">Select a contact to view details</p>
          </div>
        ) : (
          <ScrollArea className="flex-1">
            <div className="p-8 max-w-3xl mx-auto space-y-8">
              <div className="flex items-center gap-6 pb-8 border-b">
                <Avatar className="h-24 w-24 border-2 border-border bg-muted shadow-sm">
                  <AvatarImage src={selectedContact.avatarUrl || ''} />
                  <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
                    {selectedContact.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-3xl font-bold tracking-tight mb-1">{selectedContact.name}</h2>
                  {selectedContact.company && (
                    <div className="flex items-center gap-2 text-muted-foreground font-medium">
                      <Building2 className="w-4 h-4" />
                      {selectedContact.company}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="shadow-none border-border">
                  <CardHeader className="pb-3 pt-4 px-5 bg-muted/30">
                    <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Contact Info</h3>
                  </CardHeader>
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Mail className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Email</div>
                        <div className="text-sm font-medium">{selectedContact.email}</div>
                      </div>
                    </div>
                    {selectedContact.phone && (
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                          <Phone className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Phone</div>
                          <div className="text-sm font-medium">{selectedContact.phone}</div>
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
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center">
                        <MessageSquare className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Total Messages</div>
                        <div className="text-sm font-medium">{selectedContact.messageCount}</div>
                      </div>
                    </div>
                    {selectedContact.lastMessageAt && (
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                          <Clock className="w-4 h-4 text-amber-600" />
                        </div>
                        <div>
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
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
// Add import for Users
import { Users } from "lucide-react";
