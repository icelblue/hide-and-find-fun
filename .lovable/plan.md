# Pla pendent — Deduction Duel

Última actualització: recuperar aquesta llista al començar la propera sessió.

## Prioritat 🔴 Alta — pendent

1. **E2E real Personal PvP** (BLOCAT en sandbox: `LOVABLE_BROWSER_AUTH_STATUS=signed_out`).
   - Requereix 2 sessions autenticades simultànies — cal executar-ho quan el sandbox tingui sessió injectada, o manualment amb 2 comptes reals a producció.
   - Script Playwright a redactar: login host → `/space` (garantir ≥4 mobles) → lobby → 🏠 PvP a rival → login guest en context separat → acceptar invite → captura `game_personal.png` amb sala sintètica.

## Prioritat 🟡 Mitjana — ~2 crèdits

2. **Story Mode capítols 9-10** + 2-3 puzles d'ingredients addicionals per allargar el contingut final.

3. **Costs socials — tooltip + reset diari visible**
   - Tooltip explicatiu al botó (per què costa X, quan es reseteja).
   - Comptador visual del reset diari al `SocialItemsPanel`.

## Prioritat 🟢 Baixa (contingut/polish) — ~1 crèdit

4. **Catàleg de mobles ampliat** (Personal Space) — més varietat visual + alguns "rare" més cars amb bonus_tokens.

## ⚪ Opcional (si sobren crèdits) — ~0.5 crèdits

5. Badge "🏠 Personal" al header de `GamePage` per recordar el mode.
6. Ordenar lobby: invites personals primer.

---

## Estat consolidat (fet en sessions anteriors + aquesta)

- ✅ Wave B (costs socials backend + UI bàsic)
- ✅ Wave C (galleda, drap mullat, polish +2🪙)
- ✅ Wave A backend (curses/bonuses dinàmics per partida)
- ✅ **Wave A UI polish** — overlay `SpecialReveal` per curse/bonus (només moves propis)
- ✅ **Onboarding tutorials** (Space + Puzzles) via `OnboardingDialog` + localStorage flags (`onboarding:space:v1`, `onboarding:puzzle:v1`)
- ✅ Story Mode v5.2 (`story_item_effects` + skill-gated Ch5/7)
- ✅ Bloc C (Mini-puzzles ingredients)
- ✅ Bloc D (Personal Space 4×4 + botiga)
- ✅ Bloc E (Personal PvP: create RPC + adapter + lobby badge + tests)
- ✅ Spy trail (últimes 3 escenes rival)
- ✅ Drop rate 15%→8% (Master 20%→13%)
- ✅ Barricada 2 usos/dia
- ✅ Auditoria RPCs (B1-B8 tancats)
