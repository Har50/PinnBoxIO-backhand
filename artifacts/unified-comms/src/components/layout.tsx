import { Link, useLocation } from "wouter";
import { Mail, Search, Users, Settings, MessageCircle, PenSquare, LayoutDashboard } from "lucide-react";
import { Button } from "./ui/button";
import { ComposeModal } from "./compose-modal";
import { useState } from "react";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isComposeOpen, setIsComposeOpen] = useState(false);

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/inbox", label: "Inbox", icon: Mail },
    { href: "/contacts", label: "Contacts", icon: Users },
    { href: "/search", label: "Search", icon: Search },
    { href: "/whatsapp", label: "WhatsApp", icon: MessageCircle },
    { href: "/accounts", label: "Accounts", icon: Settings },
  ];

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
        
        <div className="px-4 py-2">
          <Button onClick={() => setIsComposeOpen(true)} className="w-full justify-start gap-2 shadow-sm font-medium" size="lg">
            <PenSquare className="w-4 h-4" />
            Compose
          </Button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = location === item.href || (location.startsWith(item.href) && item.href !== "/");
            return (
              <Link key={item.href} href={item.href} className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium ${isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-sidebar-accent/50 text-sidebar-foreground/80 hover:text-sidebar-foreground"}`}>
                <item.icon className="w-4 h-4" />
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
    </div>
  );
}
