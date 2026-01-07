import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gamepad2, BookOpen, History, Users, TrendingUp, ArrowRight } from "lucide-react";
import type { Game, GamePlayerWithPlayer } from "@shared/schema";

export default function HomePage() {
  const [, navigate] = useLocation();

  const { data: activeGame } = useQuery<Game & { gamePlayers: GamePlayerWithPlayer[] } | null>({
    queryKey: ["/api/games/active"],
  });

  return (
    <div className="min-h-screen px-4 py-8 pb-24 max-w-2xl mx-auto">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 mb-6">
          <Gamepad2 className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight mb-2" data-testid="text-app-name">
          Poker Ledger
        </h1>
        <p className="text-lg text-muted-foreground">
          Track games. Settle up. Stay friends.
        </p>
      </div>

      <div className="space-y-4 mb-8">
        <Card className="p-5">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-muted">
              <Users className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium mb-1">Track Buy-ins</h3>
              <p className="text-sm text-muted-foreground">
                Record each player's buy-ins during the game with a simple tap.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-muted">
              <TrendingUp className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium mb-1">Instant Settlement</h3>
              <p className="text-sm text-muted-foreground">
                Enter final amounts and get optimized settlements showing who pays whom.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-muted">
              <BookOpen className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium mb-1">Lifetime Ledger</h3>
              <p className="text-sm text-muted-foreground">
                Keep a running tally of everyone's wins and losses across all games.
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div className="space-y-3">
        {activeGame ? (
          <Button
            className="w-full h-12"
            onClick={() => navigate("/game")}
            data-testid="button-continue-game"
          >
            Continue Active Game
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button
            className="w-full h-12"
            onClick={() => navigate("/new-game")}
            data-testid="button-start-game"
          >
            Start New Game
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 h-12"
            onClick={() => navigate("/ledger")}
            data-testid="button-view-ledger"
          >
            <BookOpen className="w-4 h-4 mr-2" />
            Ledger
          </Button>
          <Button
            variant="outline"
            className="flex-1 h-12"
            onClick={() => navigate("/history")}
            data-testid="button-view-history"
          >
            <History className="w-4 h-4 mr-2" />
            History
          </Button>
        </div>
      </div>
    </div>
  );
}
