// 🔒 Component v6 — Mode Història. Targeta evolució + nivell + habilitats. i18n.
import { getPetEvolution, MAX_PET_XP } from "@/lib/story-helpers";
import { SKILLS, levelFromXp, xpToNextLevel, MAX_LEVEL } from "@/lib/story-progression";
import { useT } from "@/i18n/LanguageProvider";


interface Props {
  pet: { pet_name: string; pet_icon: string; xp: number; max_xp: number };
  unlockedSkills: Set<string>;
}

export function PetEvolutionCard({ pet, unlockedSkills }: Props) {
  const t = useT();
  const xp = pet.xp ?? 0;
  const max = pet.max_xp ?? MAX_PET_XP;
  const evo = getPetEvolution(xp, max);
  const level = levelFromXp(xp);
  const { remaining } = xpToNextLevel(xp);

  return (
    <div className="glass rounded-2xl p-4 border border-border/30 mb-4">
      <div className="flex items-center gap-3 mb-3">
        <div className={`relative inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br ${evo.glow} ring-2 ${evo.ring}`}>
          <span className="text-5xl">{pet.pet_icon}</span>
          <span className="absolute -bottom-1 -right-1 bg-background border border-border rounded-full w-7 h-7 flex items-center justify-center text-[10px] font-bold">
            {t("evolution.level", { n: level })}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-bold truncate">{pet.pet_name}</p>
          <p className="text-[11px] text-muted-foreground">{evo.badge} {t(`petTier.${evo.key}`, evo.label)}</p>
          <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden mt-1.5">
            <div className="h-1.5 rounded-full bg-accent transition-all duration-500" style={{ width: `${Math.min(xp / max * 100, 100)}%` }} />
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {level >= MAX_LEVEL ? t("evolution.maxLevel") : t("evolution.xpToNext", { xp: remaining, n: level + 1 })}
          </p>
        </div>
      </div>


      <div className="flex flex-wrap gap-1.5">
        {SKILLS.map((s) => {
          const unlocked = unlockedSkills.has(s.id);
          return (
            <div
              key={s.id}
              title={`${s.name} — ${s.description}${unlocked ? "" : ` (Lv${s.level})`}`}
              className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] border ${
                unlocked
                  ? "border-accent/50 bg-accent/10 text-foreground"
                  : "border-border/30 bg-muted/30 text-muted-foreground/60"
              }`}
            >
              <span>{s.icon}</span>
              {!unlocked && <span className="opacity-60">{t("evolution.skillLocked", { n: s.level })}</span>}

              {!unlocked && <span className="opacity-60">Lv{s.level}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
