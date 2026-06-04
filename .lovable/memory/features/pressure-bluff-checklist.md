---
name: Pressure & Bluff Checklist
description: Implementation checklist for CORE v1 pressure-and-bluff pack. Updated as items complete. Source of truth even if memory is lost.
type: feature
---

# CORE v1 — Pressió i Bluff

Decisions aprovades per l'usuari (veure `.lovable/plan.md` per detall complet).

## Checklist (marcar `[x]` quan fet)

- [x] 1. Migració: token_reset 5→4 (execute_tag_action + execute_toggle_light + default)
- [ ] 2. Migració: costs socials (RPCs execute_*) — **WAVE B**
- [x] 3. Migració: scenario_bonuses negatius (-0.3) inserts (2 per escenari × 7 = 14 caselles)
- [x] 4. Migració: aplicar -0.5 quan rival.elo>=1400 a execute_game_move
- [x] 5. Migració: execute_tag_action revela nom escenari al trencar
- [x] 6. Migració: TOOLS consumibles — drap/martell/llanterna decrement on use. Tornavís UNLIMITED. Drap dona +0.3🪙 GARANTIT.
- [x] 7. Frontend: badge "1 ús" als consumibles
- [ ] 8. Frontend: marcar Help amb regles noves
- [x] 9. i18n: textos nous (casella maleïda, consum eina)
- [x] 10. Memory: actualitzar game-mechanics-v2 + social-items + tools-system
- [ ] 11. Validació final: jugar 1 partida CPU end-to-end

## Notes de disseny
- **Tornavís UNLIMITED** justificació: és l'única manera de desbloquejar "sobre/dins" d'un moble trencat. Si bloquegéssim el joc.
- **Caselles maleïdes**: `scenario_bonuses.bonus_type='extra_token'` amb `value` negatiu (-0.3). RPC ja accepta numeric.
- **Elo threshold 1400**: si rival.elo ≥ 1400 → multiplicar penalització × 5/3 (-0.3 → -0.5).
- **Drap bonus**: +0.3🪙 GARANTIT (abans 50% × 0.3-0.5).

## Wave B pendent
Cost socials ofensius (Plàtan/Barricada/Trampa/Espia/Robar 0.5🪙, Swap 1.0🪙). Toca RPCs execute_barricada, execute_trampa, execute_swap, execute_robar_tornavis + deducció client per plàtan/espia (gestionats inline).
