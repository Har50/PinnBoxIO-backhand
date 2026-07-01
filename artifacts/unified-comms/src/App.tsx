import React, { useEffect, useRef, useState } from "react";
import { ThemeProvider, useTheme } from "@/lib/theme";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  ClerkProvider,
  SignIn,
  SignUp,
  Show,
  useClerk,
  useAuth,
} from "@clerk/react";
import { registerTokenGetter } from "@/lib/api-client";
import { brand } from "@workspace/brand";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import PrivacyPolicy from "@/pages/privacy";
import TermsOfService from "@/pages/terms";
import RefundsAndCancellations from "@/pages/refunds";
import CookiePolicy from "@/pages/cookies";
import ExpoConnect from "@/pages/expo-connect";
import { Redirect } from "wouter";
import { Layout } from "./components/layout";
import { Spinner } from "@/components/ui/spinner";
import LandingPage from "./pages/landing";
import Dashboard from "./pages/dashboard";
import Inbox from "./pages/inbox";
import Contacts from "./pages/contacts";
import Accounts from "./pages/accounts";
import AiPage from "./pages/ai";
import StoragePage from "./pages/storage";
import SettingsPage from "./pages/settings";
import CalendarPage from "./pages/calendar";
import PricingPage from "./pages/pricing";

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}


function buildClerkAppearance(isDark: boolean) {
  const bg = isDark ? brand.dark.background : brand.light.background;
  const surface = isDark ? brand.dark.surface : brand.light.card;
  const fg = isDark ? brand.dark.foreground : brand.light.foreground;
  const mutedFg = isDark ? brand.dark.foregroundMuted : brand.light.mutedForeground;
  const border = isDark ? brand.dark.border : brand.light.border;
  const muted = isDark ? brand.dark.surface : brand.light.muted;

  return {
    cssLayerName: "clerk",
    options: {
      logoPlacement: "inside" as const,
      logoLinkUrl: basePath || "/",
      logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
    },
    variables: {
      colorPrimary: brand.primary,
      colorForeground: fg,
      colorMutedForeground: mutedFg,
      colorDanger: brand.error.foreground,
      colorBackground: surface,
      colorInput: bg,
      colorInputForeground: fg,
      colorNeutral: border,
      fontFamily: "Inter, system-ui, sans-serif",
      borderRadius: "0.75rem",
    },
    elements: {
      rootBox: "flex justify-center w-full",
      cardBox: {
        className: "rounded-2xl w-[440px] max-w-full overflow-hidden shadow-lg",
        style: { backgroundColor: bg },
      },
      card: "!shadow-none !border-0 !bg-transparent !rounded-none",
      footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
      headerTitle: "font-bold",
      socialButtonsBlockButtonText: "font-medium",
      formFieldLabel: "font-medium",
      footerActionLink: "font-medium",
      formFieldSuccessText: { style: { color: brand.success } },
      logoBox: "flex items-center justify-center py-2",
      logoImage: "h-12 w-12",
      socialButtonsBlockButton: {
        className: "border",
        style: {
          borderColor: border,
          backgroundColor: bg,
        },
      },
      formButtonPrimary: { className: "clerk-btn-primary" },
      formFieldInput: {
        className: "border",
        style: {
          borderColor: border,
          backgroundColor: bg,
          color: fg,
        },
      },
      footerAction: {
        className: "border-t",
        style: {
          borderColor: border,
          backgroundColor: muted,
        },
      },
      dividerLine: { style: { backgroundColor: border } },
      alert: {
        className: "border",
        style: {
          borderColor: border,
          backgroundColor: muted,
        },
      },
      otpCodeFieldInput: {
        className: "border",
        style: {
          borderColor: border,
          backgroundColor: bg,
          color: fg,
        },
      },
    },
  };
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

function ClerkApiTokenSync() {
  const { getToken } = useAuth();
  useEffect(() => {
    registerTokenGetter(async () => {
      try { return await getToken(); } catch { return null; }
    });
    return () => registerTokenGetter(null);
  }, [getToken]);
  return null;
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

function AuthPageShell({ children }: { children: React.ReactNode }) {
  const { isDark } = useTheme();
  const shellStyle = isDark
    ? { backgroundColor: brand.dark.background, color: brand.dark.foreground }
    : undefined;
  return (
    <div
      data-testid="auth-page-shell"
      className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-8"
      style={shellStyle}
    >
      <div className="w-full max-w-[440px] mb-4">
        <a
          href={basePath || "/"}
          className="inline-flex items-center gap-1 text-sm auth-muted-link transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          ← Back to PinnboxIO
        </a>
      </div>
      {children}
      <div className="mt-6 flex flex-wrap justify-center gap-4 text-xs">
        <a href={`${basePath}/terms`} className="auth-muted-link transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">Terms</a>
        <a href={`${basePath}/privacy`} className="auth-muted-link transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">Privacy</a>
        <a href={`${basePath}/refunds`} className="auth-muted-link transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">Refunds</a>
        <a href={`${basePath}/cookies`} className="auth-muted-link transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">Cookies</a>
      </div>
    </div>
  );
}

function GoogleUnavailableNotice() {
  return (
    <div
      role="status"
      className="mb-4 max-w-[440px] w-full rounded-lg border border-amber-300/60 bg-amber-50 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200 px-3 py-2.5 text-xs leading-relaxed flex gap-2"
    >
      <span aria-hidden="true" className="mt-0.5">⚠️</span>
      <span>
        <strong className="font-semibold">Heads up:</strong> Google sign-in is temporarily unavailable while our Google account verification is in review. Please use email sign-in for now — we'll restore Google login as soon as verification is approved.
      </span>
    </div>
  );
}

function SignInPage() {
  return (
    <AuthPageShell>
      <GoogleUnavailableNotice />
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
      />
    </AuthPageShell>
  );
}

function SignUpPage() {
  return (
    <AuthPageShell>
      <GoogleUnavailableNotice />
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
      />
      <p className="mt-4 max-w-[440px] text-center text-xs text-muted-foreground leading-relaxed">
        By creating an account, you agree to our{" "}
        <a href={`${basePath}/terms`} className="underline hover:text-foreground">Terms of Service</a>{" "}
        and{" "}
        <a href={`${basePath}/privacy`} className="underline hover:text-foreground">Privacy Policy</a>.
      </p>
    </AuthPageShell>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/expo" component={ExpoConnect} />
      <Route path="/privacy" component={PrivacyPolicy} />
      <Route path="/terms" component={TermsOfService} />
      <Route path="/refunds" component={RefundsAndCancellations} />
      <Route path="/cookies" component={CookiePolicy} />
      <Route path="/pricing" component={PricingPage} />
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />
      <Route path="/login" component={Login} />
      <Route path="/">
        <Show when="loading">
          <div className="min-h-screen bg-background flex items-center justify-center">
            <Spinner className="size-8 text-primary" />
          </div>
        </Show>
        <Show when="signed-out">
          <LandingPage />
        </Show>
        <Show when="signed-in">
          <Redirect to={`${basePath}/dashboard`} />
        </Show>
      </Route>
      <Route>
        <Show when="loading">
          <div className="min-h-screen bg-background flex items-center justify-center">
            <Spinner className="size-8 text-primary" />
          </div>
        </Show>
        <Show when="signed-in">
          <Layout>
            <Switch>
              <Route path="/dashboard" component={Dashboard} />
              <Route path="/inbox" component={Inbox} />
              <Route path="/contacts" component={Contacts} />
              <Route path="/accounts" component={Accounts} />
              <Route path="/ai" component={AiPage} />
              <Route path="/storage" component={StoragePage} />
              <Route path="/settings" component={SettingsPage} />
              <Route path="/calendar" component={CalendarPage} />
              <Route component={NotFound} />
            </Switch>
          </Layout>
        </Show>
        <Show when="signed-out">
          <Redirect to={`${basePath}/sign-in`} />
        </Show>
      </Route>
    </Switch>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  const { isDark } = useTheme();
  const clerkAppearance = buildClerkAppearance(isDark);

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: "Welcome to PinnboxIO",
            subtitle: "Sign in to your unified communications hub",
          },
        },
        signUp: {
          start: {
            title: "Create your account",
            subtitle: "Join PinnboxIO for unified communications",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkApiTokenSync />
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <Router />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function BrandCssVars() {
  const { isDark } = useTheme();
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--brand-primary", brand.primary);
    root.style.setProperty("--brand-primary-hover", brand.primaryHover);
    root.style.setProperty("--brand-primary-foreground", brand.primaryForeground);
    root.style.setProperty("--brand-success", brand.success);
    if (isDark) {
      root.style.setProperty("--brand-border", brand.dark.border);
      root.style.setProperty("--brand-background", brand.dark.background);
      root.style.setProperty("--brand-muted", brand.dark.surface);
      root.style.setProperty("--brand-foreground", brand.dark.foreground);
      root.style.setProperty("--brand-foreground-muted", brand.dark.foregroundMuted);
      root.style.setProperty("--brand-foreground-subtle", brand.dark.foregroundSubtle);
    } else {
      root.style.setProperty("--brand-border", brand.light.border);
      root.style.setProperty("--brand-background", brand.light.background);
      root.style.setProperty("--brand-muted", brand.light.muted);
      root.style.setProperty("--brand-foreground", brand.light.foreground);
      root.style.setProperty("--brand-foreground-muted", brand.light.mutedForeground);
      root.style.setProperty("--brand-foreground-subtle", brand.light.foreground);
    }
  }, [isDark]);
  return null;
}

function App() {
  return (
    <ThemeProvider>
      <WouterRouter base={basePath}>
        <BrandCssVars />
        <ClerkProviderWithRoutes />
      </WouterRouter>
    </ThemeProvider>
  );
}

export default App;
