// ============================================================
// useGameLoader — encapsula loadGame + scheduleLoadGame
// ------------------------------------------------------------
// Extracció mecànica de la lògica que abans vivia inline a GamePage. No canvia
// cap comportament: rep tots els setters d'estat i refs compartits com a args.
// ============================================================
import { useCallback, type MutableRefObject, type Dispatch, type SetStateAction } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { logError } from "@/components/ErrorBoundary";
import {
  getItemsByScenario, getConnectedScenarios, ensureTokensReset, autoFixMissingScenario,
  getItemInteractions, getDirtyItemsForGame, getBreakableItemsForGame,
  getUnprocessedSocialItems, markSocialItemProcessed, SOCIAL_ITEMS, OUTDOOR_SCENARIOS,
} from "@/lib/supabase-helpers";
import {
  loadPersonalCombatData, loadPersonalCombatDataFromRooms, neighborsOf,
  type PersonalCombatData,
} from "@/lib/personal-pvp-adapter";
import { getGameReward } from "@/lib/reward-helpers";
import { parseTools, type Phase, type PlayerTools } from "@/lib/game-types";
import type { SpecialRevealData } from "@/components/game/SpecialReveal";

type Setter<T> = Dispatch<SetStateAction<T>>;

export interface UseGameLoaderSetters {
  setGame: Setter<any>;
  setPlayer: Setter<any>;
  setRival: Setter<any>;
  setPhase: Setter<Phase>;
  setPlayerTools: Setter<PlayerTools>;
  setHideStep: Setter<number>;
  setBonusAvailable: Setter<number>;
  setRivalNearby: Setter<boolean>;
  setRivalTraits: Setter<{ trait1: string | null; trait2: string | null }>;
  setConnectedScenarios: Setter<any[]>;
  setDirtyItems: Setter<Set<string>>;
  setBreakableItems: Setter<Set<string>>;
  setItemInteractions: Setter<any[]>;
  setMoveHistory: Setter<any[]>;
  setGameBreaks: Setter<Set<string>>;
  setIlluminatedScenarios: Setter<Set<string>>;
  setScenarioIsDarkState: Setter<boolean>;
  setCurrentScenarioItems: Setter<any[]>;
  setReward: Setter<any>;
  setRivalSmokeBombAt: Setter<string | null>;
  setBananaBlockedSpot: Setter<string | null>;
  setBananaEffect: Setter<boolean>;
  setTrollEffect: Setter<{ message: string; emoji: string; animation: string } | null>;
  setReceivedMessage: Setter<string | null>;
}

export interface UseGameLoaderOpts {
  gameId: string | undefined;
  user: { id: string } | null;
  t: (key: string, opts?: any) => string;
  personalDataRef: MutableRefObject<PersonalCombatData | null>;
  isLoadingGameRef: MutableRefObject<boolean>;
  pendingReloadRef: MutableRefObject<boolean>;
  realtimeReloadTimeoutRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  setters: UseGameLoaderSetters;
}

export interface UseGameLoaderResult {
  loadGame: () => Promise<void>;
  scheduleLoadGame: (delay?: number) => void;
}

export function useGameLoader(opts: UseGameLoaderOpts): UseGameLoaderResult {
  const {
    gameId, user, t, personalDataRef,
    isLoadingGameRef, pendingReloadRef, realtimeReloadTimeoutRef,
    setters: S,
  } = opts;

  const loadGame = useCallback(async () => {
    if (!gameId || !user) return;

    if (isLoadingGameRef.current) {
      pendingReloadRef.current = true;
      return;
    }

    isLoadingGameRef.current = true;

    try {
      // ── BATCH 1: Core game state (always needed) ──
      const [{ data: gameData }, { data: playerData }, { data: safePlayers }] = await Promise.all([
        supabase.from("games").select("*").eq("id", gameId).single(),
        supabase.from("game_players").select("*").eq("game_id", gameId).eq("user_id", user.id).single(),
        supabase.rpc("get_safe_game_players" as any, { _game_id: gameId }),
      ]);
      const safePlayersList = (safePlayers as any[]) ?? [];
      const rivalData = safePlayersList.find((p: any) => p.user_id !== user.id) ?? null;

      S.setGame(gameData);
      S.setPhase((gameData?.status as Phase) ?? "waiting");
      S.setRival(rivalData);

      if (playerData && (gameData?.status === "playing" || gameData?.status === "hiding")) {
        const resetTokens = await ensureTokensReset(playerData);
        playerData.tokens_remaining = resetTokens;
        playerData.tokens_last_reset = new Date().toISOString().split("T")[0];

        if (gameData?.status === "playing" && !playerData.current_scenario_id && playerData.hidden_item_id) {
          const fixedId = await autoFixMissingScenario(gameId, user.id, playerData.hidden_item_id);
          playerData.current_scenario_id = fixedId;
        }
      }
      S.setPlayer(playerData);
      S.setPlayerTools(parseTools(playerData?.tools));

      if (playerData?.has_hidden) S.setHideStep(4);

      const isStoryGame = !!(gameData as any)?.is_story;
      const isPlaying = gameData?.status === "playing";
      const isFinished = gameData?.status === "finished";
      const currentScenId = playerData?.current_scenario_id ?? "";

      // ── BATCH 2: ALL secondary queries in ONE Promise.all ──
      type QKey = "profile" | "hiddenItem" | "items" | "connected" | "moves" | "tagMoves" | "curScen" | "reward" | "smokeBombs" | "blockedSocial" | "unprocessedSocial" | "traits" | "interactions";
      const batch: Partial<Record<QKey, PromiseLike<any>>> = {};

      if (isPlaying) {
        batch.profile = supabase.from("profiles").select("bonus_tokens").eq("user_id", user.id).single();
      }
      if (!isStoryGame && isPlaying && playerData?.hidden_item_id && rivalData?.current_scenario_id) {
        batch.hiddenItem = supabase.from("items").select("scenario_id").eq("id", playerData.hidden_item_id).single();
      }
      if (!isStoryGame && isPlaying) {
        batch.traits = supabase.rpc("get_rival_traits" as any, { _game_id: gameId });
      }
      const isPersonalGame = (gameData as any)?.game_mode === "personal_pvp";
      if (isPlaying && currentScenId && !isPersonalGame) {
        batch.items = getItemsByScenario(currentScenId);
        batch.connected = getConnectedScenarios(currentScenId);
        batch.curScen = supabase.from("scenarios").select("name").eq("id", currentScenId).single();
      }
      if (isPlaying || isFinished) {
        batch.moves = supabase.from("game_moves")
          .select("*, scenarios:target_scenario_id(name, icon), items:target_item_id(name, icon)")
          .eq("game_id", gameId).eq("player_id", user.id)
          .order("turn_number", { ascending: false });
        batch.tagMoves = supabase.from("game_moves").select("bonus_value, player_id")
          .eq("game_id", gameId).like("bonus_value", "tag:%")
          .order("created_at", { ascending: true });
      }

      if (isFinished && gameData?.winner_id === user.id) {
        batch.reward = getGameReward(gameId, user.id);
      }
      if (isPlaying && !isStoryGame && rivalData) {
        batch.smokeBombs = supabase.from("game_social_items").select("created_at")
          .eq("game_id", gameId).eq("from_player_id", rivalData.user_id)
          .eq("item_type", "smoke_bomb").eq("blocked_by_shield", false)
          .order("created_at", { ascending: false }).limit(1);
        batch.blockedSocial = supabase.from("game_social_items").select("*")
          .eq("game_id", gameId).eq("to_player_id", user.id)
          .eq("blocked_by_shield", true).eq("processed", false);
        batch.unprocessedSocial = getUnprocessedSocialItems(gameId, user.id);
      }

      const keys = Object.keys(batch) as QKey[];
      const results = await Promise.all(keys.map(k => batch[k]!));
      const R: Partial<Record<QKey, any>> = {};
      keys.forEach((k, i) => { R[k] = results[i]; });

      if (R.profile) S.setBonusAvailable(R.profile.data?.bonus_tokens ?? 0);

      if (R.hiddenItem) {
        S.setRivalNearby(R.hiddenItem.data?.scenario_id === rivalData?.current_scenario_id);
      } else {
        S.setRivalNearby(false);
      }

      if (R.traits) {
        const traitsData = R.traits.data as any;
        if (traitsData) {
          S.setRivalTraits({ trait1: traitsData.trait1 ?? null, trait2: traitsData.trait2 ?? null });
        } else {
          S.setRivalTraits({ trait1: null, trait2: null });
        }
      } else {
        S.setRivalTraits({ trait1: null, trait2: null });
      }

      let loadedItems: any[] = [];
      let loadedInteractions: any[] = [];

      if (isPlaying && isPersonalGame) {
        try {
          const hostId = (gameData as any)?.created_by;
          const guestId = (gameData as any)?.invited_user_id;
          const personal = hostId && guestId
            ? await loadPersonalCombatDataFromRooms(hostId, guestId)
            : await loadPersonalCombatData(
                (gameData as any)?.host_space_snapshot,
                (gameData as any)?.guest_space_snapshot
              );
          personalDataRef.current = personal;
          loadedItems = currentScenId
            ? (personal.itemsByScenario.get(currentScenId) ?? [])
            : personal.items;
          const scenariosById = new Map(personal.scenarios.map((s) => [s.id, s]));
          const neighbors = currentScenId ? neighborsOf(currentScenId, personal.connections, scenariosById) : [];
          S.setConnectedScenarios(neighbors);
          S.setDirtyItems(new Set());
          S.setBreakableItems(new Set());
        } catch (err: any) {
          logError(err.message, err.stack, "useGameLoader:loadPersonalCombatData");
        }
      } else if (isPlaying && currentScenId && R.items) {
        loadedItems = Array.isArray(R.items) ? R.items : (R.items?.data ?? R.items ?? []);
        if (R.connected) {
          const conn = Array.isArray(R.connected) ? R.connected : (R.connected?.data ?? []);
          S.setConnectedScenarios(conn);
        }
        const gameDirty = getDirtyItemsForGame(loadedItems, gameId);
        S.setDirtyItems(gameDirty);
        const gameBreakable = getBreakableItemsForGame(loadedItems, gameId);
        S.setBreakableItems(gameBreakable);

        const hasDirtyHere = loadedItems.some((i: any) => gameDirty.has(i.id));
        if (hasDirtyHere && playerData) {
          const tools = parseTools(playerData.tools);
          if (tools.drap === 0) {
            supabase.rpc("execute_grant_drap_if_available" as any, { _game_id: gameId }).then(({ data }) => {
              if ((data as any)?.granted) {
                tools.drap = 1;
                playerData.tools = tools;
                S.setPlayerTools({ ...tools });
                toast.info(t("game.toasts.foundDrap"), { duration: 4000 });
              }
            });
          }
        }
        loadedInteractions = await getItemInteractions(loadedItems.map((i: any) => i.id));
        S.setItemInteractions(loadedInteractions);
      }

      const allMoves = R.moves?.data ?? [];
      S.setMoveHistory(allMoves);

      const allGameMoves = R.tagMoves?.data ?? [];
      const breaks = new Set<string>();
      const litScenarios = new Set<string>();
      for (const m of allGameMoves) {
        const val = (m.bonus_value as string) ?? "";
        if (val.startsWith("tag:break:")) breaks.add(val.replace("tag:break:", ""));
        if (val.startsWith("tag:fix:")) breaks.delete(val.replace("tag:fix:", ""));
        if (val.startsWith("tag:clean:")) breaks.add(`clean:${val.replace("tag:clean:", "")}`);
        if (val.startsWith("tag:light_on:")) litScenarios.add(val.replace("tag:light_on:", ""));
        if (val.startsWith("tag:light_off:")) litScenarios.delete(val.replace("tag:light_off:", ""));
        if (val.startsWith("tag:flashlight:")) litScenarios.add(val.replace("tag:flashlight:", ""));
      }
      S.setGameBreaks(breaks);
      S.setIlluminatedScenarios(litScenarios);

      const revealed = new Set<string>();
      for (const ia of loadedInteractions) {
        if (ia.effect_type === "reveal_items") {
          const wasUsed = allMoves.some((m: any) => m.target_item_id === ia.item_id);
          if (wasUsed) {
            const ids = (ia.effect_data as any)?.reveal_item_ids ?? [];
            ids.forEach((id: string) => revealed.add(id));
          }
        }
      }

      let isOutdoor = false;
      if (R.curScen && !isPersonalGame) {
        isOutdoor = OUTDOOR_SCENARIOS.includes(R.curScen.data?.name ?? "");
      }
      let indoorLightOff = false;
      if (!isOutdoor && currentScenId && !isPersonalGame) {
        for (const m of allGameMoves) {
          const val = (m.bonus_value as string) ?? "";
          if (val === `tag:light_off:${currentScenId}`) indoorLightOff = true;
          if (val === `tag:light_on:${currentScenId}`) indoorLightOff = false;
        }
      }
      const scenarioIsDark = isPlaying && !isPersonalGame
        ? (isOutdoor ? !litScenarios.has(currentScenId) : indoorLightOff)
        : false;
      S.setScenarioIsDarkState(scenarioIsDark);

      const visibleItems = loadedItems.filter((i: any) => {
        if (scenarioIsDark) return !i.hidden;
        if (!i.hidden) return true;
        if (revealed.has(i.id)) return true;
        if (isOutdoor && litScenarios.has(currentScenId)) return true;
        return false;
      });
      S.setCurrentScenarioItems(visibleItems);

      if (R.reward) S.setReward(R.reward);

      if (R.smokeBombs) {
        S.setRivalSmokeBombAt(R.smokeBombs.data?.[0]?.created_at ?? null);
      } else {
        S.setRivalSmokeBombAt(null);
      }

      if (isPlaying && !isStoryGame) {
        const blockedItems = R.blockedSocial?.data ?? [];
        const markPromises: Promise<any>[] = [];
        for (const blocked of blockedItems) {
          const info = SOCIAL_ITEMS.find(i => i.type === blocked.item_type);
          const itemName = info ? `${info.icon} ${t(info.nameKey)}` : "";
          toast.success(t("game.toasts.shieldBlocked", { item: itemName }), { duration: 5000 });
          markPromises.push(markSocialItemProcessed(blocked.id));
        }

        const unprocessed = R.unprocessedSocial ?? [];
        for (const item of unprocessed) {
          if (item.item_type === "banana") {
            const allPositions = ["sobre", "sota", "dins"] as const;
            const randomPos = allPositions[Math.floor(Math.random() * allPositions.length)];
            if (loadedItems.length > 0) {
              const randomItem = loadedItems[Math.floor(Math.random() * loadedItems.length)];
              S.setBananaBlockedSpot(`${randomItem.id}:${randomPos}`);
              S.setBananaEffect(true);
              toast.warning(t("game.toasts.bananaHit"), { duration: 5000 });
              S.setTrollEffect({ message: "🍌 PLÀTAN PODRIT!\nUna posició ha quedat bloquejada!", emoji: "🍌", animation: "shake" });
              setTimeout(() => S.setTrollEffect(null), 4000);
            }
          } else if (item.item_type === "smoke_bomb") {
            toast.warning(t("game.toasts.smokeBombUsed"), { duration: 5000 });
          } else if (item.item_type === "swap") {
            toast.warning(t("game.toasts.swapUsed"), { duration: 5000 });
          } else if (item.item_type === "message" && item.message_text) {
            S.setReceivedMessage(item.message_text);
          }
          markPromises.push(markSocialItemProcessed(item.id));
        }
        if (markPromises.length > 0) await Promise.all(markPromises);
      }
    } finally {
      isLoadingGameRef.current = false;
      if (pendingReloadRef.current) {
        pendingReloadRef.current = false;
        setTimeout(() => {
          void loadGame();
        }, 0);
      }
    }
  }, [gameId, user, t, personalDataRef, isLoadingGameRef, pendingReloadRef, S]);

  const scheduleLoadGame = useCallback((delay = 300) => {
    if (realtimeReloadTimeoutRef.current) {
      clearTimeout(realtimeReloadTimeoutRef.current);
    }
    realtimeReloadTimeoutRef.current = setTimeout(() => {
      realtimeReloadTimeoutRef.current = null;
      void loadGame();
    }, delay);
  }, [loadGame, realtimeReloadTimeoutRef]);

  // Silence unused-imports warning for SpecialRevealData (kept for consumers)
  void (undefined as SpecialRevealData | undefined);

  return { loadGame, scheduleLoadGame };
}
