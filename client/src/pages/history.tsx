import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { GameHistoryCard } from "@/components/game-history-card";
import { EmptyState } from "@/components/empty-state";
import { Clock } from "lucide-react";
import type { GameWithPlayers, SettlementWithPlayers } from "@shared/schema";

export default function HistoryPage() {
  const { data: games = [], isLoading: gamesLoading } = useQuery<GameWithPlayers[]>({
    queryKey: ["/api/games"],
  });

  const { data: allSettlements = [], isLoading: settlementsLoading } = useQuery<SettlementWithPlayers[]>({
    queryKey: ["/api/settlements"],
  });

  const completedGames = games
    .filter(g => g.status === "completed")
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const isLoading = gamesLoading || settlementsLoading;

  if (isLoading) {
    return (
      <div className="px-4 py-6 space-y-4 pb-24">
        <Skeleton className="h-8 w-32" />
        <div className="space-y-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      </div>
    );
  }

  if (completedGames.length === 0) {
    return (
      <EmptyState
        icon={Clock}
        title="No Game History"
        description="Completed games will appear here with their settlements"
      />
    );
  }

  return (
    <div className="px-4 py-6 space-y-6 pb-24 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold" data-testid="text-page-title">Game History</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {completedGames.length} completed game{completedGames.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="space-y-4">
        {completedGames.map((game) => {
          const gameSettlements = allSettlements.filter(s => s.gameId === game.id);
          return (
            <GameHistoryCard 
              key={game.id} 
              game={game} 
              settlements={gameSettlements} 
            />
          );
        })}
      </div>
    </div>
  );
}
