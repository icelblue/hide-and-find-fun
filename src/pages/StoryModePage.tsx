// ============================================================
// StoryModePage.tsx — Mode Història (single-player tutorial)
// ============================================================
// Hub de capítols + adopció de mascota.
// Les partides es juguen al motor real (GamePage) amb CPU random.
// ============================================================

import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { TypewriterText } from "@/components/TypewriterText";
import { PetHealthBadge } from "@/components/PetHealthBadge";
import {
  PET_OPTIONS, PET_ACCESSORIES, PET_CONSUMABLES, MAX_PET_XP,
  getPetEvolution, hasAllAccessories,
  getMyPet, createPet, getStoryProgress, initChapter,
  getMyAccessories, resetPetAndProgress, getActiveEvents, useConsumable,
} from "@/lib/story-helpers";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type StoryPhase = "loading" | "intro" | "hub" | "dead";

export default function StoryModePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<StoryPhase>("loading");
  const [pet, setPet] = useState<any>(null);
  const [progress, setProgress] = useState<any[]>([]);
  const [accessories, setAccessories] = useState<any[]>([]);
  const [activeEvents, setActiveEvents] = useState<any[]>([]);
  const [consumables, setConsumables] = useState<any[]>([]);
  const [playerName, setPlayerName] = useState("aventurer");

  // Intro animation states
  const [randomPet, setRandomPet] = useState<{ type: string; icon: string; name: string }>(PET_OPTIONS[0]);
  const [introStep, setIntroStep] = useState(0);
  const [giftOpened, setGiftOpened] = useState(false);
  const [petNameInput, setPetNameInput] = useState("");
  const [namingPet, setNamingPet] = useState(false);
  const [startingChapter, setStartingChapter] = useState(false);

  const allAccsCollected = useMemo(() => hasAllAccessories(accessories), [accessories]);

  const loadData = useCallback(async () => {
    if (!user) return;
    const [petData, prog, accs, profileRes, events, consumablesRes] = await Promise.all([
      getMyPet(user.id),
      getStoryProgress(user.id),
      getMyAccessories(user.id),
      supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle(),
      getActiveEvents(user.id),
      supabase.from("pet_consumables").select("*").eq("user_id", user.id).is("used_at", null).order("obtained_at"),
    ]);
    setPet(petData);
    setProgress(prog);
    setAccessories(accs);
    setActiveEvents(events);
    setConsumables(consumablesRes.data ?? []);
    if (profileRes.data?.display_name) setPlayerName(profileRes.data.display_name);

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
  const handleOpenGift = () => {
    setGiftOpened(true);
  };

  const handleConfirmPetName = async () => {
    if (!user) return;
    const trimmed = petNameInput.trim();
    if (!trimmed || trimmed.length > 20) {
      toast.error("El nom ha de tenir entre 1 i 20 caràcters");
      return;
    }
    setNamingPet(true);
    try {
      const p = await createPet(user.id, randomPet.type, trimmed, randomPet.icon);
      setPet(p);
      await initChapter(user.id, 1);
      const prog = await getStoryProgress(user.id);
      setProgress(prog);
      setPhase("hub");
      toast.success(`${randomPet.icon} ${trimmed} és el teu company!`);
    } catch (err: any) { toast.error(err.message); }
    finally { setNamingPet(false); }
  };

  // ====== PET DEATH → REBIRTH ======
  const handleRebirth = async () => {
    if (!user) return;
    try {
      await resetPetAndProgress(user.id);
      const rp = PET_OPTIONS[Math.floor(Math.random() * PET_OPTIONS.length)];
      setRandomPet(rp);
      // Skip typewriter for returning players — go straight to gift
      setIntroStep(1);
      setGiftOpened(false);
      setPhase("intro");
      toast("La teva mascota ha viscut una vida plena 💫");
    } catch (err: any) { toast.error(err.message); }
  };

  // ====== START CHAPTER → CREATE REAL GAME → NAVIGATE ======
  const startChapter = async (chapter: number) => {
    if (!user || startingChapter) return;
    setStartingChapter(true);
    try {
      await initChapter(user.id, chapter);
      const { data: gameId, error } = await supabase.rpc("create_story_game", {
        _user_id: user.id,
        _chapter: chapter,
      });
      if (error) throw error;
      if (!gameId) throw new Error("No s'ha pogut crear la partida");
      navigate(`/game/${gameId}`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setStartingChapter(false);
    }
  };

  // ====== PET EVOLUTION DISPLAY ======
  const evolution = pet ? getPetEvolution(pet.xp ?? 0, pet.max_xp) : null;

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
        <div className="text-7xl mb-4">🪦</div>
        <p className="text-sm text-muted-foreground mb-1">{pet?.pet_icon}</p>
        <h2 className="text-2xl font-bold mb-2">{pet?.pet_name} ha viscut una vida plena</h2>
        <p className="text-sm text-muted-foreground mb-2">
          Ha arribat a {MAX_PET_XP} XP — el màxim possible.
        </p>
        <p className="text-xs text-muted-foreground mb-6">
          Descansa en pau, petit amic. Ara pots adoptar una nova mascota!
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
            text={`Hola ${playerName}! Aquest regal 🎁 és per tu...`}
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
        <div className="text-center relative z-10 animate-scale-in w-full max-w-xs">
          <div className="text-8xl mb-3">{randomPet.icon}</div>
          <p className="text-lg font-bold mb-4">Un {randomPet.name}!</p>
          <p className="text-sm text-muted-foreground mb-2">Com el vols dir?</p>
          <Input
            value={petNameInput}
            onChange={(e) => setPetNameInput(e.target.value)}
            placeholder="Nom de la mascota"
            maxLength={20}
            className="text-center mb-3"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleConfirmPetName()}
          />
          <Button onClick={handleConfirmPetName} disabled={namingPet || !petNameInput.trim()} className="w-full">
            {namingPet ? "..." : `Adoptar ${randomPet.icon}`}
          </Button>
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
                  style={{ width: `${Math.min(((pet.xp ?? 0) / (pet.max_xp ?? MAX_PET_XP)) * 100, 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-accent font-semibold mt-1">⭐ {pet.xp ?? 0} / {pet.max_xp ?? MAX_PET_XP} XP</p>
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

        {/* Active health events alert */}
        {activeEvents.length > 0 && (
          <div className="mb-4 relative z-10">
            <PetHealthBadge activeEvents={activeEvents} petName={pet?.pet_name} />
          </div>
        )}

        {/* Consumables section */}
        {consumables.length > 0 && (
          <Card className="mb-4 glass border-accent/30 relative z-10">
            <CardContent className="py-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">💊 Consumibles</p>
              <div className="flex gap-2 flex-wrap">
                {PET_CONSUMABLES.map(c => {
                  const count = consumables.filter((x: any) => x.consumable_name === c.name).length;
                  if (count === 0) return null;
                  const matchingEvent = activeEvents.find((e: any) => e.event_type === c.curesEvent);
                  const cureLabel = { caiguda: "🤕 Caiguda", febre: "🫠 Febre", virus: "🤒 Virus" }[c.curesEvent] ?? "";
                  return (
                    <button
                      key={c.name}
                      onClick={async () => {
                        if (!user) return;
                        try {
                          const result = await useConsumable(user.id, c.name);
                          if (result.didCureEvent) {
                            toast.success(`${c.icon} ${c.name} usat! Ha curat ${cureLabel}! -${c.xpHeal} XP`);
                          } else if (activeEvents.length > 0) {
                            toast(`${c.icon} ${c.name} usat! -${c.xpHeal} XP, però no cura ${activeEvents[0].event_icon} ${activeEvents[0].event_name}. Necessites ${cureLabel.split(" ")[0]} per curar-ho!`);
                          } else {
                            toast.success(`${c.icon} ${c.name} usat! -${c.xpHeal} XP → ${result.newXp} XP`);
                          }
                          loadData();
                        } catch (err: any) { toast.error(err.message); }
                      }}
                      className={`flex items-center gap-1.5 rounded-xl px-3 py-2 border transition-all active:scale-95 ${matchingEvent ? "bg-accent/15 border-accent/40 ring-1 ring-accent/30" : "bg-muted/50 border-border/30 hover:bg-accent/10"}`}
                    >
                      <span className="text-lg">{c.icon}</span>
                      <div className="text-left">
                        <span className="text-xs font-semibold">{c.name} ×{count}</span>
                        <p className="text-[9px] text-muted-foreground">Cura {cureLabel}</p>
                        {matchingEvent && <p className="text-[9px] text-accent font-bold">✨ Recomanat!</p>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex items-center justify-between mb-3 relative z-10">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            📖 Capítols ({completedCount}/{totalChapters})
          </h2>
          <Button variant="ghost" size="sm" className="text-[10px] text-destructive hover:text-destructive h-6 px-2"
            onClick={async () => {
              if (!user) return;
              if (!confirm("Segur que vols reiniciar el Mode Història? Perdràs mascota, progrés i accesoris.")) return;
              try {
                await resetPetAndProgress(user.id);
                toast("Mode Història reiniciat 🔄");
                loadData();
              } catch (e: any) { toast.error(e.message); }
            }}>
            🔄 Reiniciar
          </Button>
        </div>

        <div className="space-y-2 relative z-10">
          {renderChapterCard(1, `Troba ${pet?.pet_name ?? "la mascota"}!`,
            "Aprèn a observar i confirmar en una sola habitació.",
            progress.find(p => p.chapter === 1))}

          {renderChapterCard(2, `${pet?.pet_name ?? "La mascota"} s'ha escapat!`,
            "Aprèn a moure't entre habitacions per trobar-la.",
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
                disabled={startingChapter}
                className="shrink-0 ml-2">
                {startingChapter ? "..." : isCompleted ? "Repetir" : "Jugar"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}
