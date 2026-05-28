// ============================================================
// StoryModePage.tsx — Mode Història v4
// ============================================================
// 🔒 CRITICAL: INDEPENDENT del PvP. No toca cap RPC ni taula de partida real.
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
import { getPetState, getInventory, autoDiscoverRecipes, type PetState, type InventoryItem, DEFAULT_STATE } from "@/lib/story-state";
import {
  getMySkills, getWorldStatuses, syncLevelAndSkills, getNodeVisitMap,
  type WorldStatus, SKILLS,
} from "@/lib/story-progression";
import { StoryNodeView } from "@/components/story/StoryNodeView";
import { StoryEndingScreen } from "@/components/story/StoryEndingScreen";
import { StoryDeathScreen } from "@/components/story/StoryDeathScreen";
import { RewardReveal, type RevealData } from "@/components/story/RewardReveal";
import { ChapterCompleteScreen } from "@/components/story/ChapterCompleteScreen";
import { DailyChallengeCard } from "@/components/story/DailyChallengeCard";
import { PetStatsBar } from "@/components/story/PetStatsBar";
import { InventoryDrawer } from "@/components/story/InventoryDrawer";
import { WorldMap } from "@/components/story/WorldMap";

import { PetEvolutionCard } from "@/components/story/PetEvolutionCard";
import { HelpDialog } from "@/components/story/HelpDialog";
import { resolveAndFetchPendingVisits, fetchAndMarkUnseenNotifications, type ResolvedVisit, type PetNotification } from "@/lib/pet-social";
import { WhileAwayDialog } from "@/components/story/WhileAwayDialog";
import { getPetPersonality, TRAIT_META, type Personality } from "@/lib/pet-personality";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useT } from "@/i18n/LanguageProvider";


type Phase = "loading" | "intro" | "ready" | "playing" | "chapter_break" | "ended";
export default function StoryModePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const t = useT();


  const [phase, setPhase] = useState<Phase>("loading");
  const [pet, setPet] = useState<any>(null);
  const [run, setRun] = useState<StoryRun | null>(null);
  const [node, setNode] = useState<StoryNode | null>(null);
  const [choices, setChoices] = useState<StoryChoice[]>([]);
  const [busy, setBusy] = useState(false);
  const [playerName, setPlayerName] = useState("");

  // Adoption flow
  const [randomPet, setRandomPet] = useState(PET_OPTIONS[0]);
  const [introStep, setIntroStep] = useState(0);
  const [giftOpened, setGiftOpened] = useState(false);
  const [petNameInput, setPetNameInput] = useState("");
  const [namingPet, setNamingPet] = useState(false);

  // v4: state + inventory
  const [petState, setPetState] = useState<PetState>(DEFAULT_STATE);
  const [prevPetState, setPrevPetState] = useState<PetState | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [inventoryRefresh, setInventoryRefresh] = useState(0);

  // v5: skills + worlds + visits
  const [skills, setSkills] = useState<Set<string>>(new Set());
  const [worlds, setWorlds] = useState<WorldStatus[]>([]);
  const [selectedWorld, setSelectedWorld] = useState<string>("home");
  const [visitMap, setVisitMap] = useState<Map<string, number>>(new Map());
  const [recipeCount, setRecipeCount] = useState(0);
  const [personality, setPersonality] = useState<Personality | null>(null);

  // Last ending info
  const [endedNode, setEndedNode] = useState<StoryNode | null>(null);
  const [endedStatus, setEndedStatus] = useState<"dead" | "completed" | null>(null);
  const [endedPet, setEndedPet] = useState<{ name: string; icon: string } | null>(null);

  // Chapter break + reveal
  const [reveal, setReveal] = useState<RevealData | null>(null);
  const [chapterRewards, setChapterRewards] = useState<RewardOutcome[]>([]);
  const [pendingNext, setPendingNext] = useState<StoryNode | null>(null);
  const [completedChapter, setCompletedChapter] = useState<number>(1);

  // 📬 "Mentre no hi eres" popup
  const [awayOpen, setAwayOpen] = useState(false);
  const [awayVisits, setAwayVisits] = useState<ResolvedVisit[]>([]);
  const [awayNotifs, setAwayNotifs] = useState<PetNotification[]>([]);

  const loadAll = useCallback(async () => {
    if (!user) return;
    setPhase("loading");
    try {
      const [petData, profileRes, runData, stateData, invData, skillSet, visits, recipeBookRes] = await Promise.all([
        getMyPet(user.id),
        supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle(),
        getActiveRun(user.id),
        getPetState(user.id),
        getInventory(user.id),
        getMySkills(user.id),
        getNodeVisitMap(user.id),
        supabase.from("story_recipe_book").select("recipe_id", { count: "exact", head: true }).eq("user_id", user.id),
      ]);
      const name = profileRes.data?.display_name?.trim()
        || (user.email ? user.email.split("@")[0] : "")
        || t("storyPage.adventurer");

      setPlayerName(name);
      setPet(petData);
      setPetState(stateData);
      setInventory(invData);
      setSkills(skillSet);
      setVisitMap(visits);
      const rcCount = recipeBookRes.count ?? 0;
      setRecipeCount(rcCount);
      // Carrega personalitat efectiva (espècie + estat)
      if (petData) {
        try { setPersonality(await getPetPersonality(user.id)); } catch { /* non-blocking */ }
      }

      // 🧪 Auto-discover passive: comprova si ja té ingredients per receptes no descobertes
      if (invData.length > 0) {
        const newly = await autoDiscoverRecipes(user.id, invData);
        if (newly.length > 0) {
          setRecipeCount(rcCount + newly.length);
          newly.forEach((r) =>
            toast.success(t("storyPage.recipeDiscovered", { icon: r.icon, name: r.name }), {
              description: t("storyPage.recipeDiscoveredDesc"),
              duration: 5000,
            })
          );
        }
      }


      // 🐾 Resoldre visites pendents + notificacions de regals → popup "mentre no hi eres"
      try {
        const [pending, notifs] = await Promise.all([
          resolveAndFetchPendingVisits(user.id),
          fetchAndMarkUnseenNotifications(user.id),
        ]);
        if (pending.length > 0 || notifs.length > 0) {
          setAwayVisits(pending);
          setAwayNotifs(notifs);
          setAwayOpen(true);
        }
      } catch { /* silent */ }

      if (!petData) {
        const rp = PET_OPTIONS[Math.floor(Math.random() * PET_OPTIONS.length)] as any;
        setRandomPet(rp);
        setIntroStep(0);
        setGiftOpened(false);
        setPhase("intro");
        return;
      }

      // Sync level/skills from XP, then load worlds
      const synced = await syncLevelAndSkills(user.id);
      if (synced.newlyUnlocked.length > 0) {
        const fresh = await getMySkills(user.id);
        setSkills(fresh);
        synced.newlyUnlocked.forEach((s) => toast.success(t("storyPage.skillUnlocked", { icon: s.icon, name: s.name })));

      }
      const ws = await getWorldStatuses(user.id, {
        bond: stateData.bond,
        recipesDiscovered: rcCount,
        level: synced.level,
      });
      setWorlds(ws);
      // Default selection: most-advanced unlocked world
      const lastUnlocked = [...ws].reverse().find((w) => w.unlocked);
      if (lastUnlocked) setSelectedWorld(lastUnlocked.id);

      if (runData && runData.current_node_id) {
        const n = await getNode(runData.current_node_id);
        if (!n) {
          await supabase.from("story_runs").update({ status: "completed", ended_at: new Date().toISOString() }).eq("id", runData.id);
          setPhase("ready");
          return;
        }
        const c = await getChoices(runData.current_node_id);
        setRun(runData);
        setNode(n);
        setChoices(c);
        setPhase("playing");
      } else {
        setPhase("ready");
      }
    } catch (e: any) {
      console.error("[StoryMode] loadAll error", e);
      toast.error(t("storyPage.loadError", { msg: String(e?.message ?? e) }));
      setPhase("ready");
    }
  }, [user, t]);


  useEffect(() => { loadAll(); }, [loadAll]);

  // Recarrega quan canvia l'idioma (les caches de catàleg s'invaliden soles)
  useEffect(() => {
    const handler = () => { loadAll(); };
    window.addEventListener("lang-changed", handler);
    return () => window.removeEventListener("lang-changed", handler);
  }, [loadAll]);

  // ====== INTRO ======
  const handleConfirmPetName = async () => {
    if (!user) return;
    const trimmed = petNameInput.trim();
    if (!trimmed || trimmed.length > 20) { toast.error(t("storyPage.invalidName")); return; }

    setNamingPet(true);
    try {
      const p = await createPet(user.id, randomPet.type, trimmed, randomPet.icon);
      setPet(p);
      toast.success(t("storyPage.adoptedToast", { icon: randomPet.icon, name: trimmed }));

      toast.success(`${randomPet.icon} ${trimmed} és el teu company!`);
    } catch (e: any) { toast.error(e?.message ?? "Error creant la mascota"); }
    finally { setNamingPet(false); }
  };

  // ====== START RUN ======
  const handleStartRun = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const world = worlds.find((w) => w.id === selectedWorld && w.unlocked);
      const startNodeId = world?.start_node_id;
      const worldId = world?.id;
      const r = await startRun(user.id, startNodeId, worldId);
      if (!r.current_node_id) throw new Error(t("storyPage.noNode"));
      const n = await getNode(r.current_node_id);
      if (!n) throw new Error(t("storyPage.nodeMissing", { id: r.current_node_id }));
      const c = await getChoices(r.current_node_id);
      setRun(r);
      setNode(n);
      setChoices(c);
      setChapterRewards([]);
      setPrevPetState(null);
      setPhase("playing");
    } catch (e: any) {
      console.error("[StoryMode] startRun error", e);
      toast.error(t("storyPage.startError", { msg: String(e?.message ?? t("storyPage.unknownError")) }));
    }
    finally { setBusy(false); }

  };

  // ====== CHOICE ======
  const handleChoose = async (choice: StoryChoice) => {
    if (!user || !run || !node) return;
    setBusy(true);
    try {
      const result = await makeChoice(user.id, run, choice, personality ?? undefined);
      const freshPet = await getMyPet(user.id);
      setPet(freshPet);

      // Update state bars
      if (result.reward.newState) {
        setPrevPetState(petState);
        setPetState(result.reward.newState);
        // Estat ha canviat → recalcular personalitat efectiva
        try { setPersonality(await getPetPersonality(user.id)); } catch { /* non-blocking */ }
      }

      // Notify trait bonus (if any)
      if (result.traitBonus) {
        const { TRAIT_META } = await import("@/lib/pet-personality");
        const meta = TRAIT_META[result.traitBonus.trait as keyof typeof TRAIT_META];
        toast.success(t("storyPage.traitBonus", { label: meta?.label ?? result.traitBonus.trait, m: result.traitBonus.multiplier }));

      }

      // Refresh inventory if item/recipe gained
      if (result.reward.item || result.reward.recipe) {
        const inv = await getInventory(user.id);
        setInventory(inv);
        setInventoryRefresh((n) => n + 1);
        // 🧪 Auto-descobriment de receptes amb ingredients actuals
        const newlyDiscovered = await autoDiscoverRecipes(user.id, inv);
        if (newlyDiscovered.length > 0) {
          setRecipeCount((c) => c + newlyDiscovered.length);
          newlyDiscovered.forEach((r) =>
            toast.success(t("storyPage.recipeDiscovered", { icon: r.icon, name: r.name }), {
              description: t("storyPage.recipeDiscoveredDescDrawer"),
              duration: 5000,
            })
          );
        }
      }


      // Reveal animation
      setReveal(rewardToReveal(result.reward));
      setChapterRewards(prev => [...prev, result.reward]);

      if (result.runEnded) {
        setEndedNode(result.nextNode ?? node);
        setEndedStatus(result.runEnded);
        setEndedPet({ name: freshPet?.pet_name ?? pet?.pet_name ?? "?", icon: freshPet?.pet_icon ?? pet?.pet_icon ?? "🐾" });
        setPendingNext(null);
        return;
      }

      if (result.nextNode) {
        if (result.nextNode.chapter > node.chapter) {
          setCompletedChapter(node.chapter);
        }
        // Refresh visit map (next node will have its visit recorded server-side)
        const fresh = await getNodeVisitMap(user.id);
        setVisitMap(fresh);
        setPendingNext(result.nextNode);
        const freshRun = await getActiveRun(user.id);
        if (freshRun) setRun(freshRun);
      }
    } catch (e: any) {
      console.error("[StoryMode] choice error", e);
      toast.error(t("storyPage.choiceError", { msg: String(e?.message ?? t("storyPage.choiceFailed")) }));

    }
    finally { setBusy(false); }
  };

  const handleRevealDone = async () => {
    setReveal(null);
    if (endedStatus) { setPhase("ended"); return; }
    if (!pendingNext || !node) return;
    if (pendingNext.chapter > node.chapter) { setPhase("chapter_break"); return; }
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
    toast.success("✓ Aventura desada. Pots tornar quan vulguis.");
    navigate("/");
  };

  // ====== ENDING HANDLERS ======
  const handlePlayAgain = async () => {
    setEndedNode(null); setEndedStatus(null); setEndedPet(null);
    await handleStartRun();
  };

  const handleAdoptAfterDeath = async () => {
    if (!user) return;
    setBusy(true);
    try {
      await killAndReset(user.id);
      setEndedNode(null); setEndedStatus(null); setEndedPet(null);
      setRun(null); setNode(null); setChoices([]); setPet(null);
      setPetState(DEFAULT_STATE); setInventory([]);
      const rp = PET_OPTIONS[Math.floor(Math.random() * PET_OPTIONS.length)] as any;
      setRandomPet(rp);
      setIntroStep(0); setGiftOpened(false); setPetNameInput("");
      setPhase("intro");
    } catch (e: any) { toast.error(e?.message ?? "Error reiniciant"); }
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
          title={endedNode.title} narrative={endedNode.narrative}
          petName={endedPet.name} petIcon={endedPet.icon}
          onAdoptNew={handleAdoptAfterDeath} onLobby={() => navigate("/")}
        />
      );
    }
    return (
      <StoryEndingScreen
        title={endedNode.title} narrative={endedNode.narrative}
        endingType={endedNode.ending_type}
        petName={endedPet.name} petIcon={endedPet.icon}
        onPlayAgain={handlePlayAgain} onLobby={() => navigate("/")}
      />
    );
  }

  // READY
  if (phase === "ready" && pet) {
    const completedWorlds = worlds.filter((w) => w.endingsCompleted.length > 0).length;
    const totalEndings = worlds.reduce((acc, w) => acc + w.endingsCompleted.length, 0);
    const selected = worlds.find((w) => w.id === selectedWorld);
    return (
      <div className="min-h-screen bg-background p-4 max-w-md mx-auto pb-10">
        <WhileAwayDialog open={awayOpen} onClose={() => setAwayOpen(false)} visits={awayVisits} notifications={awayNotifs} petName={pet?.pet_name} />
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[500px] h-[250px] rounded-full bg-accent/5 blur-[100px] pointer-events-none" />
        <div className="relative z-10 animate-fade-in">
          {/* Header de navegació unificat */}
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => navigate("/")} className="text-sm text-muted-foreground hover:text-primary transition-colors">
              ← Lobby
            </button>
            <div className="flex items-center gap-1">
              <HelpDialog />
              {user && (
                <InventoryDrawer
                  userId={user.id}
                  petName={pet.pet_name}
                  triggerCount={inventoryRefresh}
                  onChange={async () => {
                    const inv = await getInventory(user.id);
                    setInventory(inv);
                    const st = await getPetState(user.id);
                    setPetState(st);
                    const newly = await autoDiscoverRecipes(user.id, inv);
                    if (newly.length > 0) {
                      setRecipeCount((c) => c + newly.length);
                      newly.forEach((r) => toast.success(`💡 Recepta descoberta: ${r.icon} ${r.name}`));
                    }
                  }}
                />
              )}
              {user && <DailyChallengeCard variant="icon" userId={user.id} petName={pet.pet_name} onRewardApplied={loadAll} />}
            </div>
          </div>
          <p className="text-xs text-muted-foreground text-center mb-2">Hola, {playerName}</p>

          <PetEvolutionCard
            pet={{ pet_name: pet.pet_name, pet_icon: pet.pet_icon, xp: pet.xp ?? 0, max_xp: pet.max_xp ?? MAX_PET_XP }}
            unlockedSkills={skills}
          />

          {/* Narrative intro */}
          <div className="text-center mb-3 px-2">
            <p className="text-sm text-foreground/80 italic leading-relaxed">
              "{pet.pet_name} ha de viatjar de la <b>Casa</b> fins al <b>Castell</b>. Cada decisió forja qui esdevindrà."
            </p>
            <p className="text-[11px] text-muted-foreground mt-2">
              🗺️ Mons {completedWorlds}/4 · 🏁 Finals {totalEndings}/6 · 🧪 Receptes {recipeCount}
            </p>
          </div>

          {/* World selector */}
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2 mt-4">Tria on començar</p>
          <WorldMap worlds={worlds} selectedId={selectedWorld} onSelect={setSelectedWorld} />

          {selected && (
            <p className="text-[11px] text-muted-foreground text-center mb-3 px-3">
              {selected.description?.split("{pet}").join(pet.pet_name)}
            </p>
          )}

          <Button onClick={handleStartRun} size="lg" disabled={busy || !selected?.unlocked} className="w-full mb-2">
            {busy ? "..." : `📖 Començar a ${selected?.icon ?? "🏠"} ${selected?.name ?? "Casa"}`}
          </Button>

          

          <Button
            variant="ghost"
            onClick={async () => {
              if (!user) return;
              if (!confirm("Reiniciar tot el Mode Història? Perdràs mascota, objectes, habilitats i progrés.")) return;
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

  // CHAPTER BREAK
  if (phase === "chapter_break" && pet && pendingNext) {
    return (
      <>
        <ChapterCompleteScreen
          completedChapter={completedChapter}
          nextChapter={pendingNext.chapter}
          rewards={chapterRewards}
          petName={pet.pet_name}
          petIcon={pet.pet_icon}
          petXP={pet.xp ?? 0}
          petMaxXP={pet.max_xp ?? MAX_PET_XP}
          onContinue={handleContinueChapter}
          onPause={handlePauseAdventure}
          busy={busy}
        />
        {reveal && <RewardReveal reveal={reveal} onDone={handleRevealDone} />}
      </>
    );
  }

  // PLAYING
  if (phase === "playing" && node && pet) {
    const evo = getPetEvolution(pet.xp ?? 0, pet.max_xp);
    return (
      <div className="min-h-screen bg-background p-4 max-w-md mx-auto pb-10 relative">
        <WhileAwayDialog open={awayOpen} onClose={() => setAwayOpen(false)} visits={awayVisits} notifications={awayNotifs} petName={pet?.pet_name} />
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[500px] h-[250px] rounded-full bg-accent/5 blur-[100px] pointer-events-none" />

        <div className="flex items-center justify-between mb-3 relative z-10">
          <button onClick={() => navigate("/")} className="text-sm text-muted-foreground hover:text-primary transition-colors">
            ← Lobby
          </button>
          <div className="flex items-center gap-1">
            <HelpDialog />
            {user && <InventoryDrawer userId={user.id} petName={pet.pet_name} triggerCount={inventoryRefresh} onChange={async () => {
              const inv = await getInventory(user.id);
              setInventory(inv);
              // Re-trigger auto-discover after using/combining items (state may have changed)
              const newly = await autoDiscoverRecipes(user.id, inv);
              if (newly.length > 0) {
                setRecipeCount((c) => c + newly.length);
                newly.forEach((r) => toast.success(`💡 Recepta descoberta: ${r.icon} ${r.name}`));
              }
              // Refresh pet state too (using items affects it)
              const st = await getPetState(user.id);
              setPetState(st);
            }} />}
            
            {run && (
              <span className="text-[10px] text-accent/80 font-medium">
                ✓ Cap. {node.chapter}/8
              </span>
            )}
          </div>
        </div>

        {/* Pet status mini */}
        <div className="flex items-center gap-3 mb-3 relative z-10 glass rounded-xl px-3 py-2 border border-border/30">
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

        {/* v4: state bars */}
        <div className="relative z-10">
          <PetStatsBar state={petState} prevState={prevPetState} />
        </div>

        {/* FASE 1: Personalitat efectiva (espècie + estat actual) */}
        {personality && (
          <div className="relative z-10 flex flex-wrap gap-1.5 justify-center px-1">
            {(["curious","loyal","brave","gluttonous","calm"] as const).map((t) => {
              const meta = TRAIT_META[t];
              const value = personality[t];
              const strong = value >= 7;
              const weak = value <= 3;
              return (
                <span
                  key={t}
                  title={`${meta.label}: ${value}/10`}
                  className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                    strong ? `bg-purple-500/20 ${meta.color} ring-1 ring-purple-400/40`
                    : weak ? "bg-muted/30 text-muted-foreground/60"
                    : "bg-muted/40 text-foreground/70"
                  }`}
                >
                  {meta.icon} {value}
                </span>
              );
            })}
          </div>
        )}

        <div className="relative z-10">
          <StoryNodeView
            node={node}
            choices={choices}
            petName={pet.pet_name}
            inventory={inventory}
            state={petState}
            unlockedSkills={skills}
            nodeVisitCount={visitMap.get(node.id) ?? 1}
            worldLabel={worlds.find((w) => w.id === run?.starting_world)?.icon
              ? `${worlds.find((w) => w.id === run?.starting_world)?.icon} ${worlds.find((w) => w.id === run?.starting_world)?.name}`
              : undefined}
            personality={personality ?? undefined}
            onChoose={handleChoose}
            busy={busy || !!reveal}
          />
        </div>

        {reveal && <RewardReveal reveal={reveal} onDone={handleRevealDone} />}
      </div>
    );
  }

  return null;
}
