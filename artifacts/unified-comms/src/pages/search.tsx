import { useState, useEffect } from "react";
import { useSearch } from "wouter";
import { useDebounce } from "@/hooks/use-debounce";
import { Input } from "@/components/ui/input";
import { Search as SearchIcon, Mail, Users, FileText, ExternalLink, Zap, ZapOff } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";

const BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

interface SearchResults {
  query: string;
  messages: any[];
  contacts: any[];
  totalMessages: number;
  totalContacts: number;
  searchAccess?: { isPro: boolean; usedToday: number; limit: number | null };
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function Highlight({ text, q }: { text: string | null | undefined; q: string }) {
  if (!text) return null;
  if (!q || q.length < 2) return <>{text}</>;
  // Capturing group makes split() include matches in odd-indexed positions.
  const parts = text.split(new RegExp(`(${escapeRegex(q)})`, "ig"));
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="bg-yellow-300/30 text-foreground rounded px-0.5">{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

interface SearchLimit { usedToday: number; limit: number; }

function useUnifiedSearch(q: string) {
  const [data, setData] = useState<SearchResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [limitReached, setLimitReached] = useState<SearchLimit | null>(null);
  const [error, setError] = useState<string | null>(null);
  const enabled = q.length > 1;

  useEffect(() => {
    if (!enabled) { setData(null); setLimitReached(null); setError(null); return; }
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    apiFetch<SearchResults>(`/api/search?q=${encodeURIComponent(q)}&type=all`)
      .then((d) => {
        if (!cancelled) { setLimitReached(null); setError(null); setData(d); }
      })
      .catch((err: any) => {
        if (cancelled) return;
        if (err?.status === 402 && err?.code === "SEARCH_DAILY_LIMIT_REACHED") {
          setLimitReached({ usedToday: err?.usedToday ?? 3, limit: err?.limit ?? 3 });
          setData(null);
        } else {
          setError(err?.message ?? "Search failed. Please try again.");
          setData(null);
        }
      })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [q, enabled]);

  return { data, isLoading, limitReached, error };
}

export default function SearchPage() {
  const rawSearch = useSearch();
  const urlParams = new URLSearchParams(rawSearch);
  const initialQ = urlParams.get("q") || "";

  const [query, setQuery] = useState(initialQ);
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    const q = new URLSearchParams(rawSearch).get("q") || "";
    setQuery(q);
  }, [rawSearch]);

  const { data: results, isLoading, limitReached, error } = useUnifiedSearch(debouncedQuery);
  const hasResults = results && (
    results.messages.length > 0 ||
    results.contacts.length > 0
  );
  const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(debouncedQuery)}`;

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-8 flex flex-col h-full overflow-hidden">
      <div className="space-y-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Search</h1>
          <p className="text-muted-foreground mt-1">Find database records, emails, messages, and contacts.</p>
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
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-3">
            <SearchIcon className="h-16 w-16 opacity-20" />
            <p>Enter a search term to begin</p>
            <span className="flex items-center gap-1.5 text-xs bg-muted px-3 py-1.5 rounded-full border border-border">
              <Zap className="h-3 w-3" /> 3 free searches/day · Pro = unlimited
            </span>
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
        ) : error ? (
          <div className="flex flex-col items-center justify-center min-h-64 text-muted-foreground text-center px-4 gap-3">
            <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <ZapOff className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-base">Search failed</p>
              <p className="text-sm mt-1 max-w-sm text-muted-foreground">{error}</p>
            </div>
          </div>
        ) : limitReached ? (
          <div className="flex flex-col items-center justify-center min-h-64 text-muted-foreground text-center px-4 gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <ZapOff className="h-7 w-7 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-base">Daily search limit reached</p>
              <p className="text-sm mt-1 max-w-sm text-muted-foreground">
                You've used all {limitReached.limit} free searches today. Resets at midnight UTC.
              </p>
            </div>
            <Button className="gap-2 bg-amber-500 hover:bg-amber-600 text-white" asChild>
              <a href="https://pinnboxio.net" target="_blank" rel="noreferrer">
                Upgrade to Pro — Unlimited Search
              </a>
            </Button>
            <a href={googleSearchUrl} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground flex items-center gap-1.5 hover:text-primary transition">
              <ExternalLink className="h-3 w-3" /> Search Google instead
            </a>
          </div>
        ) : !hasResults ? (
          <div className="flex flex-col items-center justify-center min-h-64 text-muted-foreground text-center px-4">
            <FileText className="h-12 w-12 mb-4 opacity-30" />
            <p className="font-medium text-foreground">No local results found for "{debouncedQuery}"</p>
            <p className="text-sm mt-2 max-w-md">
              I searched stored messages, live connected emails, and contacts.
            </p>
            <Button asChild className="mt-5 gap-2">
              <a href={googleSearchUrl} target="_blank" rel="noreferrer">
                Search Google instead
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </div>
        ) : (
          <div className="space-y-10">
            {results!.messages.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold flex items-center gap-2 tracking-tight">
                  <Mail className="h-5 w-5 text-primary" />
                  Messages ({results!.totalMessages})
                </h2>
                <div className="border rounded-xl divide-y bg-background shadow-sm overflow-hidden">
                  {results!.messages.map((msg: any) => (
                    <Link
                      key={msg.id}
                      href="/inbox"
                      className="p-4 hover:bg-muted/30 flex flex-col gap-1 transition-colors block group cursor-pointer border-l-2 border-l-transparent hover:border-l-primary"
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-sm group-hover:text-primary transition-colors"><Highlight text={msg.subject} q={debouncedQuery} /></div>
                        <div className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(msg.receivedAt))} ago</div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <span className="font-medium text-foreground/80"><Highlight text={msg.fromName} q={debouncedQuery} /></span>
                        <span>•</span>
                        <span className="px-1.5 rounded-sm bg-muted text-[10px] font-medium" style={{ color: msg.accountColor }}>{msg.accountName}</span>
                      </div>
                      <div className="text-sm text-muted-foreground line-clamp-1"><Highlight text={msg.bodyText} q={debouncedQuery} /></div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {results!.contacts.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold flex items-center gap-2 tracking-tight">
                  <Users className="h-5 w-5 text-emerald-500" />
                  Contacts ({results!.totalContacts})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {results!.contacts.map((contact: any) => (
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
