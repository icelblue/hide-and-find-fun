// ============================================================
// GamePage.tsx — Motor principal del joc (refactoritzat v1.8)
// ============================================================
// Components externalitzats:
//   - ItemActions → src/components/game/ItemActions.tsx
//   - GameFinishedPhase → src/components/game/GameFinishedPhase.tsx
//   - SocialItemsPanel → src/components/game/SocialItemsPanel.tsx
//   - GamePopups → src/components/game/GamePopups.tsx
// ============================================================

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { logError } from "@/components/ErrorBoundary";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import {
  getScenarios, getItemsByScenario, getObjects, getConnectedScenarios,
  hideObject, checkBothPlayersHidden, startGame, performMove,
  sendSocialItem, getUnprocessedSocialItems, markSocialItemProcessed,
  ensureTokensReset, TOKEN_COSTS, SOCIAL_ITEMS, type SocialItemType,
  getObjectSpecial, autoFixMissingScenario, getMaterialBlockReason, MATERIAL_LABELS,
  redeemBonusTokens, getItemInteractions, getTagActions, performTagAction,
  OUTDOOR_SCENARIOS, toggleLight, getDirtyItemsForGame,
} from "@/lib/supabase-helpers";
import { getGameReward, RARITY_CONFIG } from "@/lib/reward-helpers";
import {
  getMyAccessories, awardAccessory, hasAllAccessories,
  PET_ACCESSORIES, PET_CONSUMABLES, getMyPet, getPetEvolution, MAX_PET_XP,
  rollHealthEvent,
} from "@/lib/story-helpers";
const completeChapter = async (_u: string, _c: number, _m: number) => ({ xp: 0, isDead: false, newXp: 0 }); // legacy stub — story v4 viu a StoryModePage
import { parseTools, POSITIONS, POS_LABELS, type PlayerTools, type Phase, type Position } from "@/lib/game-types";
import { buildTrophySpecialData, getHideMessage, getSpecialEffectDescriptor } from "@/lib/object-specials";
import {
  CUSTOM_OBJECT_SENTINEL_ID,
  CUSTOM_OBJECT_MATERIALS,
  CUSTOM_OBJECT_SIZES,
  buildCustomObjectSpecialData,
  validateCustomObject,
  isSingleEmoji,
  type CustomObjectMaterial,
  type CustomObjectSize,
} from "@/lib/custom-object";

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { HelpButton, Tip } from "@/components/HelpButton";
import { useT } from "@/i18n/LanguageProvider";

// Extracted components
import ItemActions from "@/components/game/ItemActions";
import GameFinishedPhase from "@/components/game/GameFinishedPhase";
import SocialItemsPanel from "@/components/game/SocialItemsPanel";
import { SpecialFoundPopup, MessagePopup, TrollEffect, BonusTokenPicker, HideMessagePopup, WinFoundPopup } from "@/components/game/GamePopups";
import WaitingScreen from "@/components/game/WaitingScreen";
import ScenarioPicker from "@/components/game/ScenarioPicker";

const CPU_ID = "00000000-0000-0000-0000-000000000001";

export default function GamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const t = useT();
  const posLabel = (p: string) => t(`game.pos.${p}`, p);
  const toolKey = (tool: string) => `🔧 ${t(`game.toolNames.${tool}`, tool)}`;
  const getToolName = (tool: string) =>
    tool === "drap" ? "🧹 Drap" :
    tool === "martell" ? "🔨 Martell" :
    tool === "llanterna" ? "🔦 Llanterna" : "🔧 Tornavís";

  // Core game state
  const [game, setGame] = useState<any>(null);
  const [player, setPlayer] = useState<any>(null);
  const [rival, setRival] = useState<any>(null);
  const [phase, setPhase] = useState<Phase>("waiting");

  // Data lists
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [objects, setObjects] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);

  // Hiding state
  const [selectedScenario, setSelectedScenario] = useState("");
  const [selectedObject, setSelectedObject] = useState("");
  const [selectedItem, setSelectedItem] = useState("");
  const [selectedPosition, setSelectedPosition] = useState<Position | "">("");
  const [hideStep, setHideStep] = useState(0);
  const [objectSpecial, setObjectSpecial] = useState<any>(null);
  const [specialInput, setSpecialInput] = useState("");
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [hideMessage, setHideMessage] = useState("");
  const [showHideMessagePopup, setShowHideMessagePopup] = useState(false);

  // Custom object (player-defined): icon + name + size + material
  const [customObjectIcon, setCustomObjectIcon] = useState("");
  const [customObjectName, setCustomObjectName] = useState("");
  const [customObjectSize, setCustomObjectSize] = useState<CustomObjectSize>(2);
  const [customObjectMaterial, setCustomObjectMaterial] = useState<CustomObjectMaterial>("generic");
  const [customObjectTrait1, setCustomObjectTrait1] = useState("");
  const [customObjectTrait2, setCustomObjectTrait2] = useState("");
  const [customObjectData, setCustomObjectData] = useState<ReturnType<typeof buildCustomObjectSpecialData> | null>(null);

  // My hiding-spot reminder (lazy-loaded on demand)
  const [showMyHideout, setShowMyHideout] = useState(false);
  const [myHideoutData, setMyHideoutData] = useState<{ item: string; itemIcon: string; scenario: string; scenarioIcon: string } | null>(null);

  // Playing state
  const [currentScenarioItems, setCurrentScenarioItems] = useState<any[]>([]);
  const [connectedScenarios, setConnectedScenarios] = useState<any[]>([]);
  const [moveHistory, setMoveHistory] = useState<any[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [itemInteractions, setItemInteractions] = useState<any[]>([]);
  const [playerTools, setPlayerTools] = useState<PlayerTools>(parseTools(null));
  const [dirtyItems, setDirtyItems] = useState<Set<string>>(new Set());
  const [gameBreaks, setGameBreaks] = useState<Set<string>>(new Set());
  const [illuminatedScenarios, setIlluminatedScenarios] = useState<Set<string>>(new Set());
  const [scenarioIsDarkState, setScenarioIsDarkState] = useState(false);
  const isLoadingGameRef = useRef(false);
  const pendingReloadRef = useRef(false);
  const realtimeReloadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // UI state
  const [showSocialPanel, setShowSocialPanel] = useState(false);
  const [bananaEffect, setBananaEffect] = useState(false);
  const [receivedMessage, setReceivedMessage] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [reward, setReward] = useState<any>(null);
  const [rivalNearby, setRivalNearby] = useState(false);
  const [bananaBlockedSpot, setBananaBlockedSpot] = useState<string | null>(null);
  const [rivalSmokeBombAt, setRivalSmokeBombAt] = useState<string | null>(null);
  const [rivalTraits, setRivalTraits] = useState<{ trait1: string | null; trait2: string | null }>({ trait1: null, trait2: null });
  const [showSpecialFoundPopup, setShowSpecialFoundPopup] = useState<any>(null);
  const [winFoundPopup, setWinFoundPopup] = useState<{ objectIcon?: string; objectName?: string; itemIcon?: string; itemName?: string; positionLabel?: string; rivalName?: string } | null>(null);
  const [specialFoundInput, setSpecialFoundInput] = useState("");
  const [specialFoundVariant, setSpecialFoundVariant] = useState<any>(null);
  const [trollEffect, setTrollEffect] = useState<{ message: string; emoji: string; animation: string } | null>(null);
  const [bonusAvailable, setBonusAvailable] = useState(0);
  const [bonusAmount, setBonusAmount] = useState(1);
  const [showBonusPicker, setShowBonusPicker] = useState(false);
  const [savingTrophy, setSavingTrophy] = useState(false);

  // Story mode
  const isStory = false; // 🔒 Story mode v4 viu a /story (StoryModePage). PvP no usa is_story.
  const storyChapter: number | undefined = undefined;
  const [storyResult, setStoryResult] = useState<{ xp: number; isDead: boolean; newXp: number; accessory?: any; consumable?: any } | null>(null);

  // ============================================
  // LOAD GAME
  // ============================================
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

      setGame(gameData);
      setPhase((gameData?.status as Phase) ?? "waiting");
      setRival(rivalData);

      if (playerData && (gameData?.status === "playing" || gameData?.status === "hiding")) {
        const resetTokens = await ensureTokensReset(playerData);
        playerData.tokens_remaining = resetTokens;
        playerData.tokens_last_reset = new Date().toISOString().split("T")[0];

        if (gameData?.status === "playing" && !playerData.current_scenario_id && playerData.hidden_item_id) {
          const fixedId = await autoFixMissingScenario(gameId, user.id, playerData.hidden_item_id);
          playerData.current_scenario_id = fixedId;
        }
      }
      setPlayer(playerData);
      setPlayerTools(parseTools(playerData?.tools));

      if (playerData?.has_hidden) setHideStep(4);

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
      // Use server-side RPC for traits (no longer depends on hidden_object_id)
      if (!isStoryGame && isPlaying) {
        batch.traits = supabase.rpc("get_rival_traits" as any, { _game_id: gameId });
      }
      if (isPlaying && currentScenId) {
        batch.items = getItemsByScenario(currentScenId);
        batch.connected = getConnectedScenarios(currentScenId);
        batch.curScen = supabase.from("scenarios").select("name").eq("id", currentScenId).single();
      }
      batch.moves = supabase.from("game_moves")
        .select("*, scenarios:target_scenario_id(name, icon), items:target_item_id(name, icon)")
        .eq("game_id", gameId).eq("player_id", user.id)
        .order("turn_number", { ascending: false });
      batch.tagMoves = supabase.from("game_moves").select("bonus_value, player_id")
        .eq("game_id", gameId).like("bonus_value", "tag:%")
        .order("created_at", { ascending: true });

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

      // Fire ALL queries at once
      const keys = Object.keys(batch) as QKey[];
      const results = await Promise.all(keys.map(k => batch[k]!));
      const R: Partial<Record<QKey, any>> = {};
      keys.forEach((k, i) => { R[k] = results[i]; });

      // ── Process results ──

      // Profile bonus
      if (R.profile) setBonusAvailable(R.profile.data?.bonus_tokens ?? 0);

      // Rival nearby
      if (R.hiddenItem) {
        setRivalNearby(R.hiddenItem.data?.scenario_id === rivalData?.current_scenario_id);
      } else {
        setRivalNearby(false);
      }

      // Rival traits — now from server-side RPC (secure, no hidden_object_id leak)
      if (R.traits) {
        const traitsData = R.traits.data as any;
        if (traitsData) {
          setRivalTraits({ trait1: traitsData.trait1 ?? null, trait2: traitsData.trait2 ?? null });
        } else {
          setRivalTraits({ trait1: null, trait2: null });
        }
      } else {
        setRivalTraits({ trait1: null, trait2: null });
      }
      

      // Items, connections, interactions (items result is raw array from helper)
      let loadedItems: any[] = [];
      let loadedInteractions: any[] = [];
      if (isPlaying && currentScenId && R.items) {
        loadedItems = Array.isArray(R.items) ? R.items : (R.items?.data ?? R.items ?? []);
        if (R.connected) {
          const conn = Array.isArray(R.connected) ? R.connected : (R.connected?.data ?? []);
          setConnectedScenarios(conn);
        }
        const gameDirty = getDirtyItemsForGame(loadedItems, gameId);
        setDirtyItems(gameDirty);

        // Auto-give drap if dirty items here (fire-and-forget, don't block)
        const hasDirtyHere = loadedItems.some((i: any) => gameDirty.has(i.id));
        if (hasDirtyHere && playerData) {
          const tools = parseTools(playerData.tools);
          if (tools.drap === 0) {
            tools.drap = 1;
            supabase.from("game_players").update({ tools }).eq("id", playerData.id).then(() => {});
            playerData.tools = tools;
            setPlayerTools({ ...tools });
            toast.info(t("game.toasts.foundDrap"), { duration: 4000 });
          }
        }
        // Load interactions now that we have item IDs (single extra query)
        loadedInteractions = await getItemInteractions(loadedItems.map((i: any) => i.id));
        setItemInteractions(loadedInteractions);
      }

      // Move history
      const allMoves = R.moves?.data ?? [];
      setMoveHistory(allMoves);

      // Breaks & illumination from tag moves
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
      setGameBreaks(breaks);
      setIlluminatedScenarios(litScenarios);

      // Revealed items from interactions
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

      // Scenario illumination
      let isOutdoor = false;
      if (R.curScen) {
        isOutdoor = OUTDOOR_SCENARIOS.includes(R.curScen.data?.name ?? "");
      }
      let indoorLightOff = false;
      if (!isOutdoor && currentScenId) {
        for (const m of allGameMoves) {
          const val = (m.bonus_value as string) ?? "";
          if (val === `tag:light_off:${currentScenId}`) indoorLightOff = true;
          if (val === `tag:light_on:${currentScenId}`) indoorLightOff = false;
        }
      }
      const scenarioIsDark = isOutdoor ? !litScenarios.has(currentScenId) : indoorLightOff;
      setScenarioIsDarkState(scenarioIsDark);

      const visibleItems = loadedItems.filter((i: any) => {
        if (scenarioIsDark) return !i.hidden;
        if (!i.hidden) return true;
        if (revealed.has(i.id)) return true;
        if (isOutdoor && litScenarios.has(currentScenId)) return true;
        return false;
      });
      setCurrentScenarioItems(visibleItems);

      // Reward
      if (R.reward) setReward(R.reward);

      // Smoke bomb
      if (R.smokeBombs) {
        setRivalSmokeBombAt(R.smokeBombs.data?.[0]?.created_at ?? null);
      } else {
        setRivalSmokeBombAt(null);
      }

      // Process social items (PvP only)
      if (isPlaying && !isStoryGame) {
        // Blocked items
        const blockedItems = R.blockedSocial?.data ?? [];
        const markPromises: Promise<any>[] = [];
        for (const blocked of blockedItems) {
          const info = SOCIAL_ITEMS.find(i => i.type === blocked.item_type);
          const itemName = info ? `${info.icon} ${t(info.nameKey)}` : "";
          toast.success(t("game.toasts.shieldBlocked", { item: itemName }), { duration: 5000 });
          markPromises.push(markSocialItemProcessed(blocked.id));
        }

        // Unprocessed items
        const unprocessed = R.unprocessedSocial ?? [];
        for (const item of unprocessed) {
          if (item.item_type === "banana") {
            const allPositions = ["sobre", "sota", "dins"] as const;
            const randomPos = allPositions[Math.floor(Math.random() * allPositions.length)];
            if (loadedItems.length > 0) {
              const randomItem = loadedItems[Math.floor(Math.random() * loadedItems.length)];
              setBananaBlockedSpot(`${randomItem.id}:${randomPos}`);
              setBananaEffect(true);
              toast.warning(t("game.toasts.bananaHit"), { duration: 5000 });
              setTrollEffect({ message: "🍌 PLÀTAN PODRIT!\nUna posició ha quedat bloquejada!", emoji: "🍌", animation: "shake" });
              setTimeout(() => setTrollEffect(null), 4000);
            }
          } else if (item.item_type === "smoke_bomb") {
            toast.warning(t("game.toasts.smokeBombUsed"), { duration: 5000 });
          } else if (item.item_type === "swap") {
            toast.warning(t("game.toasts.swapUsed"), { duration: 5000 });
          } else if (item.item_type === "message" && item.message_text) {
            setReceivedMessage(item.message_text);
          }
          markPromises.push(markSocialItemProcessed(item.id));
        }
        // Mark all processed in parallel
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
  }, [gameId, user]);

  const scheduleLoadGame = useCallback((delay = 300) => {
    if (realtimeReloadTimeoutRef.current) {
      clearTimeout(realtimeReloadTimeoutRef.current);
    }
    realtimeReloadTimeoutRef.current = setTimeout(() => {
      realtimeReloadTimeoutRef.current = null;
      void loadGame();
    }, delay);
  }, [loadGame]);

  const handleRealtimeSocialItem = useCallback(async (item: any) => {
    if (!user || item?.to_player_id !== user.id || item?.processed) return;

    if (item.blocked_by_shield) return;

    if (item.item_type === "banana") {
      const scenarioItems = currentScenarioItems.length > 0
        ? currentScenarioItems
        : player?.current_scenario_id
          ? await getItemsByScenario(player.current_scenario_id)
          : [];

      if (scenarioItems.length > 0) {
        const allPositions = ["sobre", "sota", "dins"] as const;
        const randomPos = allPositions[Math.floor(Math.random() * allPositions.length)];
        const randomItem = scenarioItems[Math.floor(Math.random() * scenarioItems.length)];
        setBananaBlockedSpot(`${randomItem.id}:${randomPos}`);
      }

      setBananaEffect(true);
      toast.warning(t("game.toasts.bananaHit"), { duration: 5000 });
      setTrollEffect({ message: "🍌 PLÀTAN PODRIT!\nUna posició ha quedat bloquejada!", emoji: "🍌", animation: "shake" });
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
  }, [currentScenarioItems, player?.current_scenario_id, user]);

  // ============================================
  // EFFECTS
  // ============================================
  useEffect(() => {
    if (!gameId || !user) return;
    void loadGame();
    getScenarios().then(setScenarios).catch(() => toast.error(t("game.errors.loadScenarios")));
    getObjects().then(setObjects).catch(() => toast.error(t("game.errors.loadObjects")));

    if (isStory) return;

    const channel = supabase
      .channel(`game-${gameId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "games", filter: `id=eq.${gameId}` }, () => scheduleLoadGame())
      .on("postgres_changes", { event: "*", schema: "public", table: "game_players", filter: `game_id=eq.${gameId}` }, () => scheduleLoadGame())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "game_social_items", filter: `game_id=eq.${gameId}` }, (payload: any) => {
        void handleRealtimeSocialItem(payload.new);
      })
      .subscribe();
    return () => {
      if (realtimeReloadTimeoutRef.current) {
        clearTimeout(realtimeReloadTimeoutRef.current);
        realtimeReloadTimeoutRef.current = null;
      }
      supabase.removeChannel(channel);
    };
  }, [gameId, user, loadGame, isStory, handleRealtimeSocialItem, scheduleLoadGame]);

  // ============================================
  // HIDING HANDLERS
  // ============================================
  const handleSelectScenario = async (id: string) => {
    setSelectedScenario(id);
    setItems(await getItemsByScenario(id));
    setHideStep(2);
  };

  const handleSelectObject = async (objId: string) => {
    setSelectedObject(objId);
    setActionLoading(true);
    try {
      const special = await getObjectSpecial(objId);
      setObjectSpecial(special);
      setSpecialInput("");
      setSelectedVariant(null);
      setHideMessage("");
      setHideStep(1);
    } catch (err: any) {
      toast.error(t("game.errors.loadSpecial"));
      logError(err.message, err.stack, "GamePage:handleSelectObject");
    } finally {
      setActionLoading(false);
    }
  };

  /** Confirm a player-defined custom object and advance to scenario step. */
  const handleSelectCustomObject = () => {
    const input = {
      icon: customObjectIcon.trim(),
      name: customObjectName.trim(),
      size: customObjectSize,
      material: customObjectMaterial,
      trait1: customObjectTrait1.trim(),
      trait2: customObjectTrait2.trim(),
    };
    const v = validateCustomObject(input);
    if (!v.ok) {
      toast.error(v.error || t("game.errors.invalidCustomObject"));
      return;
    }
    setSelectedObject(CUSTOM_OBJECT_SENTINEL_ID);
    setObjectSpecial(null);          // custom objects never carry a special
    setSpecialInput("");
    setSelectedVariant(null);
    setHideMessage("");
    setCustomObjectData(buildCustomObjectSpecialData(input as any));
    setHideStep(1);
  };

  const handleSelectPosition = async (pos: Position) => {
    const isCustom = selectedObject === CUSTOM_OBJECT_SENTINEL_ID && customObjectData;
    const obj = isCustom
      ? { icon: customObjectData!.custom_icon, name: customObjectData!.custom_name, size: customObjectData!.custom_size, material: customObjectData!.custom_material }
      : objects.find((o: any) => o.id === selectedObject);
    const itm = items.find((i: any) => i.id === selectedItem);
    if (pos === "dins") {
      const objSize = (obj as any)?.size ?? 2;
      const capacity = (itm as any)?.inner_capacity ?? 2;
      if (objSize > capacity) {
        toast.error(t("game.errors.objectTooBig", { obj: `${obj?.icon} ${obj?.name}`, itm: `${itm?.icon} ${itm?.name}` }));
        return;
      }
    }
    if (pos === "darrere" && (itm as any)?.can_behind === false) {
      toast.error(t("game.errors.cannotHideBehind", { itm: `${itm?.icon} ${itm?.name}` }));
      return;
    }
    const material = (obj as any)?.material ?? "generic";
    const environment = (itm as any)?.environment ?? "generic";
    const blockReason = getMaterialBlockReason(material, environment);
    if (blockReason) {
      toast.error(t("game.errors.materialBlocked", { obj: `${obj?.icon} ${obj?.name}`, reason: blockReason }));
      return;
    }
    setSelectedPosition(pos);

    // Re-fetch objectSpecial if lost (robustness against race conditions)
    let special = objectSpecial;
    if (!special && selectedObject) {
      try {
        special = await getObjectSpecial(selectedObject);
        if (special) setObjectSpecial(special);
      } catch { /* proceed without special */ }
    }

    // Show hide message popup if object supports it
    if (special && (special as any).has_hide_message) {
      setShowHideMessagePopup(true);
      return;
    }

    if (special && special.prompt_on === "hide") {
      setHideStep(5);
      return;
    }

    await doHide(pos);
  };

  const doHide = async (pos?: Position, extraSpecialData?: any) => {
    const finalPos = pos || selectedPosition as Position;
    if (!gameId || !user || !finalPos) return;
    setActionLoading(true);
    try {
      let specialData = extraSpecialData || undefined;
      if (hideMessage.trim()) {
        specialData = { ...(specialData || {}), hide_message: hideMessage.trim() };
      }
      // Merge custom-object metadata if the player created their own object
      if (selectedObject === CUSTOM_OBJECT_SENTINEL_ID && customObjectData) {
        specialData = { ...(specialData || {}), ...customObjectData };
      }
      await hideObject(gameId, user.id, selectedObject, selectedItem, finalPos, specialData);
      setHideStep(4);
      toast.success(t("game.toasts.objectHidden"));
      if (await checkBothPlayersHidden(gameId)) {
        await startGame(gameId);
        toast.success(t("game.toasts.searchStarted"));
      }
    } catch (err: any) { toast.error(err.message); logError(err.message, err.stack, "GamePage"); }
    finally { setActionLoading(false); }
  };

  // ============================================
  // ACTION HANDLERS
  // ============================================
  const clearBanana = () => {
    if (bananaEffect) {
      setBananaEffect(false);
      setBananaBlockedSpot(null);
    }
  };

  const handleMove = async (scenarioId: string) => {
    if (!gameId || !user) return;
    setActionLoading(true);
    try {
      const result = await performMove(gameId, user.id, "move", scenarioId, undefined, undefined, isStory);
      const s = scenarios.find(s => s.id === scenarioId);
      if (result.barricade_hit) {
        toast.warning(t("game.toasts.barricadeHit", { extra: result.barricade_extra_cost }), { duration: 5000 });
      }
      toast.success(isStory ? t("game.toasts.moveTo", { icon: s?.icon ?? "", name: s?.name ?? "" }) : t("game.toasts.moveToWithCost", { icon: s?.icon ?? "", name: s?.name ?? "", cost: result.barricade_hit ? TOKEN_COSTS.move + result.barricade_extra_cost : TOKEN_COSTS.move }));
      clearBanana();
      await loadGame();
    } catch (err: any) { toast.error(err.message); logError(err.message, err.stack, "GamePage"); }
    finally { setActionLoading(false); }
  };

  const handleInteraction = async (interaction: any) => {
    if (!gameId || !user || !player) return;
    const alreadyUsed = moveHistory.some((m: any) =>
      m.action === "look" && m.target_item_id === interaction.item_id &&
      (m as any).bonus_value === `interact:${interaction.action_name}`
    );
    if (interaction.one_time && alreadyUsed) { toast.error(t("game.errors.actionAlreadyDone")); return; }
    if (player.tokens_remaining < interaction.cost) { toast.error(t("game.errors.notEnoughTokens")); return; }
    setActionLoading(true);
    try {
      await performMove(gameId, user.id, "look", undefined, interaction.item_id, "sobre", isStory);
      const data = interaction.effect_data as any;
      if (interaction.effect_type === "reveal_items") toast.success(t("game.toasts.revealItems", { icon: interaction.action_icon, msg: data.message || t("game.toasts.revealItemsDefault") }), { duration: 6000 });
      else if (interaction.effect_type === "reveal_content") toast.success(`${interaction.action_icon} ${data.message}`, { duration: 6000 });
      else if (interaction.effect_type === "give_hint") toast.info(`${interaction.action_icon} ${data.hint || t("game.toasts.hintReceived")}`, { duration: 5000 });
      else if (interaction.effect_type === "enable_position") toast.success(`${interaction.action_icon} ${data.hint || t("game.toasts.posUnlocked")}`, { duration: 4000 });
      clearBanana();
      await loadGame();
    } catch (err: any) { toast.error(err.message); logError(err.message, err.stack, "GamePage"); }
    finally { setActionLoading(false); }
  };

  const handleTagAction = async (itemId: string, actionKey: string) => {
    if (!gameId || !user) return;
    setActionLoading(true);
    try {
      const result = await performTagAction(gameId, user.id, itemId, actionKey, playerTools);
      const [actionType] = actionKey.split(":");
      const item = currentScenarioItems.find(i => i.id === itemId);
      const getToolName = (t: string) => t === "drap" ? "🧹 Drap" : t === "martell" ? "🔨 Martell" : t === "llanterna" ? "🔦 Llanterna" : "🔧 Tornavís";

      if (actionType === "clean") toast.success(t("game.toasts.itemCleaned", { icon: item?.icon ?? "", name: item?.name ?? "" }), { duration: 4000 });
      else if (actionType === "break") toast.success(t("game.toasts.itemBroken", { icon: item?.icon ?? "", name: item?.name ?? "" }), { duration: 5000 });
      else if (actionType === "fix") toast.success(t("game.toasts.itemFixed", { icon: item?.icon ?? "", name: item?.name ?? "" }), { duration: 4000 });

      if (result.bonusResult) toast.success(t("game.toasts.bonusTokens", { n: result.bonusResult.amount }), { duration: 3000 });
      if (result.toolFound) toast.info(t("game.toasts.toolFound", { tool: getToolName(result.toolFound) }), { duration: 4000 });

      clearBanana();
      await loadGame();
    } catch (err: any) { toast.error(err.message); logError(err.message, err.stack, "GamePage"); }
    finally { setActionLoading(false); }
  };

  const handleToggleLight = async () => {
    if (!gameId || !user || !player?.current_scenario_id) return;
    const scenarioName = currentScenario?.name ?? "";
    const isOutdoor = OUTDOOR_SCENARIOS.includes(scenarioName);

    // Use the pre-computed dark state
    const isCurrentlyDark = scenarioIsDarkState;

    setActionLoading(true);
    try {
      const result = await toggleLight(gameId, user.id, player.current_scenario_id, !isCurrentlyDark, scenarioName);
      if (isOutdoor) {
        if (isCurrentlyDark) {
          toast.success(t("game.toasts.flashlightOn"), { duration: 5000 });
        } else {
          toast.success(t("game.toasts.flashlightOff"), { duration: 4000 });
        }
      } else {
        if (!isCurrentlyDark) {
          toast.success(t("game.toasts.lightsOff"), { duration: 4000 });
        } else {
          toast.success(t("game.toasts.lightsOn"), { duration: 4000 });
        }
      }
      if (result.toolFound) {
        const toolName = result.toolFound === "drap" ? "🧹 Drap" : result.toolFound === "martell" ? "🔨 Martell" : result.toolFound === "llanterna" ? "🔦 Llanterna" : "🔧 Tornavís";
        toast.info(t("game.toasts.toolFound", { tool: toolName }), { duration: 4000 });
      }
      clearBanana();
      await loadGame();
    } catch (err: any) { toast.error(err.message); logError(err.message, err.stack, "GamePage"); }
    finally { setActionLoading(false); }
  };

  const handleLook = async (itemId: string, pos: Position) => {
    if (!gameId || !user) return;
    setActionLoading(true);
    try {
      const result = await performMove(gameId, user.id, "look", undefined, itemId, pos, isStory);
      const item = currentScenarioItems.find(i => i.id === itemId);
      if (result.trapHit) {
        toast.warning(t("game.toasts.trapHit", { n: result.trapPenalty }), { duration: 4000 });
      }
      if (result.foundObject) {
        if (isStory && storyChapter) {
          const movesCount = (moveHistory?.length ?? 0) + 1;
          const storyRes = await completeChapter(user.id, storyChapter, movesCount);
          let wonAccessory: any = null;
          let wonConsumable: any = null;
          if (storyChapter >= 3) {
            const accIdx = storyChapter - 3;
            if (accIdx < PET_ACCESSORIES.length) {
              const acc = PET_ACCESSORIES[accIdx];
              const myAccs = await getMyAccessories(user.id);
              const alreadyOwned = myAccs.some(a => a.accessory_name === acc.name);
              if (!alreadyOwned) {
                await awardAccessory(user.id, acc.name, acc.icon);
                wonAccessory = acc;
              }
            }
            const allAccs = await getMyAccessories(user.id);
            if (hasAllAccessories(allAccs)) {
              const c = PET_CONSUMABLES[Math.floor(Math.random() * PET_CONSUMABLES.length)];
              wonConsumable = c;
              // Actually save the consumable to the database!
              await supabase.from("pet_consumables").insert({
                user_id: user.id,
                consumable_name: c.name,
                consumable_icon: c.icon,
              });
            }
          }
          // Roll for random health event ONLY when consumables are available (all accessories collected)
          let healthEvent = null;
          const currentAccs = await getMyAccessories(user.id);
          if (hasAllAccessories(currentAccs)) {
            healthEvent = await rollHealthEvent(user.id);
          }
          setStoryResult({ ...storyRes, accessory: wonAccessory, consumable: wonConsumable });
          toast.success(t("game.story.foundXp", { xp: storyRes.xp }), { duration: 6000 });
          if (healthEvent) {
            setTimeout(() => {
              toast.warning(t("game.story.healthEvent", { icon: healthEvent.icon, desc: healthEvent.desc, xp: healthEvent.xpDamage }), { duration: 8000 });
            }, 2000);
          }
        } else {
          // PvP win: fetch revealed rival data FIRST (RLS hides hidden_object_id until game finishes)
          const { data: safePlayersAfterWin } = await supabase.rpc("get_safe_game_players" as any, { _game_id: gameId });
          const resolvedRival = ((safePlayersAfterWin as any[]) ?? []).find((p: any) => p.user_id !== user.id) ?? rival;
          setRival(resolvedRival);

          const { data: rivalProf } = await supabase.from("profiles").select("display_name").eq("user_id", resolvedRival?.user_id ?? "").maybeSingle();
          const foundObjectId = resolvedRival?.hidden_object_id;
          let foundObj: any = objects.find((o: any) => o.id === foundObjectId);
          if (!foundObj && foundObjectId) {
            const { data: objRow } = await supabase.from("objects").select("name, icon").eq("id", foundObjectId).maybeSingle();
            foundObj = objRow;
          }
          const rivalSD: any = resolvedRival?.special_data;
          const isCustomFound = rivalSD?.is_custom === true;

          // Determine if a special popup will appear (custom objects no tenen special)
          const rivalSpecial = !isCustomFound && foundObjectId ? await getObjectSpecial(foundObjectId) : null;
          let willShowSpecialPopup = false;

          if (rivalSpecial) {
            if (rivalSpecial.special_type === "troll_effect") {
              const effect = getSpecialEffectDescriptor(rivalSpecial);
              setTrollEffect({ message: rivalSpecial.prompt_text, emoji: effect.emoji, animation: effect.animation });
              setTimeout(() => setTrollEffect(null), 6000);
            } else if (rivalSpecial.prompt_on === "find") {
              setSpecialFoundInput("");
              setSpecialFoundVariant(null);
              setShowSpecialFoundPopup({ special: rivalSpecial, rivalPlayer: resolvedRival, objectId: foundObjectId });
              willShowSpecialPopup = true;
            } else if (rivalSpecial.find_special_type) {
              const findSpecial = { ...rivalSpecial, special_type: rivalSpecial.find_special_type, prompt_text: rivalSpecial.find_prompt_text || rivalSpecial.prompt_text };
              setSpecialFoundInput("");
              setSpecialFoundVariant(null);
              setShowSpecialFoundPopup({ special: findSpecial, rivalPlayer: resolvedRival, objectId: foundObjectId });
              willShowSpecialPopup = true;
            }
          }

          // Only show the generic "win" popup if no trophy popup will steal focus
          if (!willShowSpecialPopup) {
            setWinFoundPopup({
              objectIcon: isCustomFound ? rivalSD.custom_icon : foundObj?.icon,
              objectName: isCustomFound ? rivalSD.custom_name : foundObj?.name,
              itemIcon: item?.icon,
              itemName: item?.name,
              positionLabel: pos ? `${POS_LABELS[pos as keyof typeof POS_LABELS]?.split(" ")[0] ?? ""} ${posLabel(pos)}`.trim() : undefined,
              rivalName: rivalProf?.display_name ?? t("game.results.rivalDefault"),
            });
          }

          const hideMsg = getHideMessage(resolvedRival?.special_data);
          if (hideMsg) toast.info(t("game.toasts.rivalHideMsg", { msg: hideMsg }), { duration: 8000 });
        }
      } else if (result.foundBonus === "extra_token" && result.bonusValue?.startsWith("tool:")) {
        const toolName = result.bonusValue === "tool:drap" ? "🧹 Drap" : result.bonusValue === "tool:martell" ? "🔨 Martell" : "🔧 Tornavís";
        toast.info(t("game.toasts.toolFound", { tool: toolName }), { duration: 4000 });
      } else if (result.foundBonus === "extra_token") toast.success(t("game.toasts.extraToken", { val: result.bonusValue }));
      else if (result.foundBonus) toast.info(t("game.toasts.magic", { val: result.bonusValue }));
      else {
        const level = result.hintLevel ?? 0;
        const noisy = (result as any).hintNoisy ? " ⚠️" : "";
        if (level === 0) toast.info(t("game.toasts.hintFrozen", { noisy, cost: TOKEN_COSTS.look }));
        else if (level === 1) toast.info(t("game.toasts.hintCold", { noisy, cost: TOKEN_COSTS.look }));
        else if (level === 2) toast.info(t("game.toasts.hintCool", { noisy, cost: TOKEN_COSTS.look }));
        else if (level === 3) toast.warning(t("game.toasts.hintWarm", { noisy, cost: TOKEN_COSTS.look }));
        else toast.success(t("game.toasts.hintHot", { noisy, cost: TOKEN_COSTS.look }));
      }
      clearBanana();
      await loadGame();
    } catch (err: any) { toast.error(err.message); logError(err.message, err.stack, "GamePage"); }
    finally { setActionLoading(false); }
  };

  const handleSpecialFoundSubmit = async () => {
    if (!gameId || !user || !showSpecialFoundPopup || savingTrophy) return;
    setSavingTrophy(true);
    try {
      const { special, rivalPlayer, objectId } = showSpecialFoundPopup;
      const rivalObj = objects.find((o: any) => o.id === objectId);
      const hideMsg = getHideMessage(rivalPlayer?.special_data);
      const specialData = buildTrophySpecialData({
        special,
        objectRecord: rivalObj,
        inputName: specialFoundInput,
        variant: specialFoundVariant,
        hideMessage: hideMsg,
      });

      // Check if trophy already saved for this game
      const { data: existing } = await supabase.from("player_inventory")
        .select("id").eq("user_id", user.id).eq("game_id", gameId)
        .eq("item_type", "special_trophy").limit(1);
      if (existing && existing.length > 0) {
        toast.info(t("game.toasts.trophyAlready"));
        setShowSpecialFoundPopup(null);
        setSpecialFoundInput("");
        setSpecialFoundVariant(null);
        return;
      }

      const { error: insErr } = await supabase.from("player_inventory").insert([{
        user_id: user.id, game_id: gameId,
        item_type: "special_trophy",
        item_value: special.special_type === "choose_variant" ? specialFoundVariant?.value ?? null : specialFoundInput.trim() || null,
        special_data: specialData,
      }]);
      if (insErr) throw insErr;
      toast.success(t("game.toasts.trophySaved"));
      setShowSpecialFoundPopup(null);
      setSpecialFoundInput("");
      setSpecialFoundVariant(null);
    } catch (err: any) {
      toast.error(t("game.toasts.trophyError", { msg: err.message ?? t("game.toasts.errorUnknown") }));
      logError(err.message ?? String(err), err.stack, "GamePage.handleSpecialFoundSubmit");
    } finally {
      setSavingTrophy(false);
    }
  };

  const handleSendSocial = async (type: SocialItemType, extraData?: { scenarioFrom?: string; scenarioTo?: string; itemId?: string }) => {
    if (!gameId || !user || !rival) return;
    setActionLoading(true);
    try {
      const msg = type === "message" ? messageInput : undefined;
      const result = await sendSocialItem(gameId, user.id, rival.user_id, type, msg, extraData);
      const info = SOCIAL_ITEMS.find(i => i.type === type);
      if (result.blocked) toast.error(t("game.toasts.blockedShield"));
      else if (result.espiaResult) toast.success(t("game.toasts.espiaResult", { name: result.espiaResult }), { duration: 8000 });
      else if (type === "smoke_bomb" && (result as any).smokeBombResult) {
        const sb = (result as any).smokeBombResult;
        toast.success(t("game.toasts.smokeBombResult", { scen: sb.new_scenario_name, item: sb.new_item_name, pos: sb.new_position }), { duration: 6000 });
      } else if (type === "barricada" && (result as any).barricadaResult) {
        const br = (result as any).barricadaResult;
        toast.success(t("game.toasts.barricadaResult", { from: br.from_name, to: br.to_name }), { duration: 6000 });
      } else if (type === "trampa" && (result as any).trampaResult) {
        const tr = (result as any).trampaResult;
        toast.success(t("game.toasts.trampaResult", { item: tr.item_name }), { duration: 5000 });
      }
      else toast.success(t("game.toasts.socialSent", { icon: info?.icon ?? "", name: info ? t(info.nameKey) : "" }));
      setShowSocialPanel(false);
      setMessageInput("");
      await loadGame();
    } catch (err: any) { toast.error(err.message); logError(err.message, err.stack, "GamePage"); }
    finally { setActionLoading(false); }
  };

  const handleRedeemBonus = async () => {
    if (!gameId || !user) return;
    setActionLoading(true);
    try {
      const amount = await redeemBonusTokens(gameId, user.id, bonusAmount);
      toast.success(t("game.toasts.bonusTokensAdded", { n: amount }));
      setShowBonusPicker(false);
      setBonusAmount(1);
      await loadGame();
    } catch (err: any) { toast.error(err.message); }
    finally { setActionLoading(false); }
  };

  // ============================================
  // DERIVED STATE
  // ============================================
  const currentScenario = scenarios.find(s => s.id === player?.current_scenario_id);
  const noTokens = player && player.tokens_remaining < TOKEN_COSTS.look;
  const isOutdoor = OUTDOOR_SCENARIOS.includes(currentScenario?.name ?? "");
  const scenarioIsDark = scenarioIsDarkState;

  const lookedSpots = new Set<string>();
  for (const m of moveHistory) {
    if (m.target_item_id && m.target_position && m.action === "look") {
      // Skip looks that happened before the rival's smoke bomb (object moved, hints invalid)
      if (rivalSmokeBombAt && m.created_at < rivalSmokeBombAt) continue;
      lookedSpots.add(`${m.target_item_id}:${m.target_position}`);
    }
  }

  // ============================================
  // LOADING
  // ============================================
  if (!game || !player) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="text-5xl mb-3 animate-pulse">🔍</div>
        <p className="text-muted-foreground text-sm">{t("game.loading")}</p>
      </div>
    </div>;
  }

  const hideSteps = [t("game.steps.object"), t("game.steps.scenario"), t("game.steps.item"), t("game.steps.position")];

  // ============================================
  // RENDER
  // ============================================
  return (
    <main className="min-h-screen bg-background p-4 pb-20 max-w-md mx-auto relative" role="main">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[500px] h-[250px] rounded-full bg-primary/5 blur-[100px] pointer-events-none" aria-hidden="true" />

      {/* Popups */}
      <SpecialFoundPopup show={showSpecialFoundPopup} rival={rival} objects={objects}
        specialFoundInput={specialFoundInput} specialFoundVariant={specialFoundVariant}
        onInputChange={setSpecialFoundInput} onVariantChange={setSpecialFoundVariant}
        onSubmit={handleSpecialFoundSubmit}
        onClose={() => { setShowSpecialFoundPopup(null); setSpecialFoundInput(""); setSpecialFoundVariant(null); }} />
      <MessagePopup message={receivedMessage} onClose={() => setReceivedMessage(null)} />
      <WinFoundPopup show={!!winFoundPopup}
        objectIcon={winFoundPopup?.objectIcon} objectName={winFoundPopup?.objectName}
        itemIcon={winFoundPopup?.itemIcon} itemName={winFoundPopup?.itemName}
        positionLabel={winFoundPopup?.positionLabel} rivalName={winFoundPopup?.rivalName}
        onClose={() => setWinFoundPopup(null)} />
      <TrollEffect effect={trollEffect} onClose={() => setTrollEffect(null)} />
      <HideMessagePopup show={showHideMessagePopup} hideMessage={hideMessage}
        onMessageChange={setHideMessage} loading={actionLoading}
        onConfirm={async () => { setShowHideMessagePopup(false); await doHide(); }}
        onSkip={async () => { setHideMessage(""); setShowHideMessagePopup(false); await doHide(); }} />

      {/* Header */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <button onClick={() => navigate(isStory ? "/story" : "/")} className="text-sm text-muted-foreground hover:text-primary transition-colors">
          {isStory ? t("game.header.backStory") : t("game.header.backLobby")}
        </button>
        <div className="flex items-center gap-2">
          {isStory ? (
            <span className="text-[11px] bg-accent/10 text-accent px-3 py-1.5 rounded-full border border-accent/20 font-semibold">
              {t("game.header.chapter", { n: storyChapter ?? "" })}
            </span>
          ) : (
            <>
              <span className="font-mono text-[11px] bg-muted/50 backdrop-blur-sm px-3 py-1.5 rounded-full border border-border/30 tracking-wider font-semibold">{game.code}</span>
              {rival && (
                <button onClick={() => navigate(`/player/${rival.user_id}`)}
                  className="text-[11px] bg-secondary/10 text-secondary px-2.5 py-1.5 rounded-full border border-secondary/20 hover:bg-secondary/20 transition-colors font-medium">
                  {t("game.header.rivalBtn")}
                </button>
              )}
            </>
          )}
        </div>
        <div className="flex items-center gap-1">
          {phase === "playing" && !isStory && (
            <div className="flex items-center gap-1">
              <div className="flex items-center gap-1.5 gradient-primary px-3 py-1.5 rounded-full shadow-md">
                <span className="text-xs">🪙</span>
                <span className="font-bold text-xs text-primary-foreground">{player.tokens_remaining}</span>
              </div>
              {bonusAvailable > 0 && !showBonusPicker && (
                <button
                  onClick={() => { setBonusAmount(Math.min(bonusAvailable, 0.5)); setShowBonusPicker(true); }}
                  className="flex items-center gap-1 bg-accent/20 text-accent-foreground px-2.5 py-1.5 rounded-full border border-accent/30 hover:bg-accent/40 transition-colors text-[11px] font-bold"
                  title={t("game.header.bonusAvailable", { n: bonusAvailable })}
                >
                  💰+{bonusAvailable}
                </button>
              )}
              {showBonusPicker && (
                <BonusTokenPicker bonusAvailable={bonusAvailable} bonusAmount={bonusAmount}
                  setBonusAmount={setBonusAmount} onRedeem={handleRedeemBonus}
                  onClose={() => setShowBonusPicker(false)} actionLoading={actionLoading} />
              )}
            </div>
          )}
          {!isStory && game.status !== "finished" && (
            <button
              onClick={async () => {
                const url = `${window.location.origin}/join/${game.id}`;
                const title = t("game.header.shareTitle");
                const text = t("game.header.shareText", { code: game.code });
                if (navigator.share) {
                  try { await navigator.share({ title, text, url }); return; } catch { /* user cancelled */ }
                }
                try {
                  await navigator.clipboard.writeText(`${text} ${url}`);
                  toast.success(t("game.header.shareCopied"));
                } catch {
                  window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`, "_blank");
                }
              }}
              className="text-[11px] bg-primary/15 text-primary px-2.5 py-1.5 rounded-full border border-primary/30 hover:bg-primary/25 transition-colors font-semibold"
              title={t("game.header.share")}
              aria-label={t("game.header.share")}
            >
              🔗
            </button>
          )}
          <HelpButton />
        </div>
      </div>

      {/* WAITING — show code + allow hiding */}
      {phase === "waiting" && !player.has_hidden && hideStep < 4 && (
        <WaitingScreen code={game.code} hasHidden={false} />
      )}

      {/* WAITING — already hidden */}
      {phase === "waiting" && player.has_hidden && (
        <WaitingScreen code={game.code} hasHidden={true} />
      )}

      {/* HIDING PHASE */}
      {(phase === "waiting" || phase === "hiding") && !player.has_hidden && hideStep < 4 && (
        <div>
          <div className="flex items-center gap-1 mb-5">
            {hideSteps.map((step, i) => (
              <div key={i} className={`flex-1 text-center text-[10px] py-1.5 rounded-full font-medium transition-all ${
                i === hideStep ? "gradient-primary text-primary-foreground shadow-md" :
                i < hideStep ? "bg-primary/20 text-primary" : "bg-muted/50 text-muted-foreground"
              }`}>{step}</div>
            ))}
          </div>

          {hideStep === 0 && (() => {
            // Filter out the sentinel "__custom__" row from the regular lists
            const realObjects = objects.filter((o: any) => o.id !== CUSTOM_OBJECT_SENTINEL_ID);
            const specials = realObjects.filter((o: any) => o.is_special);
            const basics = realObjects.filter((o: any) => !o.is_special);
            const renderCard = (o: any) => (
              <Card key={o.id} className={`glass transition-all active:scale-[0.97] relative ${actionLoading ? "opacity-50 pointer-events-none" : "cursor-pointer hover:border-secondary/40"}`} onClick={() => !actionLoading && handleSelectObject(o.id)}>
                <CardContent className="py-3 text-center">
                  <div className="text-2xl mb-1">{o.icon}</div>
                  <div className="text-[11px] font-medium">{o.name}</div>
                </CardContent>
              </Card>
            );
            const customIconValid = customObjectIcon === "" || isSingleEmoji(customObjectIcon);
            const customNameValid = customObjectName.trim().length > 0 && customObjectName.trim().length <= 20;
            const t1 = customObjectTrait1.trim();
            const t2 = customObjectTrait2.trim();
            const customTrait1Valid = t1.length > 0 && t1.length <= 60;
            const customTrait2Valid = t2.length > 0 && t2.length <= 60;
            const customReady = isSingleEmoji(customObjectIcon) && customNameValid && customTrait1Valid && customTrait2Valid;
            return (
              <div>
                <h2 className="text-lg font-bold mb-1">{t("game.hide.whatTitle")}</h2>
                <Tip>{t("game.hide.whatTip")}</Tip>
                <div className="h-3" />
                <Tabs defaultValue="specials" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 mb-3">
                    <TabsTrigger value="specials">{t("game.hide.tabSpecials")}</TabsTrigger>
                    <TabsTrigger value="basics">{t("game.hide.tabBasics")}</TabsTrigger>
                    <TabsTrigger value="custom">{t("game.hide.tabCustom")}</TabsTrigger>
                  </TabsList>
                  <TabsContent value="specials">
                    {specials.length > 0 ? (
                      <div className="grid grid-cols-3 gap-2">{specials.map(renderCard)}</div>
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-4">{t("game.hide.noSpecials")}</p>
                    )}
                  </TabsContent>
                  <TabsContent value="basics">
                    {basics.length > 0 ? (
                      <div className="grid grid-cols-3 gap-2">{basics.map(renderCard)}</div>
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-4">{t("game.hide.noBasics")}</p>
                    )}
                  </TabsContent>
                  <TabsContent value="custom">
                    <Card className="glass">
                      <CardContent className="py-4 space-y-3">
                        <p className="text-[11px] text-muted-foreground"><span dangerouslySetInnerHTML={{__html: t("game.hide.customDesc")}} /></p>
                        <div>
                          <label className="text-[11px] font-semibold mb-1 block">{t("game.hide.iconLabel")}</label>
                          <Input
                            value={customObjectIcon}
                            onChange={e => setCustomObjectIcon(e.target.value)}
                            placeholder="🦄"
                            maxLength={8}
                            className={customIconValid ? "" : "border-destructive"}
                          />
                          {!customIconValid && <p className="text-[10px] text-destructive mt-1">{t("game.hide.iconError")}</p>}
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold mb-1 block">{t("game.hide.nameLabel")}</label>
                          <Input
                            value={customObjectName}
                            onChange={e => setCustomObjectName(e.target.value.slice(0, 20))}
                            placeholder={t("game.hide.namePlaceholder")}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[11px] font-semibold mb-1 block">{t("game.hide.sizeLabel")}</label>
                            <select
                              value={customObjectSize}
                              onChange={e => setCustomObjectSize(Number(e.target.value) as CustomObjectSize)}
                              className="w-full h-10 rounded-xl border border-border/50 bg-muted/30 px-2 text-sm"
                            >
                              {CUSTOM_OBJECT_SIZES.map(s => (
                                <option key={s} value={s}>{s === 1 ? t("game.hide.sizeSmall") : s === 2 ? t("game.hide.sizeMed") : t("game.hide.sizeLarge")}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold mb-1 block">{t("game.hide.materialLabel")}</label>
                            <select
                              value={customObjectMaterial}
                              onChange={e => setCustomObjectMaterial(e.target.value as CustomObjectMaterial)}
                              className="w-full h-10 rounded-xl border border-border/50 bg-muted/30 px-2 text-sm"
                            >
                              {CUSTOM_OBJECT_MATERIALS.map(m => (
                                <option key={m} value={m}>{t(MATERIAL_LABELS[m] ?? m, m)}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold mb-1 block">{t("game.hide.trait1Label")}</label>
                          <Input
                            value={customObjectTrait1}
                            onChange={e => setCustomObjectTrait1(e.target.value.slice(0, 60))}
                            placeholder={t("game.hide.trait1Placeholder")}
                            maxLength={60}
                          />
                          <p className="text-[10px] text-muted-foreground mt-1">{customObjectTrait1.trim().length}/60</p>
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold mb-1 block">{t("game.hide.trait2Label")}</label>
                          <Input
                            value={customObjectTrait2}
                            onChange={e => setCustomObjectTrait2(e.target.value.slice(0, 60))}
                            placeholder={t("game.hide.trait2Placeholder")}
                            maxLength={60}
                          />
                          <p className="text-[10px] text-muted-foreground mt-1">{customObjectTrait2.trim().length}/60</p>
                        </div>
                        {customReady && (
                          <div className="flex items-center justify-center gap-2 py-2 bg-muted/30 rounded-lg">
                            <span className="text-2xl">{customObjectIcon}</span>
                            <span className="text-sm font-medium">{customObjectName}</span>
                          </div>
                        )}
                        <Button
                          className="w-full"
                          disabled={!customReady || actionLoading}
                          onClick={handleSelectCustomObject}
                        >
                          {t("game.hide.submitCustom")}
                        </Button>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            );
          })()}

          {hideStep === 1 && (
            <ScenarioPicker
              scenarios={scenarios}
              onSelect={handleSelectScenario}
              onBack={() => setHideStep(0)}
            />
          )}


          {hideStep === 2 && (
            <div>
              <h2 className="text-lg font-bold mb-1">{t("game.hide.whichItemTitle")}</h2>
              <Tip>{t("game.hide.whichItemTip")}</Tip>
              <div className="h-3" />
              <div className="grid grid-cols-2 gap-2.5">
                {items.map(item => {
                  const isCustom = selectedObject === CUSTOM_OBJECT_SENTINEL_ID && customObjectData;
                  const mat = isCustom
                    ? customObjectData!.custom_material
                    : ((objects.find((o: any) => o.id === selectedObject) as any)?.material ?? "generic");
                  const env = (item as any)?.environment ?? "generic";
                  const blockReason = getMaterialBlockReason(mat, env);
                  return (
                    <Card key={item.id}
                      className={`glass transition-all active:scale-[0.97] ${blockReason ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:border-accent/40"}`}
                      onClick={() => !blockReason && (() => { setSelectedItem(item.id); setHideStep(3); })()}>
                      <CardContent className="py-4 text-center">
                        <div className="text-3xl mb-1">{item.icon}</div>
                        <div className="text-sm font-medium">{item.name}</div>
                        {blockReason && <div className="text-[9px] text-destructive mt-1">🚫 {blockReason}</div>}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              <Button variant="ghost" size="sm" className="mt-3" onClick={() => setHideStep(1)}>{t("game.hide.backToScenario")}</Button>
            </div>
          )}

          {hideStep === 3 && (
            <div>
              <h2 className="text-lg font-bold mb-1">{t("game.hide.whichPosTitle")}</h2>
              <Tip>{t("game.hide.whichPosTip")}</Tip>
              <div className="h-3" />


              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {POSITIONS.map(pos => {
                  const isCustom = selectedObject === CUSTOM_OBJECT_SENTINEL_ID && customObjectData;
                  const objSize = isCustom
                    ? customObjectData!.custom_size
                    : ((objects.find((o: any) => o.id === selectedObject) as any)?.size ?? 2);
                  const itm = items.find((i: any) => i.id === selectedItem);
                  const blockedDins = pos.value === "dins" && objSize > ((itm as any)?.inner_capacity ?? 2);
                  const blockedDarrere = pos.value === "darrere" && (itm as any)?.can_behind === false;
                  const blocked = blockedDins || blockedDarrere;
                  const blockReason = blockedDins ? t("game.hide.noFit") : blockedDarrere ? t("game.hide.cannot") : "";
                  return (
                    <Card key={pos.value}
                      className={`glass transition-all active:scale-[0.97] ${blocked ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:border-primary/40"}`}
                      onClick={() => !blocked && handleSelectPosition(pos.value)}>
                      <CardContent className="py-6 text-center">
                        <div className="text-4xl mb-2">{pos.icon}</div>
                        <div className="text-sm font-semibold">{posLabel(pos.value)}</div>
                        {blocked && <div className="text-[9px] text-destructive mt-1">{blockReason}</div>}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              <Button variant="ghost" size="sm" className="mt-3" onClick={() => setHideStep(2)}>{t("game.hide.backToItem")}</Button>
            </div>
          )}
        </div>
      )}

      {/* SPECIAL HIDE STEP */}
      {(phase === "waiting" || phase === "hiding") && !player.has_hidden && hideStep === 5 && objectSpecial && (
        <div className="py-4">
          <Card className="glass glow-accent">
            <CardContent className="py-6 text-center">
              <div className="text-4xl mb-3">{objects.find((o: any) => o.id === selectedObject)?.icon}</div>
              <p className="font-bold mb-1">{t("game.hide.specialTitle")}</p>
              <p className="text-sm text-muted-foreground mb-4">{objectSpecial.prompt_text}</p>

              {objectSpecial.special_type === "custom_name" && (
                <div className="space-y-3">
                  <Input value={specialInput} onChange={e => setSpecialInput(e.target.value)}
                    placeholder={t("game.hide.customNamePlaceholder")} maxLength={40} className="text-center bg-muted/50" />
                  <Button disabled={!specialInput.trim() || actionLoading} className="w-full"
                    onClick={() => doHide(undefined, { type: "custom_name", name: specialInput.trim() })}>
                    {t("game.hide.hideWithName")}
                  </Button>
                </div>
              )}

              {objectSpecial.special_type === "custom_message" && (
                <div className="space-y-3">
                  <Input value={specialInput} onChange={e => setSpecialInput(e.target.value)}
                    placeholder={t("game.hide.customMessagePlaceholder")} maxLength={100} className="text-center bg-muted/50" />
                  <Button disabled={!specialInput.trim() || actionLoading} className="w-full"
                    onClick={() => doHide(undefined, { type: "custom_message", message: specialInput.trim() })}>
                    {t("game.hide.hideWithMessage")}
                  </Button>
                </div>
              )}

              {objectSpecial.special_type === "choose_variant" && objectSpecial.variants && (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    {(objectSpecial.variants as any[]).map((v: any) => (
                      <Card key={v.value}
                        className={`cursor-pointer glass transition-all active:scale-[0.97] ${selectedVariant?.value === v.value ? "border-primary glow-primary" : "hover:border-primary/40"}`}
                        onClick={() => setSelectedVariant(v)}>
                        <CardContent className="py-4 text-center">
                          <div className="text-3xl mb-1">{v.icon}</div>
                          <div className="text-[11px] font-medium">{v.label}</div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  <Button disabled={!selectedVariant || actionLoading} className="w-full"
                    onClick={() => doHide(undefined, { type: "choose_variant", variant: selectedVariant })}>
                    {t("game.hide.hideVariant", { icon: selectedVariant?.icon ?? "⚽" })}
                  </Button>
                </div>
              )}

              <Button variant="ghost" size="sm" className="mt-3" onClick={() => setHideStep(3)}>{t("game.hide.backToPos")}</Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* HIDING - Done */}
      {phase === "hiding" && player.has_hidden && (
        <div className="text-center py-16">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl gradient-secondary flex items-center justify-center text-4xl shadow-lg">✅</div>
          <h2 className="text-xl font-bold mb-2">{t("game.hide.doneTitle")}</h2>
          <p className="text-sm text-muted-foreground animate-pulse">{t("game.hide.doneWaiting")}</p>
        </div>
      )}

      {/* PLAYING */}
      {phase === "playing" && (
        <div className="space-y-4">
          {/* First-time tips */}
          {moveHistory.length === 0 && (
            <Card className="glass border-primary/30 glow-primary">
              <CardContent className="py-3">
                <p className="text-xs font-semibold mb-1">{t("game.search.tutorialTitle")}</p>
                <div className="space-y-1 text-[11px] text-muted-foreground">
                  <p dangerouslySetInnerHTML={{ __html: t("game.search.tutorial1") }} />
                  <p dangerouslySetInnerHTML={{ __html: t("game.search.tutorial2") }} />
                  <p dangerouslySetInnerHTML={{ __html: t("game.search.tutorial3") }} />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Location */}
          <Card className="glass">
            <CardContent className="py-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{t("game.search.locationLabel")}</span>
                <div className="font-bold text-lg leading-tight">{currentScenario?.icon} {currentScenario?.name}</div>
              </div>
              {!isStory && (
                <div className="text-right">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{t("game.search.tokensLabel")}</span>
                  <div className="font-bold text-lg leading-tight text-accent">🪙 {player.tokens_remaining}</div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status badges */}
          <div className="flex gap-2 flex-wrap">
            {!isStory && rivalNearby && (
              <span className="bg-destructive/15 text-destructive text-[11px] font-semibold px-3 py-1 rounded-full animate-pulse border border-destructive/30">
                {t("game.search.rivalNearby")}
              </span>
            )}
            {!isStory && player.shield_active && (
              <span className="bg-primary/10 text-primary text-[11px] font-semibold px-3 py-1 rounded-full border border-primary/20">{t("game.search.shieldActive")}</span>
            )}
            {noTokens && (
              <span className="bg-accent/10 text-accent text-[11px] font-semibold px-3 py-1 rounded-full border border-accent/20">{t("game.search.noTokens")}</span>
            )}
            {(playerTools.drap > 0 || playerTools.tornavis > 0 || playerTools.martell > 0 || playerTools.llanterna > 0) && (
              <span className="bg-secondary/10 text-secondary text-[11px] font-semibold px-3 py-1 rounded-full border border-secondary/20">
                🎒 {playerTools.drap > 0 ? `🧹${playerTools.drap}` : ""}{playerTools.tornavis > 0 ? ` 🔧${playerTools.tornavis}` : ""}{playerTools.martell > 0 ? ` 🔨${playerTools.martell}` : ""}{playerTools.llanterna > 0 ? ` 🔦${playerTools.llanterna}` : ""}
              </span>
            )}
          </div>

          {/* My hideout reminder — privat, només per a mi (no aplicable a mode història) */}
          {!isStory && player.hidden_item_id && player.hidden_object_id && (
            <Card className="glass border-secondary/20">
              <CardContent className="py-2.5 px-3">
                <button
                  onClick={async () => {
                    if (!showMyHideout && !myHideoutData && player.hidden_item_id && player.hidden_object_id) {
                      try {
                        const [{ data: itm }, { data: obj }] = await Promise.all([
                          supabase.from("items").select("name, scenario_id").eq("id", player.hidden_item_id).single(),
                          supabase.from("objects").select("name, icon").eq("id", player.hidden_object_id).single(),
                        ]);
                        const sc = scenarios.find(s => s.id === itm?.scenario_id);
                        setMyHideoutData({
                          item: itm?.name ?? "?",
                          itemIcon: "📦",
                          scenario: sc?.name ?? "?",
                          scenarioIcon: sc?.icon ?? "🏠",
                        });
                      } catch { /* silent */ }
                    }
                    setShowMyHideout(v => !v);
                  }}
                  className="w-full flex items-center justify-between text-left"
                >
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    {t("game.search.myHideoutLabel")} {showMyHideout ? t("game.search.myHideoutHide") : t("game.search.myHideoutShow")}
                  </span>
                  <span className="text-xs text-muted-foreground">{showMyHideout ? "▲" : "▼"}</span>
                </button>
                {showMyHideout && (
                  <div className="mt-2 pt-2 border-t border-border/30 text-[12px]">
                    {myHideoutData ? (
                      <p>
                        <span className="font-medium">{myHideoutData.scenarioIcon} {myHideoutData.scenario}</span>
                        {" → "}
                        <span className="font-medium">{myHideoutData.item}</span>
                        {" → "}
                        <span className="font-bold text-primary">{player.hidden_position}</span>
                      </p>
                    ) : (
                      <p className="text-muted-foreground">{t("game.search.loadingHideout")}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {!isStory && (rivalTraits.trait1 || rivalTraits.trait2) && (
            <Card className="glass border-accent/30 glow-accent">
              <CardContent className="py-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1.5">{t("game.search.rivalTraitsTitle")}</p>
                {rivalTraits.trait1 && <p className="text-sm font-medium">1. <span className="text-primary italic">"{rivalTraits.trait1}"</span></p>}
                {rivalTraits.trait2 && <p className="text-sm font-medium mt-1">2. <span className="text-primary italic">"{rivalTraits.trait2}"</span></p>}
                {!rivalTraits.trait2 && rivalTraits.trait1 && <p className="text-[10px] text-muted-foreground mt-1">{t("game.search.trait2Locked")}</p>}
              </CardContent>
            </Card>
          )}
          {!isStory && !rivalTraits.trait1 && moveHistory.length < 2 && (
            <p className="text-[10px] text-center text-muted-foreground">{t("game.search.trait1Locked")}</p>
          )}

          {/* Move — hidden in story chapter 1 (tutorial: search in same room) */}
          {!(isStory && storyChapter === 1) && (
          <div>
            <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              🚶 Moure's {!isStory && `· ${TOKEN_COSTS.move}🪙`}
            </h3>
            <Tip>{t("game.search.moveTip")}</Tip>
            {isStory && storyChapter === 2 && moveHistory.length === 0 && (
              <p className="text-[11px] text-accent mb-1">{t("game.search.moveStoryHint")}</p>
            )}
            <div className="grid grid-cols-2 gap-1.5 mt-2">
              {connectedScenarios.map(s => (
                <button key={s.id} onClick={() => handleMove(s.id)}
                  disabled={actionLoading || (!isStory && player.tokens_remaining < TOKEN_COSTS.move)}
                  className="glass rounded-xl p-3 text-center hover:border-primary/40 transition-all disabled:opacity-30 active:scale-[0.97]">
                  <div className="text-2xl">{s.icon}</div>
                  <div className="text-[11px] leading-tight font-medium mt-1">{s.name}</div>
                  <div className="text-[9px] text-muted-foreground mt-0.5">{t("game.search.doorLabel")}</div>
                </button>
              ))}
            </div>
          </div>
          )}
          {isStory && storyChapter === 1 && (
            <p className="text-[11px] text-muted-foreground text-center py-2">{t("game.search.storyCh1Hint")}</p>
          )}

          {/* Unified Light/Illumination toggle */}
          <div>
            {(() => {
              const isCurrentlyDark = scenarioIsDark;
              const hasLlanterna = playerTools.llanterna > 0;
              const canToggle = isOutdoor ? (isCurrentlyDark ? hasLlanterna : true) : true;

              return (
                <>
                  {/* Show toggle button always: indoor on/off, outdoor on/off */}
                  {(
                    <button
                      onClick={handleToggleLight}
                      disabled={actionLoading || player.tokens_remaining < 0.2 || !canToggle}
                      className={`w-full glass rounded-xl p-3 flex items-center gap-3 transition-all active:scale-[0.97] ${
                        isCurrentlyDark
                          ? isOutdoor && hasLlanterna
                            ? "bg-accent/20 border-2 border-accent/50 hover:border-accent/70 shadow-lg animate-pulse"
                            : "border-yellow-500/40 bg-yellow-500/10 hover:bg-yellow-500/20"
                          : "hover:border-destructive/40"
                      }`}
                    >
                      <span className="text-2xl">{isCurrentlyDark ? (isOutdoor ? "🔦" : "💡") : "🌑"}</span>
                      <div className="flex-1 text-left">
                        <div className="text-sm font-semibold">
                          {isCurrentlyDark
                            ? (isOutdoor ? t("game.search.useFlashlight") : t("game.search.turnLightOn"))
                            : t("game.search.turnLightOff")}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {isCurrentlyDark
                            ? (isOutdoor
                              ? (hasLlanterna ? t("game.search.flashlightDesc") : t("game.search.needFlashlight"))
                              : t("game.search.turnLightDesc"))
                            : t("game.search.turnOffLightDesc")}
                        </div>
                      </div>
                      <span className="text-[10px] text-muted-foreground">0.2🪙</span>
                    </button>
                  )}
                </>
              );
            })()}
          </div>

          {/* Dark warning */}
          {scenarioIsDark && (
            <Card className="glass border-yellow-500/30">
              <CardContent className="py-3 text-center">
                <div className="text-3xl mb-1">{isOutdoor ? "🌙" : "🌑"}</div>
                <p className="text-sm font-semibold">{isOutdoor ? t("game.search.darkZoneTitle") : t("game.search.lightOffTitle")}</p>
                <p className="text-[11px] text-muted-foreground">
                  {isOutdoor ? t("game.search.darkZoneSubtitle") : t("game.search.lightOffSubtitle")}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Look / Items */}
          {!scenarioIsDark && (
          <div>
            <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              👀 Investigar mobles {!isStory && `· ${TOKEN_COSTS.look}🪙`}
            </h3>
            <Tip>{t("game.search.investigateTip")}</Tip>
            {bananaEffect && bananaBlockedSpot && (
              <p className="text-xs text-destructive mt-1 animate-pulse">{t("game.search.bananaBlocked")}</p>
            )}
            <div className="space-y-1.5 mt-2">
              {currentScenarioItems.map(item => (
                <ItemActions key={item.id} item={item} positions={POSITIONS}
                  onLook={handleLook} disabled={actionLoading} tokensRemaining={player.tokens_remaining}
                  lookedSpots={lookedSpots} bananaBlockedSpot={bananaBlockedSpot}
                  interactions={itemInteractions.filter((ia: any) => ia.item_id === item.id)}
                  onInteraction={handleInteraction} moveHistory={moveHistory}
                  playerTools={playerTools} gameBreaks={gameBreaks}
                  onTagAction={handleTagAction} dirtyItems={dirtyItems} />
              ))}
            </div>
          </div>
          )}

          {/* Social items (PvP only) */}
          {!isStory && (
            <SocialItemsPanel showPanel={showSocialPanel} setShowPanel={setShowSocialPanel}
              player={player} onSendSocial={handleSendSocial}
              messageInput={messageInput} setMessageInput={setMessageInput}
              actionLoading={actionLoading}
              connectedScenarios={connectedScenarios}
              currentScenarioId={player?.current_scenario_id}
              currentScenarioItems={currentScenarioItems} />
          )}

          {/* History */}
          {moveHistory.length > 0 && (
            <details className="group">
              <summary className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 cursor-pointer select-none flex items-center gap-1">
                {t("game.historyTitle", { count: moveHistory.length })}
                <span className="text-[9px] group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="space-y-0.5 max-h-40 overflow-y-auto" style={{ WebkitOverflowScrolling: "touch" }}>
                {moveHistory.map(m => {
                  const hintIcons: Record<number, string> = { 0: "❄️", 1: "🥶", 2: "🌬️", 3: "🌡️", 4: "🔥" };
                  const hl = (m as any).hint_level;
                  return (
                    <div key={m.id} className={`text-[10px] rounded-md px-2 py-1 flex justify-between items-center border border-border/15 ${
                      hl === 4 ? "bg-orange-500/10 border-orange-500/30" :
                      hl === 3 ? "bg-yellow-500/10 border-yellow-500/30" :
                      hl === 2 ? "bg-cyan-500/10 border-cyan-500/20" :
                      hl === 1 ? "bg-blue-500/10 border-blue-500/20" :
                      hl === 0 ? "bg-slate-500/10 border-slate-500/20" :
                      "bg-muted/20"
                    }`}>
                      <span className="truncate mr-1">
                        <span className="text-muted-foreground font-mono">#{m.turn_number}</span>{" "}
                        {m.action === "move" && `🚶→ ${(m.scenarios as any)?.icon} ${(m.scenarios as any)?.name}`}
                        {m.action === "look" && (
                          <>
                            👀 {(m.items as any)?.icon} {m.target_position ? posLabel(m.target_position) : ""}
                            {hl != null && <span className="ml-0.5 font-bold">{hintIcons[hl]}</span>}
                          </>
                        )}
                        {m.found_object && " 🏆"}
                        {m.found_bonus === "extra_token" && " 🎁"}
                      </span>
                      <span className="text-muted-foreground shrink-0">-{m.token_cost}🪙</span>
                    </div>
                  );
                })}
              </div>
            </details>
          )}
        </div>
      )}

      {/* FINISHED — Story */}
      {phase === "finished" && isStory && storyResult && (
        <div className="text-center py-10">
          <div className="w-24 h-24 mx-auto mb-4 rounded-3xl gradient-primary flex items-center justify-center text-5xl shadow-xl glow-primary">
            {storyResult.isDead ? "💫" : "🎉"}
          </div>
          <h2 className="text-2xl font-bold mb-2">
            {storyResult.isDead ? t("game.story.maxXp") : <span className="text-gradient">{t("game.story.chapterDone", { n: storyChapter ?? "" })}</span>}
          </h2>
          <p className="text-lg text-accent font-bold mb-1">{t("game.story.xpGained", { xp: storyResult.xp })}</p>
          <p className="text-sm text-muted-foreground mb-2">{t("game.story.movesCount", { n: moveHistory.length })}</p>
          {storyResult.accessory && (
            <p className="text-lg font-bold text-primary mb-2">
              {t("game.story.newAccessory", { icon: storyResult.accessory.icon, name: storyResult.accessory.name })}
            </p>
          )}
          {storyResult.consumable && (
            <p className="text-sm font-medium text-green-500 mb-2">
              {storyResult.consumable.icon} {storyResult.consumable.name}!
            </p>
          )}
          {storyResult.isDead && (
            <p className="text-sm text-muted-foreground mb-2">
              {t("game.story.petDied")}
            </p>
          )}
          <div className="flex gap-2 justify-center mt-4">
            <Button onClick={() => navigate("/story")}>{t("game.story.storyModeBtn")}</Button>
          </div>
        </div>
      )}

      {/* FINISHED — PvP */}
      {phase === "finished" && !isStory && (
        <GameFinishedPhase game={game} user={user} rival={rival} reward={reward}
          navigate={navigate} objects={objects} scenarios={scenarios} gameId={gameId!} />
      )}
    </main>
  );
}
