import { Link, useLocation } from "wouter";
import { Mail, Search, Users, Settings, MessageCircle, PenSquare, LayoutDashboard, ChevronDown, ChevronRight, Phone, CreditCard } from "lucide-react";
import { Button } from "./ui/button";
import { ComposeModal } from "./compose-modal";
import { PayModal } from "./pay-modal";
import { useState } from "react";
import { useGetContacts, useGetOverviewStats } from "@workspace/api-client-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [importantExpanded, setImportantExpanded] = useState(true);

  const { data: allContacts } = useGetContacts({});
  const { data: stats } = useGetOverviewStats();

  const importantPeople = allContacts
    ? [...allContacts]
        .sort((a, b) => b.messageCount - a.messageCount)
        .filter((c) => c.messageCount > 0)
        .slice(0, 5)
    : [];

  const totalUnread = stats?.totalUnread ?? 0;

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/inbox", label: "Inbox", icon: Mail, badge: totalUnread },
    { href: "/contacts", label: "Contacts", icon: Users },
  ];

  const bottomNavItems = [
    { href: "/search", label: "Search", icon: Search },
    { href: "/whatsapp", label: "WhatsApp", icon: MessageCircle },
    { href: "/accounts", label: "Accounts", icon: Settings },
  ];

  function handlePersonClick(contact: { email: string; name: string }) {
    navigate(`/search?q=${encodeURIComponent(contact.email)}`);
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <div className="w-64 flex-shrink-0 border-r bg-sidebar text-sidebar-foreground flex flex-col">
        <div className="p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-primary-foreground font-bold shadow-md">
            UC
          </div>
          <span className="font-semibold text-lg tracking-tight">CommsHub</span>
        </div>

        <div className="px-4 py-2 flex flex-col gap-2">
          <Button onClick={() => setIsComposeOpen(true)} className="w-full justify-start gap-2 shadow-sm font-medium" size="lg">
            <PenSquare className="w-4 h-4" />
            Compose
          </Button>
          <Button
            onClick={() => setIsPayOpen(true)}
            variant="outline"
            size="lg"
            className="w-full justify-start gap-2 font-medium border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-600 hover:border-emerald-500/60"
          >
            <CreditCard className="w-4 h-4" />
            Pay
          </Button>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-3 flex flex-col gap-0.5">
          {/* Top nav: Dashboard, Inbox, Contacts */}
          {navItems.map((item) => {
            const isActive = location === item.href || (location.startsWith(item.href) && item.href !== "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium ${isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-sidebar-accent/50 text-sidebar-foreground/80 hover:text-sidebar-foreground"}`}
              >
                <item.icon className="w-4 h-4" />
                <span className="flex-1">{item.label}</span>
                {item.badge != null && item.badge > 0 && (
                  <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </Link>
            );
          })}

          {/* Important People section */}
          <div className="mt-3">
            <button
              onClick={() => setImportantExpanded((v) => !v)}
              className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-sidebar-foreground/50 hover:text-sidebar-foreground/80 transition-colors rounded-md"
            >
              <span>Important People</span>
              {importantExpanded ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>

            {importantExpanded && (
              <div className="mt-1 flex flex-col gap-0.5">
                {importantPeople.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-sidebar-foreground/40 italic">
                    No contacts with messages yet
                  </div>
                ) : (
                  importantPeople.map((contact) => (
                    <button
                      key={contact.id}
                      onClick={() => handlePersonClick(contact)}
                      title={`View messages from ${contact.name}`}
                      className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-sidebar-accent/60 transition-colors text-left group"
                    >
                      <div className="relative flex-shrink-0">
                        <Avatar className="h-7 w-7 border border-sidebar-border/50">
                          <AvatarImage src={contact.avatarUrl || ""} />
                          <AvatarFallback className="text-[10px] font-semibold bg-primary/20 text-primary">
                            {contact.name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {contact.unreadCount > 0 && (
                          <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-0.5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none border border-sidebar">
                            {contact.unreadCount > 9 ? "9+" : contact.unreadCount}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate text-sidebar-foreground/90 group-hover:text-sidebar-foreground">
                          {contact.name}
                        </div>
                        {contact.phone && (
                          <div className="text-[10px] text-sidebar-foreground/50 flex items-center gap-1 truncate">
                            <Phone className="w-2.5 h-2.5 flex-shrink-0" />
                            {contact.phone}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                        {contact.unreadCount > 0 ? (
                          <Badge className="h-4 min-w-4 px-1 text-[10px] font-bold bg-red-500 text-white border-0 rounded-full leading-none flex items-center justify-center">
                            {contact.unreadCount}
                          </Badge>
                        ) : contact.messageCount > 0 ? (
                          <Badge className="h-4 min-w-4 px-1 text-[10px] font-bold bg-muted text-muted-foreground border-0 rounded-full leading-none flex items-center justify-center">
                            {contact.messageCount}
                          </Badge>
                        ) : null}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="mx-3 my-2 border-t border-sidebar-border/40" />

          {/* Bottom nav: Search, WhatsApp, Accounts */}
          {bottomNavItems.map((item) => {
            const isActive = location === item.href || (location.startsWith(item.href) && item.href !== "/");
            const isWhatsApp = item.href === "/whatsapp";
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium ${isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-sidebar-accent/50 text-sidebar-foreground/80 hover:text-sidebar-foreground"}`}
              >
                <div className="relative">
                  <item.icon className="w-4 h-4" />
                  {isWhatsApp && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-green-500 border border-sidebar animate-pulse" />
                  )}
                </div>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-sidebar-accent border border-sidebar-border flex items-center justify-center overflow-hidden">
              <span className="text-xs font-semibold">ME</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium">My Workspace</span>
              <span className="text-xs text-sidebar-foreground/60">Pro Plan</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-background">
        <main className="flex-1 overflow-auto relative">
          {children}
        </main>
      </div>

      <ComposeModal open={isComposeOpen} onOpenChange={setIsComposeOpen} />
      <PayModal open={isPayOpen} onOpenChange={setIsPayOpen} />
    </div>
  );
}
