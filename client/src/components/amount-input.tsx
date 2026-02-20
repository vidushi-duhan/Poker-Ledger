import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AmountInputProps {
  playerId: string;
  playerName: string;
  value: string;
  onChange: (value: string) => void;
  totalBuyIn: number;
}

export function AmountInput({
  playerId,
  playerName,
  value,
  onChange,
  totalBuyIn,
}: AmountInputProps) {
  return (
    <div 
      className="py-3 px-4 border-b border-border last:border-b-0"
      data-testid={`amount-input-row-${playerId}`}
    >
      <div className="flex items-center justify-between mb-2">
        <Label htmlFor={`amount-${playerId}`} className="font-medium">
          {playerName}
        </Label>
        <span className="text-sm text-muted-foreground">
          Buy-in: {totalBuyIn.toLocaleString('en-IN')} chips
        </span>
      </div>
      <div className="relative">
        <Input
          id={`amount-${playerId}`}
          type="number"
          inputMode="numeric"
          placeholder="Ending chips"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-12 text-lg text-right px-4"
          data-testid={`input-final-amount-${playerId}`}
        />
      </div>
    </div>
  );
}
