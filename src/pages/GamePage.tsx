import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { logError } from "@/components/ErrorBoundary";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import {
  getScenarios, getItemsByScenario, getObjects, getConnectedScenarios,
  hideObject, checkBothPlayersHidden, startGame, performMove,
  sendSocialItem, getUnprocessedSocialItems, markSocialItemProcessed,
  ensureTokensReset, TOKEN_COSTS, SOCIAL_ITEMS, type SocialItemType,
  getObjectSpecial, autoFixMissingScenario, getMaterialBlockReason,
  redeemBonusTokens, getItemInteractions,
} from "@/lib/supabase-helpers";
import { getGameReward, RARITY_CONFIG } from "@/lib/reward-helpers";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { HelpButton, Tip } from "@/components/HelpButton";

type Phase = "waiting" | "hiding" | "playing" | "finished";

export default function GamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [game, setGame] = useState<any>(null);
  const [player, setPlayer] = useState<any>(null);
  const [rival, setRival] = useState<any>(null);
  const [phase, setPhase] = useState<Phase>("waiting");

  const [scenarios, setScenarios] = useState<any[]>([]);
  const [objects, setObjects] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [selectedScenario, setSelectedScenario] = useState("");
  const [selectedObject, setSelectedObject] = useState("");
  const [selectedItem, setSelectedItem] = useState("");
  const [selectedPosition, setSelectedPosition] = useState<"sobre" | "sota" | "dins" | "">("");
  const [hideStep, setHideStep] = useState(0);
  const [objectSpecial, setObjectSpecial] = useState<any>(null);
  const [specialInput, setSpecialInput] = useState("");
  const [selectedVariant, setSelectedVariant] = useState<any>(null);

  const [currentScenarioItems, setCurrentScenarioItems] = useState<any[]>([]);
  const [connectedScenarios, setConnectedScenarios] = useState<any[]>([]);
  const [moveHistory, setMoveHistory] = useState<any[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [itemInteractions, setItemInteractions] = useState<any[]>([]);
  const [revealedItemIds, setRevealedItemIds] = useState<Set<string>>(new Set());

  const [showSocialPanel, setShowSocialPanel] = useState(false);
  const [bananaEffect, setBananaEffect] = useState(false);
  const [hideMessage, setHideMessage] = useState("");
  const [receivedMessage, setReceivedMessage] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [showConfirmDialog, setShowConfirmDialog] = useState<{ itemId: string; position: "sobre" | "sota" | "dins"; itemName: string } | null>(null);
  const [reward, setReward] = useState<any>(null);
  const [rivalNearby, setRivalNearby] = useState(false);
  const [bananaBlockedSpot, setBananaBlockedSpot] = useState<string | null>(null);
  const [rivalTraits, setRivalTraits] = useState<{ trait1: string | null; trait2: string | null }>({ trait1: null, trait2: null });
  const [showSpecialFoundPopup, setShowSpecialFoundPopup] = useState<any>(null);
  const [specialFoundInput, setSpecialFoundInput] = useState("");
  const [trollEffect, setTrollEffect] = useState<{ message: string; emoji: string; animation: string } | null>(null);
  const [bonusAvailable, setBonusAvailable] = useState(0);
  const [bonusAmount, setBonusAmount] = useState(1);
  const [showBonusPicker, setShowBonusPicker] = useState(false);

  const positions = [
    { value: "sobre" as const, label: "Sobre", icon: "⬆️" },
    { value: "sota" as const, label: "Sota", icon: "⬇️" },
    { value: "dins" as const, label: "Dins", icon: "📦" },
  ];

  const loadGame = useCallback(async () => {
    if (!gameId || !user) return;

    const [{ data: gameData }, { data: playerData }, { data: rivalData }] = await Promise.all([
      supabase.from("games").select("*").eq("id", gameId).single(),
      supabase.from("game_players").select("*").eq("game_id", gameId).eq("user_id", user.id).single(),
      supabase.from("game_players").select("*").eq("game_id", gameId).neq("user_id", user.id).maybeSingle(),
    ]);

    setGame(gameData);
    setPhase((gameData?.status as Phase) ?? "waiting");
    setRival(rivalData);

    // Ensure daily token reset on load
    if (playerData && (gameData?.status === "playing" || gameData?.status === "hiding")) {
      const resetTokens = await ensureTokensReset(playerData);
      playerData.tokens_remaining = resetTokens;
      playerData.tokens_last_reset = new Date().toISOString().split("T")[0];

      // Safety: auto-fix missing scenario
      if (gameData?.status === "playing" && !playerData.current_scenario_id && playerData.hidden_item_id) {
        const fixedId = await autoFixMissingScenario(gameId, user.id, playerData.hidden_item_id);
        playerData.current_scenario_id = fixedId;
      }
    }
    setPlayer(playerData);

    // Load available bonus tokens from profile
    if (gameData?.status === "playing") {
      const { data: prof } = await supabase.from("profiles").select("bonus_tokens").eq("user_id", user.id).single();
      setBonusAvailable(prof?.bonus_tokens ?? 0);
    }

    if (playerData?.has_hidden) setHideStep(4);

    // Proximity alert: check if rival is at the scenario where we hid our object
    if (gameData?.status === "playing" && playerData?.hidden_item_id && rivalData?.current_scenario_id) {
      const { data: hiddenItem } = await supabase
        .from("items").select("scenario_id").eq("id", playerData.hidden_item_id).single();
      setRivalNearby(hiddenItem?.scenario_id === rivalData.current_scenario_id);
    } else {
      setRivalNearby(false);
    }

    // Load rival's object traits progressively
    if (gameData?.status === "playing" && rivalData?.hidden_object_id) {
      const { count: myMoves } = await supabase
        .from("game_moves").select("*", { count: "exact", head: true })
        .eq("game_id", gameId).eq("player_id", user.id);
      const totalMoves = myMoves ?? 0;

      if (totalMoves >= 2) {
        const { data: traits } = await supabase
          .from("object_traits").select("trait_number, trait_text")
          .eq("object_id", rivalData.hidden_object_id)
          .order("trait_number");
        const t1 = traits?.find((t: any) => t.trait_number === 1)?.trait_text ?? null;
        const t2 = totalMoves >= 5 ? (traits?.find((t: any) => t.trait_number === 2)?.trait_text ?? null) : null;
        setRivalTraits({ trait1: t1, trait2: t2 });
      } else {
        setRivalTraits({ trait1: null, trait2: null });
      }
    }

    let loadedItems: any[] = [];
    if (gameData?.status === "playing" && playerData?.current_scenario_id) {
      const [itemsData, connected] = await Promise.all([
        getItemsByScenario(playerData.current_scenario_id),
        getConnectedScenarios(playerData.current_scenario_id),
      ]);
      loadedItems = itemsData;
      setCurrentScenarioItems(itemsData);
      setConnectedScenarios(connected);
      // Load interactions for current scenario items
      const interactions = await getItemInteractions(itemsData.map((i: any) => i.id));
      setItemInteractions(interactions);
    }

    const { data: moves } = await supabase
      .from("game_moves")
      .select("*, scenarios:target_scenario_id(name, icon), items:target_item_id(name, icon)")
      .eq("game_id", gameId).eq("player_id", user.id)
      .order("turn_number", { ascending: false });
    setMoveHistory(moves ?? []);

    if (gameData?.status === "finished" && gameData?.winner_id === user.id) {
      const r = await getGameReward(gameId, user.id);
      setReward(r);
    }

    if (gameData?.status === "playing") {
      // Check items blocked by YOUR shield (notify you that it worked)
      const { data: blockedItems } = await supabase
        .from("game_social_items").select("*")
        .eq("game_id", gameId).eq("to_player_id", user.id)
        .eq("blocked_by_shield", true).eq("processed", false);
      for (const blocked of blockedItems ?? []) {
        const info = SOCIAL_ITEMS.find(i => i.type === blocked.item_type);
        toast.success(`🛡️ El teu escut ha bloquejat ${info?.icon} ${info?.name} del rival!`, { duration: 5000 });
        await markSocialItemProcessed(blocked.id);
      }

      const unprocessed = await getUnprocessedSocialItems(gameId, user.id);
      for (const item of unprocessed) {
        if (item.item_type === "banana") {
          const allPositions = ["sobre", "sota", "dins"] as const;
          const randomPos = allPositions[Math.floor(Math.random() * allPositions.length)];
          if (loadedItems.length > 0) {
            const randomItem = loadedItems[Math.floor(Math.random() * loadedItems.length)];
            setBananaBlockedSpot(`${randomItem.id}:${randomPos}`);
            setBananaEffect(true);
          }
        } else if (item.item_type === "smoke_bomb") {
          toast.warning("💨 El rival ha usat una bomba de fum! Ha mogut el seu objecte de posició!", { duration: 5000 });
        } else if (item.item_type === "swap") {
          toast.warning("🔄 El rival ha usat un Intercanvi! Heu intercanviat posicions!", { duration: 5000 });
        } else if (item.item_type === "shield") {
          // Shield activates on the SENDER, not the receiver — no effect here
        } else if (item.item_type === "message" && item.message_text) {
          setReceivedMessage(item.message_text);
        }
        await markSocialItemProcessed(item.id);
      }
    }
  }, [gameId, user]);

  useEffect(() => {
    if (!gameId || !user) return;
    loadGame();
    getScenarios().then(setScenarios).catch(() => toast.error("Error carregant escenaris"));
    getObjects().then(setObjects).catch(() => toast.error("Error carregant objectes"));

    const channel = supabase
      .channel(`game-${gameId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "games", filter: `id=eq.${gameId}` }, () => loadGame())
      .on("postgres_changes", { event: "*", schema: "public", table: "game_players", filter: `game_id=eq.${gameId}` }, () => loadGame())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "game_social_items", filter: `game_id=eq.${gameId}` }, () => loadGame())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [gameId, user, loadGame]);

  const handleSelectScenario = async (id: string) => {
    setSelectedScenario(id);
    setItems(await getItemsByScenario(id));
    setHideStep(1);
  };

  const handleSelectObject = async (objId: string) => {
    setSelectedObject(objId);
    const special = await getObjectSpecial(objId);
    setObjectSpecial(special);
    setSpecialInput("");
    setSelectedVariant(null);
    setHideStep(2);
  };

  const handleSelectPosition = async (pos: "sobre" | "sota" | "dins") => {
    // Check size restriction for "dins"
    const obj = objects.find((o: any) => o.id === selectedObject);
    const itm = items.find((i: any) => i.id === selectedItem);
    if (pos === "dins") {
      const objSize = (obj as any)?.size ?? 2;
      const capacity = (itm as any)?.inner_capacity ?? 2;
      if (objSize > capacity) {
        toast.error(`${obj?.icon} ${obj?.name} és massa gran per amagar dins de ${itm?.icon} ${itm?.name}!`);
        return;
      }
    }
    // Check material vs environment in UI
    const material = (obj as any)?.material ?? "generic";
    const environment = (itm as any)?.environment ?? "generic";
    const blockReason = getMaterialBlockReason(material, environment);
    if (blockReason) {
      toast.error(`🚫 ${obj?.icon} ${obj?.name}: ${blockReason}`);
      return;
    }
    setSelectedPosition(pos);

    // Check if special object needs extra input on hide
    if (objectSpecial && objectSpecial.prompt_on === "hide") {
      setHideStep(5); // Extra step for special input
      return;
    }

    // Directly hide
    await doHide(pos);
  };

  const doHide = async (pos?: "sobre" | "sota" | "dins", extraSpecialData?: any) => {
    const finalPos = pos || selectedPosition as "sobre" | "sota" | "dins";
    if (!gameId || !user || !finalPos) return;
    setActionLoading(true);
    try {
      // Merge hide message into special data if present
      let specialData = extraSpecialData || undefined;
      if (hideMessage.trim()) {
        specialData = { ...(specialData || {}), hide_message: hideMessage.trim() };
      }
      await hideObject(gameId, user.id, selectedObject, selectedItem, finalPos, specialData);
      setHideStep(4);
      toast.success("Objecte amagat! 🫣");
      if (await checkBothPlayersHidden(gameId)) {
        await startGame(gameId);
        toast.success("Comença la cerca! 🔍");
      }
    } catch (err: any) { toast.error(err.message); logError(err.message, err.stack, "GamePage"); }
    finally { setActionLoading(false); }
  };

  // Clear banana block after any token-spending action
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
      await performMove(gameId, user.id, "move", scenarioId);
      const s = scenarios.find(s => s.id === scenarioId);
      toast.success(`${s?.icon} ${s?.name} (-${TOKEN_COSTS.move}🪙)`);
      clearBanana();
      await loadGame();
    } catch (err: any) { toast.error(err.message); logError(err.message, err.stack, "GamePage"); }
    finally { setActionLoading(false); }
  };

  const handleInteraction = async (interaction: any) => {
    if (!gameId || !user || !player) return;
    // Check if already used (one_time) by looking at move history
    const alreadyUsed = moveHistory.some((m: any) =>
      m.action === "look" && m.target_item_id === interaction.item_id &&
      (m as any).bonus_value === `interact:${interaction.action_name}`
    );
    if (interaction.one_time && alreadyUsed) {
      toast.error("Ja has fet aquesta acció!");
      return;
    }
    if (player.tokens_remaining < interaction.cost) {
      toast.error("No tens prou tokens!");
      return;
    }
    setActionLoading(true);
    try {
      // Record as a look move with special bonus_value to track interaction
      await performMove(gameId, user.id, "look", undefined, interaction.item_id, "sobre");
      // Apply effect locally
      if (interaction.effect_type === "reveal_content") {
        const data = interaction.effect_data as any;
        toast.success(`${interaction.action_icon} ${data.message}`, { duration: 6000 });
      } else if (interaction.effect_type === "reveal_items") {
        toast.success(`${interaction.action_icon} Nous mobles revelats!`, { duration: 4000 });
      } else if (interaction.effect_type === "give_hint") {
        const data = interaction.effect_data as any;
        toast.info(`${interaction.action_icon} ${data.hint || "Pista rebuda!"}`, { duration: 5000 });
      } else if (interaction.effect_type === "enable_position") {
        const data = interaction.effect_data as any;
        toast.success(`${interaction.action_icon} ${data.hint || "Posició desbloquejada!"}`, { duration: 4000 });
      }
      clearBanana();
      await loadGame();
    } catch (err: any) { toast.error(err.message); logError(err.message, err.stack, "GamePage"); }
    finally { setActionLoading(false); }
  };

  const handleLook = async (itemId: string, pos: "sobre" | "sota" | "dins") => {
    if (!gameId || !user) return;
    setActionLoading(true);
    try {
      const result = await performMove(gameId, user.id, "look", undefined, itemId, pos);
      const item = currentScenarioItems.find(i => i.id === itemId);
      const posLabel = positions.find(p => p.value === pos)?.label;
      if (result.foundBonus === "extra_token") toast.success(`🎁 +${result.bonusValue} token extra!`);
      else if (result.foundBonus) toast.info(`🔮 ${result.bonusValue}`);
      else {
        // Progressive hints
        const level = result.hintLevel ?? 0;
        if (level === 0) {
          toast.info(`❄️ Fred! L'objecte NO és a ${currentScenario?.icon} ${currentScenario?.name}. (-${TOKEN_COSTS.look}🪙)`);
        } else if (level === 1) {
          toast.warning(`🌡️ Calent! L'objecte ÉS en aquesta habitació, però no a ${item?.icon} ${item?.name}. (-${TOKEN_COSTS.look}🪙)`);
        } else {
          toast.success(`🔥 MOLT CALENT! ${item?.icon} ${item?.name} és el moble correcte! Prova altra posició. (-${TOKEN_COSTS.look}🪙)`);
        }
      }
      clearBanana();
      await loadGame();
    } catch (err: any) { toast.error(err.message); logError(err.message, err.stack, "GamePage"); }
    finally { setActionLoading(false); }
  };

  const handleConfirm = async () => {
    if (!gameId || !user || !showConfirmDialog) return;
    const { itemId, position } = showConfirmDialog;
    setShowConfirmDialog(null);
    setActionLoading(true);
    try {
      const result = await performMove(gameId, user.id, "confirm", undefined, itemId, position);
      if (result.foundObject) {
        toast.success("🏆 HAS GUANYAT! Has trobat l'objecte!");
        // Check if rival's object has a "find" special
        if (rival?.hidden_object_id) {
          const rivalSpecial = await getObjectSpecial(rival.hidden_object_id);
          if (rivalSpecial && rivalSpecial.prompt_on === "find") {
            if (rivalSpecial.special_type === "troll_effect") {
              const variants = rivalSpecial.variants as any;
              setTrollEffect({
                message: rivalSpecial.prompt_text,
                emoji: variants?.emoji ?? "😈",
                animation: variants?.animation ?? "shake",
              });
              setTimeout(() => setTrollEffect(null), 6000);
            } else {
              setShowSpecialFoundPopup({ special: rivalSpecial, rivalPlayer: rival });
            }
          }
        }
        // Show hide message from rival (any object, not just specials)
        if (rival?.special_data) {
          const sd = rival.special_data as any;
          const hideMsg = sd?.hide_message || (sd?.type === "custom_message" ? sd.message : null);
          if (hideMsg) {
            toast.info(`✉️ Missatge del rival: "${hideMsg}"`, { duration: 8000 });
          }
        }
      }
      else toast.error(`❌ No era aquí... (-${TOKEN_COSTS.confirm}🪙)`);
      clearBanana();
      await loadGame();
    } catch (err: any) { toast.error(err.message); logError(err.message, err.stack, "GamePage"); }
    finally { setActionLoading(false); }
  };

  const handleSpecialFoundSubmit = async () => {
    if (!gameId || !user || !showSpecialFoundPopup) return;
    const { special } = showSpecialFoundPopup;
    // Save as trophy to player_inventory
    const rivalObj = objects.find((o: any) => o.id === rival?.hidden_object_id);
    const rivalSd = rival?.special_data as any;
    const hideMsg = rivalSd?.hide_message || (rivalSd?.type === "custom_message" ? rivalSd.message : null);
    await supabase.from("player_inventory").insert({
      user_id: user.id, game_id: gameId,
      item_type: "special_trophy",
      item_value: special.special_type === "custom_name" ? specialFoundInput.trim() : null,
      special_data: {
        object_name: rivalObj?.name,
        object_icon: rivalObj?.icon,
        custom_name: specialFoundInput.trim() || null,
        special_type: special.special_type,
        custom_message: hideMsg,
      },
    });
    toast.success(`🏆 Trofeu desat!`);
    setShowSpecialFoundPopup(null);
    setSpecialFoundInput("");
  };

  const handleSendSocial = async (type: SocialItemType) => {
    if (!gameId || !user || !rival) return;
    setActionLoading(true);
    try {
      const msg = type === "message" ? messageInput : undefined;
      const result = await sendSocialItem(gameId, user.id, rival.user_id, type, msg);
      const info = SOCIAL_ITEMS.find(i => i.type === type);
      if (result.blocked) toast.error(`🛡️ Bloquejat per l'escut del rival!`);
      else if (result.espiaResult) toast.success(`🕵️ El rival és a: ${result.espiaResult}`, { duration: 8000 });
      else toast.success(`${info?.icon} ${info?.name} enviat!`);
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
      toast.success(`+${amount}🪙 bonus tokens afegits a aquesta partida!`);
      setShowBonusPicker(false);
      setBonusAmount(1);
      await loadGame();
    } catch (err: any) { toast.error(err.message); }
    finally { setActionLoading(false); }
  };

  const currentScenario = scenarios.find(s => s.id === player?.current_scenario_id);
  const noTokens = player && player.tokens_remaining < TOKEN_COSTS.look;

  // Separate tracking: looked spots vs confirmed spots
  const lookedSpots = new Set<string>();
  const confirmedSpots = new Set<string>();
  for (const m of moveHistory) {
    if (m.target_item_id && m.target_position) {
      if (m.action === "look") lookedSpots.add(`${m.target_item_id}:${m.target_position}`);
      if (m.action === "confirm") confirmedSpots.add(`${m.target_item_id}:${m.target_position}`);
    }
  }

  if (!game || !player) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="text-5xl mb-3 animate-pulse">🔍</div>
        <p className="text-muted-foreground text-sm">Carregant partida...</p>
      </div>
    </div>;
  }

  const hideSteps = ["📍 Escenari", "🎯 Objecte", "🪑 Moble", "📌 Posició"];

  return (
    <div className="min-h-screen bg-background p-4 pb-20 max-w-md mx-auto relative">
      {/* BG glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[500px] h-[250px] rounded-full bg-primary/5 blur-[100px] pointer-events-none" />

      {/* Special found popup (joguina/anell name input) */}
      {showSpecialFoundPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md">
          <Card className="mx-4 max-w-sm glass glow-accent" onClick={e => e.stopPropagation()}>
            <CardContent className="py-6 text-center">
              <div className="text-5xl mb-3">{objects.find((o: any) => o.id === rival?.hidden_object_id)?.icon ?? "⭐"}</div>
              <p className="font-bold text-lg mb-1">⭐ Objecte especial trobat!</p>
              <p className="text-sm text-muted-foreground mb-4">{showSpecialFoundPopup.special.prompt_text}</p>
              <Input value={specialFoundInput} onChange={e => setSpecialFoundInput(e.target.value)}
                placeholder="Escriu un nom..." maxLength={40} className="text-center bg-muted/50 mb-3" />
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => { setShowSpecialFoundPopup(null); setSpecialFoundInput(""); }}>Saltar</Button>
                <Button className="flex-1" disabled={!specialFoundInput.trim()} onClick={handleSpecialFoundSubmit}>
                  Desar trofeu 🏆
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Banana notification toast (no longer full-screen block) */}

      {/* Confirm dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-background/80 backdrop-blur-md" onClick={() => setShowConfirmDialog(null)}>
          <Card className="mx-4 max-w-sm glass" onClick={e => e.stopPropagation()}>
            <CardContent className="py-6 text-center">
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl gradient-accent flex items-center justify-center text-2xl shadow-lg">🔍</div>
              <p className="font-bold mb-1">Confirmar obertura?</p>
              <p className="text-sm text-muted-foreground mb-1">
                {positions.find(p => p.value === showConfirmDialog.position)?.icon}{" "}
                {positions.find(p => p.value === showConfirmDialog.position)?.label}{" "}
                de {showConfirmDialog.itemName}
              </p>
              <p className="text-xs text-destructive font-medium mb-4">Costa {TOKEN_COSTS.confirm} tokens!</p>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowConfirmDialog(null)}>Cancel·lar</Button>
                <Button className="flex-1" onClick={handleConfirm}>Confirmar 🔍</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Message popup */}
      {receivedMessage && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-background/80 backdrop-blur-md" onClick={() => setReceivedMessage(null)}>
          <Card className="mx-4 max-w-sm glass" onClick={e => e.stopPropagation()}>
            <CardContent className="py-6 text-center">
              <div className="text-4xl mb-2">💡</div>
              <p className="text-xs text-muted-foreground mb-1">Pista del rival:</p>
              <p className="text-lg font-medium italic my-3 text-primary">"{receivedMessage}"</p>
              <p className="text-[10px] text-muted-foreground mb-3">⚠️ Pot ser veritat o un farol!</p>
              <Button size="sm" onClick={() => setReceivedMessage(null)}>Tancar</Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <button onClick={() => navigate("/")} className="text-sm text-muted-foreground hover:text-primary transition-colors">← Lobby</button>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] bg-muted/50 backdrop-blur-sm px-3 py-1.5 rounded-full border border-border/30 tracking-wider font-semibold">{game.code}</span>
          {rival && (
            <button onClick={() => navigate(`/player/${rival.user_id}`)}
              className="text-[11px] bg-secondary/10 text-secondary px-2.5 py-1.5 rounded-full border border-secondary/20 hover:bg-secondary/20 transition-colors font-medium">
              👤 Rival
            </button>
          )}
        </div>
        <div className="flex items-center gap-1">
          {phase === "playing" && (
            <div className="flex items-center gap-1">
              <div className="flex items-center gap-1.5 gradient-primary px-3 py-1.5 rounded-full shadow-md">
                <span className="text-xs">🪙</span>
                <span className="font-bold text-xs text-primary-foreground">{player.tokens_remaining}</span>
              </div>
              {bonusAvailable > 0 && !showBonusPicker && (
                <button
                  onClick={() => { setBonusAmount(1); setShowBonusPicker(true); }}
                  className="flex items-center gap-1 bg-accent/20 text-accent-foreground px-2 py-1.5 rounded-full border border-accent/30 hover:bg-accent/40 transition-colors text-[10px] font-bold animate-pulse"
                >
                  +{bonusAvailable}🪙
                </button>
              )}
              {showBonusPicker && (
                <div className="flex items-center gap-1 bg-card border border-border rounded-full px-2 py-1 shadow-lg">
                  <button onClick={() => setBonusAmount(Math.max(1, bonusAmount - 1))} className="text-xs font-bold px-1 text-muted-foreground hover:text-foreground">−</button>
                  <span className="text-xs font-bold min-w-[20px] text-center">{bonusAmount}</span>
                  <button onClick={() => setBonusAmount(Math.min(bonusAvailable, bonusAmount + 1))} className="text-xs font-bold px-1 text-muted-foreground hover:text-foreground">+</button>
                  <button onClick={handleRedeemBonus} disabled={actionLoading} className="bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">✓</button>
                  <button onClick={() => setShowBonusPicker(false)} className="text-[10px] text-muted-foreground px-1">✕</button>
                </div>
              )}
            </div>
          )}
          <HelpButton />
        </div>
      </div>

      {/* WAITING — show code + allow hiding */}
      {phase === "waiting" && !player.has_hidden && hideStep < 4 && (
        <Card className="glass glow-primary mb-4">
          <CardContent className="py-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Comparteix el codi:</p>
            <div className="font-mono text-3xl tracking-[0.5em] font-bold text-gradient">{game.code}</div>
            <p className="text-[11px] text-muted-foreground/60 mt-2">Mentre esperes, amaga el teu objecte! 👇</p>
          </CardContent>
        </Card>
      )}

      {/* WAITING — already hidden, just waiting */}
      {phase === "waiting" && player.has_hidden && (
        <div className="text-center py-16">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl gradient-secondary flex items-center justify-center text-4xl shadow-lg">✅</div>
          <h2 className="text-xl font-bold mb-2">Objecte amagat!</h2>
          <p className="text-sm text-muted-foreground mb-4">Esperant rival...</p>
          <Card className="glass glow-primary">
            <CardContent className="py-4">
              <div className="font-mono text-3xl tracking-[0.5em] font-bold text-gradient text-center">{game.code}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* HIDING */}
      {(phase === "waiting" || phase === "hiding") && !player.has_hidden && hideStep < 4 && (
        <div>
          {/* Step indicator */}
          <div className="flex items-center gap-1 mb-5">
            {hideSteps.map((step, i) => (
              <div key={i} className={`flex-1 text-center text-[10px] py-1.5 rounded-full font-medium transition-all ${
                i === hideStep ? "gradient-primary text-primary-foreground shadow-md" : 
                i < hideStep ? "bg-primary/20 text-primary" : "bg-muted/50 text-muted-foreground"
              }`}>{step}</div>
            ))}
          </div>

          {hideStep === 0 && (
            <div>
              <h2 className="text-lg font-bold mb-1">On amagues?</h2>
              <Tip>Tria l'habitació on el rival haurà de buscar. Un bon lloc és on hi ha molts mobles!</Tip>
              <div className="h-3" />
              <div className="grid grid-cols-2 gap-2.5">
                {scenarios.map(s => (
                  <Card key={s.id} className="cursor-pointer glass hover:border-primary/40 hover:glow-primary transition-all active:scale-[0.97]" onClick={() => handleSelectScenario(s.id)}>
                    <CardContent className="py-5 text-center">
                      <div className="text-4xl mb-2">{s.icon}</div>
                      <div className="text-sm font-semibold">{s.name}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {hideStep === 1 && (
            <div>
              <h2 className="text-lg font-bold mb-1">Què amagues?</h2>
              <Tip>Escull l'objecte que el rival haurà de trobar. ⭐ = objecte especial!</Tip>
              <div className="h-3" />
              <div className="grid grid-cols-3 gap-2">
                {objects.map(o => (
                  <Card key={o.id} className="cursor-pointer glass hover:border-secondary/40 transition-all active:scale-[0.97] relative" onClick={() => handleSelectObject(o.id)}>
                    <CardContent className="py-3 text-center">
                      <div className="text-2xl mb-1">{o.icon}</div>
                      <div className="text-[11px] font-medium">{o.name}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Button variant="ghost" size="sm" className="mt-3" onClick={() => setHideStep(0)}>← Canviar escenari</Button>
            </div>
          )}

          {hideStep === 2 && (
            <div>
              <h2 className="text-lg font-bold mb-1">A quin moble?</h2>
              <Tip>Amaga'l en un moble de l'escenari. 🚫 = incompatible amb el material.</Tip>
              <div className="h-3" />
              <div className="grid grid-cols-2 gap-2.5">
                {items.map(item => {
                  const obj = objects.find((o: any) => o.id === selectedObject);
                  const mat = (obj as any)?.material ?? "generic";
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
              <Button variant="ghost" size="sm" className="mt-3" onClick={() => setHideStep(1)}>← Canviar objecte</Button>
            </div>
          )}

          {hideStep === 3 && (
            <div>
              <h2 className="text-lg font-bold mb-1">Quina posició?</h2>
              <Tip>Sobre, sota o dins del moble. Alerta: objectes grans no caben dins mobles petits!</Tip>
              <div className="h-3" />

              {/* Optional hide message */}
              <div className="mb-3">
                <p className="text-[11px] text-muted-foreground mb-1">💌 Missatge opcional (es veurà quan trobin l'objecte):</p>
                <Input
                  value={hideMessage}
                  onChange={e => setHideMessage(e.target.value)}
                  placeholder="Ex: T'ha costat eh! 😏"
                  maxLength={100}
                  className="text-sm bg-muted/50 border-border/50"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                {positions.map(pos => {
                  const obj = objects.find((o: any) => o.id === selectedObject);
                  const itm = items.find((i: any) => i.id === selectedItem);
                  const blocked = pos.value === "dins" && ((obj as any)?.size ?? 2) > ((itm as any)?.inner_capacity ?? 2);
                  return (
                    <Card key={pos.value}
                      className={`glass transition-all active:scale-[0.97] ${blocked ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:border-primary/40"}`}
                      onClick={() => !blocked && handleSelectPosition(pos.value)}>
                      <CardContent className="py-6 text-center">
                        <div className="text-4xl mb-2">{pos.icon}</div>
                        <div className="text-sm font-semibold">{pos.label}</div>
                        {blocked && <div className="text-[9px] text-destructive mt-1">🚫 No hi cap</div>}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              <Button variant="ghost" size="sm" className="mt-3" onClick={() => setHideStep(2)}>← Canviar moble</Button>
            </div>
          )}
        </div>
      )}

      {/* SPECIAL HIDE STEP — extra input for carta (message) or pilota (variant) */}
      {(phase === "waiting" || phase === "hiding") && !player.has_hidden && hideStep === 5 && objectSpecial && (
        <div className="py-4">
          <Card className="glass glow-accent">
            <CardContent className="py-6 text-center">
              <div className="text-4xl mb-3">{objects.find((o: any) => o.id === selectedObject)?.icon}</div>
              <p className="font-bold mb-1">⭐ Objecte especial!</p>
              <p className="text-sm text-muted-foreground mb-4">{objectSpecial.prompt_text}</p>

              {objectSpecial.special_type === "custom_message" && (
                <div className="space-y-3">
                  <Input value={specialInput} onChange={e => setSpecialInput(e.target.value)}
                    placeholder="El teu missatge..." maxLength={100} className="text-center bg-muted/50" />
                  <Button disabled={!specialInput.trim() || actionLoading} className="w-full"
                    onClick={() => doHide(undefined, { type: "custom_message", message: specialInput.trim() })}>
                    Amagar amb missatge ✉️
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
                    Amagar {selectedVariant?.icon ?? "⚽"} 
                  </Button>
                </div>
              )}

              <Button variant="ghost" size="sm" className="mt-3" onClick={() => setHideStep(3)}>← Canviar posició</Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* HIDING - Done */}
      {phase === "hiding" && player.has_hidden && (
        <div className="text-center py-16">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl gradient-secondary flex items-center justify-center text-4xl shadow-lg">✅</div>
          <h2 className="text-xl font-bold mb-2">Objecte amagat!</h2>
          <p className="text-sm text-muted-foreground animate-pulse">Esperant que el rival amagui...</p>
        </div>
      )}

      {/* PLAYING */}
      {phase === "playing" && (
        <div className="space-y-4">
          {/* First-time tips */}
          {moveHistory.length === 0 && (
            <Card className="glass border-primary/30 glow-primary">
              <CardContent className="py-3">
                <p className="text-xs font-semibold mb-1">🎮 Com jugar:</p>
                <div className="space-y-1 text-[11px] text-muted-foreground">
                  <p>🚶 <strong>Mou-te</strong> entre habitacions per explorar</p>
                  <p>👀 <strong>Observa</strong> (0.3🪙) posicions per rebre pistes: ❄️ fred → 🌡️ calent → 🔥 molt calent!</p>
                  <p>🔍 <strong>Confirma</strong> (1.5🪙) quan creguis saber on és. Si encertes, guanyes!</p>
                </div>
              </CardContent>
            </Card>
          )}
          <Card className="glass">
            <CardContent className="py-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Ubicació</span>
                <div className="font-bold text-lg leading-tight">{currentScenario?.icon} {currentScenario?.name}</div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Tokens</span>
                <div className="font-bold text-lg leading-tight text-accent">🪙 {player.tokens_remaining}</div>
              </div>
            </CardContent>
          </Card>

          {/* Status badges */}
          <div className="flex gap-2 flex-wrap">
            {rivalNearby && (
              <span className="bg-destructive/15 text-destructive text-[11px] font-semibold px-3 py-1 rounded-full animate-pulse border border-destructive/30">
                ⚠️ Rival a prop del teu objecte!
              </span>
            )}
            {player.shield_active && (
              <span className="bg-primary/10 text-primary text-[11px] font-semibold px-3 py-1 rounded-full border border-primary/20">🛡️ Escut actiu</span>
            )}
            {noTokens && (
              <span className="bg-accent/10 text-accent text-[11px] font-semibold px-3 py-1 rounded-full border border-accent/20">😴 Sense tokens</span>
            )}
          </div>

          {/* Rival's object traits */}
          {(rivalTraits.trait1 || rivalTraits.trait2) && (
            <Card className="glass border-accent/30 glow-accent">
              <CardContent className="py-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1.5">💡 Pistes de l'objecte rival</p>
                {rivalTraits.trait1 && (
                  <p className="text-sm font-medium">1. <span className="text-primary italic">"{rivalTraits.trait1}"</span></p>
                )}
                {rivalTraits.trait2 && (
                  <p className="text-sm font-medium mt-1">2. <span className="text-primary italic">"{rivalTraits.trait2}"</span></p>
                )}
                {!rivalTraits.trait2 && rivalTraits.trait1 && (
                  <p className="text-[10px] text-muted-foreground mt-1">🔒 2a pista al torn 5</p>
                )}
              </CardContent>
            </Card>
          )}
          {!rivalTraits.trait1 && moveHistory.length < 2 && (
            <p className="text-[10px] text-center text-muted-foreground">💡 Pista de l'objecte rival al torn 2</p>
          )}

          {/* Move */}
          <div>
            <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              🚶 Moure's · {TOKEN_COSTS.move}🪙
            </h3>
            <Tip>Ves a una habitació adjacent (cada sala té 2 portes)</Tip>
            <div className="grid grid-cols-2 gap-1.5 mt-2">
              {connectedScenarios.map(s => (
                <button key={s.id} onClick={() => handleMove(s.id)}
                  disabled={actionLoading || player.tokens_remaining < TOKEN_COSTS.move}
                  className="glass rounded-xl p-3 text-center hover:border-primary/40 transition-all disabled:opacity-30 active:scale-[0.97]">
                  <div className="text-2xl">{s.icon}</div>
                  <div className="text-[11px] leading-tight font-medium mt-1">{s.name}</div>
                  <div className="text-[9px] text-muted-foreground mt-0.5">🚪 porta</div>
                </button>
              ))}
            </div>
          </div>

          {/* Look / Confirm */}
          <div>
            <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              👀 Investigar mobles
            </h3>
            <Tip>👀 Observar ({TOKEN_COSTS.look}🪙) = pista (❄️/🌡️/🔥). 🔍 Confirmar ({TOKEN_COSTS.confirm}🪙) = trobar l'objecte!</Tip>
            {bananaEffect && bananaBlockedSpot && (
              <p className="text-xs text-destructive mt-1 animate-pulse">🍌 Una posició està bloquejada! Fes una altra acció per desbloquejar-la.</p>
            )}
            <div className="space-y-1.5 mt-2">
              {currentScenarioItems.map(item => (
                <ItemActions key={item.id} item={item} positions={positions}
                  onLook={handleLook}
                  onConfirm={(id, pos) => setShowConfirmDialog({ itemId: id, position: pos, itemName: item.name })}
                  disabled={actionLoading} tokensRemaining={player.tokens_remaining}
                  lookedSpots={lookedSpots} confirmedSpots={confirmedSpots}
                  bananaBlockedSpot={bananaBlockedSpot}
                  interactions={itemInteractions.filter((ia: any) => ia.item_id === item.id)}
                  onInteraction={handleInteraction}
                  moveHistory={moveHistory} />
              ))}
            </div>
          </div>

          {/* Social */}
          <div>
            <Button variant="outline" className="w-full" size="sm"
              onClick={() => setShowSocialPanel(!showSocialPanel)}
              disabled={player.social_item_used_today}>
              {player.social_item_used_today ? "⏳ Ítem social usat avui" : "⚡ Usar ítem social (1/dia)"}
            </Button>

            {showSocialPanel && (
              <div className="mt-2 space-y-1.5">
                {SOCIAL_ITEMS.map(item => {
                  const isBombUsed = item.type === "smoke_bomb" && player.smoke_bomb_used;
                  return (
                  <div key={item.type}>
                    <button
                      onClick={() => item.type !== "message" && !isBombUsed && handleSendSocial(item.type)}
                      disabled={isBombUsed}
                      className={`w-full glass rounded-xl p-3 flex items-center gap-3 hover:border-accent/40 transition-all text-left active:scale-[0.99] ${isBombUsed ? "opacity-40" : ""}`}>
                      <span className="text-2xl">{item.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold">{item.name}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {isBombUsed ? "Ja usat en aquesta partida" : item.desc}
                        </div>
                      </div>
                      {item.type !== "message" && !isBombUsed && <span className="text-xs text-primary font-bold">→</span>}
                    </button>
                    {item.type === "message" && (
                      <div className="flex gap-1.5 mt-1.5">
                        <Input value={messageInput} onChange={e => setMessageInput(e.target.value)}
                          placeholder="Escriu pista o farol..." maxLength={80} className="text-sm bg-muted/50 border-border/50" />
                        <Button size="sm" disabled={!messageInput.trim()} onClick={() => handleSendSocial("message")}>💡</Button>
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* History */}
          {moveHistory.length > 0 && (
            <div>
              <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">📋 Historial</h3>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {moveHistory.map(m => {
                  const hintIcons: Record<number, string> = { 0: "❄️", 1: "🌡️", 2: "🔥" };
                  const hintLabels: Record<number, string> = { 0: "fred", 1: "calent", 2: "molt calent!" };
                  const hl = (m as any).hint_level;
                  return (
                    <div key={m.id} className={`text-[11px] rounded-lg px-3 py-1.5 flex justify-between border border-border/20 ${
                      hl === 2 ? "bg-orange-500/10 border-orange-500/30" :
                      hl === 1 ? "bg-yellow-500/10 border-yellow-500/20" :
                      hl === 0 ? "bg-blue-500/10 border-blue-500/20" :
                      "bg-muted/30"
                    }`}>
                      <span>
                        <span className="text-muted-foreground font-mono">#{m.turn_number}</span>{" "}
                        {m.action === "move" && `🚶 → ${(m.scenarios as any)?.icon} ${(m.scenarios as any)?.name}`}
                        {m.action === "look" && (
                          <>
                            👀 {m.target_position} {(m.items as any)?.icon} {(m.items as any)?.name}
                            {hl != null && <span className="ml-1 font-semibold">{hintIcons[hl]} {hintLabels[hl]}</span>}
                          </>
                        )}
                        {m.action === "confirm" && `🔍 ${m.target_position} ${(m.items as any)?.icon} ${(m.items as any)?.name}`}
                        {m.found_object && " 🏆"}
                        {m.found_bonus === "extra_token" && " 🎁"}
                      </span>
                      <span className="text-muted-foreground">-{m.token_cost}🪙</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* FINISHED */}
      {phase === "finished" && (
        <div className="text-center py-16">
          {game.winner_id === user?.id ? (
            <div className="w-24 h-24 mx-auto mb-4 rounded-3xl gradient-primary flex items-center justify-center text-5xl shadow-xl glow-primary">🏆</div>
          ) : (
            <div className="text-7xl mb-4 opacity-60">😢</div>
          )}
          <h2 className="text-2xl font-bold mb-2">
            {game.winner_id === user?.id ? <span className="text-gradient">Victòria!</span> : "Derrota..."}
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            {game.winner_id === user?.id ? "Elo +25 ⬆️" : "Elo -20 ⬇️"}
          </p>

          {reward?.reward_items && (
            <Card className="mb-6 mx-auto max-w-xs glass glow-accent">
              <CardContent className="py-5 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 font-semibold">🎁 Recompensa</p>
                <div className="text-5xl mb-2">{reward.reward_items.icon}</div>
                <p className="font-bold text-lg">{reward.reward_items.name}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {RARITY_CONFIG[reward.reward_items.rarity]?.emoji}{" "}
                  {RARITY_CONFIG[reward.reward_items.rarity]?.label}
                </p>
                <p className="text-[10px] text-muted-foreground/60 mt-2">
                  Ves al perfil per col·locar-lo o vendre'l
                </p>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-2 justify-center">
            <Button onClick={() => navigate("/")} variant="outline">Lobby</Button>
            <Button onClick={() => navigate("/profile")}>👤 Perfil</Button>
          </div>
        </div>
      )}

      {/* Troll effect popup overlay */}
      {trollEffect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className={`text-center space-y-4 p-8 rounded-2xl glass max-w-sm mx-4 ${
            trollEffect.animation === "shake" ? "animate-troll-shake" :
            trollEffect.animation === "flash" ? "animate-troll-flash" :
            "animate-troll-bounce"
          }`}>
            <div className="text-8xl">{trollEffect.emoji}</div>
            <p className="text-lg font-bold text-foreground leading-relaxed">{trollEffect.message}</p>
            <Button onClick={() => setTrollEffect(null)} variant="outline" size="sm">
              😂 Bona broma!
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ItemActions({ item, positions, onLook, onConfirm, disabled, tokensRemaining, lookedSpots, confirmedSpots, bananaBlockedSpot, interactions, onInteraction, moveHistory }: {
  item: any;
  positions: { value: "sobre" | "sota" | "dins"; label: string; icon: string }[];
  onLook: (id: string, pos: "sobre" | "sota" | "dins") => void;
  onConfirm: (id: string, pos: "sobre" | "sota" | "dins") => void;
  disabled: boolean;
  tokensRemaining: number;
  lookedSpots: Set<string>;
  confirmedSpots: Set<string>;
  bananaBlockedSpot: string | null;
  interactions?: any[];
  onInteraction?: (interaction: any) => void;
  moveHistory?: any[];
}) {
  const [expanded, setExpanded] = useState(false);
  const hasInteractions = interactions && interactions.length > 0;

  return (
    <div className="glass rounded-xl overflow-hidden">
      <button onClick={() => setExpanded(!expanded)}
        className="w-full p-3 flex items-center justify-between hover:bg-muted/30 transition-colors">
        <span className="font-semibold text-sm">
          {item.icon} {item.name}
          {hasInteractions && <span className="ml-1 text-xs">⚡</span>}
        </span>
        <span className="text-xs text-muted-foreground">{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && (
        <div className="border-t border-border/30 p-2.5">
          {/* Interaction buttons */}
          {hasInteractions && onInteraction && (
            <div className="mb-2 space-y-1">
              {interactions!.map((ia: any) => {
                const alreadyUsed = ia.one_time && moveHistory?.some((m: any) =>
                  m.target_item_id === ia.item_id && m.action === "look" &&
                  (m as any).bonus_value === `interact:${ia.action_name}`
                );
                return (
                  <button key={ia.id}
                    onClick={() => onInteraction(ia)}
                    disabled={disabled || tokensRemaining < ia.cost || !!alreadyUsed}
                    className={`w-full rounded-lg p-2.5 text-xs font-medium transition-all active:scale-[0.97] flex items-center gap-2 ${
                      alreadyUsed ? "bg-muted/20 opacity-40" :
                      "bg-primary/10 hover:bg-primary/20 border border-primary/20"
                    }`}>
                    <span className="text-lg">{ia.action_icon}</span>
                    <span className="flex-1 text-left">{ia.action_label}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {alreadyUsed ? "✓ fet" : `${ia.cost}🪙`}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          {/* Position grid */}
          <div className="grid grid-cols-3 gap-2">
            {positions.map(pos => {
              const spotKey = `${item.id}:${pos.value}`;
              const alreadyLooked = lookedSpots.has(spotKey);
              const alreadyConfirmed = confirmedSpots.has(spotKey);
              const isBananaBlocked = bananaBlockedSpot === spotKey;
              return (
                <div key={pos.value} className="space-y-1">
                  <button onClick={() => onLook(item.id, pos.value)}
                    disabled={disabled || tokensRemaining < TOKEN_COSTS.look || alreadyLooked || alreadyConfirmed || isBananaBlocked}
                    className={`w-full rounded-lg p-2 text-xs transition-colors active:scale-[0.97] font-medium ${
                      isBananaBlocked ? "bg-destructive/20 opacity-60 border border-destructive/30" :
                      alreadyLooked || alreadyConfirmed ? "bg-muted/20 opacity-40 line-through" :
                      "bg-muted/40 hover:bg-primary/10 disabled:opacity-30"
                    }`}>
                    {isBananaBlocked ? "🍌" : `${pos.icon} ${pos.label}`}
                    <span className="block text-[9px] text-muted-foreground mt-0.5">
                      {isBananaBlocked ? "bloquejat" : alreadyLooked || alreadyConfirmed ? "✓ vist" : `${TOKEN_COSTS.look}🪙`}
                    </span>
                  </button>
                  <button onClick={() => onConfirm(item.id, pos.value)}
                    disabled={disabled || tokensRemaining < TOKEN_COSTS.confirm || alreadyConfirmed || isBananaBlocked}
                    className={`w-full rounded-lg p-1.5 text-[10px] font-bold transition-all active:scale-[0.97] shadow-sm ${
                      isBananaBlocked ? "bg-destructive/20 opacity-60" :
                      alreadyConfirmed ? "bg-muted/20 opacity-40" :
                      "gradient-accent text-accent-foreground hover:opacity-90 disabled:opacity-30"
                    }`}>
                    {isBananaBlocked ? "🍌" : alreadyConfirmed ? "✓" : `🔍 ${TOKEN_COSTS.confirm}🪙`}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
