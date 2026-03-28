import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import {
  getScenarios,
  getItemsByScenario,
  getObjects,
  hideObject,
  checkBothPlayersHidden,
  startGame,
  performMove,
  sendSocialItem,
  getReceivedSocialItems,
  TOKEN_COSTS,
  SOCIAL_ITEMS,
  type SocialItemType,
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

  // Hiding phase
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [objects, setObjects] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<string>("");
  const [selectedObject, setSelectedObject] = useState<string>("");
  const [selectedItem, setSelectedItem] = useState<string>("");
  const [hideStep, setHideStep] = useState(0);

  // Playing phase
  const [currentScenarioItems, setCurrentScenarioItems] = useState<any[]>([]);
  const [moveHistory, setMoveHistory] = useState<any[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  // Social items
  const [showSocialPanel, setShowSocialPanel] = useState(false);
  const [bananaEffect, setBananaEffect] = useState(false);
  const [falseClueItem, setFalseClueItem] = useState<string | null>(null);
  const [receivedMessage, setReceivedMessage] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");

  const positions = [
    { value: "sobre" as const, label: "Sobre", icon: "⬆️", desc: "A sobre" },
    { value: "sota" as const, label: "Sota", icon: "⬇️", desc: "A sota" },
    { value: "dins" as const, label: "Dins", icon: "📦", desc: "A dins" },
  ];

  const loadGame = useCallback(async () => {
    if (!gameId || !user) return;

    const { data: gameData } = await supabase
      .from("games")
      .select("*")
      .eq("id", gameId)
      .single();
    setGame(gameData);
    setPhase((gameData?.status as Phase) ?? "waiting");

    const { data: playerData } = await supabase
      .from("game_players")
      .select("*")
      .eq("game_id", gameId)
      .eq("user_id", user.id)
      .single();
    setPlayer(playerData);

    // Get rival
    const { data: rivalData } = await supabase
      .from("game_players")
      .select("*")
      .eq("game_id", gameId)
      .neq("user_id", user.id)
      .single();
    setRival(rivalData);

    if (playerData?.has_hidden) setHideStep(4);

    if (gameData?.status === "playing" && playerData?.current_scenario_id) {
      const itemsData = await getItemsByScenario(playerData.current_scenario_id);
      setCurrentScenarioItems(itemsData);
    }

    const { data: moves } = await supabase
      .from("game_moves")
      .select("*, scenarios:target_scenario_id(name, icon), items:target_item_id(name, icon)")
      .eq("game_id", gameId)
      .eq("player_id", user.id)
      .order("turn_number", { ascending: false });
    setMoveHistory(moves ?? []);

    // Check received social items
    if (gameData?.status === "playing") {
      const received = await getReceivedSocialItems(gameId, user.id);
      const unprocessed = received?.filter(
        (r) => !r.blocked_by_shield && new Date(r.created_at) > new Date(Date.now() - 30000)
      );

      for (const item of unprocessed ?? []) {
        if (item.item_type === "banana") {
          setBananaEffect(true);
          setTimeout(() => setBananaEffect(false), 3000);
        } else if (item.item_type === "false_clue") {
          setFalseClueItem("🔴 Sospitós!");
          setTimeout(() => setFalseClueItem(null), 10000);
        } else if (item.item_type === "message" && item.message_text) {
          setReceivedMessage(item.message_text);
        }
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
    const itemsData = await getItemsByScenario(id);
    setItems(itemsData);
    setHideStep(1);
  };

  const handleSelectObject = (id: string) => {
    setSelectedObject(id);
    setHideStep(2);
  };

  const handleSelectItem = (id: string) => {
    setSelectedItem(id);
    setHideStep(3);
  };

  const handleSelectPosition = async (pos: "sobre" | "sota" | "dins") => {
    if (!gameId || !user) return;
    setActionLoading(true);
    try {
      await hideObject(gameId, user.id, selectedObject, selectedItem, pos);
      setHideStep(4);
      toast.success("Objecte amagat! 🫣");

      const allHidden = await checkBothPlayersHidden(gameId);
      if (allHidden) {
        await startGame(gameId, selectedScenario);
        toast.success("Tots dos heu amagat! Comença la cerca! 🔍");
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleMove = async (scenarioId: string) => {
    if (!gameId || !user) return;
    setActionLoading(true);
    try {
      await performMove(gameId, user.id, "move", scenarioId);
      const scenario = scenarios.find((s) => s.id === scenarioId);
      toast.success(`Has anat a: ${scenario?.icon} ${scenario?.name} (-${TOKEN_COSTS.move})`);
      await loadGame();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleLook = async (itemId: string, position: "sobre" | "sota" | "dins") => {
    if (!gameId || !user) return;
    setActionLoading(true);
    try {
      const result = await performMove(gameId, user.id, "look", undefined, itemId, position);
      const item = currentScenarioItems.find((i) => i.id === itemId);
      const posLabel = positions.find((p) => p.value === position)?.label;

      if (result.foundBonus) {
        if (result.foundBonus === "extra_token") {
          toast.success(`🎁 Bonus! +${result.bonusValue} token extra!`);
        } else {
          toast.info(`🔮 Pista: ${result.bonusValue}`);
        }
      } else {
        toast.info(`${posLabel} ${item?.icon} ${item?.name}: No hi ha res (-${TOKEN_COSTS.look})`);
      }
      await loadGame();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirm = async (itemId: string, position: "sobre" | "sota" | "dins") => {
    if (!gameId || !user) return;
    setActionLoading(true);
    try {
      const result = await performMove(gameId, user.id, "confirm", undefined, itemId, position);
      if (result.foundObject) {
        toast.success("🏆 HAS TROBAT L'OBJECTE! HAS GUANYAT!");
      } else {
        toast.error(`❌ No era aquí... (-${TOKEN_COSTS.confirm} tokens)`);
      }
      await loadGame();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendSocialItem = async (itemType: SocialItemType) => {
    if (!gameId || !user || !rival) return;
    setActionLoading(true);
    try {
      const msg = itemType === "message" ? messageInput : undefined;
      const result = await sendSocialItem(gameId, user.id, rival.user_id, itemType, msg);
      const itemInfo = SOCIAL_ITEMS.find(i => i.type === itemType);

      if (result.blockedByShield) {
        toast.error(`🛡️ El rival tenia un escut! ${itemInfo?.icon} bloquejat!`);
      } else {
        toast.success(`${itemInfo?.icon} ${itemInfo?.name} enviat!`);
      }
      setShowSocialPanel(false);
      setMessageInput("");
      await loadGame();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const currentScenario = scenarios.find((s) => s.id === player?.current_scenario_id);

  if (!game || !player) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Carregant...</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-background p-4 max-w-md mx-auto relative ${bananaEffect ? "animate-pulse blur-[2px]" : ""}`}>
      {/* Banana overlay */}
      {bananaEffect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-yellow-400/30 pointer-events-none">
          <span className="text-8xl animate-bounce">🍌</span>
        </div>
      )}

      {/* Received message popup */}
      {receivedMessage && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50" onClick={() => setReceivedMessage(null)}>
          <Card className="mx-4 max-w-sm">
            <CardContent className="py-6 text-center">
              <div className="text-3xl mb-2">💬</div>
              <p className="text-sm font-medium mb-1">Missatge del rival:</p>
              <p className="text-lg italic">"{receivedMessage}"</p>
              <Button size="sm" className="mt-4" onClick={() => setReceivedMessage(null)}>
                Tancar
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => navigate("/")} className="text-sm text-muted-foreground">
          ← Lobby
        </button>
        <span className="font-mono text-sm bg-muted px-2 py-1 rounded">{game.code}</span>
        <div className="flex items-center gap-1">
          <span className="text-lg">🪙</span>
          <span className="font-bold text-sm">{player.tokens_remaining}</span>
        </div>
      </div>

      {/* WAITING */}
      {phase === "waiting" && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">⏳</div>
          <h2 className="text-xl font-bold mb-2">Esperant rival</h2>
          <p className="text-muted-foreground mb-4">Comparteix el codi:</p>
          <div className="bg-muted rounded-lg p-4 font-mono text-3xl tracking-[0.3em] font-bold">
            {game.code}
          </div>
        </div>
      )}

      {/* HIDING */}
      {phase === "hiding" && hideStep < 4 && (
        <div>
          <h2 className="text-lg font-bold mb-4">🫣 Amaga el teu objecte</h2>

          {hideStep === 0 && (
            <div>
              <p className="text-sm text-muted-foreground mb-3">On vols amagar?</p>
              <div className="grid grid-cols-2 gap-2">
                {scenarios.map((s) => (
                  <Card key={s.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => handleSelectScenario(s.id)}>
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
              <p className="text-sm text-muted-foreground mb-3">Què vols amagar?</p>
              <div className="grid grid-cols-3 gap-2">
                {objects.map((o) => (
                  <Card key={o.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => handleSelectObject(o.id)}>
                    <CardContent className="py-3 text-center">
                      <div className="text-2xl mb-1">{o.icon}</div>
                      <div className="text-xs">{o.name}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Button variant="ghost" size="sm" className="mt-2" onClick={() => setHideStep(0)}>← Canviar escenari</Button>
            </div>
          )}

          {hideStep === 2 && (
            <div>
              <p className="text-sm text-muted-foreground mb-3">A quin moble/lloc?</p>
              <div className="grid grid-cols-2 gap-2">
                {items.map((item) => (
                  <Card key={item.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => handleSelectItem(item.id)}>
                    <CardContent className="py-3 text-center">
                      <div className="text-2xl mb-1">{item.icon}</div>
                      <div className="text-sm">{item.name}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Button variant="ghost" size="sm" className="mt-2" onClick={() => setHideStep(1)}>← Canviar objecte</Button>
            </div>
          )}

          {hideStep === 3 && (
            <div>
              <p className="text-sm text-muted-foreground mb-3">Quina posició?</p>
              <div className="grid grid-cols-3 gap-2">
                {positions.map((pos) => (
                  <Card key={pos.value} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => handleSelectPosition(pos.value)}>
                    <CardContent className="py-4 text-center">
                      <div className="text-3xl mb-1">{pos.icon}</div>
                      <div className="text-sm font-medium">{pos.label}</div>
                      <div className="text-xs text-muted-foreground">{pos.desc}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Button variant="ghost" size="sm" className="mt-2" onClick={() => setHideStep(2)}>← Canviar moble</Button>
            </div>
          )}
        </div>
      )}

      {/* HIDING - Waiting */}
      {phase === "hiding" && hideStep === 4 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-xl font-bold mb-2">Objecte amagat!</h2>
          <p className="text-muted-foreground">Esperant que el rival amagui el seu...</p>
        </div>
      )}

      {/* PLAYING */}
      {phase === "playing" && (
        <div>
          {/* Current location + tokens */}
          <div className="bg-muted rounded-lg p-3 mb-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-muted-foreground">Ets a:</span>
              <div className="font-bold text-lg">{currentScenario?.icon} {currentScenario?.name}</div>
            </div>
            <div className="text-right">
              <span className="text-xs text-muted-foreground">Tokens</span>
              <div className="font-bold text-lg">🪙 {player.tokens_remaining}</div>
            </div>
          </div>

          {/* Social item badge */}
          {player.shield_active && (
            <div className="bg-blue-500/10 text-blue-600 text-xs font-medium px-3 py-1 rounded-full mb-3 inline-block">
              🛡️ Escut actiu
            </div>
          )}

          {/* False clue indicator */}
          {falseClueItem && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-600 text-xs px-3 py-2 rounded-lg mb-3">
              🔮 Indicador sospitós detectat! (pot ser fals)
            </div>
          )}

          {/* Actions */}
          <div className="space-y-4">
            {/* Move */}
            <div>
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                🚶 Moure's <span className="text-xs text-muted-foreground font-normal">(-{TOKEN_COSTS.move} tokens)</span>
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {scenarios.filter((s) => s.id !== player.current_scenario_id).map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleMove(s.id)}
                    disabled={actionLoading || player.tokens_remaining < TOKEN_COSTS.move}
                    className="bg-card border rounded-lg p-2 text-center hover:border-primary/50 transition-colors disabled:opacity-40"
                  >
                    <div className="text-xl">{s.icon}</div>
                    <div className="text-xs">{s.name}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Look */}
            <div>
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                👀 Mirar <span className="text-xs text-muted-foreground font-normal">(-{TOKEN_COSTS.look} tokens)</span>
              </h3>
              <div className="space-y-2">
                {currentScenarioItems.map((item) => (
                  <ItemActions
                    key={item.id}
                    item={item}
                    positions={positions}
                    onLook={handleLook}
                    onConfirm={handleConfirm}
                    disabled={actionLoading}
                    tokensRemaining={player.tokens_remaining}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Social Items Button */}
          <div className="mt-6">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowSocialPanel(!showSocialPanel)}
              disabled={player.social_item_used_today}
            >
              {player.social_item_used_today
                ? "⏳ Ítem social usat avui"
                : "⚡ Usar ítem social (1/dia)"}
            </Button>

            {showSocialPanel && (
              <div className="mt-3 space-y-2">
                {SOCIAL_ITEMS.map((item) => (
                  <div key={item.type}>
                    <Card
                      className="cursor-pointer hover:border-accent/50 transition-colors"
                      onClick={() => {
                        if (item.type === "message") return; // handled below
                        handleSendSocialItem(item.type);
                      }}
                    >
                      <CardContent className="py-3 flex items-center gap-3">
                        <span className="text-2xl">{item.icon}</span>
                        <div className="flex-1">
                          <div className="text-sm font-medium">{item.name}</div>
                          <div className="text-xs text-muted-foreground">{item.desc}</div>
                        </div>
                        {item.type !== "message" && (
                          <span className="text-xs text-primary font-medium">Enviar →</span>
                        )}
                      </CardContent>
                    </Card>
                    {item.type === "message" && (
                      <div className="flex gap-2 mt-1">
                        <input
                          type="text"
                          value={messageInput}
                          onChange={(e) => setMessageInput(e.target.value)}
                          placeholder="Escriu un missatge..."
                          maxLength={100}
                          className="flex-1 bg-muted border rounded px-2 py-1 text-sm"
                        />
                        <Button
                          size="sm"
                          disabled={!messageInput.trim()}
                          onClick={() => handleSendSocialItem("message")}
                        >
                          💬
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* History */}
          {moveHistory.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">📋 Historial</h3>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {moveHistory.map((m) => (
                  <div key={m.id} className="text-xs bg-muted rounded px-2 py-1 flex justify-between">
                    <span>
                      #{m.turn_number}{" "}
                      {m.action === "move" && `🚶 → ${(m.scenarios as any)?.icon} ${(m.scenarios as any)?.name}`}
                      {m.action === "look" && `👀 ${m.target_position} ${(m.items as any)?.icon} ${(m.items as any)?.name}`}
                      {m.action === "confirm" && `🔍 ${m.target_position} ${(m.items as any)?.icon} ${(m.items as any)?.name}`}
                    </span>
                    <span className="text-muted-foreground">-{m.token_cost}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* FINISHED */}
      {phase === "finished" && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">{game.winner_id === user?.id ? "🏆" : "😞"}</div>
          <h2 className="text-xl font-bold mb-2">
            {game.winner_id === user?.id ? "Has guanyat!" : "Has perdut..."}
          </h2>
          <Button onClick={() => navigate("/")} className="mt-4">Tornar al lobby</Button>
        </div>
      )}
    </div>
  );
}

function ItemActions({
  item,
  positions,
  onLook,
  onConfirm,
  disabled,
  tokensRemaining,
}: {
  item: any;
  positions: { value: "sobre" | "sota" | "dins"; label: string; icon: string }[];
  onLook: (itemId: string, pos: "sobre" | "sota" | "dins") => void;
  onConfirm: (itemId: string, pos: "sobre" | "sota" | "dins") => void;
  disabled: boolean;
  tokensRemaining: number;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-card border rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-2 flex items-center justify-between hover:bg-muted/50 transition-colors"
      >
        <span>{item.icon} {item.name}</span>
        <span className="text-xs text-muted-foreground">{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && (
        <div className="border-t p-2 grid grid-cols-3 gap-1">
          {positions.map((pos) => (
            <div key={pos.value} className="text-center">
              <button
                onClick={() => onLook(item.id, pos.value)}
                disabled={disabled || tokensRemaining < TOKEN_COSTS.look}
                className="w-full bg-muted rounded p-1.5 text-xs hover:bg-primary/10 transition-colors disabled:opacity-40"
              >
                {pos.icon} {pos.label}
              </button>
              <button
                onClick={() => onConfirm(item.id, pos.value)}
                disabled={disabled || tokensRemaining < TOKEN_COSTS.confirm}
                className="w-full mt-1 bg-primary/10 text-primary rounded p-1 text-[10px] font-medium hover:bg-primary/20 transition-colors disabled:opacity-40"
              >
                🔍 Confirmar (-{TOKEN_COSTS.confirm})
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
