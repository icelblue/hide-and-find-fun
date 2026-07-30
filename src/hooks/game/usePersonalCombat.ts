// ============================================================
// usePersonalCombat — override d'escenaris/objectes en mode personal_pvp
// ------------------------------------------------------------
// Carrega la unió multi-sala (host+guest) o els snapshots legacy quan la partida
// és `personal_pvp`, i puja el resultat als setters de GamePage. Manté el ref
// `personalDataRef` per accés síncron des dels handlers (ex. handleSelectScenario).
// ============================================================
import { useEffect, useRef, type MutableRefObject, type Dispatch, type SetStateAction } from "react";
import { asError } from "@/lib/errors";
import { logError } from "@/components/ErrorBoundary";
import { useLanguage } from "@/i18n/LanguageProvider";
import {
  loadPersonalCombatData,
  loadPersonalCombatDataFromRooms,
  type PersonalCombatData,
} from "@/lib/personal-pvp-adapter";

export interface UsePersonalCombatOpts {
  game: Record<string, any> | null;
  setScenarios: Dispatch<SetStateAction<Record<string, any>[]>>;
  setObjects: Dispatch<SetStateAction<Record<string, any>[]>>;
}

export interface UsePersonalCombatResult {
  isPersonalGame: boolean;
  personalDataRef: MutableRefObject<PersonalCombatData | null>;
}

export function usePersonalCombat({ game, setScenarios, setObjects }: UsePersonalCombatOpts): UsePersonalCombatResult {
  const personalDataRef = useRef<PersonalCombatData | null>(null);
  const isPersonalGame = game?.game_mode === "personal_pvp";
  const { t } = useLanguage();

  useEffect(() => {
    if (!isPersonalGame || !game) return;
    let cancelled = false;
    (async () => {
      try {
        const hostId = game.created_by as string | undefined;
        // Partida personal: SEMPRE es juga a l'apartament de l'amfitrió (qui reta).
        // El rival no necessita tenir espai propi decorat.
        const raw = hostId
          ? await loadPersonalCombatDataFromRooms(hostId, hostId)
          : await loadPersonalCombatData(
              (game as Record<string, any>).host_space_snapshot,
              (game as Record<string, any>).guest_space_snapshot
            );
        if (cancelled) return;
        // El catàleg guarda claus i18n (`furniture.bed_basic`); cal traduir-les
        // abans de mostrar-les a la UI.
        const label = (n: string) => (n?.includes(".") ? t(n, n.split(".").pop() ?? n) : n);
        const personal: PersonalCombatData = {
          ...raw,
          objects: raw.objects.map((o) => ({ ...o, name: label(o.name) })),
          items: raw.items.map((i) => ({ ...i, name: label(i.name) })),
          itemsByScenario: new Map(
            [...raw.itemsByScenario].map(([k, v]) => [k, v.map((i) => ({ ...i, name: label(i.name) }))])
          ),
        };
        personalDataRef.current = personal;
        setScenarios(personal.scenarios);
        setObjects(personal.objects);
      } catch (_raw_err) { const err = asError(_raw_err);
        logError(err.message, err.stack, "usePersonalCombat");
      }
    })();
    return () => { cancelled = true; };
  }, [isPersonalGame, game, setScenarios, setObjects, t]);

  return { isPersonalGame, personalDataRef };
}
