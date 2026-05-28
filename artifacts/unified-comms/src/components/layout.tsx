import { Link, useLocation } from "wouter";
import { Mail, Users, Settings, LayoutDashboard, Brain, LogOut, HardDrive, Moon, Sun, SlidersHorizontal, CalendarDays, Crown } from "lucide-react";
import { Button } from "./ui/button";
import { ComposeModal } from "./compose-modal";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { useEffect, useState } from "react";
import { useUser, useClerk } from "@clerk/react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { getAuthHeaders } from "@/lib/api-client";
import { startUpgrade } from "@/lib/subscription";

const BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const signInPath = `${basePath}/sign-in`;

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "light";
    return window.localStorage.getItem("pinnboxio_theme") === "dark" ? "dark" : "light";
  });

  const { user } = useUser();
  const { signOut } = useClerk();
  const [isPro, setIsPro] = useState<boolean | null>(null);
  const [upgradeBusy, setUpgradeBusy] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem("pinnboxio_theme", theme);
  }, [theme]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`${BASE}/api/subscription/status`, { headers, credentials: "include" });
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!cancelled) setIsPro(data?.plan === "pro");
      } catch {
        if (!cancelled) setIsPro(null);
      }
    })();
    return () => { cancelled = true; };
  }, [location]);

  async function handleUpgradeClick() {
    setUpgradeBusy(true);
    try {
      await startUpgrade("annual");
    } catch (err: any) {
      alert(`Couldn't open checkout: ${err?.message || "Unknown error"}`);
    } finally {
      setUpgradeBusy(false);
    }
  }

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/inbox", label: "Inbox", icon: Mail },
    { href: "/calendar", label: "Calendar", icon: CalendarDays },
    { href: "/ai", label: "AI Assistant", icon: Brain },
    { href: "/contacts", label: "Contacts", icon: Users },
    { href: "/storage", label: "My Drive", icon: HardDrive },
  ];

  const bottomNavItems = [
    { href: "/accounts", label: "Accounts", icon: Settings },
    { href: "/settings", label: "Settings", icon: SlidersHorizontal },
  ];

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

        {/* Logo + theme toggle */}
        <div className="p-3 md:p-4 flex items-center gap-2 min-h-[56px]">
          <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-primary-foreground font-bold shadow-md flex-shrink-0 text-xs">
            PB
          </div>
          <span className="font-semibold text-lg tracking-tight hidden md:block flex-1">PinnboxIO</span>
          <button
            type="button"
            onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
            title={theme === "dark" ? "Day mode" : "Dark mode"}
            className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-sidebar-accent/60 transition-colors text-sidebar-foreground/50 hover:text-sidebar-foreground flex-shrink-0"
          >
            {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Action buttons */}
        <div className="px-2 md:px-4 py-2 flex flex-col gap-2">
          {/* Mobile: icon-only compose button */}
          <button
            onClick={() => setIsComposeOpen(true)}
            title="Compose"
            className="md:hidden w-8 h-8 mx-auto rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-sm hover:bg-primary/90 transition-colors"
          >
            <Mail className="w-4 h-4" />
          </button>
          {/* Desktop: full Compose button */}
          <Button
            onClick={() => setIsComposeOpen(true)}
            className="hidden md:flex w-full justify-start gap-2 shadow-sm font-medium"
            size="lg"
          >
            <Mail className="w-4 h-4" />
            Compose
          </Button>
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
                className={`flex items-center justify-center md:justify-start gap-3 px-2 md:px-3 py-2 rounded-md transition-colors text-sm font-medium relative ${isActive ? "bg-sidebar-primary/20 text-sidebar-primary" : "hover:bg-sidebar-accent/50 text-sidebar-foreground/80 hover:text-sidebar-foreground"}`}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                <span className="hidden md:block flex-1">{item.label}</span>
              </Link>
            );
          })}

          {/* Upgrade to Pro CTA (free users only) */}
          {isPro === false && (
            <button
              type="button"
              onClick={handleUpgradeClick}
              disabled={upgradeBusy}
              title="Upgrade to Pro"
              className="mt-1 flex items-center justify-center md:justify-start gap-2 px-2 md:px-3 py-2 rounded-md text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)", color: "white", boxShadow: "0 0 12px rgba(99,102,241,0.3)" }}
            >
              <Crown className="w-4 h-4 flex-shrink-0" />
              <span className="hidden md:block flex-1 text-left">Upgrade to Pro</span>
            </button>
          )}

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
                className={`flex items-center justify-center md:justify-start gap-3 px-2 md:px-3 py-2 rounded-md transition-colors text-sm font-medium ${isActive ? "bg-sidebar-primary/20 text-sidebar-primary" : "hover:bg-sidebar-accent/50 text-sidebar-foreground/80 hover:text-sidebar-foreground"}`}
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
        <main className="flex-1 overflow-auto relative min-h-0">
          {children}
        </main>
        <footer className="border-t border-border px-6 py-4 flex-shrink-0">
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
