// PetHealthBadge — Shows pet health status (sick/injured/virus) visually
import { Card, CardContent } from "@/components/ui/card";
import { PET_CONSUMABLES } from "@/lib/story-helpers";

const EVENT_CURE_MAP: Record<string, { icon: string; name: string }> = {};
for (const c of PET_CONSUMABLES) {
  EVENT_CURE_MAP[c.curesEvent] = { icon: c.icon, name: c.name };
}

interface PetHealthBadgeProps {
  activeEvents: any[];
  petName?: string;
  compact?: boolean;
}

export function PetHealthBadge({ activeEvents, petName, compact = false }: PetHealthBadgeProps) {
  if (activeEvents.length === 0) return null;

  if (compact) {
    return (
      <div className="flex items-center gap-1 mt-1">
        {activeEvents.map((ev) => (
          <span key={ev.id} className="text-sm animate-pulse" title={`${ev.event_name}: +${ev.xp_change} XP — Cura: ${EVENT_CURE_MAP[ev.event_type]?.icon ?? "?"} ${EVENT_CURE_MAP[ev.event_type]?.name ?? "?"}`}>
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
        {activeEvents.map((ev) => {
          const cure = EVENT_CURE_MAP[ev.event_type];
          return (
            <div key={ev.id} className="flex items-center gap-2 text-sm mb-1.5">
              <span className="text-lg">{ev.event_icon}</span>
              <div>
                <span>{ev.event_name}: <span className="text-destructive font-semibold">+{ev.xp_change} XP</span></span>
                {cure && (
                  <p className="text-[10px] text-accent">💊 Cura amb {cure.icon} {cure.name}</p>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
