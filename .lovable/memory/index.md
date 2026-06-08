# Memory: index.md
Updated: 2026-06-08 (Wave B + Wave C aplicades)

# Project Memory

## Core
Deduction Duel — joc PvP puzzle de deducció. Català/Castellà UI. Mobile-first (390px).
7 escenaris reals: Balcó, Cuina, Despatx, Habitació, Jardí, Lavabo, Menjador.
2 accions actives: Observar 0.3🪙, Moure 0.5🪙. **4 tokens/dia**, 7 dies límit.
Simultani: amagar + buscar alhora. Elo + Lligues visuals. Pistes: 5 nivells icona+tooltip.
Eines pool partida: martell 5, drap 5, llanterna **5**, tornavís 5. Drop 25% (30% si Mestre Col·leccionista).
**Eines consumibles**: drap (clean), martell (break), llanterna (encendre exterior). Tornavís UNLIMITED en ús (pot quedar a 0 però roll prioritari + `execute_robar_tornavis` social).
**Anti-bloqueig llanterna**: `execute_toggle_light` regala llanterna gratis del pool si vols encendre exterior i no en té ningú. Social `execute_robar_llanterna` gratis.
**Caselles maleïdes**: -0.3🪙 (-0.5 si rival Elo≥1400). 14 caselles (2/escenari).
Netejar = **+0.3🪙 GARANTIT** (drap auto-donat via RPC `execute_grant_drap_if_available`). Trencar revela escenari al rival.
**Outdoor scenarios** (necessiten llanterna de nit): Jardí, Balcó, Terrassa, Pati — derivat de BD `scenarios.is_outdoor`.
**Breakable/Dirty**: ~60% subset determinístic per partida via hash (`getBreakableItemsForGame` / `getDirtyItemsForGame`).
**Costos socials** (Wave B): Plàtan/Barricada/Trampa/Espia/Robar tornavís 0.5🪙, Swap 1.0🪙. Defensius (Escut, Missatge, Bomba fum, Robar llanterna) gratis. RPC `consume_social_cost`.
**Wave C — Polish**: galleda (pool 2, drop 5% en clean/fix) + drap → drap_mullat (RPC `execute_fill_water`, 0.3🪙). Drap_mullat sobre moble normal → **+2🪙 garantit** (RPC `execute_polish`). Mobles fillable: Banyera, Pica×2, Rentadora.
Mestre Col·leccionista (50/50 reward_items): ×2 bonus tokens + +5% prob eines + badge 👑.

## Memories
- [Pressure & Bluff checklist](mem://features/pressure-bluff-checklist) — Estat implementació CORE v1
- [Collection Master](mem://features/collection-master) — Distintiu 50/50, triggers, ×2 bonus, +5% eines, badge UI
- [Game architecture](mem://features/game-architecture) — Regles completes, flux, tokens, condicions
- [Scenarios & Actions](mem://features/scenarios) — Escenaris complets amb arbres, accions i costos
- [Social items](mem://features/social-items) — Plàtan, bomba fum, escut, missatge, espia, swap, barricada, trampa, robar_tornavis
- [Ranking system](mem://features/ranking) — Elo intern + Lligues Bronze→Diamant
- [Pet personality](mem://features/pet-personality) — Sistema híbrid traits (Mode Història)
