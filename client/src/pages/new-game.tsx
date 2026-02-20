import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Game } from "@shared/schema";

export default function NewGamePage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [buyInAmount, setBuyInAmount] = useState("500");
  const [chipsAmount, setChipsAmount] = useState("2000");

  const { data: activeGame, isLoading } = useQuery<Game | null>({
    queryKey: ["/api/games/active"],
  });

  const createGameMutation = useMutation({
    mutationFn: async (data: { defaultBuyIn: number; chipsPerBuyIn: number }) => {
      return apiRequest("POST", "/api/games", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/games/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/games"] });
      toast({ title: "Game started successfully!" });
      navigate("/game");
    },
    onError: () => {
      toast({ title: "Failed to start game", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseInt(buyInAmount, 10);
    const chips = parseInt(chipsAmount, 10);
    if (amount > 0 && chips > 0) {
      createGameMutation.mutate({ defaultBuyIn: amount, chipsPerBuyIn: chips });
    }
  };

  if (isLoading) {
    return (
      <div className="px-4 py-6 space-y-6 pb-24">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (activeGame) {
    return (
      <div className="px-4 py-6 space-y-6 pb-24 max-w-2xl mx-auto">
        <h1 className="text-2xl font-semibold" data-testid="text-page-title">New Game</h1>
        
        <Card className="p-6">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
              <Plus className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">A game is already in progress</p>
              <p className="text-sm text-muted-foreground mt-1">
                End the current game before starting a new one
              </p>
            </div>
            <Button
              variant="outline"
              className="w-full h-12"
              onClick={() => navigate("/game")}
              data-testid="button-go-to-active"
            >
              Go to Active Game
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-6 pb-24 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold" data-testid="text-page-title">Start New Game</h1>

      <form onSubmit={handleSubmit}>
        <Card className="p-6 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="buyInAmount" className="text-base">
              Default Buy-in Amount
            </Label>
            <p className="text-sm text-muted-foreground">
              This is the amount each player starts with per buy-in
            </p>
            <div className="relative mt-3">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">
                ₹
              </span>
              <Input
                id="buyInAmount"
                type="number"
                inputMode="numeric"
                placeholder="500"
                value={buyInAmount}
                onChange={(e) => setBuyInAmount(e.target.value)}
                className="h-14 text-xl pl-10 pr-4"
                min="1"
                required
                data-testid="input-buy-in-amount"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="chipsAmount" className="text-base">
              Chips per Buy-in
            </Label>
            <p className="text-sm text-muted-foreground">
              Number of chips given for each buy-in (e.g., 2000 chips for ₹500)
            </p>
            <div className="relative mt-3">
              <Input
                id="chipsAmount"
                type="number"
                inputMode="numeric"
                placeholder="2000"
                value={chipsAmount}
                onChange={(e) => setChipsAmount(e.target.value)}
                className="h-14 text-xl px-4"
                min="1"
                required
                data-testid="input-chips-amount"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground mb-4">
              You can add players and track multiple buy-ins during the game. 
              Settlement calculations will be done at the end.
            </p>
            
            <Button
              type="submit"
              className="w-full h-12"
              disabled={createGameMutation.isPending || !buyInAmount || parseInt(buyInAmount, 10) <= 0}
              data-testid="button-start-game"
            >
              {createGameMutation.isPending ? "Starting..." : "Start Game"}
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
