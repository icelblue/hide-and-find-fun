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
import {
  loadPersonalCombatData,
  loadPersonalCombatDataFromRooms,
  type PersonalCombatData,
} from "@/lib/personal-pvp-adapter";

export interface UsePersonalCombatOpts {
  game: any;
  setScenarios: Dispatch<SetStateAction<any[]>>;
  setObjects: Dispatch<SetStateAction<any[]>>;
}

export interface UsePersonalCombatResult {
  isPersonalGame: boolean;
  personalDataRef: MutableRefObject<PersonalCombatData | null>;
}

export function usePersonalCombat({ game, setScenarios, setObjects }: UsePersonalCombatOpts): UsePersonalCombatResult {
  const personalDataRef = useRef<PersonalCombatData | null>(null);
  const isPersonalGame = game?.game_mode === "personal_pvp";

  useEffect(() => {
    if (!isPersonalGame || !game) return;
    let cancelled = false;
    (async () => {
      try {
        const hostId = game.created_by;
        const guestId = game.invited_user_id;
        const personal = hostId && guestId
          ? await loadPersonalCombatDataFromRooms(hostId, guestId)
          : await loadPersonalCombatData(
              game.host_space_snapshot,
              game.guest_space_snapshot
            );
        if (cancelled) return;
        personalDataRef.current = personal;
        setScenarios(personal.scenarios);
        setObjects(personal.objects);
      } catch (_raw_err) { const err = asError(_raw_err);
        logError(err.message, err.stack, "usePersonalCombat");
      }
    })();
    return () => { cancelled = true; };
  }, [isPersonalGame, game, setScenarios, setObjects]);

  return { isPersonalGame, personalDataRef };
}
