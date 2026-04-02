import { useGetOverviewStats, useGetRecentMessages, useGetContacts } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Mail, InboxIcon, Star, Users, MessageSquare, Phone, Clock, Building2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetOverviewStats();
  const { data: recent, isLoading: recentLoading } = useGetRecentMessages({ limit: 5 });
  const { data: allContacts, isLoading: contactsLoading } = useGetContacts({});

  const importantPeople = allContacts
    ? [...allContacts]
        .sort((a, b) => b.messageCount - a.messageCount)
        .filter((c) => c.messageCount > 0)
        .slice(0, 6)
    : [];

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of all your communications.</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)
        ) : (
          <>
            <Card className="hover-elevate transition-shadow cursor-default border-border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Unread</CardTitle>
                <div className="p-2 bg-primary/10 rounded-full">
                  <InboxIcon className="w-4 h-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats?.totalUnread || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Across all accounts</p>
              </CardContent>
            </Card>
            <Card className="hover-elevate transition-shadow cursor-default border-border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Starred</CardTitle>
                <div className="p-2 bg-amber-500/10 rounded-full">
                  <Star className="w-4 h-4 text-amber-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats?.totalStarred || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Important messages</p>
              </CardContent>
            </Card>
            <Card className="hover-elevate transition-shadow cursor-default border-border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Contacts</CardTitle>
                <div className="p-2 bg-emerald-500/10 rounded-full">
                  <Users className="w-4 h-4 text-emerald-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats?.totalContacts || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Saved contacts</p>
              </CardContent>
            </Card>
            <Card className="hover-elevate transition-shadow cursor-default border-border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Accounts</CardTitle>
                <div className="p-2 bg-indigo-500/10 rounded-full">
                  <Mail className="w-4 h-4 text-indigo-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats?.totalAccounts || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Connected accounts</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Important People section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Important People</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Your most active contacts by message volume</p>
          </div>
          <Link href="/contacts" className="text-sm text-primary hover:underline font-medium">
            View all contacts
          </Link>
        </div>

        {contactsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : importantPeople.length === 0 ? (
          <Card className="shadow-sm border-border">
            <div className="p-8 text-center text-muted-foreground flex flex-col items-center gap-3">
              <Users className="w-10 h-10 opacity-20" />
              <p className="text-sm">No contacts with messages yet. Add contacts to see them here.</p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {importantPeople.map((contact) => (
              <Link key={contact.id} href="/contacts">
                <Card className="shadow-sm border-border hover:border-primary/30 hover:shadow-md transition-all cursor-pointer group">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-11 w-11 border border-border flex-shrink-0">
                        <AvatarImage src={contact.avatarUrl || ""} />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                          {contact.name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-semibold truncate text-foreground group-hover:text-primary transition-colors">
                            {contact.name}
                          </span>
                        </div>
                        {contact.company && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2 truncate">
                            <Building2 className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{contact.company}</span>
                          </div>
                        )}
                        {!contact.company && (
                          <div className="text-xs text-muted-foreground mb-2 truncate">{contact.email}</div>
                        )}
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            variant="secondary"
                            className="flex items-center gap-1 text-xs px-2 py-0.5 bg-primary/10 text-primary border-0 font-medium"
                          >
                            <MessageSquare className="w-3 h-3" />
                            {contact.messageCount} {contact.messageCount === 1 ? "message" : "messages"}
                          </Badge>
                          {contact.phone && (
                            <Badge
                              variant="secondary"
                              className="flex items-center gap-1 text-xs px-2 py-0.5 bg-emerald-500/10 text-emerald-700 border-0 font-medium"
                            >
                              <Phone className="w-3 h-3" />
                              {contact.phone}
                            </Badge>
                          )}
                        </div>
                        {contact.lastMessageAt && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1.5">
                            <Clock className="w-3 h-3" />
                            Last contact {formatDistanceToNow(new Date(contact.lastMessageAt), { addSuffix: true })}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Recent messages + account breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold tracking-tight">Recent Messages</h2>
            <Link href="/inbox" className="text-sm text-primary hover:underline font-medium">View all</Link>
          </div>
          <Card className="shadow-sm border-border overflow-hidden">
            <div className="divide-y divide-border">
              {recentLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="p-4 flex gap-4"><Skeleton className="h-10 w-10 rounded-full" /><div className="space-y-2 flex-1"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-3 w-full" /></div></div>
                ))
              ) : recent?.messages?.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground flex flex-col items-center">
                  <MessageSquare className="w-12 h-12 mb-3 text-muted-foreground/30" />
                  <p>No recent messages found.</p>
                </div>
              ) : (
                recent?.messages?.map((msg) => (
                  <div key={msg.id} className="p-4 hover:bg-muted/50 transition-colors flex flex-col sm:flex-row sm:items-center gap-4 cursor-pointer relative">
                    <div className="flex items-center gap-3 w-full sm:w-48 flex-shrink-0">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: msg.accountColor || "#ccc" }} title={msg.accountName} />
                      <div className="font-medium text-sm truncate flex-1" title={msg.fromName}>{msg.fromName}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm truncate ${msg.isRead ? "font-normal text-muted-foreground" : "font-semibold text-foreground/90"}`}>{msg.subject}</div>
                      <div className="text-sm text-muted-foreground truncate">{msg.bodyText?.substring(0, 100) || "No content"}</div>
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap hidden sm:block">
                      {formatDistanceToNow(new Date(msg.receivedAt), { addSuffix: true })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold tracking-tight">Account Breakdown</h2>
          <Card className="shadow-sm border-border">
            <div className="p-1">
              {statsLoading ? (
                <div className="p-4 space-y-4"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
              ) : stats?.accountBreakdown?.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-sm">No accounts configured.</div>
              ) : (
                stats?.accountBreakdown?.map((acc) => (
                  <div key={acc.accountId} className="flex items-center justify-between p-3 rounded-md hover:bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-muted flex items-center justify-center text-xs font-bold text-white shadow-sm" style={{ backgroundColor: acc.color || "#ccc" }}>
                        {acc.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-medium leading-none">{acc.name}</div>
                        <div className="text-xs text-muted-foreground mt-1">{acc.email}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold">{acc.unread}</div>
                      <div className="text-xs text-muted-foreground">unread</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
