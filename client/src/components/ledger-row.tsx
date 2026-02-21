import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Zap, Target, Star } from "lucide-react";
import type { Player } from "@shared/schema";

interface LedgerRowProps {
  player: Player;
  rank: number;
  balance?: number;
  gamesPlayed?: number;
}

export function LedgerRow({ player, rank, balance, gamesPlayed }: LedgerRowProps) {
  const displayBalance = balance ?? player.totalBalance;
  const displayGames = gamesPlayed ?? player.gamesPlayed;
  const isPositive = displayBalance > 0;
  
  return (
    <div 
      className="flex items-center justify-between py-4 px-4 border-b border-border last:border-b-0 hover-elevate"
      data-testid={`ledger-row-${player.id}`}
    >
      <div className="flex items-center gap-4">
        <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
          rank <= 3 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
        }`}>
          {rank === 1 ? <Trophy className="w-4 h-4 text-yellow-500" /> : rank}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-semibold text-base" data-testid={`ledger-name-${player.id}`}>
              {player.name}
            </p>
            {player.winStreak >= 2 && (
              <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-none px-1.5 py-0 h-5">
                <Zap className="w-3 h-3 mr-1 fill-current" />
                {player.winStreak}
              </Badge>
            )}
            {player.gamesPlayed >= 10 && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-none px-1.5 py-0 h-5">
                <Star className="w-3 h-3 mr-1 fill-current" />
                Pro
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs text-muted-foreground">
              {displayGames} game{displayGames !== 1 ? "s" : ""}
            </span>
            {player.maxWinStreak > 0 && (
              <span className="text-[10px] text-muted-foreground flex items-center">
                <Target className="w-2.5 h-2.5 mr-0.5" />
                PB: {player.maxWinStreak}
              </span>
            )}
          </div>
        </div>
      </div>
      
      <div className="text-right">
        <p 
          className={`font-bold text-lg ${
            isPositive ? "text-chart-1" : displayBalance < 0 ? "text-destructive" : "text-muted-foreground"
          }`}
          data-testid={`ledger-balance-${player.id}`}
        >
          {isPositive ? "+" : ""}₹{displayBalance.toLocaleString('en-IN')}
        </p>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
          Net Balance
        </p>
      </div>
    </div>
  );
}
