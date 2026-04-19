import { useAuth } from "@workspace/replit-auth-web";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Login() {
  const { login } = useAuth();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
            <span className="text-2xl font-bold text-primary-foreground">PI</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">PinnboxIO</h1>
            <p className="text-muted-foreground mt-1 text-sm">Unified Communications for your team</p>
          </div>
        </div>

        <div className="border rounded-2xl p-8 space-y-6 bg-card shadow-sm">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Sign in to continue</h2>
            <p className="text-sm text-muted-foreground">
              Sign in to access your inbox, contacts, and workspace.
            </p>
          </div>

          <Button onClick={login} size="lg" className="w-full gap-2 font-medium">
            Sign in with Replit
          </Button>

          <p className="text-xs text-muted-foreground">
            By signing in you agree to our{" "}
            <a href="/terms" className="underline hover:text-foreground">Terms of Service</a>
            {" "}and{" "}
            <a href="/privacy" className="underline hover:text-foreground">Privacy Policy</a>.
          </p>
        </div>

        <div className="flex items-center justify-center gap-5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />
            WhatsApp
          </span>
          <span>Email</span>
          <span>Contacts</span>
          <span>Search</span>
        </div>

        <div className="flex items-center justify-center flex-wrap gap-4 text-xs text-muted-foreground pt-2">
          <a href="/terms" className="hover:text-foreground transition-colors">Terms</a>
          <a href="/privacy" className="hover:text-foreground transition-colors">Privacy</a>
          <a href="/refunds" className="hover:text-foreground transition-colors">Refunds</a>
          <a href="/cookies" className="hover:text-foreground transition-colors">Cookies</a>
        </div>
      </div>
    </div>
  );
}
