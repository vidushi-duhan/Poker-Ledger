import { ArrowRight } from "lucide-react";
import type { SettlementWithPlayers } from "@shared/schema";

interface SettlementRowProps {
  settlement: SettlementWithPlayers;
}

export function SettlementRow({ settlement }: SettlementRowProps) {
  return (
    <div 
      className="flex items-center justify-between py-4 px-4 bg-card rounded-lg border border-card-border"
      data-testid={`settlement-row-${settlement.id}`}
    >
      <div className="flex items-center gap-3 flex-1">
        <div className="flex-1 text-right">
          <p className="font-medium text-base" data-testid={`settlement-from-${settlement.id}`}>
            {settlement.fromPlayer.name}
          </p>
        </div>
        
        <div className="flex items-center gap-2 px-3">
          <ArrowRight className="w-5 h-5 text-muted-foreground" />
        </div>
        
        <div className="flex-1">
          <p className="font-medium text-base" data-testid={`settlement-to-${settlement.id}`}>
            {settlement.toPlayer.name}
          </p>
        </div>
      </div>
      
      <div className="ml-4">
        <p 
          className="text-xl font-semibold text-foreground"
          data-testid={`settlement-amount-${settlement.id}`}
        >
          <span className="opacity-70">₹</span>{settlement.amount.toLocaleString('en-IN')}
        </p>
      </div>
    </div>
  );
}
