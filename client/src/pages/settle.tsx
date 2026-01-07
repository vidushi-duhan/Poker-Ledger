import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AmountInput } from "@/components/amount-input";
import { SettlementRow } from "@/components/settlement-row";
import { EmptyState } from "@/components/empty-state";
import { Calculator, CheckCircle, AlertCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Game, GamePlayerWithPlayer, SettlementWithPlayers } from "@shared/schema";

interface FinalAmounts {
  [playerId: string]: string;
}

export default function SettlePage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [finalAmounts, setFinalAmounts] = useState<FinalAmounts>({});
  const [calculatedSettlements, setCalculatedSettlements] = useState<SettlementWithPlayers[]>([]);
  const [showSettlements, setShowSettlements] = useState(false);

  const { data: activeGame, isLoading } = useQuery<Game & { gamePlayers: GamePlayerWithPlayer[] } | null>({
    queryKey: ["/api/games/active"],
  });

  const completeGameMutation = useMutation({
    mutationFn: async (data: { gameId: string; finalAmounts: { playerId: string; finalAmount: number }[] }) => {
      return apiRequest("POST", `/api/games/${data.gameId}/complete`, { finalAmounts: data.finalAmounts });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/games/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/games"] });
      queryClient.invalidateQueries({ queryKey: ["/api/players"] });
      queryClient.invalidateQueries({ queryKey: ["/api/settlements"] });
      toast({ title: "Game completed successfully!" });
      navigate("/history");
    },
    onError: () => {
      toast({ title: "Failed to complete game", variant: "destructive" });
    },
  });

  const handleAmountChange = (playerId: string, value: string) => {
    setFinalAmounts((prev) => ({ ...prev, [playerId]: value }));
    setShowSettlements(false);
  };

  const totalBuyIns = useMemo(() => {
    if (!activeGame) return 0;
    return activeGame.gamePlayers.reduce(
      (sum, gp) => sum + gp.buyInCount * activeGame.defaultBuyIn,
      0
    );
  }, [activeGame]);

  const totalFinalAmounts = useMemo(() => {
    return Object.values(finalAmounts).reduce((sum, val) => {
      const num = parseInt(val, 10);
      return sum + (isNaN(num) ? 0 : num);
    }, 0);
  }, [finalAmounts]);

  const allPlayersEntered = useMemo(() => {
    if (!activeGame) return false;
    return activeGame.gamePlayers.every(
      (gp) => finalAmounts[gp.playerId] !== undefined && finalAmounts[gp.playerId] !== ""
    );
  }, [activeGame, finalAmounts]);

  const isBalanced = totalBuyIns === totalFinalAmounts;

  const calculateSettlements = () => {
    if (!activeGame || !allPlayersEntered || !isBalanced) return;

    const playerBalances: { playerId: string; playerName: string; balance: number }[] = [];

    activeGame.gamePlayers.forEach((gp) => {
      const totalBuyIn = gp.buyInCount * activeGame.defaultBuyIn;
      const finalAmount = parseInt(finalAmounts[gp.playerId], 10);
      const netResult = finalAmount - totalBuyIn;

      playerBalances.push({
        playerId: gp.playerId,
        playerName: gp.player.name,
        balance: netResult,
      });
    });

    const losers = playerBalances.filter((p) => p.balance < 0).sort((a, b) => a.balance - b.balance);
    const winners = playerBalances.filter((p) => p.balance > 0).sort((a, b) => b.balance - a.balance);

    const settlements: SettlementWithPlayers[] = [];
    let loserIdx = 0;
    let winnerIdx = 0;

    const loserBalances = losers.map((l) => ({ ...l, remaining: Math.abs(l.balance) }));
    const winnerBalances = winners.map((w) => ({ ...w, remaining: w.balance }));

    while (loserIdx < loserBalances.length && winnerIdx < winnerBalances.length) {
      const loser = loserBalances[loserIdx];
      const winner = winnerBalances[winnerIdx];

      const amount = Math.min(loser.remaining, winner.remaining);

      if (amount > 0) {
        settlements.push({
          id: `temp-${loserIdx}-${winnerIdx}`,
          gameId: activeGame.id,
          fromPlayerId: loser.playerId,
          toPlayerId: winner.playerId,
          amount,
          fromPlayer: { id: loser.playerId, name: loser.playerName, totalBalance: 0, gamesPlayed: 0 },
          toPlayer: { id: winner.playerId, name: winner.playerName, totalBalance: 0, gamesPlayed: 0 },
        });

        loser.remaining -= amount;
        winner.remaining -= amount;
      }

      if (loser.remaining === 0) loserIdx++;
      if (winner.remaining === 0) winnerIdx++;
    }

    setCalculatedSettlements(settlements);
    setShowSettlements(true);
  };

  const handleCompleteGame = () => {
    if (!activeGame) return;

    const finalAmountsData = Object.entries(finalAmounts).map(([playerId, amount]) => ({
      playerId,
      finalAmount: parseInt(amount, 10),
    }));

    completeGameMutation.mutate({
      gameId: activeGame.id,
      finalAmounts: finalAmountsData,
    });
  };

  if (isLoading) {
    return (
      <div className="px-4 py-6 space-y-6 pb-24">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-24 w-full" />
        <div className="space-y-2">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  if (!activeGame) {
    return (
      <EmptyState
        icon={Calculator}
        title="No Active Game"
        description="Start a game first before settling"
        actionLabel="Start New Game"
        onAction={() => navigate("/new-game")}
      />
    );
  }

  return (
    <div className="px-4 py-6 space-y-6 pb-24 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold" data-testid="text-page-title">Settlement</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Enter the final amount each player has
        </p>
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Total Buy-ins</p>
            <p className="text-xl font-semibold" data-testid="text-total-buyins">
              <span className="opacity-70">₹</span>{totalBuyIns.toLocaleString('en-IN')}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Final Total</p>
            <p 
              className={`text-xl font-semibold ${isBalanced ? "text-chart-1" : "text-destructive"}`}
              data-testid="text-final-total"
            >
              <span className="opacity-70">₹</span>{totalFinalAmounts.toLocaleString('en-IN')}
            </p>
          </div>
        </div>
        {!isBalanced && allPlayersEntered && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border text-sm text-destructive">
            <AlertCircle className="w-4 h-4" />
            <span>Total amounts don't match. Difference: ₹{Math.abs(totalBuyIns - totalFinalAmounts).toLocaleString('en-IN')}</span>
          </div>
        )}
        {isBalanced && allPlayersEntered && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border text-sm text-chart-1">
            <CheckCircle className="w-4 h-4" />
            <span>Amounts are balanced!</span>
          </div>
        )}
      </Card>

      <Card>
        <div className="p-4 border-b border-border">
          <p className="text-sm font-medium text-muted-foreground">Enter Final Amounts</p>
        </div>
        {activeGame.gamePlayers.map((gp) => (
          <AmountInput
            key={gp.id}
            playerId={gp.playerId}
            playerName={gp.player.name}
            value={finalAmounts[gp.playerId] || ""}
            onChange={(value) => handleAmountChange(gp.playerId, value)}
            totalBuyIn={gp.buyInCount * activeGame.defaultBuyIn}
          />
        ))}
      </Card>

      {!showSettlements && (
        <Button
          className="w-full h-12"
          onClick={calculateSettlements}
          disabled={!allPlayersEntered || !isBalanced}
          data-testid="button-calculate"
        >
          <Calculator className="w-5 h-5 mr-2" />
          Calculate Settlements
        </Button>
      )}

      {showSettlements && calculatedSettlements.length > 0 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-medium mb-3">Settlements</h2>
            <div className="space-y-3">
              {calculatedSettlements.map((settlement) => (
                <SettlementRow key={settlement.id} settlement={settlement} />
              ))}
            </div>
          </div>

          <Button
            className="w-full h-12"
            onClick={handleCompleteGame}
            disabled={completeGameMutation.isPending}
            data-testid="button-complete-game"
          >
            <CheckCircle className="w-5 h-5 mr-2" />
            {completeGameMutation.isPending ? "Completing..." : "Complete Game"}
          </Button>
        </div>
      )}

      {showSettlements && calculatedSettlements.length === 0 && (
        <Card className="p-6 text-center">
          <CheckCircle className="w-12 h-12 text-chart-1 mx-auto mb-3" />
          <p className="font-medium">No settlements needed!</p>
          <p className="text-sm text-muted-foreground mt-1">
            Everyone broke even in this game
          </p>
          <Button
            className="w-full h-12 mt-4"
            onClick={handleCompleteGame}
            disabled={completeGameMutation.isPending}
            data-testid="button-complete-game-no-settle"
          >
            {completeGameMutation.isPending ? "Completing..." : "Complete Game"}
          </Button>
        </Card>
      )}
    </div>
  );
}
