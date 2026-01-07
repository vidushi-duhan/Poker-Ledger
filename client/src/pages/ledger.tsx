import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LedgerRow } from "@/components/ledger-row";
import { EmptyState } from "@/components/empty-state";
import { BookOpen, TrendingUp, TrendingDown, Users, Calendar } from "lucide-react";
import { startOfWeek, startOfMonth, isBefore } from "date-fns";
import type { Player, GameWithPlayers } from "@shared/schema";

type TimePeriod = "all" | "week" | "month";

export default function LedgerPage() {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("all");

  const { data: players = [], isLoading: playersLoading } = useQuery<Player[]>({
    queryKey: ["/api/players"],
  });

  const { data: games = [], isLoading: gamesLoading } = useQuery<GameWithPlayers[]>({
    queryKey: ["/api/games"],
  });

  const isLoading = playersLoading || gamesLoading;

  const filteredStats = useMemo(() => {
    if (timePeriod === "all") {
      return players.map(p => ({
        ...p,
        filteredBalance: p.totalBalance,
        filteredGamesPlayed: p.gamesPlayed,
      }));
    }

    const now = new Date();
    const periodStart = timePeriod === "week" 
      ? startOfWeek(now, { weekStartsOn: 1 }) 
      : startOfMonth(now);

    const completedGamesInPeriod = games.filter(g => {
      if (g.status !== "completed" || !g.completedAt) return false;
      const completedDate = new Date(g.completedAt);
      return !isBefore(completedDate, periodStart);
    });

    const playerStats = new Map<string, { balance: number; gamesPlayed: number }>();
    
    players.forEach(p => {
      playerStats.set(p.id, { balance: 0, gamesPlayed: 0 });
    });

    completedGamesInPeriod.forEach(game => {
      game.gamePlayers.forEach(gp => {
        const stats = playerStats.get(gp.playerId);
        if (stats) {
          const netResult = gp.netResult ?? 0;
          stats.balance += netResult;
          stats.gamesPlayed += 1;
        }
      });
    });

    return players.map(p => {
      const stats = playerStats.get(p.id) || { balance: 0, gamesPlayed: 0 };
      return {
        ...p,
        filteredBalance: stats.balance,
        filteredGamesPlayed: stats.gamesPlayed,
      };
    });
  }, [players, games, timePeriod]);

  const sortedPlayers = [...filteredStats].sort((a, b) => b.filteredBalance - a.filteredBalance);
  
  const totalPositive = filteredStats
    .filter(p => p.filteredBalance > 0)
    .reduce((sum, p) => sum + p.filteredBalance, 0);
  
  const totalNegative = filteredStats
    .filter(p => p.filteredBalance < 0)
    .reduce((sum, p) => sum + Math.abs(p.filteredBalance), 0);

  const periodLabel = timePeriod === "all" ? "All Time" : timePeriod === "week" ? "This Week" : "This Month";

  if (isLoading) {
    return (
      <div className="px-4 py-6 space-y-4 pb-24">
        <Skeleton className="h-8 w-32" />
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    );
  }

  if (players.length === 0) {
    return (
      <EmptyState
        icon={BookOpen}
        title="No Players Yet"
        description="Players will appear here after you add them to a game"
      />
    );
  }

  return (
    <div className="px-4 py-6 space-y-6 pb-24 max-w-2xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-semibold" data-testid="text-page-title">Player Ledger</h1>
        <Select value={timePeriod} onValueChange={(v) => setTimePeriod(v as TimePeriod)}>
          <SelectTrigger className="w-[140px]" data-testid="select-time-period">
            <Calendar className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Players</span>
          </div>
          <p className="text-xl font-semibold" data-testid="text-player-count">
            {players.length}
          </p>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-chart-1" />
            <span className="text-xs text-muted-foreground">Winnings</span>
          </div>
          <p className="text-xl font-semibold text-chart-1" data-testid="text-total-winnings">
            +₹{totalPositive.toLocaleString('en-IN')}
          </p>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-destructive" />
            <span className="text-xs text-muted-foreground">Losses</span>
          </div>
          <p className="text-xl font-semibold text-destructive" data-testid="text-total-losses">
            -₹{totalNegative.toLocaleString('en-IN')}
          </p>
        </Card>
      </div>

      {timePeriod !== "all" && (
        <p className="text-sm text-muted-foreground">
          Showing results for {periodLabel.toLowerCase()}
        </p>
      )}

      <Card>
        {sortedPlayers.map((player, index) => (
          <LedgerRow 
            key={player.id} 
            player={player} 
            rank={index + 1}
            balance={player.filteredBalance}
            gamesPlayed={player.filteredGamesPlayed}
          />
        ))}
      </Card>
    </div>
  );
}
