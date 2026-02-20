import { Button } from "@/components/ui/button";
import { Plus, Minus } from "lucide-react";
import type { GamePlayerWithPlayer } from "@shared/schema";

interface PlayerRowProps {
  gamePlayer: GamePlayerWithPlayer;
  defaultBuyIn: number;
  onAddBuyIn: (playerId: string) => void;
  onRemoveBuyIn: (playerId: string) => void;
  onRemovePlayer: (gamePlayerId: string) => void;
}

export function PlayerRow({
  gamePlayer,
  defaultBuyIn,
  onAddBuyIn,
  onRemoveBuyIn,
  onRemovePlayer,
}: PlayerRowProps) {
  const totalBuyIn = gamePlayer.buyInCount * defaultBuyIn;
  const totalChips = gamePlayer.buyInCount * (gamePlayer as any).game.chipsPerBuyIn;

  return (
    <div 
      className="flex items-center justify-between py-3 px-4 border-b border-border last:border-b-0 min-h-14"
      data-testid={`player-row-${gamePlayer.player.id}`}
    >
      <div className="flex-1 min-w-0">
        <p className="font-medium text-base truncate" data-testid={`player-name-${gamePlayer.player.id}`}>
          {gamePlayer.player.name}
        </p>
        <p className="text-sm text-muted-foreground">
          ₹{totalBuyIn.toLocaleString('en-IN')} | {totalChips.toLocaleString('en-IN')} chips
        </p>
      </div>
      
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 bg-muted rounded-full px-2 py-1">
          <Button
            size="icon"
            variant="ghost"
            className="w-8 h-8 rounded-full"
            onClick={() => onRemoveBuyIn(gamePlayer.player.id)}
            disabled={gamePlayer.buyInCount <= 1}
            data-testid={`button-remove-buyin-${gamePlayer.player.id}`}
            aria-label="Remove buy-in"
          >
            <Minus className="w-4 h-4" />
          </Button>
          
          <span 
            className="min-w-8 text-center font-semibold text-base"
            data-testid={`buyin-count-${gamePlayer.player.id}`}
          >
            {gamePlayer.buyInCount}
          </span>
          
          <Button
            size="icon"
            variant="ghost"
            className="w-8 h-8 rounded-full"
            onClick={() => onAddBuyIn(gamePlayer.player.id)}
            data-testid={`button-add-buyin-${gamePlayer.player.id}`}
            aria-label="Add buy-in"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
