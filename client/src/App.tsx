import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
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
import { Wifi, WifiOff } from "lucide-react";

function ConnectionStatus() {
  const { isError, isLoading } = useQuery({
    queryKey: ["/api/health"],
    refetchInterval: 5000,
    retry: true,
  });

  if (isLoading) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/80 backdrop-blur border text-xs font-medium shadow-sm transition-all animate-in fade-in slide-in-from-top-2">
      {isError ? (
        <>
          <WifiOff className="w-3.5 h-3.5 text-destructive" />
          <span className="text-destructive">Disconnected</span>
        </>
      ) : (
        <>
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <Wifi className="w-3.5 h-3.5 text-emerald-500" />
          <span className="text-muted-foreground">Connected</span>
        </>
      )}
    </div>
  );
}

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
        <div className="min-h-screen bg-background relative">
          <ConnectionStatus />
          <Router />
          <BottomNav />
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
