import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import { MusicProvider } from "@/contexts/music-context";

// Pages
import { Home } from "@/pages/home";
import { Roster } from "@/pages/roster";
import { NewCharacter } from "@/pages/new-character";
import { Fights } from "@/pages/fights";
import { Admin } from "@/pages/admin";
import { Suggest } from "@/pages/suggest";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Characters rarely change — cache for 5 min, keep in memory for 30
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      // Don't silently refetch every time the user alt-tabs back
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/roster" component={Roster} />
      <Route path="/new-character" component={NewCharacter} />
      <Route path="/fights" component={Fights} />
      <Route path="/suggest" component={Suggest} />
      <Route path="/admin" component={Admin} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <MusicProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Layout>
              <Router />
            </Layout>
          </WouterRouter>
          <Toaster />
        </MusicProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
