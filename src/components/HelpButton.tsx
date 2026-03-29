import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { TOKEN_COSTS } from "@/lib/supabase-helpers";

const RULES = [
  {
    title: "🎯 Objectiu",
    text: "Amaga un objecte i busca el del rival. El primer que el trobi, guanya!",
  },
  {
    title: "🫣 Fase d'amagar",
    text: "Tria escenari → objecte → moble → posició (sobre/sota/dins). Tots dos amaguen alhora.",
  },
  {
    title: "🪙 Tokens",
    text: `Tens 5 tokens/dia. Es reinicien cada dia. Usa'ls bé!`,
  },
  {
    title: "🚶 Moure's · " + TOKEN_COSTS.move + "🪙",
    text: "Canvia d'habitació. Cada sala té portes que connecten amb altres sales.",
  },
  {
    title: "👀 Observar · " + TOKEN_COSTS.look + "🪙",
    text: "Mira una posició d'un moble. Reps una pista: ❄️ Fred (habitació incorrecta) · 🌡️ Calent (bona habitació, moble incorrecte) · 🔥 Molt calent (moble correcte, posició incorrecta!). NO TROBA l'objecte, només dona pistes per deduir.",
  },
  {
    title: "🔍 Confirmar · " + TOKEN_COSTS.confirm + "🪙",
    text: "L'ÚNICA acció que pot trobar l'objecte! Si encertes moble + posició, guanyes. Si falles, perds tokens. Usa les pistes d'observar per saber on confirmar!",
  },
  {
    title: "🍌 Plàtan (ítem social)",
    text: "Bloqueja una posició aleatòria del rival. Es desbloqueja quan el rival gasta tokens en una altra acció.",
  },
  {
    title: "⚡ Altres ítems socials (1/dia)",
    text: "💣 Bomba fum: Mou el teu objecte (1 cop/partida) · 🔮 Pista falsa: Confon rival · 🛡️ Escut: Bloqueja ítem · 💬 Missatge: Envia text.",
  },
  {
    title: "🏆 Recompenses",
    text: "Guanya partides per obtenir mobles. Col·loca'ls en escenaris o ven-los per tokens bonus.",
  },
  {
    title: "📈 Elo i Lligues",
    text: "Guanyar: +25 Elo · Perdre: -20 Elo. Lligues: Bronze → Silver → Gold → Platinum → Diamond.",
  },
];

export function HelpButton() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.width = "100%";
      document.body.style.top = `-${window.scrollY}px`;
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

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className="text-lg"
        aria-label="Com jugar"
      >
        ❓
      </Button>

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
            style={{ maxHeight: "calc(100vh - max(32px, env(safe-area-inset-top, 16px)) - max(32px, env(safe-area-inset-bottom, 16px)))" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 pt-5 pb-2 shrink-0">
              <h2 className="text-lg font-bold">📖 Com jugar</h2>
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                ✕
              </Button>
            </div>
            <div
              className="px-5 pb-5 space-y-3 overflow-y-auto flex-1 overscroll-contain"
              style={{
                WebkitOverflowScrolling: "touch",
                overscrollBehavior: "contain",
              }}
            >
              {RULES.map((r, i) => (
                <div key={i}>
                  <p className="text-sm font-semibold mb-0.5">{r.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{r.text}</p>
                </div>
              ))}
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
