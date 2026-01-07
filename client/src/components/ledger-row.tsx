import type { Player } from "@shared/schema";

interface LedgerRowProps {
  player: Player;
  rank: number;
}

export function LedgerRow({ player, rank }: LedgerRowProps) {
  const isPositive = player.totalBalance >= 0;
  
  return (
    <div 
      className="flex items-center justify-between py-4 px-4 border-b border-border last:border-b-0 hover-elevate"
      data-testid={`ledger-row-${player.id}`}
    >
      <div className="flex items-center gap-3">
        <div 
          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            rank <= 3 
              ? "bg-primary text-primary-foreground" 
              : "bg-muted text-muted-foreground"
          }`}
        >
          {rank}
        </div>
        <div>
          <p className="font-medium text-base" data-testid={`ledger-name-${player.id}`}>
            {player.name}
          </p>
          <p className="text-sm text-muted-foreground">
            {player.gamesPlayed} game{player.gamesPlayed !== 1 ? "s" : ""} played
          </p>
        </div>
      </div>
      
      <div className="text-right">
        <p 
          className={`text-lg font-semibold ${
            isPositive ? "text-chart-1" : "text-destructive"
          }`}
          data-testid={`ledger-balance-${player.id}`}
        >
          {isPositive ? "+" : ""}₹{player.totalBalance.toLocaleString('en-IN')}
        </p>
      </div>
    </div>
  );
}
