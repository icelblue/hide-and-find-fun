// PetHealthBadge — Shows pet health status (sick/injured/virus) visually
import { Card, CardContent } from "@/components/ui/card";

interface PetHealthBadgeProps {
  activeEvents: any[];
  petName?: string;
  compact?: boolean; // For inline display (PlayerProfilePage)
}

export function PetHealthBadge({ activeEvents, petName, compact = false }: PetHealthBadgeProps) {
  if (activeEvents.length === 0) return null;

  if (compact) {
    return (
      <div className="flex items-center gap-1 mt-1">
        {activeEvents.map((ev: any) => (
          <span key={ev.id} className="text-sm animate-pulse" title={`${ev.event_name}: +${ev.xp_change} XP`}>
            {ev.event_icon}
          </span>
        ))}
        <span className="text-[10px] text-destructive font-semibold">Malalt!</span>
      </div>
    );
  }

  return (
    <Card className="glass border-destructive/40 animate-fade-in">
      <CardContent className="py-3">
        <p className="text-sm font-bold text-destructive mb-2">
          ⚠️ {petName ?? "La mascota"} està malalt!
        </p>
        {activeEvents.map((ev: any) => (
          <div key={ev.id} className="flex items-center gap-2 text-sm mb-1">
            <span className="text-lg">{ev.event_icon}</span>
            <span>{ev.event_name}: <span className="text-destructive font-semibold">+{ev.xp_change} XP</span></span>
          </div>
        ))}
        <p className="text-[10px] text-muted-foreground mt-2">Usa consumibles per curar-lo i reduir XP!</p>
      </CardContent>
    </Card>
  );
}
