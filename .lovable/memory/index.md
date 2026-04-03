# Project Memory

## Core
Deduction Duel — joc PvP puzzle de deducció. Català/Castellà UI. Mobile-first (390px).
Escenari→Zona→Spot→Amagatall (arbre decisió). 5 tokens/dia, 7 dies límit.
Simultani: amagar + buscar alhora. Elo + Lligues visuals. Pistes: icona + tooltip.
Accions amb cost variable: 0.3 (observar) / 0.5 (moure) / 1.5 (confirmar).
Camins 100% predefinits per escenari. 7 escenaris.
SemVer: MAJOR.MINOR.PATCH. Sempre dir a l'usuari si un canvi és minor/major/patch.
App version: v1.0.0 (src/lib/constants.ts). CHANGELOG.md al root.

## Memories
- [Game mechanics v2](mem://features/game-mechanics-v2) — Progressive hints, hint_level stored, espia item, swap item, hide message, shield/smoke fixes, foto trophy, furniture capacity, random bonuses
- [Interactive furniture v1.1](mem://features/interactive-furniture) — Tag-based actions (dirty→clean, breakable→break, broken→fix), tools (drap, tornavís), item_interactions for specials
- [Scenarios & Actions](mem://features/scenarios) — 7 escenaris complets amb arbres, accions i costos
- [Social items](mem://features/social-items) — Plàtan, bomba fum, escut, espia, intercanvi, missatge (pista falsa ELIMINADA)
- [Ranking system](mem://features/ranking) — Elo intern + Lligues Bronze→Diamant
- [Object validation](mem://features/objects) — Regex, diccionari, propietats booleanes
- [Rewards](mem://features/rewards) — Win → random furniture prize, place in scenario or sell

## Pending
- Pintar acció (ajornada)
- Database dump/seed per a instal·lació local
