import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@workspace/replit-auth-web";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import PrivacyPolicy from "@/pages/privacy";
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
import TermsOfService from "./pages/terms";
import RefundsAndCancellations from "./pages/refunds";
import CookiePolicy from "./pages/cookies";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  const { isLoading, isAuthenticated } = useAuth();

  return (
    <Switch>
      <Route path="/privacy" component={PrivacyPolicy} />
      <Route path="/terms" component={TermsOfService} />
      <Route path="/refunds" component={RefundsAndCancellations} />
      <Route path="/cookies" component={CookiePolicy} />
      <Route>
        {isLoading ? (
          <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shadow-md">
                <span className="text-lg font-bold text-primary-foreground">UC</span>
              </div>
              <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          </div>
        ) : !isAuthenticated ? (
          <Login />
        ) : (
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
        )}
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
