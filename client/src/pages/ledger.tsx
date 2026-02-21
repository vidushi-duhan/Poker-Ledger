import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LedgerRow } from "@/components/ledger-row";
import { EmptyState } from "@/components/empty-state";
import { BookOpen, TrendingUp, TrendingDown, Users, Calendar, Trophy, Zap, Target } from "lucide-react";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, format, isBefore, isAfter } from "date-fns";
import type { Player, GameWithPlayers } from "@shared/schema";

interface FilterOption {
  value: string;
  label: string;
  startDate?: Date;
  endDate?: Date;
}

export default function LedgerPage() {
  const [selectedFilter, setSelectedFilter] = useState<string>("all");

  const { data: players = [], isLoading: playersLoading } = useQuery<Player[]>({
    queryKey: ["/api/players"],
  });

  const { data: games = [], isLoading: gamesLoading } = useQuery<GameWithPlayers[]>({
    queryKey: ["/api/games"],
  });

  const isLoading = playersLoading || gamesLoading;

  const filterOptions = useMemo<FilterOption[]>(() => {
    const now = new Date();
    const options: FilterOption[] = [
      { value: "all", label: "All Time" },
      { value: "this-week", label: "This Week", startDate: startOfWeek(now, { weekStartsOn: 1 }) },
      { value: "last-week", label: "Last Week", startDate: startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }), endDate: endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }) },
    ];

    const completedGames = games.filter(g => g.status === "completed" && g.completedAt);
    
    if (completedGames.length > 0) {
      const monthsWithGames = new Set<string>();
      
      completedGames.forEach(game => {
        if (game.completedAt) {
          const completedDate = new Date(game.completedAt);
          const monthKey = format(completedDate, "yyyy-MM");
          monthsWithGames.add(monthKey);
        }
      });

      const sortedMonths = Array.from(monthsWithGames).sort().reverse();

      sortedMonths.forEach(monthKey => {
        const [year, month] = monthKey.split("-");
        const monthDate = new Date(parseInt(year), parseInt(month) - 1, 1);
        const monthStart = startOfMonth(monthDate);
        const monthEnd = endOfMonth(monthDate);
        const label = format(monthDate, "MMMM yyyy");
        
        options.push({
          value: `month-${monthKey}`,
          label,
          startDate: monthStart,
          endDate: monthEnd,
        });
      });
    }

    return options;
  }, [games]);

  const currentFilter = filterOptions.find(f => f.value === selectedFilter) || filterOptions[0];

  const filteredStats = useMemo(() => {
    if (selectedFilter === "all") {
      return players.map(p => ({
        ...p,
        filteredBalance: p.totalBalance,
        filteredGamesPlayed: p.gamesPlayed,
      }));
    }

    const filter = filterOptions.find(f => f.value === selectedFilter);
    if (!filter || !filter.startDate) {
      return players.map(p => ({
        ...p,
        filteredBalance: p.totalBalance,
        filteredGamesPlayed: p.gamesPlayed,
      }));
    }

    const completedGamesInPeriod = games.filter(g => {
      if (g.status !== "completed" || !g.completedAt) return false;
      const completedDate = new Date(g.completedAt);
      
      const afterStart = !isBefore(completedDate, filter.startDate!);
      const beforeEnd = filter.endDate ? !isAfter(completedDate, filter.endDate) : true;
      
      return afterStart && beforeEnd;
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
  }, [players, games, selectedFilter, filterOptions]);

  const sortedPlayers = [...filteredStats].sort((a, b) => b.filteredBalance - a.filteredBalance);
  
  const totalPositive = filteredStats
    .filter(p => p.filteredBalance > 0)
    .reduce((sum, p) => sum + p.filteredBalance, 0);
  
  const totalNegative = filteredStats
    .filter(p => p.filteredBalance < 0)
    .reduce((sum, p) => sum + Math.abs(p.filteredBalance), 0);

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
        <Select value={selectedFilter} onValueChange={setSelectedFilter}>
          <SelectTrigger className="w-[160px]" data-testid="select-time-period">
            <Calendar className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {filterOptions.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-4 h-4 text-yellow-500" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Top Winner</span>
          </div>
          <p className="text-lg font-bold truncate">
            {sortedPlayers[0]?.name || "None"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            ₹{(sortedPlayers[0]?.filteredBalance || 0).toLocaleString('en-IN')}
          </p>
        </Card>
        
        <Card className="p-4 bg-gradient-to-br from-chart-1/5 to-chart-1/10 border-chart-1/20">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-orange-500" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Hot Streak</span>
          </div>
          <p className="text-lg font-bold truncate">
            {[...filteredStats].sort((a, b) => b.winStreak - a.winStreak)[0]?.name || "None"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {[...filteredStats].sort((a, b) => b.winStreak - a.winStreak)[0]?.winStreak || 0} wins
          </p>
        </Card>
        
        <Card className="p-4 bg-gradient-to-br from-blue-500/5 to-blue-500/10 border-blue-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Biggest Win</span>
          </div>
          <p className="text-lg font-bold truncate">
            {[...filteredStats].sort((a, b) => b.bestWin - a.bestWin)[0]?.name || "None"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            ₹{([...filteredStats].sort((a, b) => b.bestWin - a.bestWin)[0]?.bestWin || 0).toLocaleString('en-IN')}
          </p>
        </Card>
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

      {selectedFilter !== "all" && (
        <p className="text-sm text-muted-foreground">
          Showing results for {currentFilter.label.toLowerCase()}
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
