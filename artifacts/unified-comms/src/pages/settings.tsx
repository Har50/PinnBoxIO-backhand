import { useState, useEffect } from "react";
import { useUser, useClerk } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  User,
  Bell,
  Palette,
  Link2,
  Shield,
  LogOut,
  Moon,
  Sun,
  Mail,
  ChevronRight,
  ExternalLink,
  Star,
  Crown,
  Zap,
  HardDrive,
} from "lucide-react";
import { Link } from "wouter";
import {
  useGetAccounts,
  useGetUserPreferences,
  useUpdateUserPreferences,
  getGetUserPreferencesQueryKey,
} from "@workspace/api-client-react";
import { getAuthHeaders } from "@/lib/api-client";

const BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

interface SubscriptionStatus {
  plan: "free" | "pro";
  renewsAt: string | null;
  cancelAtPeriodEnd: boolean;
  billingCycle: "monthly" | "annual" | null;
  currency: string | null;
  queriesLimit: number | null;
  storageUsedBytes: number;
  storageTotalBytes: number;
}

function useSubscriptionStatus() {
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`${BASE}/api/subscription/status`, { headers, credentials: "include" });
        if (!res.ok) throw new Error("Failed");
        const data: SubscriptionStatus = await res.json();
        if (!cancelled) setStatus(data);
      } catch {
        if (!cancelled) setStatus(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { status, loading, refetch: () => setLoading(true) };
}

async function startUpgrade(): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BASE}/api/subscription/create-order`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ planKey: "pro_monthly", currency: "inr" }),
  });
  if (!res.ok) throw new Error("Could not create order");
  const { checkoutUrl } = await res.json();
  if (checkoutUrl) window.open(checkoutUrl, "_blank", "noopener");
}

function useTheme() {
  const [theme, setThemeState] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "light";
    return window.localStorage.getItem("pinnboxio_theme") === "dark" ? "dark" : "light";
  });

  const setTheme = (t: "light" | "dark") => {
    setThemeState(t);
    document.documentElement.classList.toggle("dark", t === "dark");
    window.localStorage.setItem("pinnboxio_theme", t);
  };

  return { theme, setTheme };
}

function useNotificationPrefs() {
  const queryClient = useQueryClient();
  const { data: serverPrefs } = useGetUserPreferences();
  const { mutate: updatePrefs } = useUpdateUserPreferences();

  const prefs: Record<string, boolean> = {
    emailSummary: serverPrefs?.emailSummary ?? true,
    importantMessages: serverPrefs?.importantMessages ?? true,
    weeklyDigest: serverPrefs?.weeklyDigest ?? false,
  };

  const toggle = (key: string) => {
    const next = { ...prefs, [key]: !prefs[key] };
    queryClient.setQueryData(getGetUserPreferencesQueryKey(), next);
    updatePrefs(
      { data: { [key]: next[key] } },
      {
        onSuccess: (updated) => {
          queryClient.setQueryData(getGetUserPreferencesQueryKey(), updated);
        },
        onError: () => {
          queryClient.invalidateQueries({ queryKey: getGetUserPreferencesQueryKey() });
        },
      },
    );
  };

  return { prefs, toggle };
}

export default function SettingsPage() {
  const { user } = useUser();
  const { signOut, openUserProfile } = useClerk();
  const { theme, setTheme } = useTheme();
  const { prefs, toggle } = useNotificationPrefs();
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);
  const [upgrading, setUpgrading] = useState(false);

  const { data: accounts } = useGetAccounts();
  const { status: subStatus, loading: subLoading } = useSubscriptionStatus();

  const isPro = subStatus?.plan === "pro";

  const renewsAtDate = subStatus?.renewsAt ? new Date(subStatus.renewsAt) : null;
  const renewsLabel = renewsAtDate
    ? renewsAtDate.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
    : null;

  async function handleUpgrade() {
    setUpgrading(true);
    try {
      await startUpgrade();
    } catch {
      // silent — checkout page failed to open
    } finally {
      setUpgrading(false);
    }
  }

  const userEmail = user?.primaryEmailAddress?.emailAddress ?? "";
  const userFirstName = user?.firstName ?? "";
  const userLastName = user?.lastName ?? "";
  const userImage = user?.imageUrl ?? "";
  const userDisplayName =
    userFirstName && userLastName
      ? `${userFirstName} ${userLastName}`
      : userEmail || "My Workspace";
  const initials =
    userFirstName && userLastName
      ? `${userFirstName[0]}${userLastName[0]}`
      : userEmail.slice(0, 2).toUpperCase() || "U";

  const emailAccounts = accounts?.filter((a) => a.type === "email") ?? [];

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-background">
      <div className="px-4 sm:px-8 py-5 border-b flex items-center gap-3 bg-background sticky top-0 z-10">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Shield className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h1 className="font-semibold text-foreground text-base">Settings</h1>
          <p className="text-xs text-muted-foreground">Manage your account and preferences</p>
        </div>
      </div>

      <div className="flex-1 p-4 sm:p-8 flex flex-col gap-6 max-w-2xl w-full mx-auto">

        {/* Profile */}
        <Card data-testid="section-profile">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-sm font-semibold">Profile</CardTitle>
            </div>
            <CardDescription className="text-xs">Your account identity across PinnboxIO</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Avatar className="w-14 h-14 shrink-0">
                <AvatarImage src={userImage} alt={userDisplayName} />
                <AvatarFallback className="text-base font-semibold bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate">{userDisplayName}</p>
                <p className="text-sm text-muted-foreground truncate">{userEmail}</p>
                {user?.publicMetadata?.plan && (
                  <Badge variant="secondary" className="mt-1 text-xs">
                    {String(user.publicMetadata.plan)}
                  </Badge>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => openUserProfile()}
              >
                Edit
                <ExternalLink className="w-3 h-3 ml-1.5" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Subscription */}
        <Card data-testid="section-subscription">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-sm font-semibold">Subscription</CardTitle>
            </div>
            <CardDescription className="text-xs">Your current plan and billing</CardDescription>
          </CardHeader>
          <CardContent>
            {subLoading ? (
              <div className="h-14 rounded-lg bg-muted/40 animate-pulse" />
            ) : isPro ? (
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}>
                  <Crown className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">Pro Plan</p>
                    <Badge className="text-xs bg-indigo-500/15 text-indigo-500 border-indigo-500/20 hover:bg-indigo-500/20">
                      Active
                    </Badge>
                    {subStatus?.cancelAtPeriodEnd && (
                      <Badge variant="outline" className="text-xs text-muted-foreground">
                        Cancels at period end
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {subStatus?.billingCycle === "annual" ? "Annual billing" : "Monthly billing"}
                    {renewsLabel && !subStatus?.cancelAtPeriodEnd && ` · renews ${renewsLabel}`}
                    {renewsLabel && subStatus?.cancelAtPeriodEnd && ` · access until ${renewsLabel}`}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => window.open(`${BASE}/api/subscription/portal`, "_blank", "noopener")}
                >
                  Manage
                  <ExternalLink className="w-3 h-3 ml-1.5" />
                </Button>
              </div>
            ) : (
              <button
                data-testid="btn-upgrade-pro"
                disabled={upgrading}
                onClick={handleUpgrade}
                className="w-full flex items-center gap-4 rounded-xl px-4 py-3.5 text-left transition-opacity hover:opacity-90 disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)", color: "white" }}
              >
                <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <Star className="w-4 h-4 text-white" fill="currentColor" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-white">Upgrade to Pro</p>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    <span className="flex items-center gap-1 text-xs text-indigo-200">
                      <Zap className="w-3 h-3" />Unlimited AI
                    </span>
                    <span className="flex items-center gap-1 text-xs text-indigo-200">
                      <HardDrive className="w-3 h-3" />25 GB storage
                    </span>
                    <span className="text-xs text-indigo-200">$7.99/mo</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-indigo-200 shrink-0" />
              </button>
            )}
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card data-testid="section-appearance">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-sm font-semibold">Appearance</CardTitle>
            </div>
            <CardDescription className="text-xs">Customize how PinnboxIO looks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {theme === "dark" ? (
                  <Moon className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <Sun className="w-4 h-4 text-muted-foreground" />
                )}
                <div>
                  <Label className="text-sm font-medium">Dark mode</Label>
                  <p className="text-xs text-muted-foreground">
                    {theme === "dark" ? "Dark theme is on" : "Light theme is on"}
                  </p>
                </div>
              </div>
              <Switch
                data-testid="toggle-dark-mode"
                aria-label="Dark mode"
                checked={theme === "dark"}
                onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card data-testid="section-notifications">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-sm font-semibold">Notifications</CardTitle>
            </div>
            <CardDescription className="text-xs">Choose what you want to be notified about</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Daily email summary</Label>
                <p className="text-xs text-muted-foreground">Receive a morning digest of your inbox activity</p>
              </div>
              <Switch
                data-testid="switch-email-summary"
                aria-label="Daily email summary"
                checked={prefs.emailSummary}
                onCheckedChange={() => toggle("emailSummary")}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Important message alerts</Label>
                <p className="text-xs text-muted-foreground">Get notified when high-priority messages arrive</p>
              </div>
              <Switch
                data-testid="switch-important-messages"
                aria-label="Important message alerts"
                checked={prefs.importantMessages}
                onCheckedChange={() => toggle("importantMessages")}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Weekly digest</Label>
                <p className="text-xs text-muted-foreground">A weekly summary of your communication trends</p>
              </div>
              <Switch
                data-testid="switch-weekly-digest"
                aria-label="Weekly digest"
                checked={prefs.weeklyDigest}
                onCheckedChange={() => toggle("weeklyDigest")}
              />
            </div>
          </CardContent>
        </Card>

        {/* Integrations */}
        <Card data-testid="section-connected-accounts">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Link2 className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-sm font-semibold">Connected accounts</CardTitle>
            </div>
            <CardDescription className="text-xs">Services linked to your PinnboxIO workspace</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center gap-3 py-1">
              <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/30 flex items-center justify-center shrink-0">
                <Mail className="w-4 h-4 text-red-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">Email accounts</p>
                <p className="text-xs text-muted-foreground">
                  {emailAccounts.length > 0
                    ? `${emailAccounts.length} account${emailAccounts.length > 1 ? "s" : ""} connected`
                    : "No accounts connected"}
                </p>
              </div>
              {emailAccounts.length > 0 && (
                <Badge variant="secondary" className="text-xs shrink-0">
                  {emailAccounts.length}
                </Badge>
              )}
            </div>

            <div className="mt-1">
              <Link href={`${BASE}/accounts`}>
                <Button data-testid="btn-manage-accounts" variant="outline" size="sm" className="w-full gap-2">
                  Manage connected accounts
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Account & Security */}
        <Card data-testid="section-account-security">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-sm font-semibold">Account &amp; security</CardTitle>
            </div>
            <CardDescription className="text-xs">Manage your session and account security</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center justify-between py-1">
              <div>
                <p className="text-sm font-medium text-foreground">Password &amp; security</p>
                <p className="text-xs text-muted-foreground">Update password, 2FA, and security settings</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => openUserProfile()}
              >
                Manage
                <ExternalLink className="w-3 h-3 ml-1.5" />
              </Button>
            </div>
            <Separator />
            <div className="flex items-center justify-between py-1">
              <div>
                <p className="text-sm font-medium text-foreground">Sign out</p>
                <p className="text-xs text-muted-foreground">Sign out of your PinnboxIO account</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setShowSignOutDialog(true)}
              >
                <LogOut className="w-3.5 h-3.5 mr-1.5" />
                Sign out
              </Button>
            </div>
          </CardContent>
        </Card>

      </div>

      <Dialog open={showSignOutDialog} onOpenChange={setShowSignOutDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign out</DialogTitle>
            <DialogDescription>
              Are you sure you want to sign out of PinnboxIO?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSignOutDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => signOut({ redirectUrl: `${BASE}/sign-in` })}
            >
              Sign out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
