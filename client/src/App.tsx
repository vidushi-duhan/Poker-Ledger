import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BottomNav } from "@/components/bottom-nav";
import HomePage from "@/pages/home";
import ActiveGamePage from "@/pages/active-game";
import LedgerPage from "@/pages/ledger";
import HistoryPage from "@/pages/history";
import NewGamePage from "@/pages/new-game";
import SettlePage from "@/pages/settle";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/game" component={ActiveGamePage} />
      <Route path="/ledger" component={LedgerPage} />
      <Route path="/history" component={HistoryPage} />
      <Route path="/new-game" component={NewGamePage} />
      <Route path="/settle" component={SettlePage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen bg-background">
          <Router />
          <BottomNav />
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
