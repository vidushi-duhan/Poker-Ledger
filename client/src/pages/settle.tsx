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
  const [finalChips, setFinalChips] = useState<FinalAmounts>({});
  const [calculatedSettlements, setCalculatedSettlements] = useState<SettlementWithPlayers[]>([]);
  const [showSettlements, setShowSettlements] = useState(false);

  const { data: activeGame, isLoading } = useQuery<Game & { gamePlayers: GamePlayerWithPlayer[] } | null>({
    queryKey: ["/api/games/active"],
  });

  const completeGameMutation = useMutation({
    mutationFn: async (data: { gameId: string; finalChips: { playerId: string; chips: number }[] }) => {
      return apiRequest("POST", `/api/games/${data.gameId}/complete`, { finalChips: data.finalChips });
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
    setFinalChips((prev) => ({ ...prev, [playerId]: value }));
    setShowSettlements(false);
  };

  const totalBuyInChips = useMemo(() => {
    if (!activeGame) return 0;
    return activeGame.gamePlayers.reduce(
      (sum, gp) => sum + gp.buyInCount * activeGame.chipsPerBuyIn,
      0
    );
  }, [activeGame]);

  const totalFinalChips = useMemo(() => {
    return Object.values(finalChips).reduce((sum, val) => {
      const num = parseInt(val, 10);
      return sum + (isNaN(num) ? 0 : num);
    }, 0);
  }, [finalChips]);

  const allPlayersEntered = useMemo(() => {
    if (!activeGame) return false;
    return activeGame.gamePlayers.every(
      (gp) => finalChips[gp.playerId] !== undefined && finalChips[gp.playerId] !== ""
    );
  }, [activeGame, finalChips]);

  const isBalanced = totalBuyInChips === totalFinalChips;

  const calculateSettlements = () => {
    if (!activeGame || !allPlayersEntered || !isBalanced) return;

    const conversionRatio = activeGame.chipsPerBuyIn / activeGame.defaultBuyIn;
    const playerBalances: { playerId: string; playerName: string; balance: number }[] = [];

    activeGame.gamePlayers.forEach((gp) => {
      const totalBuyInMoney = gp.buyInCount * activeGame.defaultBuyIn;
      const chips = parseInt(finalChips[gp.playerId], 10);
      const moneyValue = chips / conversionRatio;
      const netResult = moneyValue - totalBuyInMoney;

      playerBalances.push({
        playerId: gp.playerId,
        playerName: gp.player.name,
        balance: Math.round(netResult),
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

    const finalChipsData = Object.entries(finalChips).map(([playerId, chips]) => ({
      playerId,
      chips: parseInt(chips, 10),
    }));

    completeGameMutation.mutate({
      gameId: activeGame.id,
      finalChips: finalChipsData,
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
          Enter the ending chips amount each player has
        </p>
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Total Buy-in Chips (₹)</p>
            <p className="text-xl font-semibold" data-testid="text-total-buyins">
              {totalBuyInChips.toLocaleString('en-IN')} (₹{(activeGame.gamePlayers.reduce((s, gp) => s + gp.buyInCount * activeGame.defaultBuyIn, 0)).toLocaleString('en-IN')})
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Ending Total Chips (₹)</p>
            <p 
              className={`text-xl font-semibold ${isBalanced ? "text-chart-1" : "text-destructive"}`}
              data-testid="text-final-total"
            >
              {totalFinalChips.toLocaleString('en-IN')} (₹{(totalFinalChips / (activeGame.chipsPerBuyIn / activeGame.defaultBuyIn)).toLocaleString('en-IN')})
            </p>
          </div>
        </div>
        {!isBalanced && allPlayersEntered && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border text-sm text-destructive">
            <AlertCircle className="w-4 h-4" />
            <span>Total chips don't match. Difference: {Math.abs(totalBuyInChips - totalFinalChips).toLocaleString('en-IN')}</span>
          </div>
        )}
        {isBalanced && allPlayersEntered && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border text-sm text-chart-1">
            <CheckCircle className="w-4 h-4" />
            <span>Chips are balanced!</span>
          </div>
        )}
      </Card>

      <Card>
        <div className="p-4 border-b border-border">
          <p className="text-sm font-medium text-muted-foreground">Enter Ending Chips</p>
        </div>
        {activeGame.gamePlayers.map((gp) => (
          <AmountInput
            key={gp.id}
            playerId={gp.playerId}
            playerName={gp.player.name}
            value={finalChips[gp.playerId] || ""}
            onChange={(value) => handleAmountChange(gp.playerId, value)}
            totalBuyIn={gp.buyInCount * activeGame.chipsPerBuyIn}
            conversionRatio={activeGame.chipsPerBuyIn / activeGame.defaultBuyIn}
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
