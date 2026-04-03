// ============================================================
// HelpButton.tsx — Panell flotant de regles del joc
// ============================================================
// Mostra un modal scrollable amb totes les regles de Deduction
// Duel organitzades per seccions. S'obre amb el botó ❓ present
// al Lobby i a GamePage.
//
// El component `Tip` s'exporta per mostrar petits textos d'ajuda
// contextuals a qualsevol pàgina (ex: sota botons d'acció).
//
// NOTA: Quan s'obre el modal, es bloqueja l'scroll del body
// per evitar scroll-through en iOS (position: fixed + top trick).
// ============================================================

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { TOKEN_COSTS } from "@/lib/supabase-helpers";

/**
 * Array de regles del joc.
 * Cada entrada té un títol (amb emoji i cost si aplica) i un text descriptiu.
 * Mantenir sincronitzat amb qualsevol canvi de mecànica!
 */
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
    text: "Mira una posició d'un moble. Reps una pista progressiva:\n❄️ Fred → L'objecte NO és en aquesta habitació.\n🌡️ Calent → Bona habitació, moble incorrecte.\n🔥 Molt calent → Moble correcte, prova altra posició!\nAquesta acció NO TROBA l'objecte, només dona pistes.",
  },
  {
    title: "🔍 Confirmar · " + TOKEN_COSTS.confirm + "🪙",
    text: "L'ÚNICA acció que pot trobar l'objecte! Si encertes moble + posició, guanyes. Si falles, perds els tokens. Usa les pistes d'observar per saber on confirmar.",
  },
  {
    title: "💡 Pistes de l'objecte rival",
    text: "Al torn 2 reps la 1a pista sobre l'objecte que busques. Al torn 5, la 2a pista. Serveixen per deduir QUÈ busques.",
  },
  {
    title: "⚡ Ítems socials (1/dia)",
    text: "Un cop al dia pots usar un ítem:\n🍌 Plàtan — Bloqueja 1 posició del rival (es desbloqueja amb qualsevol acció).\n💣 Bomba de fum — Mou el TEU objecte a altra posició (1 ús/partida).\n🛡️ Escut — Protegeix del pròxim plàtan o intercanvi (1 ús, es desactiva després).\n🔄 Intercanvi — Intercanvia la teva ubicació amb la del rival.\n🕵️ Espia — Descobreix en quina habitació és el rival.\n💡 Pista — Envia un missatge o farol al rival.",
  },
  {
    title: "🎁 Bonus i eines",
    text: "Quan observes o confirmes, tens un 20% de trobar tokens extra o eines:\n🧹 Drap — per netejar mobles bruts (es troba automàticament si hi ha mobles bruts a prop).\n🔨 Martell — per trencar mobles fràgils.\n🔧 Tornavís — tothom comença amb 1! Per arreglar mobles trencats.\n🔦 Llanterna — per il·luminar zones fosques a l'exterior.\n⚡ Les eines són IL·LIMITADES dins la mateixa partida (no es consumeixen).",
  },
  {
    title: "💡 Llum i llanterna",
    text: "🏠 Interiors: El llum està encès per defecte. Pots apagar-lo (0.2🪙) perquè ningú vegi els mobles — ni tu ni el rival! Qualsevol pot encendre'l de nou.\n🌿 Exteriors (Jardí, Balcó): No hi ha llum! Usa 🔦 Llanterna (0.2🪙) per revelar mobles ocults (Baúl, Gerro). La llanterna no es consumeix.",
  },
  {
    title: "⚡ Mobles interactius",
    text: "Alguns mobles tenen accions basades en les seves propietats:\n🧹 Netejar (mobles bruts 🧹) — 0.2🪙, cal Drap, 50% bonus. Els mobles bruts canvien cada partida!\n💥 Trencar (mobles fràgils) — 0.3🪙, cal Martell, notifica el rival on ets!\n🔧 Arreglar (mobles trencats) — 0.2🪙, cal Tornavís, 40% bonus.\nBusca el 🧹 o ⚡ al nom del moble!",
  },
  {
    title: "🏆 Recompenses",
    text: "Guanya partides per obtenir mobles decoratius. Col·loca'ls en escenaris (fins al límit!) o ven-los per tokens bonus. La Foto (🖼️) es pot guardar com a trofeu amb un nom personalitzat!",
  },
  {
    title: "📈 Elo i Lligues",
    text: "Guanyar: +25 Elo · Perdre: -20 Elo.\n🥉 Bronze (< 1200) → 🥈 Silver → 🥇 Gold → 💎 Platinum → 👑 Diamond (≥ 1800).",
  },
];

/**
 * Botó d'ajuda "❓" que obre un modal fullscreen amb les regles del joc.
 * Usat al header del Lobby i del GamePage.
 */
export function HelpButton() {
  const [open, setOpen] = useState(false);

  // Bloqueja l'scroll del body quan el modal és obert (fix iOS scroll-through)
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

      {/* Modal overlay — backdrop blur + centered card */}
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
            {/* Header fix (no scrollable) */}
            <div className="flex items-center justify-between px-5 pt-5 pb-2 shrink-0">
              <h2 className="text-lg font-bold">📖 Com jugar</h2>
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                ✕
              </Button>
            </div>
            {/* Scrollable rules list */}
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
                  <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">{r.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Component de text d'ajuda contextual.
 * Mostra text petit i en cursiva, usat per donar pistes
 * sota botons o seccions de la UI.
 *
 * Exemple: <Tip>Observar dona pistes, no troba l'objecte!</Tip>
 */
export function Tip({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] text-muted-foreground/70 italic leading-snug">{children}</p>
  );
}
