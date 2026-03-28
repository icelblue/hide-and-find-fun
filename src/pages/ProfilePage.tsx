import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getScenarios } from "@/lib/supabase-helpers";
import { getMyRewards, placeRewardItem, sellRewardItem, RARITY_CONFIG } from "@/lib/reward-helpers";
import { toast } from "sonner";
import { Tip } from "@/components/HelpButton";

const RARITY_BORDER: Record<string, string> = {
  common: "border-muted-foreground/30",
  uncommon: "border-green-500/40",
  rare: "border-blue-500/40",
  epic: "border-purple-500/50",
  legendary: "border-amber-400/60",
};

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

  const leagueInfo: Record<string, { icon: string; next: string; eloNeeded: number; gradient: string }> = {
    bronze: { icon: "🥉", next: "Silver", eloNeeded: 1200, gradient: "from-amber-700 to-amber-600" },
    silver: { icon: "🥈", next: "Gold", eloNeeded: 1400, gradient: "from-gray-400 to-gray-300" },
    gold: { icon: "🥇", next: "Platinum", eloNeeded: 1600, gradient: "from-yellow-500 to-amber-400" },
    platinum: { icon: "💎", next: "Diamond", eloNeeded: 1800, gradient: "from-cyan-400 to-blue-400" },
    diamond: { icon: "👑", next: "—", eloNeeded: 9999, gradient: "from-purple-400 to-pink-400" },
  };

  const league = leagueInfo[profile.league] ?? leagueInfo.bronze;
  const winRate = profile.games_played > 0
    ? Math.round((profile.games_won / profile.games_played) * 100)
    : 0;
  const bonusTokens = (profile as any).bonus_tokens ?? 0;
  const eloProgress = Math.min(((profile.elo % 200) / 200) * 100, 100);

  return (
    <div className="min-h-screen bg-background p-4 max-w-md mx-auto pb-20 relative">
      {/* BG */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[500px] h-[250px] rounded-full bg-primary/5 blur-[100px] pointer-events-none" />

      {/* Modals */}
      {placingReward && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-background/80 backdrop-blur-md" onClick={() => setPlacingReward(null)}>
          <Card className="mx-4 max-w-sm w-full glass" onClick={e => e.stopPropagation()}>
            <CardContent className="py-6">
              <div className="text-center mb-4">
                <div className="text-4xl mb-2">{placingReward.reward_items.icon}</div>
                <p className="font-bold">{placingReward.reward_items.name}</p>
                <p className="text-xs text-muted-foreground mt-1">On vols col·locar-lo?</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {scenarios.map((s: any) => (
                  <button key={s.id} onClick={() => handlePlace(s.id)}
                    disabled={loading}
                    className="bg-muted/50 rounded-xl p-3 text-center hover:bg-primary/10 transition-all disabled:opacity-30 active:scale-[0.97] border border-border/30">
                    <div className="text-2xl">{s.icon}</div>
                    <div className="text-xs mt-1 font-medium">{s.name}</div>
                  </button>
                ))}
              </div>
              <Button variant="ghost" size="sm" className="w-full mt-3" onClick={() => setPlacingReward(null)}>Cancel·lar</Button>
            </CardContent>
          </Card>
        </div>
      )}

      {sellingReward && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-background/80 backdrop-blur-md" onClick={() => setSellingReward(null)}>
          <Card className="mx-4 max-w-sm glass" onClick={e => e.stopPropagation()}>
            <CardContent className="py-6 text-center">
              <div className="text-4xl mb-3">{sellingReward.reward_items.icon}</div>
              <p className="font-bold mb-1">Vendre {sellingReward.reward_items.name}?</p>
              <p className="text-sm text-muted-foreground mb-4">
                Rebràs <span className="font-bold text-accent">+{sellingReward.reward_items.sell_value} tokens bonus 🪙</span>
                <br /><span className="text-[10px]">(s'afegiran al pròxim reset diari)</span>
              </p>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setSellingReward(null)}>Cancel·lar</Button>
                <Button className="flex-1" onClick={handleSell} disabled={loading}>Vendre</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <button onClick={() => navigate("/")} className="text-sm text-muted-foreground hover:text-primary mb-5 block transition-colors relative z-10">
        ← Lobby
      </button>

      {/* Profile header */}
      <div className="text-center mb-6 relative z-10">
        <div className={`w-20 h-20 mx-auto mb-3 rounded-2xl bg-gradient-to-br ${league.gradient} flex items-center justify-center shadow-lg text-4xl`}>
          {league.icon}
        </div>
        <h1 className="text-2xl font-bold">{profile.display_name}</h1>
        <p className="text-sm font-semibold text-primary capitalize mt-0.5">{profile.league} League</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {[
          { val: profile.games_played, label: "Partides" },
          { val: profile.games_won, label: "Victòries" },
          { val: `${winRate}%`, label: "Win rate" },
          { val: `${profile.best_streak}🔥`, label: "Ratxa" },
        ].map((stat, i) => (
          <Card key={i} className="glass">
            <CardContent className="py-2.5 px-1 text-center">
              <div className="text-lg font-bold leading-tight">{stat.val}</div>
              <div className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">{stat.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Elo bar */}
      <Card className="mb-5 glass">
        <CardContent className="py-3">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Elo Rating</span>
            <span className="font-bold text-sm text-gradient">{profile.elo}</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div className="gradient-primary h-2 rounded-full transition-all duration-500" style={{ width: `${eloProgress}%` }} />
          </div>
          <div className="flex justify-between mt-1.5">
            <p className="text-[10px] text-muted-foreground">
              {league.eloNeeded - profile.elo > 0
                ? `${league.eloNeeded - profile.elo} per ${league.next}`
                : "Rang màxim!"}
            </p>
            {bonusTokens > 0 && (
              <p className="text-[10px] font-semibold text-accent">🪙 +{bonusTokens} bonus</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Inventory */}
      <div className="mb-6">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
          🎒 Inventari ({rewards.length})
        </h2>
        <Tip>📍 Col·loca mobles en escenaris per ampliar el joc · 🪙 Ven-los per tokens bonus</Tip>
        <div className="h-2" />
        {rewards.length === 0 ? (
          <Card className="glass">
            <CardContent className="py-8 text-center">
              <div className="text-4xl mb-2 opacity-50">📦</div>
              <p className="text-sm text-muted-foreground">Cap objecte.</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Guanya partides per obtenir mobles!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {rewards.map((r: any) => {
              const item = r.reward_items;
              const rarity = RARITY_CONFIG[item.rarity] ?? RARITY_CONFIG.common;
              const borderClass = RARITY_BORDER[item.rarity] ?? RARITY_BORDER.common;
              return (
                <Card key={r.id} className={`glass border ${borderClass}`}>
                  <CardContent className="py-2.5 flex items-center gap-3">
                    <span className="text-2xl">{item.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm">{item.name}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {rarity.emoji} {rarity.label} · {item.sell_value}🪙
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" className="text-xs h-7 px-2 rounded-lg"
                        onClick={() => setPlacingReward(r)}>📍</Button>
                      <Button size="sm" variant="ghost" className="text-xs h-7 px-2 rounded-lg"
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
