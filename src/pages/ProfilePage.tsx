import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getScenarios } from "@/lib/supabase-helpers";
import { getMyRewards, placeRewardItem, sellRewardItem, RARITY_CONFIG } from "@/lib/reward-helpers";
import { toast } from "sonner";

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [rewards, setRewards] = useState<any[]>([]);
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [placingReward, setPlacingReward] = useState<any>(null);
  const [sellingReward, setSellingReward] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    const [prof, rew, scen] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", user.id).single().then(r => r.data),
      getMyRewards(user.id).catch(() => []),
      getScenarios().catch(() => []),
    ]);
    setProfile(prof);
    setRewards(rew);
    setScenarios(scen);
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  const handlePlace = async (scenarioId: string) => {
    if (!placingReward) return;
    setLoading(true);
    try {
      await placeRewardItem(placingReward.id, scenarioId);
      toast.success(`${placingReward.reward_items.icon} ${placingReward.reward_items.name} col·locat!`);
      setPlacingReward(null);
      await loadData();
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  const handleSell = async () => {
    if (!sellingReward) return;
    setLoading(true);
    try {
      const tokens = await sellRewardItem(sellingReward.id);
      toast.success(`+${tokens} tokens bonus! 🪙`);
      setSellingReward(null);
      await loadData();
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  if (!profile) return null;

  const leagueInfo: Record<string, { icon: string; next: string; eloNeeded: number }> = {
    bronze: { icon: "🥉", next: "Silver", eloNeeded: 1200 },
    silver: { icon: "🥈", next: "Gold", eloNeeded: 1400 },
    gold: { icon: "🥇", next: "Platinum", eloNeeded: 1600 },
    platinum: { icon: "💎", next: "Diamond", eloNeeded: 1800 },
    diamond: { icon: "👑", next: "—", eloNeeded: 9999 },
  };

  const league = leagueInfo[profile.league] ?? leagueInfo.bronze;
  const winRate = profile.games_played > 0
    ? Math.round((profile.games_won / profile.games_played) * 100)
    : 0;
  const bonusTokens = (profile as any).bonus_tokens ?? 0;

  return (
    <div className="min-h-screen bg-background p-4 max-w-md mx-auto pb-20">
      {/* Place dialog */}
      {placingReward && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-foreground/30 backdrop-blur-sm" onClick={() => setPlacingReward(null)}>
          <Card className="mx-4 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <CardContent className="py-6">
              <div className="text-center mb-4">
                <div className="text-3xl mb-1">{placingReward.reward_items.icon}</div>
                <p className="font-bold">{placingReward.reward_items.name}</p>
                <p className="text-xs text-muted-foreground">On vols col·locar-lo?</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {scenarios.map((s: any) => (
                  <button key={s.id} onClick={() => handlePlace(s.id)}
                    disabled={loading}
                    className="bg-muted rounded-lg p-3 text-center hover:bg-primary/10 transition-all disabled:opacity-30 active:scale-[0.97]">
                    <div className="text-2xl">{s.icon}</div>
                    <div className="text-xs mt-1">{s.name}</div>
                  </button>
                ))}
              </div>
              <Button variant="ghost" size="sm" className="w-full mt-3" onClick={() => setPlacingReward(null)}>Cancel·lar</Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Sell confirm dialog */}
      {sellingReward && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-foreground/30 backdrop-blur-sm" onClick={() => setSellingReward(null)}>
          <Card className="mx-4 max-w-sm" onClick={e => e.stopPropagation()}>
            <CardContent className="py-6 text-center">
              <div className="text-3xl mb-2">{sellingReward.reward_items.icon}</div>
              <p className="font-bold mb-1">Vendre {sellingReward.reward_items.name}?</p>
              <p className="text-sm text-muted-foreground mb-4">
                Rebràs <span className="font-bold text-foreground">+{sellingReward.reward_items.sell_value} tokens bonus 🪙</span>
                <br /><span className="text-xs">(s'afegiran al pròxim reset diari)</span>
              </p>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setSellingReward(null)}>Cancel·lar</Button>
                <Button className="flex-1" onClick={handleSell} disabled={loading}>Vendre</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <button onClick={() => navigate("/")} className="text-sm text-muted-foreground mb-4 block">
        ← Lobby
      </button>

      {/* Profile header */}
      <div className="text-center mb-6">
        <div className="text-6xl mb-2">{league.icon}</div>
        <h1 className="text-2xl font-bold">{profile.display_name}</h1>
        <p className="text-sm font-semibold text-primary capitalize">{profile.league} League</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Card><CardContent className="py-3 text-center">
          <div className="text-xl font-bold">{profile.games_played}</div>
          <div className="text-[11px] text-muted-foreground">Partides</div>
        </CardContent></Card>
        <Card><CardContent className="py-3 text-center">
          <div className="text-xl font-bold">{profile.games_won}</div>
          <div className="text-[11px] text-muted-foreground">Victòries</div>
        </CardContent></Card>
        <Card><CardContent className="py-3 text-center">
          <div className="text-xl font-bold">{winRate}%</div>
          <div className="text-[11px] text-muted-foreground">Win rate</div>
        </CardContent></Card>
        <Card><CardContent className="py-3 text-center">
          <div className="text-xl font-bold">{profile.best_streak}🔥</div>
          <div className="text-[11px] text-muted-foreground">Millor ratxa</div>
        </CardContent></Card>
      </div>

      {/* Elo bar */}
      <Card className="mb-4">
        <CardContent className="py-3">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-sm font-medium">Elo</span>
            <span className="font-bold text-sm">{profile.elo}</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${Math.min(((profile.elo % 200) / 200) * 100, 100)}%` }} />
          </div>
          <div className="flex justify-between mt-1">
            <p className="text-[10px] text-muted-foreground">
              {league.eloNeeded - profile.elo > 0
                ? `${league.eloNeeded - profile.elo} per ${league.next}`
                : "Rang màxim!"}
            </p>
            {bonusTokens > 0 && (
              <p className="text-[10px] font-medium text-primary">🪙 +{bonusTokens} bonus pendent</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Inventory */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          🎒 Inventari ({rewards.length})
        </h2>
        {rewards.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center">
              <div className="text-3xl mb-2">📦</div>
              <p className="text-sm text-muted-foreground">Cap objecte.</p>
              <p className="text-xs text-muted-foreground">Guanya partides per obtenir mobles!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {rewards.map((r: any) => {
              const item = r.reward_items;
              const rarity = RARITY_CONFIG[item.rarity] ?? RARITY_CONFIG.common;
              return (
                <Card key={r.id}>
                  <CardContent className="py-2.5 flex items-center gap-3">
                    <span className="text-2xl">{item.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{item.name}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {rarity.emoji} {rarity.label} · Venda: {item.sell_value}🪙
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" className="text-xs h-7 px-2"
                        onClick={() => setPlacingReward(r)}>📍</Button>
                      <Button size="sm" variant="ghost" className="text-xs h-7 px-2"
                        onClick={() => setSellingReward(r)}>🪙</Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Button variant="outline" className="w-full" onClick={signOut}>
        🚪 Tancar sessió
      </Button>
    </div>
  );
}
