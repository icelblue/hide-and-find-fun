// ============================================================
// useGameRealtime — subscripció Supabase realtime + debounced reload
// ------------------------------------------------------------
// Encapsula el canal `game-<id>` (games, game_players, game_social_items) i el
// handler d'items socials entrants. També fa el load inicial + pobla scenaris/
// objects globals. Comportament idèntic al codi que abans vivia inline.
// ============================================================
import { useCallback, useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  getScenarios, getObjects, getItemsByScenario, markSocialItemProcessed,
} from "@/lib/supabase-helpers";

export interface UseGameRealtimeOpts {
  gameId: string | undefined;
  user: { id: string } | null;
  isStory: boolean;
  t: (key: string, opts?: any) => string;
  loadGame: () => Promise<void>;
  scheduleLoadGame: (delay?: number) => void;
  currentScenarioItems: any[];
  player: any;
  setScenarios: Dispatch<SetStateAction<any[]>>;
  setObjects: Dispatch<SetStateAction<any[]>>;
  setBananaBlockedSpot: Dispatch<SetStateAction<string | null>>;
  setBananaEffect: Dispatch<SetStateAction<boolean>>;
  setTrollEffect: Dispatch<SetStateAction<{ message: string; emoji: string; animation: string } | null>>;
  setReceivedMessage: Dispatch<SetStateAction<string | null>>;
}

export function useGameRealtime(opts: UseGameRealtimeOpts): void {
  const {
    gameId, user, isStory, t, loadGame, scheduleLoadGame,
    currentScenarioItems, player,
    setScenarios, setObjects, setBananaBlockedSpot, setBananaEffect,
    setTrollEffect, setReceivedMessage,
  } = opts;

  const currentScenarioItemsRef = useRef(currentScenarioItems);
  const playerRef = useRef(player);

  useEffect(() => {
    currentScenarioItemsRef.current = currentScenarioItems;
    playerRef.current = player;
  }, [currentScenarioItems, player]);

  const handleRealtimeSocialItem = useCallback(async (item: any) => {
    if (!user || item?.to_player_id !== user.id || item?.processed) return;
    if (item.blocked_by_shield) return;

    if (item.item_type === "banana") {
      const latestItems = currentScenarioItemsRef.current;
      const latestPlayer = playerRef.current;
      const scenarioItems = latestItems.length > 0
        ? latestItems
        : latestPlayer?.current_scenario_id
          ? await getItemsByScenario(latestPlayer.current_scenario_id)
          : [];

      if (scenarioItems.length > 0) {
        const allPositions = ["sobre", "sota", "dins"] as const;
        const randomPos = allPositions[Math.floor(Math.random() * allPositions.length)];
        const randomItem = scenarioItems[Math.floor(Math.random() * scenarioItems.length)];
        setBananaBlockedSpot(`${randomItem.id}:${randomPos}`);
      }

      setBananaEffect(true);
      toast.warning(t("game.toasts.bananaHit"), { duration: 5000 });
      setTrollEffect({ message: t("game.social.bananaTroll"), emoji: "🍌", animation: "shake" });
      setTimeout(() => setTrollEffect(null), 4000);
      await markSocialItemProcessed(item.id);
      return;
    }

    if (item.item_type === "message" && item.message_text) {
      setReceivedMessage(item.message_text);
      await markSocialItemProcessed(item.id);
      return;
    }

    if (item.item_type === "smoke_bomb") {
      toast.warning(t("game.toasts.smokeBombUsed"), { duration: 5000 });
      await markSocialItemProcessed(item.id);
    }
  }, [user, t, setBananaBlockedSpot, setBananaEffect, setTrollEffect, setReceivedMessage]);

  useEffect(() => {
    if (!gameId || !user) return;
    void loadGame();
    getScenarios().then(setScenarios).catch(() => toast.error(t("game.errors.loadScenarios")));
    getObjects().then(setObjects).catch(() => toast.error(t("game.errors.loadObjects")));

    if (isStory) return;

    const channel = supabase
      .channel(`game-${gameId}`)
      // NOTA: game_players és FORA de la publicació realtime (seguretat:
      // filtraria dades ocultes) — subscriure-s'hi no dispara mai.
      // El "pulse" servidor (trg_pulse_game_on_move) toca games.updated_at
      // a cada moviment, així que escoltar `games` cobreix tota l'activitat.
      .on("postgres_changes", { event: "*", schema: "public", table: "games", filter: `id=eq.${gameId}` }, () => scheduleLoadGame())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "game_social_items", filter: `game_id=eq.${gameId}` }, (payload: any) => {
        void handleRealtimeSocialItem(payload.new);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, user, loadGame, isStory, handleRealtimeSocialItem, scheduleLoadGame, setScenarios, setObjects, t]);
}
