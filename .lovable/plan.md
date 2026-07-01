# Pla pendent — Deduction Duel

Última actualització: recuperar aquesta llista al començar la propera sessió.

## Prioritat 🔴 Alta (bugs/UX crítics) — ~2 crèdits

1. **E2E real Personal PvP**
   - Smoke Playwright amb 2 sessions reals (host + guest) jugant una partida personal completa.
   - Captura `game_personal.png`.
   - Verificar que el guest carrega correctament el `host_space_snapshot` (ara només s'ha validat des de la perspectiva de l'host).

2. **Tutorial onboarding Personal Space + Puzzles**
   - Primer cop que l'usuari entra a `/space`: dialog explicatiu (grid 4×4, botiga amb bonus_tokens, mínim 4 mobles per jugar PvP personal).
   - Primer cop que troba un puzle d'ingredients al Mode Història: dialog explicatiu (ordre correcte, límit d'intents, penalització skip).
   - Flag a `profiles` (`tutorial_space_seen`, `tutorial_puzzle_seen`) o localStorage.

## Prioritat 🟡 Mitjana — ~2 crèdits

3. **Wave A UI polish** — animacions de revelació de maledicció/bonus (ara només ring + emoji estàtic). Reutilitzar `RewardReveal` del Mode Història com a base.

4. **Story Mode capítols 9-10** + 2-3 puzles d'ingredients addicionals per allargar el contingut final.

5. **Costs socials — tooltip + reset diari visible**
   - Tooltip explicatiu al botó (per què costa X, quan es reseteja).
   - Comptador visual del reset diari al `SocialItemsPanel`.

## Prioritat 🟢 Baixa (contingut/polish) — ~1 crèdit

6. **Catàleg de mobles ampliat** (Personal Space) — més varietat visual + alguns "rare" més cars amb bonus_tokens.

## ⚪ Opcional (si sobren crèdits) — ~0.5 crèdits

7. Badge "🏠 Personal" al header de `GamePage` per recordar el mode.
8. Ordenar lobby: invites personals primer.

---

## Recomanació d'execució segons crèdits disponibles

- **5 crèdits** → 1 + 2 + 3 (bug bloquejant + onboarding + polish visual notable).
- **8+ crèdits** → afegir 4 + 5.
- **10+ crèdits** → tot fins 6, deixar 7-8 com a buffer.

## Estat consolidat (fet en sessions anteriors)

- ✅ Wave B (costs socials backend + UI bàsic)
- ✅ Wave C (galleda, drap mullat, polish +2🪙)
- ✅ Wave A backend (curses/bonuses dinàmics per partida)
- ✅ Story Mode v5.2 (`story_item_effects` + skill-gated Ch5/7)
- ✅ Bloc C (Mini-puzzles ingredients)
- ✅ Bloc D (Personal Space 4×4 + botiga)
- ✅ Bloc E (Personal PvP: create RPC + adapter + lobby badge + tests)
- ✅ Spy trail (últimes 3 escenes rival)
- ✅ Drop rate 15%→8% (Master 20%→13%)
- ✅ Barricada 2 usos/dia
- ✅ Auditoria RPCs (B1-B8 tancats)
