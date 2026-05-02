// ============================================================
// GameFinishedPhase.tsx — Resultats de la partida
// ============================================================
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MATERIAL_LABELS } from "@/lib/supabase-helpers";
import { getHideMessage } from "@/lib/object-specials";
import { RARITY_CONFIG } from "@/lib/reward-helpers";
import { POS_LABELS } from "@/lib/game-types";
import { supabase } from "@/integrations/supabase/client";

interface FinishedPhaseProps {
  game: any;
  user: any;
  rival: any;
  reward: any;
  navigate: (path: string) => void;
  objects: any[];
  scenarios: any[];
  gameId: string;
}

interface ActionLogEntry {
  id: string;
  playerName: string;
  turnNumber: number;
  action: string;
  description: string;
  createdAt: string;
  isOwn: boolean;
}

export default function GameFinishedPhase({ game, user, rival, reward, navigate, objects, scenarios, gameId }: FinishedPhaseProps) {
  const [rivalInfo, setRivalInfo] = useState<{
    obj: any; item: any; scenario: any; position: string;
    hideMessage: string | null; rivalName: string;
    specialType: string | null; traits: string[];
  } | null>(null);
  const [showRivalInfo, setShowRivalInfo] = useState(false);
  const [actionLog, setActionLog] = useState<ActionLogEntry[]>([]);
  const [showActionLog, setShowActionLog] = useState(false);

  useEffect(() => {
    if (!gameId || !user) return;

    // Fetch action log for both players
    (async () => {
      // Get all moves + profiles in parallel
      const [{ data: allMoves }, { data: profiles }] = await Promise.all([
        supabase
          .from("game_moves")
          .select("id, player_id, turn_number, action, target_scenario_id, target_item_id, target_position, found_object, found_bonus, bonus_value, hint_level, token_cost, created_at")
          .eq("game_id", gameId)
          .order("created_at", { ascending: true }),
        supabase
          .from("profiles")
          .select("user_id, display_name"),
      ]);

      if (!allMoves || allMoves.length === 0) return;

      // Get unique scenario/item IDs to batch-fetch names
      const scenarioIds = [...new Set(allMoves.filter(m => m.target_scenario_id).map(m => m.target_scenario_id!))];
      const itemIds = [...new Set(allMoves.filter(m => m.target_item_id).map(m => m.target_item_id!))];

      const [{ data: scenarioData }, { data: itemData }] = await Promise.all([
        scenarioIds.length > 0
          ? supabase.from("scenarios").select("id, name, icon").in("id", scenarioIds)
          : { data: [] as any[] },
        itemIds.length > 0
          ? supabase.from("items").select("id, name, icon").in("id", itemIds)
          : { data: [] as any[] },
      ]);

      const scenarioMap = new Map((scenarioData ?? []).map(s => [s.id, s]));
      const itemMap = new Map((itemData ?? []).map(i => [i.id, i]));
      const profileMap = new Map((profiles ?? []).map(p => [p.user_id, p.display_name ?? "Jugador"]));

      const log: ActionLogEntry[] = allMoves.map(m => {
        const playerName = profileMap.get(m.player_id) ?? "Jugador";
        const isOwn = m.player_id === user.id;
        let description = "";

        const bonusVal = (m.bonus_value as string) ?? "";

        // Tag actions (light, break, clean, fix)
        if (bonusVal.startsWith("tag:light_off:")) {
          const scnId = bonusVal.replace("tag:light_off:", "");
          const scn = scenarioMap.get(scnId);
          description = `🌑 Apaga el llum de ${scn?.icon ?? ""} ${scn?.name ?? ""}`;
        } else if (bonusVal.startsWith("tag:light_on:")) {
          const scnId = bonusVal.replace("tag:light_on:", "");
          const scn = scenarioMap.get(scnId);
          description = `💡 Encén el llum de ${scn?.icon ?? ""} ${scn?.name ?? ""}`;
        } else if (bonusVal.startsWith("tag:break:")) {
          const itm = itemMap.get(m.target_item_id ?? "");
          description = `💥 Trenca ${itm?.icon ?? ""} ${itm?.name ?? ""}`;
        } else if (bonusVal.startsWith("tag:clean:")) {
          const itm = itemMap.get(m.target_item_id ?? "");
          description = `🧹 Neteja ${itm?.icon ?? ""} ${itm?.name ?? ""}`;
        } else if (bonusVal.startsWith("tag:fix:")) {
          const itm = itemMap.get(m.target_item_id ?? "");
          description = `🔧 Arregla ${itm?.icon ?? ""} ${itm?.name ?? ""}`;
        } else if (m.action === "move") {
          const scn = scenarioMap.get(m.target_scenario_id ?? "");
          description = `🚶 Es mou a ${scn?.icon ?? ""} ${scn?.name ?? ""}`;
        } else if (m.action === "look" && m.target_item_id) {
          const itm = itemMap.get(m.target_item_id);
          const posLabel = m.target_position ? POS_LABELS[m.target_position] ?? m.target_position : "";
          const hintIcons: Record<number, string> = { 0: "❄️", 1: "🌡️", 2: "🔥", 3: "🏆" };
          const hint = m.hint_level != null ? ` ${hintIcons[m.hint_level] ?? ""}` : "";
          if (m.found_object) {
            description = `🏆 TROBA l'objecte a ${itm?.icon ?? ""} ${itm?.name ?? ""} ${posLabel}!`;
          } else {
            description = `👀 Observa ${itm?.icon ?? ""} ${itm?.name ?? ""} ${posLabel}${hint}`;
          }
        } else if (m.action === "confirm") {
          const itm = itemMap.get(m.target_item_id ?? "");
          description = `🎯 Confirma ${itm?.icon ?? ""} ${itm?.name ?? ""}`;
        } else {
          description = `${m.action}`;
        }

        return {
          id: m.id,
          playerName,
          turnNumber: m.turn_number,
          action: m.action,
          description: description.trim(),
          createdAt: m.created_at,
          isOwn,
        };
      });

      setActionLog(log);
    })();

    // Rival info (loser only)
    if (game.winner_id === user?.id || !rival) return;
    (async () => {
      const rivalSD: any = rival.special_data;
      const isCustom = rivalSD?.is_custom === true;

      const [{ data: obj }, { data: itm }, { data: rivalProf }] = await Promise.all([
        rival.hidden_object_id && !isCustom
          ? supabase.from("objects").select("name, icon, material, size").eq("id", rival.hidden_object_id).single()
          : { data: null },
        rival.hidden_item_id
          ? supabase.from("items").select("name, icon, scenario_id, environment").eq("id", rival.hidden_item_id).single()
          : { data: null },
        supabase.from("profiles").select("display_name").eq("user_id", rival.user_id).single(),
      ]);
      let scn = null;
      if (itm?.scenario_id) {
        scn = scenarios.find((s: any) => s.id === itm.scenario_id) ?? null;
      }
      const hideMsg = getHideMessage(rival.special_data);

      let traits: string[] = [];
      let specialType: string | null = null;
      let displayObj: any = obj;
      if (isCustom) {
        // Player-created object: data lives in special_data
        displayObj = {
          name: rivalSD.custom_name,
          icon: rivalSD.custom_icon,
          material: rivalSD.custom_material ?? "generic",
          size: rivalSD.custom_size ?? 2,
        };
        if (rivalSD.custom_trait1) traits.push(rivalSD.custom_trait1);
        if (rivalSD.custom_trait2) traits.push(rivalSD.custom_trait2);
      } else if (rival.hidden_object_id) {
        const [{ data: traitData }, { data: specialData }] = await Promise.all([
          supabase.from("object_traits").select("trait_text").eq("object_id", rival.hidden_object_id).order("trait_number"),
          supabase.from("object_specials").select("special_type").eq("object_id", rival.hidden_object_id).maybeSingle(),
        ]);
        traits = (traitData ?? []).map((t: any) => t.trait_text);
        specialType = specialData?.special_type ?? null;
      }

      setRivalInfo({
        obj: displayObj, item: itm, scenario: scn,
        position: rival.hidden_position ?? "?",
        hideMessage: hideMsg,
        rivalName: rivalProf?.display_name ?? "Rival",
        specialType,
        traits,
      });
    })();
  }, [game.winner_id, user?.id, rival, scenarios, gameId]);

  const isWinner = game.winner_id === user?.id;

  return (
    <div className="text-center py-10">
      {isWinner ? (
        <div className="w-24 h-24 mx-auto mb-4 rounded-3xl gradient-primary flex items-center justify-center text-5xl shadow-xl glow-primary">🏆</div>
      ) : (
        <div className="text-7xl mb-4 opacity-60">😢</div>
      )}
      <h2 className="text-2xl font-bold mb-2">
        {isWinner ? <span className="text-gradient">Victòria!</span> : "Derrota..."}
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        {isWinner ? "Elo +25 ⬆️" : "Elo -20 ⬇️"}
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

      {/* Loser: show where the object was */}
      {!isWinner && rivalInfo && (
        <div className="mb-6">
          {!showRivalInfo ? (
            <Button variant="outline" onClick={() => setShowRivalInfo(true)} className="mb-2">
              👁️ Veure on era l'objecte
            </Button>
          ) : (
            <Card className="mx-auto max-w-xs glass border-secondary/30">
              <CardContent className="py-4">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3 font-semibold">
                  📍 L'objecte de {rivalInfo.rivalName}
                </p>
                {rivalInfo.obj && (
                  <div className="text-4xl mb-2">{rivalInfo.obj.icon}</div>
                )}
                <p className="font-bold text-lg mb-1">{rivalInfo.obj?.name ?? "?"}</p>
                {rivalInfo.obj?.material && rivalInfo.obj.material !== "generic" && (
                  <p className="text-[10px] text-muted-foreground mb-2">
                    Material: <span className="font-medium text-foreground/70">{MATERIAL_LABELS[rivalInfo.obj.material] ?? rivalInfo.obj.material}</span>
                    {rivalInfo.obj.size && <span> · Mida {rivalInfo.obj.size}</span>}
                  </p>
                )}
                <div className="text-sm text-muted-foreground space-y-1">
                  {rivalInfo.scenario && (
                    <p>{rivalInfo.scenario.icon} <strong>{rivalInfo.scenario.name}</strong></p>
                  )}
                  {rivalInfo.item && (
                    <p>{rivalInfo.item.icon} {rivalInfo.item.name} · {POS_LABELS[rivalInfo.position] ?? rivalInfo.position}</p>
                  )}
                </div>
                {rivalInfo.traits.length > 0 && (
                  <div className="mt-3 text-xs text-muted-foreground">
                    <p className="font-semibold text-[10px] uppercase tracking-wider mb-1">💡 Pistes que tenia:</p>
                    {rivalInfo.traits.map((t, i) => (
                      <p key={i} className="text-primary/80 italic">"{t}"</p>
                    ))}
                  </div>
                )}
                {rivalInfo.specialType && (
                  <p className="text-[10px] text-accent mt-2">⭐ Objecte especial ({rivalInfo.specialType})</p>
                )}
                {rivalInfo.hideMessage && (
                  <div className="mt-3 p-2 rounded-lg bg-accent/10 border border-accent/20">
                    <p className="text-xs font-semibold text-accent mb-0.5">💌 Missatge del rival:</p>
                    <p className="text-sm italic text-foreground/80">"{rivalInfo.hideMessage}"</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Action Log */}
      {actionLog.length > 0 && (
        <div className="mb-6">
          {!showActionLog ? (
            <Button variant="outline" onClick={() => setShowActionLog(true)} className="mb-2">
              📋 Veure historial d'accions ({actionLog.length})
            </Button>
          ) : (
            <Card className="mx-auto max-w-sm glass border-border/30">
              <CardContent className="py-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                    📋 Historial de la partida
                  </p>
                  <button onClick={() => setShowActionLog(false)} className="text-xs text-muted-foreground hover:text-foreground">✕</button>
                </div>
                <div className="space-y-0.5 max-h-60 overflow-y-auto text-left" style={{ WebkitOverflowScrolling: "touch" }}>
                  {actionLog.map((entry) => (
                    <div
                      key={entry.id}
                      className={`text-[10px] rounded-md px-2 py-1.5 border border-border/15 ${
                        entry.isOwn ? "bg-primary/5 border-primary/20" : "bg-secondary/5 border-secondary/20"
                      }`}
                    >
                      <span className={`font-semibold ${entry.isOwn ? "text-primary" : "text-secondary"}`}>
                        {entry.playerName}
                      </span>
                      <span className="text-muted-foreground ml-1">{entry.description}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <div className="flex gap-2 justify-center">
        <Button onClick={() => navigate("/")} variant="outline">Lobby</Button>
        <Button onClick={() => navigate("/profile")}>👤 Perfil</Button>
      </div>
    </div>
  );
}
