import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import Home from "@/pages/home";
import Post from "@/pages/post";
import Category from "@/pages/category";
import About from "@/pages/about";
import Bookmarks from "@/pages/bookmarks";
import NotFound from "@/pages/not-found";

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        staleTime: 1000 * 60 * 5, // 5 mins
      },
    },
  });
}

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export function Routes() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/about" component={About} />
      <Route path="/bookmarks" component={Bookmarks} />
      <Route path="/category/:tag" component={Category} />
      <Route path="/:slug" component={Post} />
      <Route component={NotFound} />
    </Switch>
  );
}

const sharedQueryClient = createQueryClient();

interface AppProps {
  queryClient?: QueryClient;
  helmetContext?: object;
  ssrPath?: string;
}

function App({ queryClient, helmetContext, ssrPath }: AppProps = {}) {
  const client = queryClient ?? sharedQueryClient;
  return (
    <HelmetProvider context={helmetContext}>
      <QueryClientProvider client={client}>
        <TooltipProvider>
          <WouterRouter base={BASE} ssrPath={ssrPath}>
            <Routes />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export { App };
export default App;
