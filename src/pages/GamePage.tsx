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
  TOKEN_COSTS, SOCIAL_ITEMS, type SocialItemType,
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

  const [currentScenarioItems, setCurrentScenarioItems] = useState<any[]>([]);
  const [connectedScenarios, setConnectedScenarios] = useState<any[]>([]);
  const [moveHistory, setMoveHistory] = useState<any[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  const [showSocialPanel, setShowSocialPanel] = useState(false);
  const [bananaEffect, setBananaEffect] = useState(false);
  const [falseClueItem, setFalseClueItem] = useState(false);
  const [receivedMessage, setReceivedMessage] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [showConfirmDialog, setShowConfirmDialog] = useState<{ itemId: string; position: "sobre" | "sota" | "dins"; itemName: string } | null>(null);
  const [reward, setReward] = useState<any>(null);
  const [rivalNearby, setRivalNearby] = useState(false);
  const [bananaBlockedSpot, setBananaBlockedSpot] = useState<string | null>(null);
  const [rivalTraits, setRivalTraits] = useState<{ trait1: string | null; trait2: string | null }>({ trait1: null, trait2: null });

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
    setPlayer(playerData);
    setRival(rivalData);

    if (playerData?.has_hidden) setHideStep(5);

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
        } else if (item.item_type === "false_clue") {
          setFalseClueItem(true);
          setTimeout(() => setFalseClueItem(false), 10000);
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

  const handleSelectPosition = async (pos: "sobre" | "sota" | "dins") => {
    // Check size restriction for "dins"
    if (pos === "dins") {
      const obj = objects.find((o: any) => o.id === selectedObject);
      const itm = items.find((i: any) => i.id === selectedItem);
      const objSize = (obj as any)?.size ?? 2;
      const capacity = (itm as any)?.inner_capacity ?? 2;
      if (objSize > capacity) {
        toast.error(`${obj?.icon} ${obj?.name} és massa gran per amagar dins de ${itm?.icon} ${itm?.name}!`);
        return;
      }
    }
    setSelectedPosition(pos);
    // Directly hide — no clue step needed (traits are predefined)
    if (!gameId || !user) return;
    setActionLoading(true);
    try {
      await hideObject(gameId, user.id, selectedObject, selectedItem, pos);
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
        const hints = [
          `❄️ ${posLabel} ${item?.icon} ${item?.name}: fred... no és per aquí (-${TOKEN_COSTS.look}🪙)`,
          `🌡️ ${posLabel} ${item?.icon} ${item?.name}: calent! Alguna cosa a prop... (-${TOKEN_COSTS.look}🪙)`,
          `🔥 ${posLabel} ${item?.icon} ${item?.name}: MOLT CALENT! Quasi ho tens! (-${TOKEN_COSTS.look}🪙)`,
        ];
        const level = result.hintLevel ?? 0;
        if (level === 0) toast.info(hints[0]);
        else if (level === 1) toast.warning(hints[1]);
        else toast.success(hints[2]);
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
      if (result.foundObject) toast.success("🏆 HAS GUANYAT! Has trobat l'objecte!");
      else toast.error(`❌ No era aquí... (-${TOKEN_COSTS.confirm}🪙)`);
      clearBanana();
      await loadGame();
    } catch (err: any) { toast.error(err.message); logError(err.message, err.stack, "GamePage"); }
    finally { setActionLoading(false); }
  };

  const handleSendSocial = async (type: SocialItemType) => {
    if (!gameId || !user || !rival) return;
    setActionLoading(true);
    try {
      const msg = type === "message" ? messageInput : undefined;
      const result = await sendSocialItem(gameId, user.id, rival.user_id, type, msg);
      const info = SOCIAL_ITEMS.find(i => i.type === type);
      if (result.blocked) toast.error(`🛡️ Bloquejat per l'escut del rival!`);
      else toast.success(`${info?.icon} ${info?.name} enviat!`);
      setShowSocialPanel(false);
      setMessageInput("");
      await loadGame();
    } catch (err: any) { toast.error(err.message); logError(err.message, err.stack, "GamePage"); }
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
            <div className="flex items-center gap-1.5 gradient-primary px-3 py-1.5 rounded-full shadow-md">
              <span className="text-xs">🪙</span>
              <span className="font-bold text-xs text-primary-foreground">{player.tokens_remaining}</span>
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
              <Tip>Escull l'objecte que el rival haurà de trobar.</Tip>
              <div className="h-3" />
              <div className="grid grid-cols-3 gap-2">
                {objects.map(o => (
                  <Card key={o.id} className="cursor-pointer glass hover:border-secondary/40 transition-all active:scale-[0.97]" onClick={() => { setSelectedObject(o.id); setHideStep(2); }}>
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
              <Tip>Amaga'l en un moble de l'escenari.</Tip>
              <div className="h-3" />
              <div className="grid grid-cols-2 gap-2.5">
                {items.map(item => (
                  <Card key={item.id} className="cursor-pointer glass hover:border-accent/40 transition-all active:scale-[0.97]" onClick={() => { setSelectedItem(item.id); setHideStep(3); }}>
                    <CardContent className="py-4 text-center">
                      <div className="text-3xl mb-1">{item.icon}</div>
                      <div className="text-sm font-medium">{item.name}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Button variant="ghost" size="sm" className="mt-3" onClick={() => setHideStep(1)}>← Canviar objecte</Button>
            </div>
          )}

          {hideStep === 3 && (
            <div>
              <h2 className="text-lg font-bold mb-1">Quina posició?</h2>
              <Tip>Sobre, sota o dins del moble. Alerta: objectes grans no caben dins mobles petits!</Tip>
              <div className="h-3" />
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
            {falseClueItem && (
              <span className="bg-destructive/10 text-destructive text-[11px] font-semibold px-3 py-1 rounded-full animate-pulse border border-destructive/20">🔮 Sospitós!</span>
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
                  bananaBlockedSpot={bananaBlockedSpot} />
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
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {moveHistory.map(m => (
                  <div key={m.id} className="text-[11px] bg-muted/30 rounded-lg px-3 py-1.5 flex justify-between border border-border/20">
                    <span>
                      <span className="text-muted-foreground font-mono">#{m.turn_number}</span>{" "}
                      {m.action === "move" && `🚶 → ${(m.scenarios as any)?.icon} ${(m.scenarios as any)?.name}`}
                      {m.action === "look" && `👀 ${m.target_position} ${(m.items as any)?.icon} ${(m.items as any)?.name}`}
                      {m.action === "confirm" && `🔍 ${m.target_position} ${(m.items as any)?.icon} ${(m.items as any)?.name}`}
                      {m.found_object && " 🏆"}
                      {m.found_bonus === "extra_token" && " 🎁"}
                    </span>
                    <span className="text-muted-foreground">-{m.token_cost}🪙</span>
                  </div>
                ))}
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
    </div>
  );
}

function ItemActions({ item, positions, onLook, onConfirm, disabled, tokensRemaining, lookedSpots, confirmedSpots, bananaBlockedSpot }: {
  item: any;
  positions: { value: "sobre" | "sota" | "dins"; label: string; icon: string }[];
  onLook: (id: string, pos: "sobre" | "sota" | "dins") => void;
  onConfirm: (id: string, pos: "sobre" | "sota" | "dins") => void;
  disabled: boolean;
  tokensRemaining: number;
  lookedSpots: Set<string>;
  confirmedSpots: Set<string>;
  bananaBlockedSpot: string | null;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="glass rounded-xl overflow-hidden">
      <button onClick={() => setExpanded(!expanded)}
        className="w-full p-3 flex items-center justify-between hover:bg-muted/30 transition-colors">
        <span className="font-semibold text-sm">{item.icon} {item.name}</span>
        <span className="text-xs text-muted-foreground">{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && (
        <div className="border-t border-border/30 p-2.5 grid grid-cols-3 gap-2">
          {positions.map(pos => {
            const spotKey = `${item.id}:${pos.value}`;
            const alreadyLooked = lookedSpots.has(spotKey);
            const alreadyConfirmed = confirmedSpots.has(spotKey);
            const isBananaBlocked = bananaBlockedSpot === spotKey;
            return (
              <div key={pos.value} className="space-y-1">
                {/* LOOK button: disabled if already looked OR confirmed OR banana blocked */}
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
                {/* CONFIRM button: disabled if already confirmed OR banana blocked, BUT allowed even if looked */}
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
      )}
    </div>
  );
}
