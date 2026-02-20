import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
import { PlayerRow } from "@/components/player-row";
import { AddPlayerDialog } from "@/components/add-player-dialog";
import { EmptyState } from "@/components/empty-state";
import { Gamepad2, Calculator, Users, X } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { Game, Player, GamePlayerWithPlayer } from "@shared/schema";

export default function ActiveGamePage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: activeGame, isLoading: gameLoading } = useQuery<Game & { gamePlayers: GamePlayerWithPlayer[] } | null>({
    queryKey: ["/api/games/active"],
  });

  const { data: allPlayers = [], isLoading: playersLoading } = useQuery<Player[]>({
    queryKey: ["/api/players"],
  });

  const addPlayerMutation = useMutation({
    mutationFn: async ({ gameId, playerId }: { gameId: string; playerId: string }) => {
      return apiRequest("POST", "/api/game-players", { gameId, playerId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/games/active"] });
    },
    onError: () => {
      toast({ title: "Failed to add player", variant: "destructive" });
    },
  });

  const createPlayerMutation = useMutation({
    mutationFn: async (name: string) => {
      return apiRequest("POST", "/api/players", { name });
    },
    onSuccess: async (response) => {
      const player = await response.json();
      queryClient.invalidateQueries({ queryKey: ["/api/players"] });
      if (activeGame) {
        addPlayerMutation.mutate({ gameId: activeGame.id, playerId: player.id });
      }
    },
    onError: () => {
      toast({ title: "Failed to create player", variant: "destructive" });
    },
  });

  const updateBuyInMutation = useMutation({
    mutationFn: async ({ gamePlayerId, buyInCount }: { gamePlayerId: string; buyInCount: number }) => {
      return apiRequest("PATCH", `/api/game-players/${gamePlayerId}`, { buyInCount });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/games/active"] });
    },
    onError: () => {
      toast({ title: "Failed to update buy-in", variant: "destructive" });
    },
  });

  const cancelGameMutation = useMutation({
    mutationFn: async (gameId: string) => {
      return apiRequest("POST", `/api/games/${gameId}/cancel`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/games/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/games"] });
      toast({ title: "Game cancelled" });
    },
    onError: () => {
      toast({ title: "Failed to cancel game", variant: "destructive" });
    },
  });

  const handleAddBuyIn = (playerId: string) => {
    const gamePlayer = activeGame?.gamePlayers.find(gp => gp.playerId === playerId);
    if (gamePlayer) {
      updateBuyInMutation.mutate({ 
        gamePlayerId: gamePlayer.id, 
        buyInCount: gamePlayer.buyInCount + 1 
      });
    }
  };

  const handleRemoveBuyIn = (playerId: string) => {
    const gamePlayer = activeGame?.gamePlayers.find(gp => gp.playerId === playerId);
    if (gamePlayer && gamePlayer.buyInCount > 1) {
      updateBuyInMutation.mutate({ 
        gamePlayerId: gamePlayer.id, 
        buyInCount: gamePlayer.buyInCount - 1 
      });
    }
  };

  const handleRemovePlayer = (gamePlayerId: string) => {
    // TODO: Implement remove player
  };

  const handleAddExisting = (playerId: string) => {
    if (activeGame) {
      addPlayerMutation.mutate({ gameId: activeGame.id, playerId });
    }
  };

  const handleAddNew = (name: string) => {
    createPlayerMutation.mutate(name);
  };

  const isLoading = gameLoading || playersLoading;

  if (isLoading) {
    return (
      <div className="px-4 py-6 space-y-4 pb-24">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-12 w-full" />
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    );
  }

  if (!activeGame) {
    return (
      <EmptyState
        icon={Gamepad2}
        title="No Active Game"
        description="Start a new poker game to begin tracking buy-ins and settlements"
        actionLabel="Start New Game"
        onAction={() => navigate("/new-game")}
      />
    );
  }

  const totalPot = activeGame.gamePlayers.reduce(
    (sum, gp) => sum + gp.buyInCount * activeGame.defaultBuyIn,
    0
  );

  const playersInGame = activeGame.gamePlayers.map(gp => gp.playerId);

  return (
    <div className="px-4 py-6 space-y-6 pb-24 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold" data-testid="text-page-title">Active Game</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {format(new Date(activeGame.date), "EEEE, MMM d, yyyy 'at' h:mm a")}
        </p>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Total Pot</p>
            <p className="text-2xl font-semibold" data-testid="text-total-pot">
              <span className="opacity-70">₹</span>{totalPot.toLocaleString('en-IN')}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Buy-in Rate</p>
            <p className="text-lg font-medium" data-testid="text-buy-in-amount">
              ₹{activeGame.defaultBuyIn} = {activeGame.chipsPerBuyIn} chips
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
          <Users className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {activeGame.gamePlayers.length} player{activeGame.gamePlayers.length !== 1 ? "s" : ""}
          </span>
        </div>
      </Card>

      <AddPlayerDialog
        existingPlayers={allPlayers}
        playersInGame={playersInGame}
        onAddExisting={handleAddExisting}
        onAddNew={handleAddNew}
        isLoading={addPlayerMutation.isPending || createPlayerMutation.isPending}
      />

      {activeGame.gamePlayers.length > 0 ? (
        <Card className="overflow-hidden">
          <AnimatePresence mode="popLayout">
            {activeGame.gamePlayers.map((gamePlayer) => (
              <motion.div
                key={gamePlayer.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ 
                  layout: { type: "spring", stiffness: 500, damping: 35 },
                  opacity: { duration: 0.2 }
                }}
              >
                <PlayerRow
                  gamePlayer={gamePlayer}
                  defaultBuyIn={activeGame.defaultBuyIn}
                  chipsPerBuyIn={activeGame.chipsPerBuyIn}
                  onAddBuyIn={handleAddBuyIn}
                  onRemoveBuyIn={handleRemoveBuyIn}
                  onRemovePlayer={handleRemovePlayer}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </Card>
      ) : (
        <Card className="p-6">
          <p className="text-center text-muted-foreground">
            Add players to start tracking buy-ins
          </p>
        </Card>
      )}

      {activeGame.gamePlayers.length >= 2 && (
        <Button
          className="w-full h-12"
          onClick={() => navigate("/settle")}
          data-testid="button-end-game"
        >
          <Calculator className="w-5 h-5 mr-2" />
          End Game & Calculate Settlement
        </Button>
      )}

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="outline"
            className="w-full"
            data-testid="button-cancel-game"
          >
            <X className="w-4 h-4 mr-2" />
            Cancel Game
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this game?</AlertDialogTitle>
            <AlertDialogDescription>
              This will abandon the current game. No amounts will be added to anyone's ledger. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-dialog-cancel">Keep Playing</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cancelGameMutation.mutate(activeGame.id)}
              disabled={cancelGameMutation.isPending}
              data-testid="button-cancel-dialog-confirm"
            >
              {cancelGameMutation.isPending ? "Cancelling..." : "Cancel Game"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
