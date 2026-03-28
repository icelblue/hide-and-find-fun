import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import {
  getScenarios, getItemsByScenario, getObjects,
  hideObject, checkBothPlayersHidden, startGame, performMove,
  sendSocialItem, getUnprocessedSocialItems, markSocialItemProcessed,
  TOKEN_COSTS, SOCIAL_ITEMS, type SocialItemType,
} from "@/lib/supabase-helpers";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  const [hideStep, setHideStep] = useState(0);

  const [currentScenarioItems, setCurrentScenarioItems] = useState<any[]>([]);
  const [moveHistory, setMoveHistory] = useState<any[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  const [showSocialPanel, setShowSocialPanel] = useState(false);
  const [bananaEffect, setBananaEffect] = useState(false);
  const [falseClueItem, setFalseClueItem] = useState(false);
  const [receivedMessage, setReceivedMessage] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [showConfirmDialog, setShowConfirmDialog] = useState<{ itemId: string; position: "sobre" | "sota" | "dins"; itemName: string } | null>(null);

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
      supabase.from("game_players").select("*").eq("game_id", gameId).neq("user_id", user.id).single(),
    ]);

    setGame(gameData);
    setPhase((gameData?.status as Phase) ?? "waiting");
    setPlayer(playerData);
    setRival(rivalData);

    if (playerData?.has_hidden) setHideStep(4);

    if (gameData?.status === "playing" && playerData?.current_scenario_id) {
      const itemsData = await getItemsByScenario(playerData.current_scenario_id);
      setCurrentScenarioItems(itemsData);
    }

    const { data: moves } = await supabase
      .from("game_moves")
      .select("*, scenarios:target_scenario_id(name, icon), items:target_item_id(name, icon)")
      .eq("game_id", gameId).eq("player_id", user.id)
      .order("turn_number", { ascending: false });
    setMoveHistory(moves ?? []);

    // Process social items (only unprocessed)
    if (gameData?.status === "playing") {
      const unprocessed = await getUnprocessedSocialItems(gameId, user.id);
      for (const item of unprocessed) {
        if (item.item_type === "banana") {
          setBananaEffect(true);
          setTimeout(() => setBananaEffect(false), 3000);
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
    getScenarios().then(setScenarios);
    getObjects().then(setObjects);

    const channel = supabase
      .channel(`game-${gameId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "games", filter: `id=eq.${gameId}` }, () => loadGame())
      .on("postgres_changes", { event: "*", schema: "public", table: "game_players", filter: `game_id=eq.${gameId}` }, () => loadGame())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "game_social_items" }, () => loadGame())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [gameId, user, loadGame]);

  const handleSelectScenario = async (id: string) => {
    setSelectedScenario(id);
    setItems(await getItemsByScenario(id));
    setHideStep(1);
  };

  const handleHidePosition = async (pos: "sobre" | "sota" | "dins") => {
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
    } catch (err: any) { toast.error(err.message); }
    finally { setActionLoading(false); }
  };

  const handleMove = async (scenarioId: string) => {
    if (!gameId || !user) return;
    setActionLoading(true);
    try {
      await performMove(gameId, user.id, "move", scenarioId);
      const s = scenarios.find(s => s.id === scenarioId);
      toast.success(`${s?.icon} ${s?.name} (-${TOKEN_COSTS.move}🪙)`);
      await loadGame();
    } catch (err: any) { toast.error(err.message); }
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
      else toast.info(`${posLabel} ${item?.icon} ${item?.name}: buit (-${TOKEN_COSTS.look}🪙)`);
      await loadGame();
    } catch (err: any) { toast.error(err.message); }
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
      await loadGame();
    } catch (err: any) { toast.error(err.message); }
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
    } catch (err: any) { toast.error(err.message); }
    finally { setActionLoading(false); }
  };

  const currentScenario = scenarios.find(s => s.id === player?.current_scenario_id);
  const noTokens = player && player.tokens_remaining < TOKEN_COSTS.look;

  if (!game || !player) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="text-4xl mb-2 animate-pulse">🔍</div>
        <p className="text-muted-foreground text-sm">Carregant partida...</p>
      </div>
    </div>;
  }

  // Step indicator for hiding phase
  const hideSteps = ["📍 Escenari", "🎯 Objecte", "🪑 Moble", "📌 Posició"];

  return (
    <div className={`min-h-screen bg-background p-4 max-w-md mx-auto relative ${bananaEffect ? "blur-sm" : ""}`}>
      {/* Banana overlay */}
      {bananaEffect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-accent/40 pointer-events-none">
          <span className="text-[120px] animate-bounce">🍌</span>
        </div>
      )}

      {/* Confirm dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-foreground/30 backdrop-blur-sm" onClick={() => setShowConfirmDialog(null)}>
          <Card className="mx-4 max-w-sm" onClick={e => e.stopPropagation()}>
            <CardContent className="py-6 text-center">
              <div className="text-3xl mb-2">🔍</div>
              <p className="font-bold mb-1">Confirmar obertura?</p>
              <p className="text-sm text-muted-foreground mb-1">
                {positions.find(p => p.value === showConfirmDialog.position)?.icon}{" "}
                {positions.find(p => p.value === showConfirmDialog.position)?.label}{" "}
                de {showConfirmDialog.itemName}
              </p>
              <p className="text-xs text-destructive mb-4">Costa {TOKEN_COSTS.confirm} tokens!</p>
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
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-foreground/30 backdrop-blur-sm" onClick={() => setReceivedMessage(null)}>
          <Card className="mx-4 max-w-sm" onClick={e => e.stopPropagation()}>
            <CardContent className="py-6 text-center">
              <div className="text-3xl mb-2">💬</div>
              <p className="text-sm text-muted-foreground mb-1">El rival diu:</p>
              <p className="text-lg font-medium italic my-3">"{receivedMessage}"</p>
              <Button size="sm" onClick={() => setReceivedMessage(null)}>Tancar</Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => navigate("/")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">← Lobby</button>
        <span className="font-mono text-xs bg-muted px-2.5 py-1 rounded-full">{game.code}</span>
        {phase === "playing" && (
          <div className="flex items-center gap-1 bg-muted px-2.5 py-1 rounded-full">
            <span className="text-sm">🪙</span>
            <span className="font-bold text-sm">{player.tokens_remaining}</span>
          </div>
        )}
      </div>

      {/* WAITING */}
      {phase === "waiting" && (
        <div className="text-center py-16">
          <div className="text-6xl mb-4 animate-pulse">⏳</div>
          <h2 className="text-xl font-bold mb-2">Esperant rival</h2>
          <p className="text-sm text-muted-foreground mb-6">Comparteix el codi:</p>
          <div className="bg-card border-2 border-dashed border-primary/30 rounded-xl p-6 font-mono text-4xl tracking-[0.4em] font-bold">
            {game.code}
          </div>
          <p className="text-xs text-muted-foreground mt-4">L'altra persona ha d'entrar el codi al lobby</p>
        </div>
      )}

      {/* HIDING */}
      {phase === "hiding" && hideStep < 4 && (
        <div>
          {/* Step indicator */}
          <div className="flex items-center gap-1 mb-4">
            {hideSteps.map((step, i) => (
              <div key={i} className={`flex-1 text-center text-[10px] py-1 rounded-full ${
                i === hideStep ? "bg-primary text-primary-foreground font-medium" : 
                i < hideStep ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
              }`}>{step}</div>
            ))}
          </div>

          {hideStep === 0 && (
            <div>
              <h2 className="text-lg font-bold mb-1">On amagues?</h2>
              <p className="text-xs text-muted-foreground mb-3">Tria l'escenari on vols amagar l'objecte</p>
              <div className="grid grid-cols-2 gap-2">
                {scenarios.map(s => (
                  <Card key={s.id} className="cursor-pointer hover:border-primary/50 hover:shadow-sm transition-all active:scale-[0.98]" onClick={() => handleSelectScenario(s.id)}>
                    <CardContent className="py-4 text-center">
                      <div className="text-3xl mb-1">{s.icon}</div>
                      <div className="text-sm font-medium">{s.name}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {hideStep === 1 && (
            <div>
              <h2 className="text-lg font-bold mb-1">Què amagues?</h2>
              <p className="text-xs text-muted-foreground mb-3">Tria un objecte del llistat</p>
              <div className="grid grid-cols-3 gap-2">
                {objects.map(o => (
                  <Card key={o.id} className="cursor-pointer hover:border-primary/50 transition-all active:scale-[0.98]" onClick={() => { setSelectedObject(o.id); setHideStep(2); }}>
                    <CardContent className="py-2.5 text-center">
                      <div className="text-xl mb-0.5">{o.icon}</div>
                      <div className="text-[11px]">{o.name}</div>
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
              <p className="text-xs text-muted-foreground mb-3">On poses l'objecte?</p>
              <div className="grid grid-cols-2 gap-2">
                {items.map(item => (
                  <Card key={item.id} className="cursor-pointer hover:border-primary/50 transition-all active:scale-[0.98]" onClick={() => { setSelectedItem(item.id); setHideStep(3); }}>
                    <CardContent className="py-3 text-center">
                      <div className="text-2xl mb-1">{item.icon}</div>
                      <div className="text-sm">{item.name}</div>
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
              <p className="text-xs text-muted-foreground mb-3">A sobre, a sota o a dins?</p>
              <div className="grid grid-cols-3 gap-3">
                {positions.map(pos => (
                  <Card key={pos.value} className="cursor-pointer hover:border-primary/50 transition-all active:scale-[0.98]" onClick={() => handleHidePosition(pos.value)}>
                    <CardContent className="py-5 text-center">
                      <div className="text-4xl mb-2">{pos.icon}</div>
                      <div className="text-sm font-medium">{pos.label}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Button variant="ghost" size="sm" className="mt-3" onClick={() => setHideStep(2)}>← Canviar moble</Button>
            </div>
          )}
        </div>
      )}

      {/* HIDING - Done */}
      {phase === "hiding" && hideStep === 4 && (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-xl font-bold mb-2">Objecte amagat!</h2>
          <p className="text-sm text-muted-foreground animate-pulse">Esperant que el rival amagui...</p>
        </div>
      )}

      {/* PLAYING */}
      {phase === "playing" && (
        <div className="space-y-4">
          {/* Location bar */}
          <div className="bg-card border rounded-xl p-3 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Ubicació</span>
              <div className="font-bold text-lg leading-tight">{currentScenario?.icon} {currentScenario?.name}</div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Tokens</span>
              <div className="font-bold text-lg leading-tight">🪙 {player.tokens_remaining}</div>
            </div>
          </div>

          {/* Status badges */}
          <div className="flex gap-2 flex-wrap">
            {player.shield_active && (
              <span className="bg-primary/10 text-primary text-xs font-medium px-2.5 py-1 rounded-full">🛡️ Escut actiu</span>
            )}
            {falseClueItem && (
              <span className="bg-destructive/10 text-destructive text-xs font-medium px-2.5 py-1 rounded-full animate-pulse">🔮 Sospitós detectat!</span>
            )}
            {noTokens && (
              <span className="bg-accent/10 text-accent-foreground text-xs font-medium px-2.5 py-1 rounded-full">😴 Sense tokens — torna demà</span>
            )}
          </div>

          {/* Move */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              🚶 Moure's · {TOKEN_COSTS.move}🪙
            </h3>
            <div className="grid grid-cols-3 gap-1.5">
              {scenarios.filter(s => s.id !== player.current_scenario_id).map(s => (
                <button key={s.id} onClick={() => handleMove(s.id)}
                  disabled={actionLoading || player.tokens_remaining < TOKEN_COSTS.move}
                  className="bg-card border rounded-lg p-2 text-center hover:border-primary/50 transition-all disabled:opacity-30 active:scale-[0.97]">
                  <div className="text-lg">{s.icon}</div>
                  <div className="text-[10px] leading-tight">{s.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Look / Confirm */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              👀 Investigar
            </h3>
            <div className="space-y-1.5">
              {currentScenarioItems.map(item => (
                <ItemActions key={item.id} item={item} positions={positions}
                  onLook={handleLook}
                  onConfirm={(id, pos) => setShowConfirmDialog({ itemId: id, position: pos, itemName: item.name })}
                  disabled={actionLoading} tokensRemaining={player.tokens_remaining} />
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
                {SOCIAL_ITEMS.map(item => (
                  <div key={item.type}>
                    <button
                      onClick={() => item.type !== "message" && handleSendSocial(item.type)}
                      className="w-full bg-card border rounded-lg p-2.5 flex items-center gap-3 hover:border-accent/50 transition-all text-left active:scale-[0.99]">
                      <span className="text-2xl">{item.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{item.name}</div>
                        <div className="text-[11px] text-muted-foreground">{item.desc}</div>
                      </div>
                      {item.type !== "message" && <span className="text-xs text-primary">→</span>}
                    </button>
                    {item.type === "message" && (
                      <div className="flex gap-1.5 mt-1">
                        <Input value={messageInput} onChange={e => setMessageInput(e.target.value)}
                          placeholder="Escriu..." maxLength={80} className="text-sm" />
                        <Button size="sm" disabled={!messageInput.trim()} onClick={() => handleSendSocial("message")}>💬</Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* History */}
          {moveHistory.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">📋 Historial</h3>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {moveHistory.map(m => (
                  <div key={m.id} className="text-[11px] bg-muted rounded-lg px-2.5 py-1.5 flex justify-between">
                    <span>
                      <span className="text-muted-foreground">#{m.turn_number}</span>{" "}
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
          <div className="text-7xl mb-4">{game.winner_id === user?.id ? "🏆" : "😢"}</div>
          <h2 className="text-2xl font-bold mb-2">
            {game.winner_id === user?.id ? "Victoria!" : "Derrota..."}
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            {game.winner_id === user?.id ? "Elo +25 ⬆️" : "Elo -20 ⬇️"}
          </p>
          <Button onClick={() => navigate("/")} size="lg">Tornar al lobby</Button>
        </div>
      )}
    </div>
  );
}

function ItemActions({ item, positions, onLook, onConfirm, disabled, tokensRemaining }: {
  item: any;
  positions: { value: "sobre" | "sota" | "dins"; label: string; icon: string }[];
  onLook: (id: string, pos: "sobre" | "sota" | "dins") => void;
  onConfirm: (id: string, pos: "sobre" | "sota" | "dins") => void;
  disabled: boolean;
  tokensRemaining: number;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-card border rounded-lg overflow-hidden">
      <button onClick={() => setExpanded(!expanded)}
        className="w-full p-2.5 flex items-center justify-between hover:bg-muted/50 transition-colors">
        <span className="font-medium text-sm">{item.icon} {item.name}</span>
        <span className="text-xs text-muted-foreground">{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && (
        <div className="border-t p-2 grid grid-cols-3 gap-1.5">
          {positions.map(pos => (
            <div key={pos.value} className="space-y-1">
              <button onClick={() => onLook(item.id, pos.value)}
                disabled={disabled || tokensRemaining < TOKEN_COSTS.look}
                className="w-full bg-muted rounded-md p-1.5 text-xs hover:bg-primary/10 transition-colors disabled:opacity-30 active:scale-[0.97]">
                {pos.icon} {pos.label}
                <span className="block text-[9px] text-muted-foreground">{TOKEN_COSTS.look}🪙</span>
              </button>
              <button onClick={() => onConfirm(item.id, pos.value)}
                disabled={disabled || tokensRemaining < TOKEN_COSTS.confirm}
                className="w-full bg-primary/10 text-primary rounded-md p-1 text-[10px] font-medium hover:bg-primary/20 transition-colors disabled:opacity-30 active:scale-[0.97]">
                🔍 {TOKEN_COSTS.confirm}🪙
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
