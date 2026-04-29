import { Link, useLocation } from "wouter";
import { Mail, Search, Users, Settings, PenSquare, LayoutDashboard, ChevronDown, ChevronRight, Sparkles, LogOut, HardDrive, Moon, Sun, SlidersHorizontal } from "lucide-react";
import { Button } from "./ui/button";
import { ComposeModal } from "./compose-modal";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { useEffect, useState } from "react";
import { useGetContacts, useGetOverviewStats } from "@workspace/api-client-react";
import { useUser, useClerk } from "@clerk/react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const signInPath = `${basePath}/sign-in`;

export function Layout({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [importantExpanded, setImportantExpanded] = useState(true);
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "light";
    return window.localStorage.getItem("pinnboxio_theme") === "dark" ? "dark" : "light";
  });

  const { data: allContacts } = useGetContacts({});
  const { data: stats } = useGetOverviewStats();
  const { user } = useUser();
  const { signOut } = useClerk();

  const importantPeople = allContacts
    ? [...allContacts]
        .sort((a, b) => b.messageCount - a.messageCount)
        .filter((c) => c.messageCount > 0)
        .slice(0, 5)
    : [];

  const totalUnread = stats?.totalUnread ?? 0;

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem("pinnboxio_theme", theme);
  }, [theme]);

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/inbox", label: "Inbox", icon: Mail, badge: totalUnread },
    { href: "/ai", label: "AI Assistant", icon: Sparkles },
    { href: "/contacts", label: "Contacts", icon: Users },
    { href: "/storage", label: "My Drive", icon: HardDrive },
  ];

  const bottomNavItems = [
    { href: "/search", label: "Search", icon: Search },
    { href: "/accounts", label: "Accounts", icon: Settings },
    { href: "/settings", label: "Settings", icon: SlidersHorizontal },
  ];

  function handlePersonClick(contact: { email: string; name: string }) {
    navigate(`/search?q=${encodeURIComponent(contact.email)}`);
  }

  const userEmail = user?.primaryEmailAddress?.emailAddress ?? "";
  const userFirstName = user?.firstName ?? "";
  const userLastName = user?.lastName ?? "";
  const userImage = user?.imageUrl ?? "";
  const userDisplayName = userFirstName && userLastName
    ? `${userFirstName} ${userLastName}`
    : userEmail || "My Workspace";

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar — slim (52px) on mobile, full (256px) on md+ */}
      <div className="w-[52px] md:w-64 flex-shrink-0 border-r bg-sidebar text-sidebar-foreground flex flex-col transition-all duration-200">

        {/* Logo */}
        <div className="p-3 md:p-4 flex items-center gap-3 min-h-[56px]">
          <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-primary-foreground font-bold shadow-md flex-shrink-0 text-xs">
            PB
          </div>
          <span className="font-semibold text-lg tracking-tight hidden md:block">PinnboxIO</span>
        </div>

        {/* Action buttons */}
        <div className="px-2 md:px-4 py-2 flex flex-col gap-2">
          {/* Mobile: icon-only compose button */}
          <button
            onClick={() => setIsComposeOpen(true)}
            title="Compose"
            className="md:hidden w-8 h-8 mx-auto rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-sm hover:bg-primary/90 transition-colors"
          >
            <PenSquare className="w-4 h-4" />
          </button>
          {/* Desktop: full Compose button */}
          <Button
            onClick={() => setIsComposeOpen(true)}
            className="hidden md:flex w-full justify-start gap-2 shadow-sm font-medium"
            size="lg"
          >
            <PenSquare className="w-4 h-4" />
            Compose
          </Button>

          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
            className="hidden md:flex w-full justify-start gap-2 font-medium"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {theme === "dark" ? "Day mode" : "Dark mode"}
          </Button>
          <button
            type="button"
            onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
            title={theme === "dark" ? "Day mode" : "Dark mode"}
            className="md:hidden w-8 h-8 mx-auto rounded-full border border-sidebar-border text-sidebar-foreground/80 flex items-center justify-center hover:bg-sidebar-accent transition-colors"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-1.5 md:px-3 flex flex-col gap-0.5">
          {/* Primary nav items */}
          {navItems.map((item) => {
            const isActive = location === item.href || (location.startsWith(item.href) && item.href !== "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={`flex items-center justify-center md:justify-start gap-3 px-2 md:px-3 py-2 rounded-md transition-colors text-sm font-medium relative ${isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-sidebar-accent/50 text-sidebar-foreground/80 hover:text-sidebar-foreground"}`}
              >
                <div className="relative flex-shrink-0">
                  <item.icon className="w-4 h-4" />
                  {/* Mobile-only badge dot */}
                  {item.badge != null && item.badge > 0 && (
                    <span className="md:hidden absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500 border border-sidebar" />
                  )}
                </div>
                <span className="hidden md:block flex-1">{item.label}</span>
                {/* Desktop badge count */}
                {item.badge != null && item.badge > 0 && (
                  <span className="hidden md:flex min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold items-center justify-center leading-none">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </Link>
            );
          })}

          {/* Important People — desktop only */}
          <div className="mt-3 hidden md:block">
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
          <div className="mx-1.5 md:mx-3 my-2 border-t border-sidebar-border/40" />

          {/* Secondary nav items */}
          {bottomNavItems.map((item) => {
            const isActive = location === item.href || (location.startsWith(item.href) && item.href !== "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={`flex items-center justify-center md:justify-start gap-3 px-2 md:px-3 py-2 rounded-md transition-colors text-sm font-medium ${isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-sidebar-accent/50 text-sidebar-foreground/80 hover:text-sidebar-foreground"}`}
              >
                <div className="relative flex-shrink-0">
                  <item.icon className="w-4 h-4" />
                </div>
                <span className="hidden md:block">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="p-2 md:p-4 border-t border-sidebar-border">
          {/* Mobile: avatar only with sign-out on tap */}
          <div className="md:hidden flex justify-center">
            <button
              onClick={() => setShowSignOutDialog(true)}
              title="Sign out"
              className="relative group"
            >
              <Avatar className="w-8 h-8 border border-sidebar-border">
                <AvatarImage src={userImage} />
                <AvatarFallback className="text-xs font-semibold bg-primary/20 text-primary">
                  {userFirstName?.[0]}{userLastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-sidebar-border hidden group-hover:flex items-center justify-center">
                <LogOut className="w-2.5 h-2.5 text-sidebar-foreground/60" />
              </span>
            </button>
          </div>

          {/* Desktop: full user row */}
          <div className="hidden md:flex items-center gap-3 px-2 py-2 rounded-md hover:bg-sidebar-accent/40 transition-colors group">
            <Avatar className="w-8 h-8 border border-sidebar-border flex-shrink-0">
              <AvatarImage src={userImage} />
              <AvatarFallback className="text-xs font-semibold bg-primary/20 text-primary">
                {userFirstName?.[0]}{userLastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">
                {userDisplayName}
              </div>
              <div className="text-xs text-sidebar-foreground/60 truncate">
                {userEmail}
              </div>
            </div>
            <button
              onClick={() => setShowSignOutDialog(true)}
              title="Sign out"
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-sidebar-accent text-sidebar-foreground/60 hover:text-sidebar-foreground"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-background">
        <main className="flex-1 overflow-auto relative">
          {children}
          <footer className="border-t border-border px-6 py-4 mt-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} PinnboxIO. All rights reserved.</p>
              <nav className="flex flex-wrap items-center gap-4">
                {[
                  { href: "/privacy", label: "Privacy Policy" },
                  { href: "/terms", label: "Terms of Service" },
                  { href: "/refunds", label: "Refunds & Cancellations" },
                  { href: "/cookies", label: "Cookie Policy" },
                ].map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {item.label}
                  </a>
                ))}
              </nav>
            </div>
          </footer>
        </main>
      </div>

      <ComposeModal open={isComposeOpen} onOpenChange={setIsComposeOpen} />

      <Dialog open={showSignOutDialog} onOpenChange={setShowSignOutDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Sign out of PinnboxIO?</DialogTitle>
            <DialogDescription>
              You will be redirected to the sign-in page.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowSignOutDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setShowSignOutDialog(false);
                signOut({ redirectUrl: signInPath });
              }}
            >
              Sign out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
