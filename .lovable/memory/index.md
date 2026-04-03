# Project Memory

## Core
Deduction Duel — joc PvP puzzle de deducció. Català/Castellà UI. Mobile-first (390px).
Escenari→Zona→Spot→Amagatall (arbre decisió). 5 tokens/dia, 7 dies límit.
Simultani: amagar + buscar alhora. Elo + Lligues visuals. Pistes: icona + tooltip.
Accions amb cost variable: 0.3 (observar) / 0.5 (explorar) / 1.0 (investigar) / 1.5 (confirmar).
Camins 100% predefinits per escenari. 3 escenaris inicials: Cuina, Biblioteca, Garatge.

## Memories
- [Game mechanics v2](mem://features/game-mechanics-v2) — Progressive hints, hint_level stored, espia item, hide message, shield/smoke fixes, foto trophy, furniture capacity
- [Scenarios & Actions](mem://features/scenarios) — 3 escenaris complets amb arbres, accions i costos
- [Social items](mem://features/social-items) — Plàtan, bomba fum, escut, espia, missatge (pista falsa ELIMINADA)
- [Ranking system](mem://features/ranking) — Elo intern + Lligues Bronze→Diamant
- [Object validation](mem://features/objects) — Regex, diccionari, propietats booleanes
- [Rewards](mem://features/rewards) — Win → random furniture prize, place in scenario or sell

## Pending
- Nou ítem social proposat: 🔄 Intercanvi (swap positions amb rival)
- Bonus aleatoris per partida (ara fixos a scenario_bonuses)
- Database dump/seed per a instal·lació local
