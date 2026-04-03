// ============================================================
// StoryModePage.tsx — Mode Història (single-player tutorial)
// ============================================================
// Capítols progressius per aprendre a jugar:
//   1. Adopta mascota + troba-la en 1 escenari
//   2. Mascota s'escapa → 3 escenaris (aprèn a moure's)
//   3+ Partides vs CPU per accesoris de mascota
// ============================================================

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { TypewriterText } from "@/components/TypewriterText";
import {
  PET_OPTIONS, PET_ACCESSORIES,
  getMyPet, createPet, getStoryProgress, initChapter, completeChapter,
  getMyAccessories, awardAccessory, cpuChooseHidingSpot, calculateXP,
} from "@/lib/story-helpers";
import { getScenarios, getItemsByScenario, getObjects } from "@/lib/supabase-helpers";
import { toast } from "sonner";

type StoryPhase = "loading" | "intro" | "gift" | "naming" | "hub" | "playing";

export default function StoryModePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<StoryPhase>("loading");
  const [pet, setPet] = useState<any>(null);
  const [progress, setProgress] = useState<any[]>([]);
  const [accessories, setAccessories] = useState<any[]>([]);

  // Intro animation states
  const [randomPet, setRandomPet] = useState<{ type: string; icon: string; name: string }>(PET_OPTIONS[0]);
  const [petName, setPetName] = useState("");
  const [introStep, setIntroStep] = useState(0);
  const [giftOpened, setGiftOpened] = useState(false);

  // Chapter play states
  const [activeChapter, setActiveChapter] = useState(0);
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [allObjects, setAllObjects] = useState<any[]>([]);
  const [currentScenarioId, setCurrentScenarioId] = useState("");
  const [currentItems, setCurrentItems] = useState<any[]>([]);
  const [availableScenarios, setAvailableScenarios] = useState<any[]>([]);
  const [hiddenSpot, setHiddenSpot] = useState<any>(null);
  const [movesUsed, setMovesUsed] = useState(0);
  const [chapterDone, setChapterDone] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);

  const loadData = useCallback(async () => {
    if (!user) return;
    const [petData, prog, accs, scen, objs] = await Promise.all([
      getMyPet(user.id),
      getStoryProgress(user.id),
      getMyAccessories(user.id),
      getScenarios(),
      getObjects(),
    ]);
    setPet(petData);
    setProgress(prog);
    setAccessories(accs);
    setScenarios(scen);
    setAllObjects(objs);

    if (!petData) {
      // New player — show intro
      const rp = PET_OPTIONS[Math.floor(Math.random() * PET_OPTIONS.length)];
      setRandomPet(rp);
      setPhase("intro");
    } else {
      setPhase("hub");
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  // ====== INTRO FLOW ======
  const handleOpenGift = () => {
    setGiftOpened(true);
    setTimeout(() => setPhase("naming"), 1500);
  };

  const handleCreatePet = async () => {
    if (!user || !petName.trim()) return;
    try {
      const p = await createPet(user.id, randomPet.type, petName.trim(), randomPet.icon);
      setPet(p);
      // Init chapter 1
      await initChapter(user.id, 1);
      const prog = await getStoryProgress(user.id);
      setProgress(prog);
      setPhase("hub");
      toast.success(`${randomPet.icon} ${petName.trim()} és el teu company!`);
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

    if (chapter === 1) {
      // Single random scenario
      const scen = scenarios[Math.floor(Math.random() * scenarios.length)];
      const items = await getItemsByScenario(scen.id);
      setAvailableScenarios([scen]);
      setCurrentScenarioId(scen.id);
      setCurrentItems(items);
      // CPU hides pet in this scenario
      const positions = ["sobre", "sota", "dins"] as const;
      const item = items[Math.floor(Math.random() * items.length)];
      const pos = positions[Math.floor(Math.random() * positions.length)];
      setHiddenSpot({ itemId: item.id, position: pos, itemName: item.name, scenarioId: scen.id });
    } else if (chapter === 2) {
      // 3 random scenarios
      const shuffled = [...scenarios].sort(() => Math.random() - 0.5).slice(0, 3);
      setAvailableScenarios(shuffled);
      const startScen = shuffled[0];
      const items = await getItemsByScenario(startScen.id);
      setCurrentScenarioId(startScen.id);
      setCurrentItems(items);
      // Hide in random scenario (not the starting one)
      const hideScen = shuffled[Math.floor(Math.random() * (shuffled.length - 1)) + 1] || shuffled[0];
      const hideItems = await getItemsByScenario(hideScen.id);
      const positions = ["sobre", "sota", "dins"] as const;
      const item = hideItems[Math.floor(Math.random() * hideItems.length)];
      const pos = positions[Math.floor(Math.random() * positions.length)];
      setHiddenSpot({ itemId: item.id, position: pos, itemName: item.name, scenarioId: hideScen.id });
    } else {
      // Chapter 3+: full game vs CPU
      setAvailableScenarios(scenarios);
      const startScen = scenarios[Math.floor(Math.random() * scenarios.length)];
      const items = await getItemsByScenario(startScen.id);
      setCurrentScenarioId(startScen.id);
      setCurrentItems(items);
      // CPU hides in random scenario
      const hideScen = scenarios[Math.floor(Math.random() * scenarios.length)];
      const hideItems = await getItemsByScenario(hideScen.id);
      const positions = ["sobre", "sota", "dins"] as const;
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
    // Check if found
    if (hiddenSpot && hiddenSpot.itemId === itemId && hiddenSpot.position === position && hiddenSpot.scenarioId === currentScenarioId) {
      handleFound();
    } else {
      // Hint: same scenario?
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
    const xp = await completeChapter(user.id, activeChapter, movesUsed + 1);
    setXpEarned(xp);

    // Chapter 3+ gives accessory
    if (activeChapter >= 3) {
      const accIdx = activeChapter - 3;
      if (accIdx < PET_ACCESSORIES.length) {
        const acc = PET_ACCESSORIES[accIdx];
        await awardAccessory(user.id, acc.name, acc.icon);
      }
    }

    setChapterDone(true);
    toast.success(`🎉 Trobat! +${xp} XP`);
  };

  const backToHub = async () => {
    await loadData();
    setPhase("hub");
  };

  // ====== RENDER ======
  if (phase === "loading") return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <p className="text-muted-foreground text-sm animate-pulse">Carregant...</p>
    </div>
  );

  // INTRO: typewriter welcome
  if (phase === "intro") return (
    <div className="min-h-screen bg-background p-6 max-w-md mx-auto flex flex-col items-center justify-center">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[500px] h-[250px] rounded-full bg-accent/5 blur-[100px] pointer-events-none" />
      {introStep === 0 && (
        <div className="text-center relative z-10">
          <TypewriterText
            text={`Hola ${user?.email?.split("@")[0] ?? "aventurer"}! Aquest regal 🎁 és per tu...`}
            speed={45}
            onComplete={() => setTimeout(() => setIntroStep(1), 800)}
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

  // NAMING
  if (phase === "naming") return (
    <div className="min-h-screen bg-background p-6 max-w-md mx-auto flex flex-col items-center justify-center">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[500px] h-[250px] rounded-full bg-accent/5 blur-[100px] pointer-events-none" />
      <div className="text-center relative z-10 w-full max-w-xs">
        <div className="text-7xl mb-4">{randomPet.icon}</div>
        <TypewriterText
          text="Aquest és el teu company en aquesta aventura. Posa-li nom!"
          speed={35}
          className="text-sm text-muted-foreground mb-6"
        />
        <Input
          value={petName}
          onChange={e => setPetName(e.target.value.slice(0, 20))}
          placeholder="Nom de la mascota..."
          maxLength={20}
          className="text-center text-lg font-bold mb-4"
          autoFocus
        />
        <Button onClick={handleCreatePet} disabled={!petName.trim()} className="w-full" size="lg">
          Confirmar ✨
        </Button>
      </div>
    </div>
  );

  // HUB: chapter selection
  if (phase === "hub") {
    const totalAccessories = PET_ACCESSORIES.length;
    const totalChapters = 2 + totalAccessories;
    const completedCount = progress.filter(p => p.status === "completed").length;

    return (
      <div className="min-h-screen bg-background p-4 max-w-md mx-auto pb-20 relative">
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[500px] h-[250px] rounded-full bg-accent/5 blur-[100px] pointer-events-none" />

        <button onClick={() => navigate("/")} className="text-sm text-muted-foreground hover:text-primary mb-5 block transition-colors relative z-10">
          ← Lobby
        </button>

        {/* Pet info */}
        {pet && (
          <div className="text-center mb-6 relative z-10">
            <div className="text-6xl mb-2">{pet.pet_icon}</div>
            <h1 className="text-xl font-bold">{pet.pet_name}</h1>
            <p className="text-sm text-accent font-semibold">⭐ {pet.xp ?? 0} XP</p>
            {accessories.length > 0 && (
              <div className="flex justify-center gap-1.5 mt-2">
                {accessories.map((a: any) => (
                  <span key={a.id} className="text-xl" title={a.accessory_name}>{a.accessory_icon}</span>
                ))}
              </div>
            )}
          </div>
        )}

        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 relative z-10">
          📖 Capítols ({completedCount}/{totalChapters})
        </h2>

        <div className="space-y-2 relative z-10">
          {/* Chapter 1 */}
          {renderChapterCard(1, `Troba ${pet?.pet_name ?? "la mascota"}!`,
            "Aprèn a observar i confirmar en una sola habitació.",
            progress.find(p => p.chapter === 1))}

          {/* Chapter 2 */}
          {renderChapterCard(2, `${pet?.pet_name ?? "La mascota"} s'ha escapat!`,
            "Aprèn a moure't entre 3 habitacions per trobar-la.",
            progress.find(p => p.chapter === 2))}

          {/* Chapters 3+: accessories */}
          {PET_ACCESSORIES.map((acc, i) => {
            const ch = 3 + i;
            return renderChapterCard(ch, `${acc.icon} Accessori: ${acc.name}`,
              `Partida completa vs CPU. Guanya ${acc.icon} ${acc.name} per ${pet?.pet_name ?? "la mascota"}!`,
              progress.find(p => p.chapter === ch));
          })}
        </div>
      </div>
    );
  }

  function renderChapterCard(chapter: number, title: string, desc: string, prog: any) {
    const isCompleted = prog?.status === "completed";
    const isActive = prog?.status === "active";
    const isLocked = !prog || prog.status === "locked";
    // Chapter 1 is always unlocked
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

  // PLAYING: simplified game
  if (phase === "playing") {
    const currentScen = availableScenarios.find(s => s.id === currentScenarioId);
    const positions = [
      { value: "sobre", label: "Sobre", icon: "⬆️" },
      { value: "sota", label: "Sota", icon: "⬇️" },
      { value: "dins", label: "Dins", icon: "📦" },
    ];

    if (chapterDone) {
      const accIdx = activeChapter - 3;
      const wonAcc = accIdx >= 0 && accIdx < PET_ACCESSORIES.length ? PET_ACCESSORIES[accIdx] : null;
      return (
        <div className="min-h-screen bg-background p-6 max-w-md mx-auto flex flex-col items-center justify-center">
          <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[500px] h-[250px] rounded-full bg-green-500/10 blur-[100px] pointer-events-none" />
          <div className="text-center relative z-10 animate-scale-in">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold mb-2">Capítol {activeChapter} completat!</h2>
            <p className="text-lg text-accent font-bold mb-1">+{xpEarned} XP ⭐</p>
            <p className="text-sm text-muted-foreground mb-2">Moviments: {movesUsed + 1}</p>
            {wonAcc && (
              <p className="text-lg font-bold text-primary mb-4">
                Nou accessori: {wonAcc.icon} {wonAcc.name}!
              </p>
            )}
            <Button onClick={backToHub} size="lg" className="w-full max-w-xs">
              Tornar al menú 📖
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-background p-4 max-w-md mx-auto pb-20 relative">
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[500px] h-[250px] rounded-full bg-accent/5 blur-[100px] pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between mb-4 relative z-10">
          <button onClick={backToHub} className="text-sm text-muted-foreground hover:text-primary transition-colors">
            ← Sortir
          </button>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Capítol {activeChapter}</p>
            <p className="text-sm font-bold">{movesUsed} moviments</p>
          </div>
        </div>

        {/* Story hint */}
        <Card className="mb-4 glass border-accent/30 relative z-10">
          <CardContent className="py-3 text-center">
            {activeChapter === 1 && (
              <p className="text-sm">
                {pet?.pet_icon} <strong>{pet?.pet_name}</strong> s'amaga en aquesta habitació. Observa els mobles per trobar-{pet?.pet_type === "cat" ? "lo" : "lo"}!
              </p>
            )}
            {activeChapter === 2 && (
              <p className="text-sm">
                {pet?.pet_icon} <strong>{pet?.pet_name}</strong> s'ha escapat! Mou-te entre habitacions i observa per trobar-lo!
              </p>
            )}
            {activeChapter >= 3 && (
              <p className="text-sm">
                🎯 Busca l'accessori {PET_ACCESSORIES[activeChapter - 3]?.icon} <strong>{PET_ACCESSORIES[activeChapter - 3]?.name}</strong> per {pet?.pet_name}!
              </p>
            )}
          </CardContent>
        </Card>

        {/* Current scenario */}
        <div className="mb-3 relative z-10">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            {currentScen?.icon} {currentScen?.name}
          </h2>
        </div>

        {/* Move to other scenarios (chapters 2+) */}
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

        {/* Items grid */}
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
