import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ChevronDown, ChevronUp, Users, TrendingUp, TrendingDown, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { GameWithPlayers, SettlementWithPlayers } from "@shared/schema";

interface GameHistoryCardProps {
  game: GameWithPlayers;
  settlements: SettlementWithPlayers[];
}

export function GameHistoryCard({ game, settlements }: GameHistoryCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { toast } = useToast();

  const deleteGameMutation = useMutation({
    mutationFn: async (gameId: string) => {
      return apiRequest("DELETE", `/api/games/${gameId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/games"] });
      queryClient.invalidateQueries({ queryKey: ["/api/players"] });
      queryClient.invalidateQueries({ queryKey: ["/api/settlements"] });
      toast({ title: "Game deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete game", variant: "destructive" });
    },
  });

  const totalPot = game.gamePlayers.reduce(
    (sum, gp) => sum + gp.buyInCount * game.defaultBuyIn,
    0
  );

  const winners = game.gamePlayers.filter((gp) => (gp.netResult || 0) > 0);
  const losers = game.gamePlayers.filter((gp) => (gp.netResult || 0) < 0);

  return (
    <Card 
      className="overflow-hidden"
      data-testid={`game-card-${game.id}`}
    >
      <button
        className="w-full p-4 text-left hover-elevate"
        onClick={() => setExpanded(!expanded)}
        data-testid={`button-expand-game-${game.id}`}
        aria-expanded={expanded}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              {format(new Date(game.date), "EEEE, MMM d, yyyy")}
            </p>
            <p className="text-sm text-muted-foreground">
              {format(new Date(game.date), "h:mm a")}
            </p>
          </div>
          <Badge variant={game.status === "completed" ? "secondary" : "default"} className="text-xs">
            {game.status === "completed" ? "Completed" : game.status === "settling" ? "Settling" : "Active"}
          </Badge>
        </div>

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-sm">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span>{game.gamePlayers.length}</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <TrendingUp className="w-4 h-4 text-chart-1" />
              <span>{winners.length}</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <TrendingDown className="w-4 h-4 text-destructive" />
              <span>{losers.length}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold">
              <span className="opacity-70">₹</span>{totalPot.toLocaleString('en-IN')}
            </span>
            {expanded ? (
              <ChevronUp className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-border">
          <div className="pt-4">
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Players</h4>
            <div className="space-y-2">
              {game.gamePlayers.map((gp) => (
                <div 
                  key={gp.id} 
                  className="flex items-center justify-between py-2"
                  data-testid={`history-player-${gp.id}`}
                >
                  <div>
                    <p className="font-medium">{gp.player.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {gp.buyInCount} buy-in{gp.buyInCount !== 1 ? "s" : ""} (₹{(gp.buyInCount * game.defaultBuyIn).toLocaleString('en-IN')})
                    </p>
                  </div>
                  <div className="text-right">
                    {gp.netResult !== null && (
                      <p className={`font-semibold ${
                        gp.netResult >= 0 ? "text-chart-1" : "text-destructive"
                      }`}>
                        {gp.netResult >= 0 ? "+" : ""}₹{gp.netResult.toLocaleString('en-IN')}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {settlements.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Settlements</h4>
              <div className="space-y-2">
                {settlements.map((s) => (
                  <div 
                    key={s.id} 
                    className="flex items-center justify-between py-2 px-3 bg-muted rounded-lg"
                    data-testid={`history-settlement-${s.id}`}
                  >
                    <p className="text-sm">
                      <span className="font-medium">{s.fromPlayer.name}</span>
                      <span className="text-muted-foreground"> pays </span>
                      <span className="font-medium">{s.toPlayer.name}</span>
                    </p>
                    <p className="font-semibold">₹{s.amount.toLocaleString('en-IN')}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-border">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-destructive"
                  data-testid={`button-delete-game-${game.id}`}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Game
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this game?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently remove this game and update all player ledger balances. 
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => deleteGameMutation.mutate(game.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={deleteGameMutation.isPending}
                    data-testid="button-confirm-delete"
                  >
                    {deleteGameMutation.isPending ? "Deleting..." : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}
    </Card>
  );
}
