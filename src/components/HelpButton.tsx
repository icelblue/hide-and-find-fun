import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
    text: `Tens 5 tokens/dia. Moure's: ${TOKEN_COSTS.move}🪙 · Observar: ${TOKEN_COSTS.look}🪙 · Confirmar: ${TOKEN_COSTS.confirm}🪙. Es reinicien cada dia.`,
  },
  {
    title: "🚶 Moure's",
    text: "Cada habitació té 2 portes. Només pots anar a les sales adjacents (circuit: Cuina → Menjador → Jardí → Balcó → Habitació → Despatx → Lavabo → Cuina).",
  },
  {
    title: "👀 Observar",
    text: "Mira una posició d'un moble. Si no hi ha l'objecte, potser trobes un bonus (token extra, pista...).",
  },
  {
    title: "🔍 Confirmar",
    text: "Aposta forta! Si l'objecte és allà, guanyes. Si no, perds 1.5 tokens. Pensa bé!",
  },
  {
    title: "⚡ Ítems socials (1/dia)",
    text: "🍌 Plàtan: Borrós 3s · 💣 Bomba fum: Mou el teu objecte · 🔮 Pista falsa: Confon rival · 🛡️ Escut: Bloqueja un ítem · 💬 Missatge: Envia text.",
  },
  {
    title: "🏆 Recompenses",
    text: "Guanya partides per obtenir mobles. Col·loca'ls en escenaris (amplien el joc) o ven-los per tokens bonus.",
  },
  {
    title: "📈 Elo i Lligues",
    text: "Guanyar: +25 Elo · Perdre: -20 Elo. Puja de lliga: Bronze → Silver → Gold → Platinum → Diamond.",
  },
];

export function HelpButton() {
  const [open, setOpen] = useState(false);

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
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-foreground/30 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <Card
            className="mx-2 mb-2 sm:mb-0 max-w-md w-full max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <CardContent className="pt-5 pb-4 flex flex-col gap-0 overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold">📖 Com jugar</h2>
                <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                  ✕
                </Button>
              </div>
              <div className="space-y-3 overflow-y-auto pr-1">
                {RULES.map((r, i) => (
                  <div key={i}>
                    <p className="text-sm font-semibold mb-0.5">{r.title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{r.text}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
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
