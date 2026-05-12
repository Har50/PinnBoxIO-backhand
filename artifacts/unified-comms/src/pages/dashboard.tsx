import { useGetOverviewStats, useGetRecentMessages } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Users, MessageSquare } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetOverviewStats();
  const { data: recent, isLoading: recentLoading } = useGetRecentMessages({ limit: 5 });

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of all your communications.</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {statsLoading ? (
          Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)
        ) : (
          <>
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
                  <Link key={msg.id} href="/inbox" className="p-4 hover:bg-muted/50 transition-colors flex flex-col sm:flex-row sm:items-center gap-4 cursor-pointer relative block">
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
                  </Link>
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
                  <div key={acc.accountId} className="flex items-center gap-3 p-3 rounded-md hover:bg-muted/50">
                    <div className="w-8 h-8 rounded flex items-center justify-center text-xs font-bold text-white shadow-sm flex-shrink-0" style={{ backgroundColor: acc.color || "#ccc" }}>
                      {acc.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium leading-none">{acc.name}</div>
                      <div className="text-xs text-muted-foreground mt-1 truncate">{acc.email}</div>
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
