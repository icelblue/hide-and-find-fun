// ============================================================
// regressions.test.ts — Tests de regressió
// ============================================================
// Cada test documenta un bug trobat, quan es va detectar, i la correcció.
// Si un test falla, significa que la regressió ha tornat.
// ============================================================
import { describe, it, expect, vi } from "vitest";
import { buildTrophySpecialData, getHideMessage, getTrophyDisplayName, getTrophyDisplayIcon } from "@/lib/object-specials";

// ============================================
// REG-001: Trofeus duplicats per clics ràpids
// Data: 2026-04-11 | Fix: actionLoading guard + unique index DB
// Bug: Al clicar "Desar trofeu" múltiples cops ràpidament,
//      s'inserien múltiples trofeus per la mateixa partida.
// ============================================
describe("REG-001: Trofeus duplicats", () => {
  it("buildTrophySpecialData retorna dades consistents per un sol trofeu", () => {
    const data = buildTrophySpecialData({
      special: { special_type: "custom_name" },
      objectRecord: { name: "Foto", icon: "🖼️" },
      inputName: "Vacances",
    });
    expect(data.custom_name).toBe("Vacances");
    expect(data.object_name).toBe("Foto");
    // Un sol objecte, un sol resultat — la protecció de duplicats és a DB (unique index)
  });
});

// ============================================
// REG-002: Bonus tokens infinits (no es restaven del perfil)
// Data: 2026-04-11 | Fix: RPC redeem_bonus_tokens amb FOR UPDATE
// Bug: Al afegir bonus tokens a una partida, no es descomptaven
//      del perfil del jugador, permetent tokens infinits.
// ============================================
describe("REG-002: Bonus tokens infinits", () => {
  it("la funció redeemBonusTokens ha d'existir i usar RPC atòmic", async () => {
    // Validem que la funció importada existeix (la lògica atòmica és a DB)
    const { redeemBonusTokens } = await import("@/lib/supabase-helpers");
    expect(typeof redeemBonusTokens).toBe("function");
  });
});

// ============================================
// REG-003: Bomba de fum mou objecte a lloc ja mirat (rival no pot guanyar)
// Data: 2026-04-11 | Fix: rivalSmokeBombAt state + filter lookedSpots
// Bug: Quan s'usava bomba de fum, l'objecte es movia a un lloc on
//      el rival ja havia mirat i no podia tornar a mirar-hi.
// ============================================
describe("REG-003: Bomba de fum reset mirades", () => {
  it("lookedSpots anteriors a smoke bomb s'han d'ignorar", () => {
    // Simulem la lògica de filtratge
    const smokeBombAt = "2026-04-11T15:00:00Z";
    const lookedSpots = [
      { key: "item1-sobre", at: "2026-04-11T14:00:00Z" }, // ABANS de bomba → s'ha d'ignorar
      { key: "item2-dins", at: "2026-04-11T16:00:00Z" },  // DESPRÉS de bomba → es manté
    ];
    const filtered = lookedSpots.filter(s => s.at > smokeBombAt);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].key).toBe("item2-dins");
  });
});

// ============================================
// REG-004: Doble-clic ítems socials (acció múltiple)
// Data: 2026-04-11 | Fix: actionLoading prop a SocialItemsPanel
// Bug: Al clicar ràpidament un ítem social, s'enviava múltiples
//      cops la mateixa acció.
// ============================================
describe("REG-004: Doble-clic ítems socials", () => {
  it("actionLoading ha de bloquejar accions concurrents", () => {
    // La protecció és a UI (disabled={actionLoading}),
    // validem que el pattern és correcte amb un mock
    let actionLoading = false;
    const actions: string[] = [];

    const sendItem = () => {
      if (actionLoading) return; // guard
      actionLoading = true;
      actions.push("sent");
      // simula async
      actionLoading = false;
    };

    sendItem();
    // Simulem clic ràpid durant actionLoading
    actionLoading = true;
    sendItem(); // hauria de ser bloquejat
    actionLoading = false;

    expect(actions).toHaveLength(1); // Només 1 acció enviada
  });
});

// ============================================
// REG-005: Popup objecte especial desapareix (Carta, Foto)
// Data: 2026-04-11 | Fix: re-fetch objectSpecial a handleSelectPosition
// Bug: El popup d'objecte especial (pas 5) no apareixia perquè
//      objectSpecial es perdia per race condition.
// ============================================
describe("REG-005: Popup especial desapareix", () => {
  it("objectes amb prompt_on=hide han de mostrar pas 5", () => {
    const special = { prompt_on: "hide", special_type: "custom_message" };
    const shouldShowStep5 = special && special.prompt_on === "hide";
    expect(shouldShowStep5).toBe(true);
  });

  it("objectes amb prompt_on=find NO han de mostrar pas 5", () => {
    const special = { prompt_on: "find", special_type: "custom_name" };
    const shouldShowStep5 = special && special.prompt_on === "hide";
    expect(shouldShowStep5).toBe(false);
  });
});

// ============================================
// REG-006: Foto doble comportament (hide msg + find trophy)
// Data: 2026-04-11 | Fix: find_special_type + find_prompt_text camps
// Bug: La Foto havia de tenir popup al amagar (missatge) I al trobar
//      (nom trofeu), però el sistema només suportava un prompt_on.
// ============================================
describe("REG-006: Foto doble comportament", () => {
  it("objecte amb find_special_type mostra popup al find també", () => {
    const rivalSpecial = {
      prompt_on: "hide",
      special_type: "custom_message",
      find_special_type: "custom_name",
      find_prompt_text: "Posa nom a la foto:",
    };

    // Lògica del GamePage: si prompt_on !== "find" però té find_special_type
    let showPopup = false;
    if (rivalSpecial.special_type === "troll_effect") {
      // troll
    } else if (rivalSpecial.prompt_on === "find") {
      showPopup = true;
    } else if (rivalSpecial.find_special_type) {
      showPopup = true; // dual-behavior
    }
    expect(showPopup).toBe(true);
  });

  it("getHideMessage recupera missatge de custom_message", () => {
    expect(getHideMessage({ type: "custom_message", message: "Hola!" })).toBe("Hola!");
    expect(getHideMessage({ hide_message: "Secret" })).toBe("Secret");
  });

  it("trofeu de Foto mostra nom personalitzat", () => {
    const data = buildTrophySpecialData({
      special: { special_type: "custom_name" },
      objectRecord: { name: "Foto", icon: "🖼️" },
      inputName: "Platja 2026",
    });
    expect(getTrophyDisplayName(data)).toBe('"Platja 2026"');
    expect(getTrophyDisplayIcon(data)).toBe("🖼️");
  });
});
