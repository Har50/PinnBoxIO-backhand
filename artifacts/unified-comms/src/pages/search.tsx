import { useSearchAll } from "@workspace/api-client-react";
import { useState, useEffect } from "react";
import { useSearch } from "wouter";
import { useDebounce } from "@/hooks/use-debounce";
import { Input } from "@/components/ui/input";
import { Search as SearchIcon, Mail, Users, FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";

export default function SearchPage() {
  const rawSearch = useSearch();
  const urlParams = new URLSearchParams(rawSearch);
  const initialQ = urlParams.get("q") || "";

  const [query, setQuery] = useState(initialQ);
  const debouncedQuery = useDebounce(query, 300);

  // Update when the URL param changes (e.g., clicking a different person in sidebar)
  useEffect(() => {
    const q = new URLSearchParams(rawSearch).get("q") || "";
    setQuery(q);
  }, [rawSearch]);

  const { data: results, isLoading } = useSearchAll(
    { q: debouncedQuery, type: "all" },
    { query: { enabled: debouncedQuery.length > 1, queryKey: ["search", debouncedQuery] as any } }
  );

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 flex flex-col h-full overflow-hidden">
      <div className="space-y-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Global Search</h1>
          <p className="text-muted-foreground mt-1">Find messages, contacts, and attachments.</p>
        </div>

        <div className="relative max-w-2xl">
          <SearchIcon className="absolute left-3.5 top-3.5 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Type at least 2 characters to search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus={!!initialQ}
            className="pl-11 h-12 text-base bg-muted/30 border-muted-foreground/20 shadow-sm focus-visible:ring-primary focus-visible:bg-background transition-colors"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-12">
        {!debouncedQuery || debouncedQuery.length < 2 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <SearchIcon className="h-16 w-16 mb-4 opacity-20" />
            <p>Enter a search term to begin</p>
          </div>
        ) : isLoading ? (
          <div className="space-y-8">
            <div className="space-y-4">
              <Skeleton className="h-6 w-32" />
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={`m-${i}`} className="h-20 w-full" />)}
            </div>
            <div className="space-y-4">
              <Skeleton className="h-6 w-32" />
              {Array.from({ length: 2 }).map((_, i) => <Skeleton key={`c-${i}`} className="h-16 w-full" />)}
            </div>
          </div>
        ) : !results || (results.messages.length === 0 && results.contacts.length === 0) ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <FileText className="h-12 w-12 mb-4 opacity-30" />
            <p>No results found for "{debouncedQuery}"</p>
          </div>
        ) : (
          <div className="space-y-10">
            {results.messages.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold flex items-center gap-2 tracking-tight">
                  <Mail className="h-5 w-5 text-primary" />
                  Messages ({results.totalMessages})
                </h2>
                <div className="border rounded-xl divide-y bg-background shadow-sm overflow-hidden">
                  {results.messages.map((msg) => (
                    <Link
                      key={msg.id}
                      href="/inbox"
                      className="p-4 hover:bg-muted/30 flex flex-col gap-1 transition-colors block group cursor-pointer border-l-2 border-l-transparent hover:border-l-primary"
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-sm group-hover:text-primary transition-colors">{msg.subject}</div>
                        <div className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(msg.receivedAt))} ago</div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <span className="font-medium text-foreground/80">{msg.fromName}</span>
                        <span>•</span>
                        <span className="px-1.5 rounded-sm bg-muted text-[10px] font-medium" style={{ color: msg.accountColor }}>{msg.accountName}</span>
                      </div>
                      <div className="text-sm text-muted-foreground line-clamp-1">{msg.bodyText}</div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {results.contacts.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold flex items-center gap-2 tracking-tight">
                  <Users className="h-5 w-5 text-emerald-500" />
                  Contacts ({results.totalContacts})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {results.contacts.map((contact) => (
                    <Link
                      key={contact.id}
                      href="/contacts"
                      className="flex items-center gap-4 p-4 border rounded-xl bg-background hover:bg-muted/30 hover:border-emerald-500/30 transition-all shadow-sm cursor-pointer group"
                    >
                      <Avatar className="h-12 w-12 border bg-muted">
                        <AvatarImage src={contact.avatarUrl || ""} />
                        <AvatarFallback className="font-medium text-emerald-600 bg-emerald-500/10">
                          {contact.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm truncate group-hover:text-emerald-600 transition-colors">{contact.name}</div>
                        <div className="text-xs text-muted-foreground truncate">{contact.email}</div>
                        {contact.company && <div className="text-xs text-muted-foreground truncate mt-0.5">{contact.company}</div>}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
