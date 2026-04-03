// ============================================================
// StoryModePage.tsx — Mode Història (single-player tutorial)
// ============================================================
// Capítols progressius per aprendre a jugar:
//   1. Adopta mascota + troba-la en 1 escenari
//   2. Mascota s'escapa → 3 escenaris (aprèn a moure's)
//   3+ Partides vs CPU per accesoris → consumibles → XP
// Pet evolution: visual tiers. Max XP = pet dies → restart.
// ============================================================

import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { useAuth } from "@/hooks/useAuth";
import { TypewriterText } from "@/components/TypewriterText";
import {
  PET_OPTIONS, PET_ACCESSORIES, PET_CONSUMABLES, MAX_PET_XP,
  getPetEvolution, hasAllAccessories,
  getMyPet, createPet, getStoryProgress, initChapter, completeChapter,
  getMyAccessories, awardAccessory, resetPetAndProgress, calculateXP,
} from "@/lib/story-helpers";
import { getScenarios, getItemsByScenario, getObjects } from "@/lib/supabase-helpers";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type StoryPhase = "loading" | "intro" | "gift" | "hub" | "playing" | "dead";

export default function StoryModePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<StoryPhase>("loading");
  const [pet, setPet] = useState<any>(null);
  const [progress, setProgress] = useState<any[]>([]);
  const [accessories, setAccessories] = useState<any[]>([]);

  // Intro animation states
  const [randomPet, setRandomPet] = useState<{ type: string; icon: string; name: string }>(PET_OPTIONS[0]);
  const [introStep, setIntroStep] = useState(0);
  const [giftOpened, setGiftOpened] = useState(false);

  // Chapter play states
  const [activeChapter, setActiveChapter] = useState(0);
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [currentScenarioId, setCurrentScenarioId] = useState("");
  const [currentItems, setCurrentItems] = useState<any[]>([]);
  const [availableScenarios, setAvailableScenarios] = useState<any[]>([]);
  const [hiddenSpot, setHiddenSpot] = useState<any>(null);
  const [movesUsed, setMovesUsed] = useState(0);
  const [chapterDone, setChapterDone] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [wonConsumable, setWonConsumable] = useState<any>(null);
  const [petDied, setPetDied] = useState(false);

  const allAccsCollected = useMemo(() => hasAllAccessories(accessories), [accessories]);

  const loadData = useCallback(async () => {
    if (!user) return;
    const [petData, prog, accs, scen] = await Promise.all([
      getMyPet(user.id),
      getStoryProgress(user.id),
      getMyAccessories(user.id),
      getScenarios(),
    ]);
    setPet(petData);
    setProgress(prog);
    setAccessories(accs);
    setScenarios(scen);

    if (!petData) {
      const rp = PET_OPTIONS[Math.floor(Math.random() * PET_OPTIONS.length)];
      setRandomPet(rp);
      setPhase("intro");
    } else if (petData.xp >= MAX_PET_XP) {
      setPhase("dead");
    } else {
      setPhase("hub");
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  // ====== INTRO FLOW ======
  const handleOpenGift = async () => {
    setGiftOpened(true);
    if (!user) return;
    try {
      // Fetch display_name from profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", user.id)
        .maybeSingle();
      const name = profile?.display_name || user.email?.split("@")[0] || "Jugador";
      const p = await createPet(user.id, randomPet.type, name, randomPet.icon);
      setPet(p);
      await initChapter(user.id, 1);
      const prog = await getStoryProgress(user.id);
      setProgress(prog);
      setTimeout(() => {
        setPhase("hub");
        toast.success(`${randomPet.icon} ${name} és el teu company!`);
      }, 1500);
    } catch (err: any) { toast.error(err.message); }
  };

  // ====== PET DEATH → REBIRTH ======
  const handleRebirth = async () => {
    if (!user) return;
    try {
      await resetPetAndProgress(user.id);
      const rp = PET_OPTIONS[Math.floor(Math.random() * PET_OPTIONS.length)];
      setRandomPet(rp);
      
      setIntroStep(0);
      setGiftOpened(false);
      setPhase("intro");
      toast("La teva mascota ha viscut una vida plena 💫");
    } catch (err: any) { toast.error(err.message); }
  };

  // ====== CHAPTER PLAY ======
  const startChapter = async (chapter: number) => {
    if (!user) return;
    await initChapter(user.id, chapter);
    setActiveChapter(chapter);
    setMovesUsed(0);
    setChapterDone(false);
    setXpEarned(0);
    setWonConsumable(null);
    setPetDied(false);

    const positions = ["sobre", "sota", "dins"] as const;

    if (chapter === 1) {
      const scen = scenarios[Math.floor(Math.random() * scenarios.length)];
      const items = await getItemsByScenario(scen.id);
      setAvailableScenarios([scen]);
      setCurrentScenarioId(scen.id);
      setCurrentItems(items);
      const item = items[Math.floor(Math.random() * items.length)];
      const pos = positions[Math.floor(Math.random() * positions.length)];
      setHiddenSpot({ itemId: item.id, position: pos, itemName: item.name, scenarioId: scen.id });
    } else if (chapter === 2) {
      const shuffled = [...scenarios].sort(() => Math.random() - 0.5).slice(0, 3);
      setAvailableScenarios(shuffled);
      const startScen = shuffled[0];
      const items = await getItemsByScenario(startScen.id);
      setCurrentScenarioId(startScen.id);
      setCurrentItems(items);
      const hideScen = shuffled[Math.floor(Math.random() * (shuffled.length - 1)) + 1] || shuffled[0];
      const hideItems = await getItemsByScenario(hideScen.id);
      const item = hideItems[Math.floor(Math.random() * hideItems.length)];
      const pos = positions[Math.floor(Math.random() * positions.length)];
      setHiddenSpot({ itemId: item.id, position: pos, itemName: item.name, scenarioId: hideScen.id });
    } else {
      setAvailableScenarios(scenarios);
      const startScen = scenarios[Math.floor(Math.random() * scenarios.length)];
      const items = await getItemsByScenario(startScen.id);
      setCurrentScenarioId(startScen.id);
      setCurrentItems(items);
      const hideScen = scenarios[Math.floor(Math.random() * scenarios.length)];
      const hideItems = await getItemsByScenario(hideScen.id);
      const item = hideItems[Math.floor(Math.random() * hideItems.length)];
      const pos = positions[Math.floor(Math.random() * positions.length)];
      setHiddenSpot({ itemId: item.id, position: pos, itemName: item.name, scenarioId: hideScen.id });
    }
    setPhase("playing");
  };

  const handleMove = async (scenarioId: string) => {
    const items = await getItemsByScenario(scenarioId);
    setCurrentScenarioId(scenarioId);
    setCurrentItems(items);
    setMovesUsed(m => m + 1);
  };

  const handleLook = (itemId: string, position: string) => {
    setMovesUsed(m => m + 1);
    if (hiddenSpot && hiddenSpot.itemId === itemId && hiddenSpot.position === position && hiddenSpot.scenarioId === currentScenarioId) {
      handleFound();
    } else {
      if (hiddenSpot?.scenarioId === currentScenarioId) {
        if (hiddenSpot?.itemId === itemId) {
          toast.info("🔥 Molt calent! Prova una altra posició!");
        } else {
          toast.info("🌡️ Calent! Estàs a l'habitació correcta!");
        }
      } else {
        toast.info("❄️ Fred! No és en aquesta habitació.");
      }
    }
  };

  const handleFound = async () => {
    if (!user) return;
    const result = await completeChapter(user.id, activeChapter, movesUsed + 1);
    setXpEarned(result.xp);
    setPetDied(result.isDead);

    // Chapter 3+: award accessory if not yet owned, otherwise consumable
    if (activeChapter >= 3) {
      const accIdx = activeChapter - 3;
      if (accIdx < PET_ACCESSORIES.length) {
        const acc = PET_ACCESSORIES[accIdx];
        const alreadyOwned = accessories.some(a => a.accessory_name === acc.name);
        if (!alreadyOwned) {
          await awardAccessory(user.id, acc.name, acc.icon);
        }
      }
      // If all accessories collected, show random consumable
      if (allAccsCollected || accIdx >= PET_ACCESSORIES.length) {
        const consumable = PET_CONSUMABLES[Math.floor(Math.random() * PET_CONSUMABLES.length)];
        setWonConsumable(consumable);
      }
    }

    setChapterDone(true);
    toast.success(`🎉 Trobat! +${result.xp} XP`);
  };

  const backToHub = async () => {
    await loadData();
  };

  // ====== PET EVOLUTION DISPLAY ======
  const evolution = pet ? getPetEvolution(pet.xp ?? 0) : null;

  // ====== RENDER ======
  if (phase === "loading") return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <p className="text-muted-foreground text-sm animate-pulse">Carregant...</p>
    </div>
  );

  // PET DEAD
  if (phase === "dead") return (
    <div className="min-h-screen bg-background p-6 max-w-md mx-auto flex flex-col items-center justify-center">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[500px] h-[250px] rounded-full bg-muted/10 blur-[100px] pointer-events-none" />
      <div className="text-center relative z-10 animate-fade-in">
        <div className="text-7xl mb-4 opacity-50">{pet?.pet_icon}</div>
        <h2 className="text-2xl font-bold mb-2">{pet?.pet_name} ha viscut una vida plena</h2>
        <p className="text-sm text-muted-foreground mb-2">
          Ha arribat a {MAX_PET_XP} XP — el màxim possible.
        </p>
        <p className="text-xs text-muted-foreground mb-6">
          Gràcies per cuidar-{pet?.pet_type === "cat" ? "lo" : "lo"}. Ara pots adoptar una nova mascota!
        </p>
        <Button onClick={handleRebirth} size="lg" className="w-full max-w-xs">
          🥚 Nova mascota
        </Button>
        <Button variant="ghost" onClick={() => navigate("/")} className="w-full max-w-xs mt-2">
          ← Lobby
        </Button>
      </div>
    </div>
  );

  // INTRO
  if (phase === "intro") return (
    <div className="min-h-screen bg-background p-6 max-w-md mx-auto flex flex-col items-center justify-center">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[500px] h-[250px] rounded-full bg-accent/5 blur-[100px] pointer-events-none" />
      {introStep === 0 && (
        <div className="text-center relative z-10">
          <TypewriterText
            text={`Hola ${user?.email?.split("@")[0] ?? "aventurer"}! Aquest regal 🎁 és per tu...`}
            speed={75}
            onComplete={() => setTimeout(() => setIntroStep(1), 1200)}
            className="text-lg font-medium mb-6"
          />
        </div>
      )}
      {introStep >= 1 && !giftOpened && (
        <div className="text-center relative z-10 animate-fade-in">
          <button onClick={handleOpenGift}
            className="text-8xl hover:scale-110 transition-transform active:scale-95 animate-pulse cursor-pointer">
            🎁
          </button>
          <p className="text-sm text-muted-foreground mt-4">Toca per obrir!</p>
        </div>
      )}
      {giftOpened && (
        <div className="text-center relative z-10 animate-scale-in">
          <div className="text-8xl mb-4">{randomPet.icon}</div>
          <p className="text-lg font-bold">Un {randomPet.name}!</p>
        </div>
      )}
    </div>
  );

  // HUB
  if (phase === "hub") {
    const totalChapters = 2 + PET_ACCESSORIES.length;
    const completedCount = progress.filter(p => p.status === "completed").length;

    return (
      <div className="min-h-screen bg-background p-4 max-w-md mx-auto pb-20 relative">
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[500px] h-[250px] rounded-full bg-accent/5 blur-[100px] pointer-events-none" />

        <button onClick={() => navigate("/")} className="text-sm text-muted-foreground hover:text-primary mb-5 block transition-colors relative z-10">
          ← Lobby
        </button>

        {/* Pet info with evolution */}
        {pet && evolution && (
          <div className="text-center mb-6 relative z-10">
            <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br ${evolution.glow} ring-2 ${evolution.ring} mb-2`}>
              <span className="text-6xl">{pet.pet_icon}</span>
            </div>
            <h1 className="text-xl font-bold">{pet.pet_name}</h1>
            <p className="text-xs text-muted-foreground">
              {evolution.badge} {evolution.label}
              {evolution.nextTier && (
                <span className="ml-1">→ {evolution.nextTier.badge} {evolution.nextTier.label} ({evolution.nextTier.minXp} XP)</span>
              )}
            </p>
            <div className="w-48 mx-auto mt-2">
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="h-2 rounded-full bg-accent transition-all duration-500"
                  style={{ width: `${Math.min(((pet.xp ?? 0) / MAX_PET_XP) * 100, 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-accent font-semibold mt-1">⭐ {pet.xp ?? 0} / {MAX_PET_XP} XP</p>
            </div>
            {accessories.length > 0 && (
              <div className="flex justify-center gap-1.5 mt-2">
                {accessories.map((a: any) => (
                  <span key={a.id} className="text-xl" title={a.accessory_name}>{a.accessory_icon}</span>
                ))}
              </div>
            )}
            {allAccsCollected && (
              <p className="text-[10px] text-green-500 mt-1">✅ Tots els accesoris! Ara guanyes consumibles + XP</p>
            )}
          </div>
        )}

        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 relative z-10">
          📖 Capítols ({completedCount}/{totalChapters})
        </h2>

        <div className="space-y-2 relative z-10">
          {renderChapterCard(1, `Troba ${pet?.pet_name ?? "la mascota"}!`,
            "Aprèn a observar i confirmar en una sola habitació.",
            progress.find(p => p.chapter === 1))}

          {renderChapterCard(2, `${pet?.pet_name ?? "La mascota"} s'ha escapat!`,
            "Aprèn a moure't entre 3 habitacions per trobar-la.",
            progress.find(p => p.chapter === 2))}

          {PET_ACCESSORIES.map((acc, i) => {
            const ch = 3 + i;
            const chProg = progress.find(p => p.chapter === ch);
            const alreadyOwned = accessories.some(a => a.accessory_name === acc.name);
            const desc = alreadyOwned
              ? `${acc.icon} ${acc.name} ✅ — Repeteix per guanyar XP${allAccsCollected ? " + consumibles" : ""}!`
              : `Partida vs CPU. Guanya ${acc.icon} ${acc.name} per ${pet?.pet_name ?? "la mascota"}!`;
            return renderChapterCard(ch, `${acc.icon} Accessori: ${acc.name}`, desc, chProg);
          })}
        </div>
      </div>
    );
  }

  function renderChapterCard(chapter: number, title: string, desc: string, prog: any) {
    const isCompleted = prog?.status === "completed";
    const isLocked = !prog || prog.status === "locked";
    const canStart = chapter === 1 || !isLocked;

    return (
      <Card key={chapter} className={`glass transition-all ${isCompleted ? "border-green-500/30" : isLocked ? "opacity-50" : "border-primary/30"}`}>
        <CardContent className="py-3">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold flex items-center gap-1.5">
                {isCompleted ? "✅" : isLocked ? "🔒" : "📖"} {title}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{desc}</p>
              {isCompleted && prog.best_moves && (
                <p className="text-[10px] text-green-500 mt-0.5">Millor: {prog.best_moves} moviments</p>
              )}
            </div>
            {canStart && (
              <Button size="sm" variant={isCompleted ? "outline" : "default"}
                onClick={() => startChapter(chapter)}
                className="shrink-0 ml-2">
                {isCompleted ? "Repetir" : "Jugar"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // PLAYING
  if (phase === "playing") {
    const currentScen = availableScenarios.find(s => s.id === currentScenarioId);
    const positions = [
      { value: "sobre", label: "Sobre", icon: "⬆️" },
      { value: "sota", label: "Sota", icon: "⬇️" },
      { value: "dins", label: "Dins", icon: "📦" },
    ];

    if (chapterDone) {
      const accIdx = activeChapter - 3;
      const wonNewAcc = accIdx >= 0 && accIdx < PET_ACCESSORIES.length && !accessories.some(a => a.accessory_name === PET_ACCESSORIES[accIdx]?.name)
        ? PET_ACCESSORIES[accIdx] : null;
      return (
        <div className="min-h-screen bg-background p-6 max-w-md mx-auto flex flex-col items-center justify-center">
          <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[500px] h-[250px] rounded-full bg-green-500/10 blur-[100px] pointer-events-none" />
          <div className="text-center relative z-10 animate-scale-in">
            <div className="text-6xl mb-4">{petDied ? "💫" : "🎉"}</div>
            <h2 className="text-2xl font-bold mb-2">
              {petDied ? `${pet?.pet_name} ha arribat al màxim!` : `Capítol ${activeChapter} completat!`}
            </h2>
            <p className="text-lg text-accent font-bold mb-1">+{xpEarned} XP ⭐</p>
            <p className="text-sm text-muted-foreground mb-2">Moviments: {movesUsed + 1}</p>
            {wonNewAcc && (
              <p className="text-lg font-bold text-primary mb-2">
                Nou accessori: {wonNewAcc.icon} {wonNewAcc.name}!
              </p>
            )}
            {wonConsumable && (
              <p className="text-sm font-medium text-green-500 mb-2">
                {wonConsumable.icon} {wonConsumable.name} per {pet?.pet_name}!
              </p>
            )}
            {petDied && (
              <p className="text-sm text-muted-foreground mb-2">
                Ha viscut una vida plena. Podràs adoptar una nova mascota.
              </p>
            )}
            <Button onClick={backToHub} size="lg" className="w-full max-w-xs">
              {petDied ? "🥚 Continuar" : "Tornar al menú 📖"}
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-background p-4 max-w-md mx-auto pb-20 relative">
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[500px] h-[250px] rounded-full bg-accent/5 blur-[100px] pointer-events-none" />

        <div className="flex items-center justify-between mb-4 relative z-10">
          <button onClick={backToHub} className="text-sm text-muted-foreground hover:text-primary transition-colors">
            ← Sortir
          </button>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Capítol {activeChapter}</p>
            <p className="text-sm font-bold">{movesUsed} moviments</p>
          </div>
        </div>

        <Card className="mb-4 glass border-accent/30 relative z-10">
          <CardContent className="py-3 text-center">
            {activeChapter === 1 && (
              <p className="text-sm">
                {pet?.pet_icon} <strong>{pet?.pet_name}</strong> s'amaga en aquesta habitació. Observa els mobles per trobar-lo!
              </p>
            )}
            {activeChapter === 2 && (
              <p className="text-sm">
                {pet?.pet_icon} <strong>{pet?.pet_name}</strong> s'ha escapat! Mou-te entre habitacions i observa per trobar-lo!
              </p>
            )}
            {activeChapter >= 3 && (
              <p className="text-sm">
                🎯 Busca {allAccsCollected ? "provisions" : `l'accessori ${PET_ACCESSORIES[activeChapter - 3]?.icon ?? ""}`} per {pet?.pet_name}!
              </p>
            )}
          </CardContent>
        </Card>

        <div className="mb-3 relative z-10">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            {currentScen?.icon} {currentScen?.name}
          </h2>
        </div>

        {activeChapter >= 2 && availableScenarios.length > 1 && (
          <div className="flex gap-2 mb-4 overflow-x-auto relative z-10">
            {availableScenarios.filter(s => s.id !== currentScenarioId).map(s => (
              <Button key={s.id} variant="outline" size="sm" onClick={() => handleMove(s.id)}
                className="shrink-0">
                {s.icon} {s.name}
              </Button>
            ))}
          </div>
        )}

        <div className="space-y-2 relative z-10">
          {currentItems.filter(i => !i.hidden).map((item: any) => (
            <Card key={item.id} className="glass">
              <CardContent className="py-3">
                <p className="text-sm font-semibold mb-2">{item.icon} {item.name}</p>
                <div className="flex gap-2">
                  {positions.map(pos => (
                    <Button key={pos.value} size="sm" variant="outline"
                      className="flex-1 text-xs"
                      onClick={() => handleLook(item.id, pos.value)}>
                      {pos.icon} {pos.label}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return null;
}
