import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, UserPlus } from "lucide-react";
import type { Player } from "@shared/schema";

interface AddPlayerDialogProps {
  existingPlayers: Player[];
  playersInGame: string[];
  onAddExisting: (playerId: string) => void;
  onAddNew: (name: string) => void;
  isLoading?: boolean;
}

export function AddPlayerDialog({
  existingPlayers,
  playersInGame,
  onAddExisting,
  onAddNew,
  isLoading,
}: AddPlayerDialogProps) {
  const [open, setOpen] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [showNewPlayerInput, setShowNewPlayerInput] = useState(false);

  const availablePlayers = existingPlayers.filter(
    (p) => !playersInGame.includes(p.id)
  );

  const handleAddNew = () => {
    if (newPlayerName.trim()) {
      onAddNew(newPlayerName.trim());
      setNewPlayerName("");
      setShowNewPlayerInput(false);
      setOpen(false);
    }
  };

  const handleAddExisting = (playerId: string) => {
    onAddExisting(playerId);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          className="w-full h-12" 
          data-testid="button-add-player"
        >
          <UserPlus className="w-5 h-5 mr-2" />
          Add Player
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm mx-4">
        <DialogHeader>
          <DialogTitle>Add Player to Game</DialogTitle>
          <DialogDescription>
            Select an existing player or create a new one to add to this game.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 pt-4">
          {availablePlayers.length > 0 && !showNewPlayerInput && (
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Select existing player</Label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {availablePlayers.map((player) => (
                  <Button
                    key={player.id}
                    variant="outline"
                    className="w-full justify-start h-12 text-left"
                    onClick={() => handleAddExisting(player.id)}
                    disabled={isLoading}
                    data-testid={`button-select-player-${player.id}`}
                  >
                    <span className="font-medium">{player.name}</span>
                    <span className="ml-auto text-sm text-muted-foreground">
                      {player.totalBalance >= 0 ? "+" : ""}₹{player.totalBalance.toLocaleString('en-IN')}
                    </span>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {!showNewPlayerInput && (
            <Button
              variant="secondary"
              className="w-full h-12"
              onClick={() => setShowNewPlayerInput(true)}
              data-testid="button-new-player"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create New Player
            </Button>
          )}

          {showNewPlayerInput && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="playerName">Player Name</Label>
                <Input
                  id="playerName"
                  placeholder="Enter player name"
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  className="h-12 text-base"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleAddNew()}
                  data-testid="input-player-name"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 h-12"
                  onClick={() => {
                    setShowNewPlayerInput(false);
                    setNewPlayerName("");
                  }}
                  data-testid="button-cancel-new-player"
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 h-12"
                  onClick={handleAddNew}
                  disabled={!newPlayerName.trim() || isLoading}
                  data-testid="button-confirm-new-player"
                >
                  Add Player
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
