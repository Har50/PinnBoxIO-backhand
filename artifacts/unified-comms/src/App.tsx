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
} from "@clerk/react";
import NotFound from "@/pages/not-found";
import PrivacyPolicy from "@/pages/privacy";
import TermsOfService from "@/pages/terms";
import RefundsAndCancellations from "@/pages/refunds";
import CookiePolicy from "@/pages/cookies";
import LandingPage, { AuthHeroPanel } from "@/pages/landing";
import { Layout } from "./components/layout";
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
    colorPrimary: "#3b82f6",
    colorForeground: "#f1f5f9",
    colorMutedForeground: "#94a3b8",
    colorDanger: "hsl(0 72% 51%)",
    colorBackground: "#1e293b",
    colorInput: "#0f172a",
    colorInputForeground: "#f1f5f9",
    colorNeutral: "#334155",
    fontFamily: "Inter, system-ui, sans-serif",
    borderRadius: "0.75rem",
  },
  elements: {
    rootBox: "w-full",
    cardBox: "rounded-2xl w-[440px] max-w-full overflow-hidden shadow-xl",
    card: "!shadow-none !border-0 !rounded-none",
    footer: "!shadow-none !border-0 !rounded-none",
    headerTitle: "font-bold",
    socialButtonsBlockButtonText: "font-medium",
    formFieldLabel: "font-medium",
    logoBox: "flex items-center justify-center py-2",
    logoImage: "h-12 w-12",
    formButtonPrimary: "bg-blue-500 hover:bg-blue-600 text-white",
    footerAction: "border-t border-slate-700",
    dividerLine: "bg-slate-600",
    formFieldRow: "",
    main: "",
  },
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

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
    <div
      className="min-h-screen w-full flex items-center justify-center px-6 py-12"
      style={{ backgroundColor: "#0f172a" }}
    >
      <div className="w-full max-w-5xl flex flex-col md:flex-row items-center gap-12 md:gap-16">
        <AuthHeroPanel />

        <div
          style={{
            width: 1,
            alignSelf: "stretch",
            backgroundColor: "#1e293b",
          }}
          className="hidden md:block"
        />

        <div className="flex flex-col items-center gap-6 w-full md:w-auto">
          {children}
          <div className="flex flex-wrap justify-center gap-4 text-xs" style={{ color: "#64748b" }}>
            <a href={`${basePath}/terms`} className="hover:text-slate-300 transition-colors">Terms</a>
            <a href={`${basePath}/privacy`} className="hover:text-slate-300 transition-colors">Privacy</a>
            <a href={`${basePath}/refunds`} className="hover:text-slate-300 transition-colors">Refunds</a>
            <a href={`${basePath}/cookies`} className="hover:text-slate-300 transition-colors">Cookies</a>
          </div>
        </div>
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
      <Route>
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
          <LandingPage />
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
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <Router />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
