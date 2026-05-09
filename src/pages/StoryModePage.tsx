// ============================================================
// StoryModePage.tsx — Mode Història v3 (aventura ramificada)
// ============================================================
// 🔒 CRITICAL: Aquest fitxer és INDEPENDENT del PvP.
// No toca cap RPC ni taula de partida real.
// ============================================================

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { TypewriterText } from "@/components/TypewriterText";
import {
  PET_OPTIONS, MAX_PET_XP, getMyPet, createPet, getPetEvolution,
} from "@/lib/story-helpers";
import {
  getActiveRun, startRun, getNode, getChoices, makeChoice, killAndReset,
  rewardToReveal,
  type StoryRun, type StoryNode, type StoryChoice, type RewardOutcome,
} from "@/lib/story-runs";
import { StoryNodeView } from "@/components/story/StoryNodeView";
import { StoryEndingScreen } from "@/components/story/StoryEndingScreen";
import { StoryDeathScreen } from "@/components/story/StoryDeathScreen";
import { RewardReveal, type RevealData } from "@/components/story/RewardReveal";
import { ChapterCompleteScreen } from "@/components/story/ChapterCompleteScreen";
import { DailyChallengeCard } from "@/components/story/DailyChallengeCard";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Phase = "loading" | "intro" | "ready" | "playing" | "chapter_break" | "ended";

export default function StoryModePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<Phase>("loading");
  const [pet, setPet] = useState<any>(null);
  const [run, setRun] = useState<StoryRun | null>(null);
  const [node, setNode] = useState<StoryNode | null>(null);
  const [choices, setChoices] = useState<StoryChoice[]>([]);
  const [busy, setBusy] = useState(false);
  const [playerName, setPlayerName] = useState("aventurer");

  // Adoption flow
  const [randomPet, setRandomPet] = useState(PET_OPTIONS[0]);
  const [introStep, setIntroStep] = useState(0);
  const [giftOpened, setGiftOpened] = useState(false);
  const [petNameInput, setPetNameInput] = useState("");
  const [namingPet, setNamingPet] = useState(false);

  // Last ending info (kept after run ends to show screen)
  const [endedNode, setEndedNode] = useState<StoryNode | null>(null);
  const [endedStatus, setEndedStatus] = useState<"dead" | "completed" | null>(null);
  const [endedPet, setEndedPet] = useState<{ name: string; icon: string } | null>(null);

  // Chapter break + reveal
  const [reveal, setReveal] = useState<RevealData | null>(null);
  const [chapterRewards, setChapterRewards] = useState<RewardOutcome[]>([]);
  const [pendingNext, setPendingNext] = useState<StoryNode | null>(null);
  const [completedChapter, setCompletedChapter] = useState<number>(1);

  const loadAll = useCallback(async () => {
    if (!user) return;
    setPhase("loading");
    const [petData, profileRes, runData] = await Promise.all([
      getMyPet(user.id),
      supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle(),
      getActiveRun(user.id),
    ]);
    if (profileRes.data?.display_name) setPlayerName(profileRes.data.display_name);
    setPet(petData);

    if (!petData) {
      const rp = PET_OPTIONS[Math.floor(Math.random() * PET_OPTIONS.length)] as any;
      setRandomPet(rp);
      setIntroStep(0);
      setGiftOpened(false);
      setPhase("intro");
      return;
    }

    if (runData && runData.current_node_id) {
      setRun(runData);
      const n = await getNode(runData.current_node_id);
      const c = await getChoices(runData.current_node_id);
      setNode(n);
      setChoices(c);
      setPhase("playing");
    } else {
      setPhase("ready");
    }
  }, [user]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ====== INTRO ======
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
      setPhase("ready");
      toast.success(`${randomPet.icon} ${trimmed} és el teu company!`);
    } catch (e: any) { toast.error(e.message); }
    finally { setNamingPet(false); }
  };

  // ====== START RUN ======
  const handleStartRun = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const r = await startRun(user.id);
      const n = await getNode(r.current_node_id!);
      const c = await getChoices(r.current_node_id!);
      setRun(r);
      setNode(n);
      setChoices(c);
      setPhase("playing");
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  // ====== CHOICE ======
  const handleChoose = async (choice: StoryChoice) => {
    if (!user || !run || !node) return;
    setBusy(true);
    try {
      const result = await makeChoice(user.id, run, choice);

      // Refresh pet (xp/max changed)
      const freshPet = await getMyPet(user.id);
      setPet(freshPet);

      // Always show reveal animation for the reward
      setReveal(rewardToReveal(result.reward));

      // Track rewards for current chapter
      setChapterRewards(prev => [...prev, result.reward]);

      if (result.runEnded) {
        setEndedNode(result.nextNode ?? node);
        setEndedStatus(result.runEnded);
        setEndedPet({ name: freshPet?.pet_name ?? pet?.pet_name ?? "?", icon: freshPet?.pet_icon ?? pet?.pet_icon ?? "🐾" });
        // Phase set after reveal closes (handled in onDone via pendingFinish)
        setPendingNext(null);
        // We'll switch phase when reveal closes
        return;
      }

      if (result.nextNode) {
        // Detect chapter change
        if (result.nextNode.chapter > node.chapter) {
          setCompletedChapter(node.chapter);
          setPendingNext(result.nextNode);
        } else {
          setPendingNext(result.nextNode);
        }
        // Refresh run
        const freshRun = await getActiveRun(user.id);
        if (freshRun) setRun(freshRun);
      }
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  // Called when RewardReveal animation finishes
  const handleRevealDone = async () => {
    setReveal(null);
    // If run ended, transition to ended
    if (endedStatus) {
      setPhase("ended");
      return;
    }
    if (!pendingNext || !node) return;
    // Chapter break?
    if (pendingNext.chapter > node.chapter) {
      setPhase("chapter_break");
      return;
    }
    // Same chapter, continue normally
    const newChoices = await getChoices(pendingNext.id);
    setNode(pendingNext);
    setChoices(newChoices);
    setPendingNext(null);
  };

  const handleContinueChapter = async () => {
    if (!pendingNext) return;
    setBusy(true);
    try {
      const newChoices = await getChoices(pendingNext.id);
      setNode(pendingNext);
      setChoices(newChoices);
      setPendingNext(null);
      setChapterRewards([]);
      setPhase("playing");
    } finally { setBusy(false); }
  };

  const handlePauseAdventure = () => {
    // Run is already auto-saved in BD; just go to lobby
    toast.success("✓ Aventura desada. Pots tornar quan vulguis.");
    navigate("/");
  };

  // ====== ENDING HANDLERS ======
  const handlePlayAgain = async () => {
    // Completed (non-death) → just start a new run
    await handleStartRun();
    setEndedNode(null); setEndedStatus(null); setEndedPet(null);
  };

  const handleAdoptAfterDeath = async () => {
    if (!user) return;
    setBusy(true);
    try {
      await killAndReset(user.id);
      setEndedNode(null); setEndedStatus(null); setEndedPet(null);
      setRun(null); setNode(null); setChoices([]); setPet(null);
      const rp = PET_OPTIONS[Math.floor(Math.random() * PET_OPTIONS.length)] as any;
      setRandomPet(rp);
      setIntroStep(0);
      setGiftOpened(false);
      setPetNameInput("");
      setPhase("intro");
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  // ====== RENDER ======
  if (phase === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground text-sm animate-pulse">Carregant...</p>
      </div>
    );
  }

  if (phase === "intro") {
    return (
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
            <button onClick={() => setGiftOpened(true)}
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
  }

  if (phase === "ended" && endedNode && endedPet) {
    if (endedStatus === "dead") {
      return (
        <StoryDeathScreen
          title={endedNode.title}
          narrative={endedNode.narrative}
          petName={endedPet.name}
          petIcon={endedPet.icon}
          onAdoptNew={handleAdoptAfterDeath}
          onLobby={() => navigate("/")}
        />
      );
    }
    return (
      <StoryEndingScreen
        title={endedNode.title}
        narrative={endedNode.narrative}
        endingType={endedNode.ending_type}
        petName={endedPet.name}
        petIcon={endedPet.icon}
        onPlayAgain={handlePlayAgain}
        onLobby={() => navigate("/")}
      />
    );
  }

  // READY (mascota viva, sense run actiu)
  if (phase === "ready" && pet) {
    const evo = getPetEvolution(pet.xp ?? 0, pet.max_xp);
    return (
      <div className="min-h-screen bg-background p-6 max-w-md mx-auto flex flex-col items-center justify-center">
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[500px] h-[250px] rounded-full bg-accent/5 blur-[100px] pointer-events-none" />
        <div className="text-center relative z-10 animate-fade-in w-full">
          <div className={`inline-flex items-center justify-center w-28 h-28 rounded-full bg-gradient-to-br ${evo.glow} ring-2 ${evo.ring} mb-3`}>
            <span className="text-7xl">{pet.pet_icon}</span>
          </div>
          <h1 className="text-2xl font-bold mb-1">{pet.pet_name}</h1>
          <p className="text-xs text-muted-foreground mb-4">
            {evo.badge} {evo.label} · ⭐ {pet.xp ?? 0} / {pet.max_xp ?? MAX_PET_XP} XP
          </p>
          <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
            8 capítols. Cada decisió canvia la història. Tria amb seny: les males opcions poden ser mortals.
          </p>
          <Button onClick={handleStartRun} size="lg" disabled={busy} className="w-full mb-2">
            {busy ? "..." : "📖 Començar nova aventura"}
          </Button>
          <Button variant="ghost" onClick={() => navigate("/")} className="w-full">
            ← Lobby
          </Button>
          <Button
            variant="ghost"
            onClick={async () => {
              if (!user) return;
              if (!confirm("Reiniciar tot el Mode Història? Perdràs mascota i progrés.")) return;
              await killAndReset(user.id);
              loadAll();
            }}
            className="w-full text-[10px] text-destructive hover:text-destructive mt-3"
          >
            🔄 Reiniciar tot
          </Button>
        </div>
      </div>
    );
  }

  // PLAYING
  if (phase === "playing" && node && pet) {
    const evo = getPetEvolution(pet.xp ?? 0, pet.max_xp);
    return (
      <div className="min-h-screen bg-background p-4 max-w-md mx-auto pb-10 relative">
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[500px] h-[250px] rounded-full bg-accent/5 blur-[100px] pointer-events-none" />

        <button onClick={() => navigate("/")} className="text-sm text-muted-foreground hover:text-primary mb-4 block transition-colors relative z-10">
          ← Lobby
        </button>

        {/* Pet status mini */}
        <div className="flex items-center gap-3 mb-5 relative z-10 glass rounded-xl px-3 py-2 border border-border/30">
          <span className="text-3xl">{pet.pet_icon}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate">{pet.pet_name}</p>
            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden mt-1">
              <div
                className="h-1.5 rounded-full bg-accent transition-all duration-500"
                style={{ width: `${Math.min(((pet.xp ?? 0) / (pet.max_xp ?? MAX_PET_XP)) * 100, 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">{evo.badge} {evo.label} · {pet.xp ?? 0}/{pet.max_xp ?? MAX_PET_XP}</p>
          </div>
        </div>

        <div className="relative z-10">
          <StoryNodeView
            node={node}
            choices={choices}
            petName={pet.pet_name}
            onChoose={handleChoose}
            busy={busy}
          />
        </div>
      </div>
    );
  }

  return null;
}
