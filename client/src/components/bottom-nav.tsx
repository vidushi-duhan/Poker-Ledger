import { useLocation, Link } from "wouter";
import { Gamepad2, BookOpen, Clock, Plus } from "lucide-react";

const navItems = [
  { path: "/", label: "Active Game", icon: Gamepad2 },
  { path: "/ledger", label: "Ledger", icon: BookOpen },
  { path: "/history", label: "History", icon: Clock },
  { path: "/new-game", label: "New Game", icon: Plus },
];

export function BottomNav() {
  const [location] = useLocation();

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 bg-card border-t border-card-border z-50"
      data-testid="nav-bottom"
    >
      <div className="max-w-2xl mx-auto flex items-stretch h-16">
        {navItems.map((item) => {
          const isActive = location === item.path;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors hover-elevate active-elevate-2 ${
                isActive 
                  ? "text-foreground" 
                  : "text-muted-foreground"
              }`}
              data-testid={`nav-link-${item.label.toLowerCase().replace(/\s/g, '-')}`}
            >
              <Icon 
                className={`w-5 h-5 ${isActive ? "stroke-[2.5px]" : "stroke-[1.5px]"}`} 
              />
              <span 
                className={`text-xs ${isActive ? "font-semibold" : "font-normal"}`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
      <div className="h-safe-area-inset-bottom bg-card" />
    </nav>
  );
}
