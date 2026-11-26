import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Featured { user_id: string; display_name: string | null; elo: number; elo_change: number; game_code: string; opponent_name: string | null }

/** Lobby highlight: the player with the biggest Elo gain in a single win so far. */
export function FeaturedPlayerCard({ myUserId, onChallenge, disabled }: { myUserId?: string; onChallenge: (id: string, name: string) => void; disabled?: boolean }) {
  const navigate = useNavigate();
  const [f, setF] = useState<Featured | null>(null);
  useEffect(() => { supabase.rpc("get_featured_player").then(({ data }) => setF((data as unknown as Featured) ?? null)); }, []);
  if (!f) return null;
  const name = f.display_name ?? "Jugador";
  const isMe = f.user_id === myUserId;
  return (
    <Card className="mb-4 glass border-primary/40" aria-label="Jugador destacat">
      <CardContent className="py-3">
        <p className="text-[10px] uppercase tracking-wider text-primary font-semibold mb-1">🏆 Millor partida fins ara</p>
        <p className="text-sm">
          <button onClick={() => navigate(`/player/${f.user_id}`)} className="font-bold hover:text-primary">{name}</button>
          {" "}va guanyar <span className="font-bold text-primary">+{f.elo_change} Elo</span> en una sola partida
          {f.opponent_name ? <> contra {f.opponent_name}</> : null}.
        </p>
        <div className="flex gap-2 mt-2">
          <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => navigate(`/player/${f.user_id}`)}>👤 Perfil</Button>
          {!isMe && <Button size="sm" className="flex-1 text-xs" disabled={disabled} onClick={() => onChallenge(f.user_id, name)}>⚔️ Repta'l</Button>}
        </div>
        {isMe && <p className="text-[11px] text-muted-foreground mt-2">Ets tu! Defensa el títol 💪</p>}
      </CardContent>
    </Card>
  );
}
