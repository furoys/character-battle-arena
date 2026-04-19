import { useState } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import { IntroScreen } from "@/components/intro-screen";

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
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
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

function AppInner() {
  // Only show the intro once per session
  const [showIntro, setShowIntro] = useState(
    () => sessionStorage.getItem("ava_intro_played") !== "1"
  );

  const handleIntroDone = () => {
    sessionStorage.setItem("ava_intro_played", "1");
    setShowIntro(false);
  };

  return (
    <>
      {showIntro && <IntroScreen onDone={handleIntroDone} />}
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Layout>
            <Router />
          </Layout>
          <Toaster />
        </WouterRouter>
      </TooltipProvider>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppInner />
    </QueryClientProvider>
  );
}

export default App;
