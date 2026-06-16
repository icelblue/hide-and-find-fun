---
name: Story Mode v5.1
description: Aventura ramificada single-player. v5.2 elimina DiscoveryJournal (duplicava Objectes/Receptes amb Motxilla). Finals descoberts ara són pestanya 🏁 dins InventoryDrawer (5 tabs: Objectes/Receptes/Accessoris/Finals/Ajuda). v5.1 base: decay temporal, ús d'items, auto-descobriment receptes, HelpDialog, requisits mons visibles.
type: feature
---

## Mode Història v5.1 — "El Viatge de {pet}"

### v5.1 noves peces (sobre v5)
- **Decay temporal**: `getPetState` calcula decay segons `updated_at` (cada 6h: hunger +15, sleep +12, fear -5, bond -3) i persisteix.
- **Ús d'items**: `useItemOnPet` consumeix 1 unitat i aplica efecte. `getItemEffect` mapeja per `item_id` o per keywords del nom (poma/aigua/manta/joguina/poció/flor).
- **Auto-discover receptes**: `autoDiscoverRecipes(userId, inv)` insereix a `story_recipe_book` les receptes desbloquejades amb ingredients actuals + toast 💡. S'invoca a `loadAll`, després de cada `handleChoose` amb item nou, i després de `useItem`/`combine`.
- **Motxilla amb pestanyes** (`InventoryDrawer`): Objectes (botó "Donar...") · Receptes (descobertes + siluetes "???") · Ajuda.
- **`HelpDialog`** persistent (botó ❓): 4 pestanyes Bàsic / Necessitats / Receptes / Mons. Visible a "ready" i "playing".
- **`WorldMap`** mostra requisits exactes sota mons bloquejats (no només "🔒").
- **`PlayerProfilePage`** mostra `Lv. X` al costat del nom de la mascota.

### Estructura: 4 mons que es desbloquegen
| Món | Caps | Desbloqueig |
|-----|------|-------------|
| 🏠 Casa | 1-2 | sempre |
| 🌳 Carrer | 3-4 | vincle ≥ 40 |
| 🌲 Bosc | 5-6 | 3+ receptes descobertes |
| 🏰 Castell | 7-8 | nivell ≥ 7 |

### Pilars de progressió persistent
1. **Nivells 1→10** (`player_pets.level`, +1 cada 500 XP).
2. **Habilitats** (Lv2 👃 Olfacte · Lv4 💪 Força · Lv6 ✨ Empatia · Lv8 🔥 Coratge · Lv10 👑 Llegenda) desbloquegen choices `requires_skill`.
3. **Evolució visual** (`getPetEvolution`): Bebè 🥚 / Jove 🌱 / Adult ⭐ / Veterà 🔥 / Llegendari 👑.
4. **Diari de descobertes** (`DiscoveryJournal`).

### Necessitats (4 estats)
- 😋 Gana, 😴 Son, 😨 Por, ❤️ Vincle (0-100). Decau temporal automàtic cada lectura.
- Pet_events (malalties 🤒) són sistema separat: regalats per altres usuaris amb consumibles.

### Branques noves cada cop
`story_choices.requires_skill / min_visits / max_visits` + `story_node_visits`.

### Fitxers clau v5.1
- `src/lib/story-state.ts` — decay, ITEM_EFFECTS, useItemOnPet, autoDiscoverRecipes
- `src/lib/story-progression.ts` — nivells, skills, mons, visites, diari
- `src/components/story/InventoryDrawer.tsx` — Tabs (Objectes/Receptes/Ajuda)
- `src/components/story/HelpDialog.tsx` — tutorial 4 pestanyes
- `src/components/story/WorldMap.tsx` — requisits visibles
- `src/components/story/{DiscoveryJournal,PetEvolutionCard}.tsx`
- `src/lib/story-runs.ts` — `startRun(userId, startNodeId?, worldId?)`
- `src/components/story/StoryNodeView.tsx` — filtra per skill+visits
- `src/pages/StoryModePage.tsx` — integra tot
- `src/pages/PlayerProfilePage.tsx` — mostra Lv. X

### Independent del PvP 🔒
Cap RPC PvP, cap taula PvP modificada.

### v5.2 (2026-06-16)
- **Peça A · Effects explícits**: nova taula `story_item_effects (item_id, kind, d_hunger, d_sleep, d_fear, d_bond)` + cache a `story-state.ts`. `getItemEffect` consulta cache BD abans del fallback per keyword. Seeds: 12 base + 4 outputs de receptes (amulet_seafire, clau_obrible, pocio_calma, ruta_secreta) + 3 d'inventari existent (clau_vella, sea_pearl, shell). `getItemEffectAsync` per UIs que vulguin esperar cache.
- **Peça B · Skill choices Bosc/Castell**: 5 noves opcions `requires_skill` als capítols 5 i 7 (👃 c5_forest, 💪 c5_forest_wolf, ✨ c5_forest_storm, 🔥 c7_dragon, 👑 c7_silence). Cada node manté ≥3 opcions sense skill.

### Pendent (blocs grans amb disseny obert)
- Mini-puzzles (schema `story_nodes.puzzle_data`?)
- Espai propi amb mobles desbloquejables (nova taula `player_spaces`)
- Selector d'espai personalitzat al crear partida PvP (depèn d'espai propi)

