# Project Memory

## Core
Deduction Duel — joc PvP puzzle de deducció. Català/Castellà UI. Mobile-first (390px).
Escenari→Zona→Spot→Amagatall (arbre decisió). 5 tokens/dia, 7 dies límit.
Simultani: amagar + buscar alhora. Elo + Lligues visuals. Pistes: icona + tooltip.
Accions amb cost variable: 0.3 (observar) / 0.5 (moure). Confirmar ELIMINAT v1.5.
Camins 100% predefinits per escenari. 7 escenaris: Cuina, Jardí, Balcó, Habitació, Menjador, Lavabo, Despatx.
Missatge secret NOMÉS per objectes especials (amb object_specials).
Materials: fabric="Roba", food="Menjar". Restriccions simplificades.
Documentació SEMPRE sincronitzada amb codi en cada canvi.

## Memories
- [Game mechanics v2](mem://features/game-mechanics-v2) — Observar+trobar, pistes progressives, items socials, restriccions materials
- [Interactive furniture](mem://features/interactive-furniture) — Tags, eines UNLIMITED, dirty random per game
- [Rewards](mem://features/rewards) — Win → random furniture prize, place in scenario or sell
- [Scenarios & Actions](mem://features/scenarios) — 7 escenaris amb arbres, accions i costos
- [Social items](mem://features/social-items) — Plàtan, bomba fum, escut, intercanvi, espia, missatge
- [Ranking system](mem://features/ranking) — Elo intern + Lligues Bronze→Diamant
- [Object validation](mem://features/objects) — Regex, diccionari, propietats booleanes
