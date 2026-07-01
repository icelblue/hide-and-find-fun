# Pla pendent — Deduction Duel

Última actualització: recuperar aquesta llista al començar la propera sessió.

# Pla pendent — Deduction Duel

Última actualització: recuperar aquesta llista al començar la propera sessió.

## Prioritat 🔴 Alta — pendent

1. **E2E real Personal PvP** (BLOCAT en sandbox: `LOVABLE_BROWSER_AUTH_STATUS=signed_out`).
   - Requereix 2 sessions autenticades simultànies — cal executar-ho quan el sandbox tingui sessió injectada, o manualment amb 2 comptes reals a producció.
   - Script Playwright a redactar: login host → `/space` (garantir ≥4 mobles) → lobby → 🏠 PvP a rival → login guest en context separat → acceptar invite → captura `game_personal.png` amb sala sintètica.


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
