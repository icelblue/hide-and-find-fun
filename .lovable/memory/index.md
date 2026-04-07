# Project Memory

## Core
Deduction Duel v1.9.0 — joc PvP puzzle de deducció. Català/Castellà UI. Mobile-first (390px).
Moviments via RPC SECURITY DEFINER (execute_game_move, toggle_light, tag_action).
Simultani: amagar + buscar alhora. Elo + Lligues visuals. Pistes: icona + tooltip.
Accions: 0.3 (observar) / 0.5 (moure). Eines il·limitades. Pool compartit.
game_players fora de realtime. get_safe_game_players emmascara hidden_*.
Menú: 1r Perfil, 2n Mode Història. Swipe-to-delete partides.

## Memories
- [Game architecture](mem://features/game-architecture) — Regles completes, flux, tokens, condicions
- [Game mechanics v2](mem://features/game-mechanics-v2) — Hints progressives, bomba fum, banana
- [Scenarios & Actions](mem://features/scenarios) — 3 escenaris complets amb arbres, accions i costos
- [Social items](mem://features/social-items) — Plàtan, bomba fum, pista falsa, escut, missatge
- [Ranking system](mem://features/ranking) — Elo intern + Lligues Bronze→Diamant
- [Object validation](mem://features/objects) — Regex, diccionari, propietats booleanes
- [Rewards](mem://features/rewards) — Mobles per guanyar partides, raresa, vendre/col·locar
- [Story mode](mem://features/story-mode) — Tutorial single-player, mascota amb evolució, events salut (virus/febre/caiguda), consumibles curatius, mort/renaixement a 5000 XP
- [Interactive furniture](mem://features/interactive-furniture) — Interaccions amb mobles, eines compartides
