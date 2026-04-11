# Project Memory

## Core
Deduction Duel — joc PvP puzzle de deducció. Català/Castellà UI. Mobile-first (390px).
Escenari→Zona→Spot→Amagatall (arbre decisió). 5 tokens/dia, 7 dies límit.
Simultani: amagar + buscar alhora. Elo + Lligues visuals. Pistes: icona + tooltip.
Accions amb cost variable: 0.3 (observar) / 0.5 (explorar) / 1.0 (investigar) / 1.5 (confirmar).
Camins 100% predefinits per escenari. 3 escenaris inicials: Cuina, Biblioteca, Garatge.

## Memories
- [Game architecture](mem://features/game-architecture) — Regles completes, flux, tokens, condicions
- [Scenarios & Actions](mem://features/scenarios) — 3 escenaris complets amb arbres, accions i costos
- [Social items](mem://features/social-items) — Plàtan, bomba fum, pista falsa, escut, missatge
- [Ranking system](mem://features/ranking) — Elo intern + Lligues Bronze→Diamant
- [Object validation](mem://features/objects) — Regex, diccionari, propietats booleanes
- [Story Mode](mem://features/story-mode) — Mode Història, mascota, accesoris, consumibles, events salut
- [Tools system](mem://features/tools-system) — Eines estratègiques: dirty bloqueja dins, broken bloqueja sobre+dins
- [Regressions](mem://features/regressions) — Tests de regressió REG-001..006 a regressions.test.ts
