---
name: Story Mode v4
description: Aventura ramificada single-player. 8 capítols, recompenses ocultes, checkpoints, repte diari, estats mascota (gana/son/por/vincle), inventari narratiu i sistema de receptes. Independent del PvP.
type: feature
---

## Mode Història v4

### Mecàniques (v4)
- **Estats mascota** (taula `pet_state`, 0-100): hunger, sleep, fear, bond. Defaults 30/30/20/40. Cada `story_choices.state_delta` jsonb modifica un o més. UI: 4 barres a `PetStatsBar` (vincle, gana, son, por). Si fear≥95 → +50 dany XP.
- **Vincle (bond)**: choices amb `requires_bond` només surten si bond≥X. Marca ❤️.
- **Inventari narratiu** (taula `story_inventory`): reward_type='item' amb `{item_id,name,icon}`. Choices amb `requires_items: ["id1","id2"]` només surten si tens els items. Marca ✨.
- **Receptes** (taules `story_recipes` catàleg + `story_recipe_book` descobertes): reward_type='recipe' amb `{recipe_id,...}` afegeix la recepta al diari. Combinar a l'`InventoryDrawer` consumeix els items requerits i crea el resultat. 3 receptes seed.
- **UX**: Recompenses 100% ocultes fins després de triar (`RewardReveal` 1.5s). Autosave a cada decisió. `ChapterCompleteScreen` cada canvi de capítol amb resum + Pausar.
- **Repte diari** (`daily_challenge_log`): 1 node per `dow`, recompenses suaus.

### Fitxers
- `src/lib/story-runs.ts` — makeChoice aplica reward + state_delta + cleanup
- `src/lib/story-state.ts` — estats, inventari, receptes (`combineRecipe`)
- `src/lib/story-helpers.ts` — pet/accessoris/consumables (cleanup: ja no toca story_progress)
- `src/components/story/PetStatsBar.tsx` — 4 barres animades amb deltas visibles
- `src/components/story/InventoryDrawer.tsx` — motxilla 🎒 + receptes
- `src/components/story/StoryNodeView.tsx` — filtra choices per items/bond
- `src/components/story/{RewardReveal,ChapterCompleteScreen,DailyChallengeCard,StoryEndingScreen,StoryDeathScreen}.tsx`
- `src/pages/StoryModePage.tsx` — fases: loading|intro|ready|playing|chapter_break|ended

### Greeting fix
`playerName` = display_name → email prefix → "aventurer" (mai falla).

### Independent del PvP 🔒
Cap RPC PvP, cap taula PvP. Migració v4 ha eliminat:
- taula `story_progress` (sistema antic)
- RPCs `create_story_game`, `finish_story_game`
- columnes `games.is_story` i `games.story_chapter` (i 17 partides obsoletes)
- helpers obsolets: `getStoryProgress`, `initChapter`, `completeChapter`

### Pendent
- Espai propi amb mobles desbloquejables
- Selector d'espai personalitzat al crear partida PvP
- Mini-puzzles (puzzle_type/puzzle_data ja al schema)
- Més seeds amb items/state_delta a capítols 3-8
