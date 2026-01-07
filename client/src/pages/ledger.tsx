import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LedgerRow } from "@/components/ledger-row";
import { EmptyState } from "@/components/empty-state";
import { BookOpen, TrendingUp, TrendingDown, Users } from "lucide-react";
import type { Player } from "@shared/schema";

export default function LedgerPage() {
  const { data: players = [], isLoading } = useQuery<Player[]>({
    queryKey: ["/api/players"],
  });

  const sortedPlayers = [...players].sort((a, b) => b.totalBalance - a.totalBalance);
  
  const totalPositive = players
    .filter(p => p.totalBalance > 0)
    .reduce((sum, p) => sum + p.totalBalance, 0);
  
  const totalNegative = players
    .filter(p => p.totalBalance < 0)
    .reduce((sum, p) => sum + Math.abs(p.totalBalance), 0);

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
      <h1 className="text-2xl font-semibold" data-testid="text-page-title">Player Ledger</h1>

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

      <Card>
        {sortedPlayers.map((player, index) => (
          <LedgerRow key={player.id} player={player} rank={index + 1} />
        ))}
      </Card>
    </div>
  );
}
