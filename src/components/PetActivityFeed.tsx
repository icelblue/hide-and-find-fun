// PetActivityFeed — Llista de visites recents de mascotes (reutilitzable
// en perfil propi i perfil públic d'altres jugadors).
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useT } from "@/i18n/LanguageProvider";
import { outcomeLabel, type RecentVisit } from "@/lib/pet-social";

interface Props {
  visits: RecentVisit[];
  ownUserId?: string | null;
  /** Si true: títol "El teu...". Si false: títol "Activitat de ...". */
  isOwn: boolean;
  /** Nom de la mascota visualitzada (per al títol quan no és pròpia) */
  petName?: string;
}

export function PetActivityFeed({ visits, ownUserId, isOwn, petName }: Props) {
  const navigate = useNavigate();
  const t = useT();
  if (!visits || visits.length === 0) return null;

  const title = isOwn
    ? t("pet.activityFeed")
    : t("pet.activityOf", { name: petName ?? t("pet.thePet") });

  return (
    <div className="mb-4">
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
        {title}
      </h2>
      <div className="space-y-1.5">
        {visits.map((v) => {
          const o = outcomeLabel(v.outcome);
          let action: string;
          if (isOwn) {
            action = v.role === "host" ? "ha vingut a jugar" : "vas enviar-la a";
          } else {
            // viewing someone else's profile: describe from their pet's perspective
            action = v.role === "host" ? "ha rebut visita de" : "ha visitat a";
          }
          const mins = Math.floor((Date.now() - new Date(v.resolved_at).getTime()) / 60000);
          const timeStr = mins < 60 ? `${mins}m` : mins < 1440 ? `${Math.floor(mins / 60)}h` : `${Math.floor(mins / 1440)}d`;
          const isSelfRef = ownUserId && v.other_user_id === ownUserId;
          return (
            <Card key={v.id} className="glass">
              <CardContent className="py-2 px-3 flex items-center gap-2">
                <span className="text-xl">{v.other_pet_icon}</span>
                <div className="flex-1 min-w-0">
                  <button
                    onClick={() => navigate(`/player/${v.other_user_id}`)}
                    className="text-xs font-semibold text-primary hover:underline truncate block">
                    {isSelfRef ? "la teva mascota" : v.other_pet_name}
                  </button>
                  <p className="text-[11px] text-muted-foreground">
                    {action} · <span className={`font-semibold ${o.color}`}>{o.icon} {o.text}</span>
                  </p>
                </div>
                <span className="text-[10px] text-muted-foreground/60 shrink-0">{timeStr}</span>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
