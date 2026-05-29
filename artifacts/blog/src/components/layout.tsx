import { Link, useLocation } from "wouter";
import { Bookmark, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useBookmarks } from "@/hooks/use-bookmarks";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { bookmarks } = useBookmarks();

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background selection:bg-primary selection:text-primary-foreground">
      <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-background/80 border-b border-border/40">
        <div className="container mx-auto px-4 md:px-8 max-w-5xl h-16 flex items-center justify-between">
          <Link href="/" className="font-semibold text-lg tracking-tight hover:opacity-80 transition-opacity">
            PinnboxIO <span className="text-muted-foreground font-normal">Blog</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <Link href="/" className={`hover:text-foreground transition-colors ${location === '/' ? 'text-foreground' : ''}`}>Latest</Link>
            <Link href="/about" className={`hover:text-foreground transition-colors ${location === '/about' ? 'text-foreground' : ''}`}>About</Link>
            <Link href="/bookmarks" className={`flex items-center gap-1.5 hover:text-foreground transition-colors ${location === '/bookmarks' ? 'text-foreground' : ''}`}>
              <Bookmark className="w-4 h-4" />
              Bookmarks
              {bookmarks.length > 0 && (
                <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded-full text-xs font-semibold">
                  {bookmarks.length}
                </span>
              )}
            </Link>
          </nav>

          {/* Mobile Nav Toggle */}
          <button 
            className="md:hidden p-2 -mr-2 text-foreground"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Nav */}
        {isMobileMenuOpen && (
          <nav className="md:hidden absolute top-16 left-0 w-full bg-background border-b border-border p-4 flex flex-col gap-4 text-sm font-medium animate-in slide-in-from-top-2">
            <Link href="/" className="p-2 hover:bg-muted rounded-md transition-colors">Latest</Link>
            <Link href="/about" className="p-2 hover:bg-muted rounded-md transition-colors">About</Link>
            <Link href="/bookmarks" className="p-2 flex items-center gap-2 hover:bg-muted rounded-md transition-colors">
              <Bookmark className="w-4 h-4" /> Bookmarks
            </Link>
          </nav>
        )}
      </header>

      <main className="flex-1">
        {children}
      </main>

      <footer className="border-t border-border mt-20 py-12 text-center text-muted-foreground text-sm">
        <div className="container mx-auto px-4">
          <p>© {new Date().getFullYear()} PinnboxIO. All rights reserved.</p>
          <div className="mt-4 flex justify-center gap-4">
            <Link href="/about" className="hover:text-foreground transition-colors">About</Link>
            <a href="https://pinnboxio.com" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">Product</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
