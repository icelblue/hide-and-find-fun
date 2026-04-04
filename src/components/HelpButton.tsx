// ============================================================
// HelpButton.tsx — Panell flotant de regles del joc + catàleg recompenses
// ============================================================
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { TOKEN_COSTS } from "@/lib/supabase-helpers";
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
    text: "Mira una posició d'un moble. Si encertes moble + posició, trobes l'objecte i guanyes! Si no, reps una pista progressiva:\n❄️ Fred → L'objecte NO és en aquesta habitació.\n🌡️ Calent → Bona habitació, moble incorrecte.\n🔥 Molt calent → Moble correcte, prova altra posició!",
  },
  {
    title: "💡 Pistes de l'objecte rival",
    text: "Al torn 2 reps la 1a pista sobre l'objecte que busques. Al torn 5, la 2a pista. Serveixen per deduir QUÈ busques.",
  },
  {
    title: "⚡ Ítems socials (1/dia)",
    text: "Un cop al dia pots usar un ítem:\n🍌 Plàtan — Bloqueja 1 posició del rival (es desbloqueja amb qualsevol acció).\n💣 Bomba de fum — Mou el TEU objecte a una habitació diferent aleatòria (1 ús/partida). T'avisarà de la nova ubicació.\n🛡️ Escut — Protegeix del pròxim plàtan, intercanvi o robatori.\n🔄 Intercanvi — Intercanvia la teva ubicació amb la del rival.\n🕵️ Espia — Descobreix on és el rival.\n🔧 Robar tornavís — Roba 1 tornavís al rival.\n💡 Pista — Envia un missatge o farol.",
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
    text: "🧹 Netejar (bruts) — 0.2🪙, cal Drap.\n💥 Trencar (fràgils) — 0.3🪙, cal Martell, notifica el rival!\n🔧 Arreglar (trencats) — 0.2🪙, cal Tornavís.",
  },
  {
    title: "📈 Elo i Lligues",
    text: "Guanyar: +25 Elo · Perdre: -20 Elo.\n🥉 Bronze → 🥈 Silver → 🥇 Gold → 💎 Platinum → 👑 Diamond.",
  },
];

export function HelpButton({ variant }: { variant?: "menu" | "icon" }) {
  const [open, setOpen] = useState(false);
  const [rewardCatalog, setRewardCatalog] = useState<any[]>([]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.width = "100%";
      document.body.style.top = `-${window.scrollY}px`;
      // Load reward catalog
      getRewardCatalog().then(setRewardCatalog).catch(() => {});
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

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm"
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
            className="max-w-md w-full bg-card border border-border rounded-2xl shadow-xl flex flex-col"
            style={{ maxHeight: "min(85vh, calc(100dvh - 32px))" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 pt-5 pb-2 shrink-0">
              <h2 className="text-lg font-bold">📖 Com jugar</h2>
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                ✕
              </Button>
            </div>
            <div
              className="px-5 pb-5 space-y-4 overflow-y-auto flex-1 overscroll-contain"
              style={{
                WebkitOverflowScrolling: "touch",
                overscrollBehavior: "contain",
              }}
            >
              {RULES.map((r, i) => (
                <div key={i} className="border-b border-border/20 pb-3 last:border-0">
                  <p className="text-sm font-semibold mb-1">{r.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">{r.text}</p>
                </div>
              ))}

              {/* Reward catalog */}
              <div className="border-t border-border/40 pt-4">
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
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function Tip({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] text-muted-foreground/70 italic leading-snug">{children}</p>
  );
}
