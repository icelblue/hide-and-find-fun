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

export default function GameFinishedPhase({ game, user, rival, reward, navigate, objects, scenarios, gameId }: FinishedPhaseProps) {
  const [rivalInfo, setRivalInfo] = useState<{
    obj: any; item: any; scenario: any; position: string;
    hideMessage: string | null; rivalName: string;
    specialType: string | null; traits: string[];
  } | null>(null);
  const [showRivalInfo, setShowRivalInfo] = useState(false);

  useEffect(() => {
    if (game.winner_id === user?.id || !rival) return;
    (async () => {
      const [{ data: obj }, { data: itm }, { data: rivalProf }] = await Promise.all([
        rival.hidden_object_id
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
      if (rival.hidden_object_id) {
        const [{ data: traitData }, { data: specialData }] = await Promise.all([
          supabase.from("object_traits").select("trait_text").eq("object_id", rival.hidden_object_id).order("trait_number"),
          supabase.from("object_specials").select("special_type").eq("object_id", rival.hidden_object_id).maybeSingle(),
        ]);
        traits = (traitData ?? []).map((t: any) => t.trait_text);
        specialType = specialData?.special_type ?? null;
      }

      setRivalInfo({
        obj, item: itm, scenario: scn,
        position: rival.hidden_position ?? "?",
        hideMessage: hideMsg,
        rivalName: rivalProf?.display_name ?? "Rival",
        specialType,
        traits,
      });
    })();
  }, [game.winner_id, user?.id, rival, scenarios]);

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

      <div className="flex gap-2 justify-center">
        <Button onClick={() => navigate("/")} variant="outline">Lobby</Button>
        <Button onClick={() => navigate("/profile")}>👤 Perfil</Button>
      </div>
    </div>
  );
}
