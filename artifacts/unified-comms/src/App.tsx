import React, { useEffect, useRef } from "react";
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
import { Redirect } from "wouter";
import { Layout } from "./components/layout";
import LandingPage from "./pages/landing";
import Dashboard from "./pages/dashboard";
import Inbox from "./pages/inbox";
import Contacts from "./pages/contacts";
import SearchPage from "./pages/search";
import Accounts from "./pages/accounts";
import WhatsApp from "./pages/whatsapp";
import LinkedInPage from "./pages/linkedin";
import AiPage from "./pages/ai";
import StoragePage from "./pages/storage";

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

const clerkAppearance = {
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: brand.primary,
    colorForeground: brand.light.foreground,
    colorMutedForeground: brand.light.mutedForeground,
    colorDanger: brand.error.foreground,
    colorBackground: brand.light.card,
    colorInput: brand.light.background,
    colorInputForeground: brand.light.foreground,
    colorNeutral: brand.light.border,
    fontFamily: "Inter, system-ui, sans-serif",
    borderRadius: "0.75rem",
  },
  elements: {
    rootBox: "flex justify-center w-full",
    cardBox: {
      className: "rounded-2xl w-[440px] max-w-full overflow-hidden shadow-lg",
      style: { backgroundColor: brand.light.background },
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
        borderColor: brand.light.border,
        backgroundColor: brand.light.background,
      },
    },
    formButtonPrimary: { className: "clerk-btn-primary" },
    formFieldInput: {
      className: "border",
      style: {
        borderColor: brand.light.border,
        backgroundColor: brand.light.background,
        color: brand.light.foreground,
      },
    },
    footerAction: {
      className: "border-t",
      style: {
        borderColor: brand.light.border,
        backgroundColor: brand.light.muted,
      },
    },
    dividerLine: { style: { backgroundColor: brand.light.border } },
    alert: {
      className: "border",
      style: {
        borderColor: brand.light.border,
        backgroundColor: brand.light.muted,
      },
    },
    otpCodeFieldInput: {
      className: "border",
      style: {
        borderColor: brand.light.border,
        backgroundColor: brand.light.background,
        color: brand.light.foreground,
      },
    },
  },
};

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
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-[440px] mb-4">
        <a
          href={basePath || "/"}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          ← Back to PinnboxIO
        </a>
      </div>
      {children}
      <div className="mt-6 flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
        <a href={`${basePath}/terms`} className="hover:text-foreground transition-colors">Terms</a>
        <a href={`${basePath}/privacy`} className="hover:text-foreground transition-colors">Privacy</a>
        <a href={`${basePath}/refunds`} className="hover:text-foreground transition-colors">Refunds</a>
        <a href={`${basePath}/cookies`} className="hover:text-foreground transition-colors">Cookies</a>
      </div>
    </div>
  );
}

function SignInPage() {
  return (
    <AuthPageShell>
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
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
      />
    </AuthPageShell>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/privacy" component={PrivacyPolicy} />
      <Route path="/terms" component={TermsOfService} />
      <Route path="/refunds" component={RefundsAndCancellations} />
      <Route path="/cookies" component={CookiePolicy} />
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />
      <Route path="/login" component={Login} />
      <Route path="/">
        <Show when="loading">
          <div className="min-h-screen bg-background" />
        </Show>
        <Show when="signed-out">
          <LandingPage />
        </Show>
        <Show when="signed-in">
          <Layout>
            <Dashboard />
          </Layout>
        </Show>
      </Route>
      <Route>
        <Show when="loading">
          <div className="min-h-screen bg-background" />
        </Show>
        <Show when="signed-in">
          <Layout>
            <Switch>
              <Route path="/" component={Dashboard} />
              <Route path="/inbox" component={Inbox} />
              <Route path="/contacts" component={Contacts} />
              <Route path="/search" component={SearchPage} />
              <Route path="/accounts" component={Accounts} />
              <Route path="/whatsapp" component={WhatsApp} />
              <Route path="/linkedin" component={LinkedInPage} />
              <Route path="/ai" component={AiPage} />
              <Route path="/storage" component={StoragePage} />
              <Route path="/settings" component={AiPage} />
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

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
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
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--brand-primary", brand.primary);
    root.style.setProperty("--brand-primary-hover", brand.primaryHover);
    root.style.setProperty("--brand-primary-foreground", brand.primaryForeground);
    root.style.setProperty("--brand-border", brand.light.border);
    root.style.setProperty("--brand-background", brand.light.background);
    root.style.setProperty("--brand-muted", brand.light.muted);
    root.style.setProperty("--brand-foreground", brand.light.foreground);
    root.style.setProperty("--brand-success", brand.success);
  }, []);
  return null;
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <BrandCssVars />
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
