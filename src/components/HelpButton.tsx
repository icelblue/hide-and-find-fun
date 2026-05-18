// ============================================================
// HelpButton.tsx — Panell flotant de regles del joc + catàleg recompenses
// ============================================================
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { TOKEN_COSTS, getScenarios, getConnectedScenarios } from "@/lib/supabase-helpers";
import { getRewardCatalog, RARITY_CONFIG } from "@/lib/reward-helpers";

const RARITY_ORDER = ["common", "uncommon", "rare", "epic", "legendary"] as const;
const DROP_RATES: Record<string, { pct: string; label: string }> = {
  common: { pct: "50%", label: "Comú" },
  uncommon: { pct: "30%", label: "Poc comú" },
  rare: { pct: "13%", label: "Rar" },
  epic: { pct: "5%", label: "Èpic" },
  legendary: { pct: "2%", label: "Llegendari" },
};

const RULES = [
  {
    title: "🎯 Objectiu",
    text: "Amaga un objecte i busca el del rival. El primer que el trobi, guanya!",
  },
  {
    title: "🫣 Fase d'amagar",
    text: "Tria escenari → objecte → moble → posició (sobre/sota/dins). Pots escriure un missatge opcional que es mostrarà quan el rival trobi l'objecte. Tots dos amaguen alhora.",
  },
  {
    title: "🪙 Tokens",
    text: "Tens 5 tokens al dia, es reinicien automàticament. Pots gastar bonus tokens guanyats de recompenses. Administra'ls bé!",
  },
  {
    title: "🚶 Moure's · " + TOKEN_COSTS.move + "🪙",
    text: "Canvia d'habitació. Cada sala té portes que connecten amb altres sales.",
  },
  {
    title: "👀 Observar · " + TOKEN_COSTS.look + "🪙",
    text: "Mira una posició d'un moble (⬆️ sobre, ⬇️ sota, 📦 dins, 🔙 darrere). Si encertes moble + posició, trobes l'objecte i guanyes! Si no, reps una pista de 5 nivells:\n❄️ Glaçat → Habitació molt lluny.\n🥶 Fred → Habitació pròxima a la correcta.\n🌬️ Fresc → Bona habitació, però el moble no té res a veure.\n🌡️ Tebi → Bona habitació, moble d'una categoria similar a la correcta.\n🔥 Calent → Moble correcte! Prova altra posició.\n\n⚠️ Atenció: hi ha un 20% de probabilitat que la pista t'enganyi amb un nivell adjacent. La victòria, però, mai és falsa.\n\nℹ️ Alguns mobles no permeten totes les posicions (una catifa no té 'dins', un arbre no té 'darrere'…). Els botons bloquejats t'ho indiquen.",
  },
  {
    title: "💡 Pistes de l'objecte rival",
    text: "Al torn 2 reps la 1a pista sobre l'objecte que busques. Al torn 5, la 2a pista. Serveixen per deduir QUÈ busques.",
  },
  {
    title: "⚡ Ítems socials",
    text: "Un cop al dia pots usar un ítem (excepte barricada i trampa que es poden usar 2 cops/dia):\n🍌 Plàtan — Bloqueja 1 posició del rival.\n💣 Bomba de fum — Mou el TEU objecte a altra habitació (1 ús/partida).\n🛡️ Escut — Protegeix del pròxim atac.\n🔄 Intercanvi — Intercanvia la teva ubicació amb la del rival.\n🕵️ Espia — Descobreix on és el rival.\n🚧 Barricada (2/dia) — Bloqueja un camí. El rival pot forçar pagant +1🪙 (peatge d'un sol ús: després cau).\n🪤 Trampa (2/dia) — Col·loca trampa en un moble. Si el rival mira, perd 1🪙 (mínim 0).\n🔧 Robar tornavís — Roba 1 tornavís al rival.\n💡 Pista — Envia un missatge o farol.",
  },
  {
    title: "🎁 Bonus i eines",
    text: "Quan observes, tens un 20% de trobar tokens extra o eines:\n🧹 Drap (×2) — netejar mobles bruts.\n🔨 Martell (×5) — trencar mobles fràgils.\n🔧 Tornavís (×5 extra, tothom comença amb 1).\n🔦 Llanterna (×1) — zones fosques.\n⚠️ POOL COMPARTIT: Qui la troba se la queda! El rival es queda sense!",
  },
  {
    title: "💡 Llum i llanterna",
    text: "🏠 Interiors: Pots apagar el llum (0.2🪙) perquè ningú vegi els mobles.\n🌿 Exteriors: Usa 🔦 Llanterna (0.2🪙) per revelar mobles ocults.",
  },
  {
    title: "⚡ Mobles interactius",
    text: "🧹 Netejar (bruts) — 0.3🪙, cal Drap. Desbloqueja la posició \"dins\".\n💥 Trencar (fràgils) — 0.4🪙, cal Martell, notifica el rival! Bloqueja \"sobre\" + \"dins\".\n🔧 Arreglar (trencats) — 0.3🪙, cal Tornavís. Restaura posicions.\n⚠️ Quasi tots els mobles es poden trencar si tens martell!",
  },
  {
    title: "📈 Elo i Lligues",
    text: "Guanyar: +25 Elo · Perdre: -20 Elo.\n🥉 Bronze → 🥈 Silver → 🥇 Gold → 💎 Platinum → 👑 Diamond.",
  },
  {
    title: "🐾 Mode Història",
    text: "Juga sol contra la CPU per aprendre el joc. Adopta una mascota virtual que evoluciona amb XP!\n🥚 Bebè → 🌱 Jove → ⭐ Adult → 🔥 Veterà → 👑 Llegendari\nSi l'XP arriba a 5000, la mascota mor (🪦) i cal reiniciar.",
  },
  {
    title: "🤒 Salut de la mascota",
    text: "Al completar capítols hi ha un 25% de probabilitat d'un event de salut:\n🤒 Virus: +200 XP | 🤕 Caiguda: +150 XP | 🫠 Febre: +100 XP\nEls events pugen l'XP ràpidament! Usa consumibles per curar:\n🍖 Menjar: -100 XP | 💧 Aigua: -50 XP | 💉 Vacuna: -200 XP\nEls consumibles es desbloquegen després d'obtenir tots els accesoris.",
  },
  {
    title: "💊 Regalar consumibles",
    text: "Pots regalar consumibles a les mascotes d'altres jugadors! Ves al seu perfil → si tens consumibles disponibles, apareixerà un botó per curar la seva mascota.",
  },
  {
    title: "🏆 Vitrina pública",
    text: "Al perfil de cada jugador pots veure la seva col·lecció de mobles guanyats (vitrina). Els mobles no obtinguts apareixen en gris.",
  },
];

const BASICS = [
  {
    step: "1",
    title: "🎯 Què és el joc?",
    text: "Tu i el rival amagueu cadascú UN objecte en un escenari (casa amb habitacions). Guanya qui trobi primer l'objecte de l'altre!",
  },
  {
    step: "2",
    title: "🫣 Amaga el teu objecte",
    text: "Tries: HABITACIÓ → OBJECTE (una clau, un anell...) → MOBLE on amagar-lo → POSICIÓ (sobre, sota o dins). Pots deixar un missatge divertit que veurà el rival quan el trobi.",
  },
  {
    step: "3",
    title: "🚶 Mou-te per la casa",
    text: "Cada habitació té portes a 1-2 habitacions adjacents. Moure costa pocs tokens. Has d'anar a la mateixa habitació on creus que el rival ha amagat el seu objecte.",
  },
  {
    step: "4",
    title: "👀 Mira als mobles",
    text: "Quan estiguis a una habitació, observa els mobles (0.3🪙 per mirada). Reps pistes:\n❄️ FRED → Estàs a la habitació equivocada\n🌡️ CALENT → Habitació correcta, però moble equivocat\n🔥 MOLT CALENT → Moble correcte! Prova altra posició",
  },
  {
    step: "5",
    title: "🏆 Guanyar",
    text: "Si encertes MOBLE + POSICIÓ exactes, trobes l'objecte i guanyes la partida! T'emportes una recompensa (un moble per la teva col·lecció).",
  },
  {
    step: "6",
    title: "🪙 Tokens",
    text: "Tens 5 tokens al dia (es reinicien sols). Cada acció gasta una mica. Si t'acabes els tokens, has d'esperar a demà o convidar amics per guanyar bonus tokens.",
  },
  {
    step: "7",
    title: "⚡ Trucs i ítems socials",
    text: "Pots fastidiar el rival! Plàtans 🍌 (li bloqueges una posició), bombes de fum 💣 (mous el teu objecte!), trampes 🪤, escuts 🛡️... Mira la pestanya 'Regles completes' per a tots.",
  },
];

export function HelpButton({ variant }: { variant?: "menu" | "icon" }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"basics" | "rules" | "rewards">("basics");
  const [rewardCatalog, setRewardCatalog] = useState<any[]>([]);
  const [scenarioMap, setScenarioMap] = useState<{ name: string; icon: string; connections: string[] }[]>([]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.width = "100%";
      document.body.style.top = `-${window.scrollY}px`;
      // Load reward catalog + scenario connections
      getRewardCatalog().then(setRewardCatalog).catch(() => {});
      getScenarios().then(async (scenarios) => {
        const result: { name: string; icon: string; connections: string[] }[] = [];
        for (const s of scenarios) {
          const connected = await getConnectedScenarios(s.id);
          result.push({ name: s.name, icon: s.icon, connections: connected.map((c: any) => `${c.icon} ${c.name}`) });
        }
        setScenarioMap(result);
      }).catch(() => {});
    } else {
      const scrollY = document.body.style.top;
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
      document.body.style.top = "";
      window.scrollTo(0, parseInt(scrollY || "0") * -1);
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
      document.body.style.top = "";
    };
  }, [open]);

  // Group rewards by rarity
  const groupedRewards: Record<string, any[]> = {};
  for (const r of RARITY_ORDER) groupedRewards[r] = [];
  for (const item of rewardCatalog) {
    if (groupedRewards[item.rarity]) groupedRewards[item.rarity].push(item);
  }

  const modal = open ? createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/30 backdrop-blur-sm"
      onClick={() => setOpen(false)}
      style={{
        touchAction: "none",
        paddingTop: "max(16px, env(safe-area-inset-top, 16px))",
        paddingBottom: "max(16px, env(safe-area-inset-bottom, 16px))",
        paddingLeft: "8px",
        paddingRight: "8px",
      }}
    >
      <div
        className="max-w-md w-full bg-card border border-border rounded-2xl shadow-xl flex flex-col overflow-hidden"
        style={{ maxHeight: "min(85vh, calc(100dvh - 32px))" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-2 shrink-0">
          <h2 className="text-lg font-bold">📖 Com jugar</h2>
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
            ✕
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-3 pb-2 shrink-0 border-b border-border/30">
          {([
            { id: "basics", label: "🌟 Bàsic" },
            { id: "rules", label: "📖 Regles" },
            { id: "rewards", label: "🏆 Premis" },
          ] as const).map(t => (
            <button
              key={t.id}
              type="button"
              onClick={(e) => { e.stopPropagation(); setTab(t.id); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${
                tab === t.id ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted/40"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div
          className="px-5 pb-5 pt-4 space-y-4 overflow-y-auto flex-1 overscroll-contain"
          style={{
            WebkitOverflowScrolling: "touch",
            overscrollBehavior: "contain",
          }}
        >
          {/* TAB: BÀSIC — Per a novells */}
          {tab === "basics" && (
            <>
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-3">
                <p className="text-xs font-semibold text-primary mb-1">👋 Primer cop?</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Llegeix aquests 7 passos i podràs jugar la teva primera partida en 3 minuts!
                </p>
              </div>
              {BASICS.map((b, i) => (
                <div key={i} className="flex gap-3 border-b border-border/20 pb-3 last:border-0">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center">
                    {b.step}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold mb-1">{b.title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">{b.text}</p>
                  </div>
                </div>
              ))}
              <div className="bg-secondary/10 border border-secondary/20 rounded-xl p-3 mt-3">
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  💡 <strong>Truc:</strong> A la teva partida, toca <span className="font-mono">🤫 El meu amagatall</span> si oblides on has amagat el teu objecte.
                </p>
              </div>
            </>
          )}

          {/* TAB: REGLES COMPLETES */}
          {tab === "rules" && (
            <>
              {RULES.map((r, i) => (
                <div key={i} className="border-b border-border/20 pb-3 last:border-0">
                  <p className="text-sm font-semibold mb-1">{r.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">{r.text}</p>
                </div>
              ))}

              {/* Scenario connections map */}
              {scenarioMap.length > 0 && (
                <div className="border-t border-border/40 pt-4">
                  <p className="text-sm font-semibold mb-3">🗺️ Mapa d'habitacions</p>
                  <p className="text-xs text-muted-foreground mb-3">Cada habitació està connectada amb altres per portes. Pots moure't entre habitacions adjacents.</p>
                  <div className="space-y-2">
                    {scenarioMap.map((s, i) => (
                      <div key={i} className="bg-muted/30 rounded-lg px-3 py-2">
                        <span className="text-sm font-semibold">{s.icon} {s.name}</span>
                        {s.connections.length > 0 ? (
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            → {s.connections.join(" · ")}
                          </p>
                        ) : (
                          <p className="text-[11px] text-muted-foreground/50 mt-0.5">Sense connexions</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* TAB: PREMIS */}
          {tab === "rewards" && (
            <div>
              <p className="text-sm font-semibold mb-3">🏆 Catàleg de recompenses</p>
              <p className="text-xs text-muted-foreground mb-3">
                Guanya partides per obtenir mobles decoratius. Cada victòria dona un moble aleatori amb probabilitat:
              </p>
              {RARITY_ORDER.map(rarity => {
                const items = groupedRewards[rarity] ?? [];
                const cfg = RARITY_CONFIG[rarity];
                const drop = DROP_RATES[rarity];
                if (items.length === 0) return null;
                return (
                  <div key={rarity} className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold">
                        {cfg?.emoji} {drop?.label} ({items.length})
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {drop?.pct} · {cfg?.sell}🪙
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {items.map((item: any) => (
                        <span key={item.id} className="inline-flex items-center gap-1 bg-muted/40 rounded-lg px-2 py-1 text-[11px]">
                          {item.icon} {item.name}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
              <p className="text-[10px] text-muted-foreground mt-2">
                Total: {rewardCatalog.length} mobles · Col·loca'ls en escenaris o ven-los per tokens bonus
              </p>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
      {variant === "menu" ? (
        <button onClick={() => setOpen(true)} className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted/50 flex items-center gap-2">
          ❓ Com jugar
        </button>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setOpen(true)}
          className="text-lg"
          aria-label="Com jugar"
        >
          ❓
        </Button>
      )}

      {modal}
    </>
  );
}

export function Tip({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] text-muted-foreground/70 italic leading-snug">{children}</p>
  );
}
