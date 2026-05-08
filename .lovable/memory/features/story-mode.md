---
name: Story Mode v3
description: Aventura narrativa ramificada single-player. 8 capítols, ~48 nodes, 3 decisions/node, 6 finals + morts. Reset total si la mascota mor. Independent del PvP.
type: feature
---

## Mode Història v3 (Aventura ramificada)

### Estructura
- 48 nodes a `story_nodes` (id, chapter 1-8, title, narrative amb `{pet}` placeholder, is_ending, ending_type)
- 111 opcions a `story_choices` (3 per node no-final): label, next_node_id, reward_type, reward_value (jsonb)
- Run actiu a `story_runs` per usuari (current_node_id, path[], status: active/dead/completed)

### Recompenses (`reward_type`)
- `xp`: `{xp:N}` → addPetXP
- `damage`: `{damage:N}` → addPetXP (>=9999 = mort segura)
- `accessory`: `{accessory:"Nom",icon:"🎀"}` → awardAccessory
- `consumable`: `{consumable:"Menjar|Aigua|Vacuna"}` → insert pet_consumables

### Finals
6 endings: peaceful, hero, mystic, redeemed, lonely, adventure + 5 morts (fire, pan, wound, lost, dragon).
Mort = `killAndReset(userId)` → esborra pet, accessoris, consumibles, events, story_progress + drop runs.

### Fitxers
- `src/lib/story-runs.ts` — helpers (catàleg cached, getActiveRun, startRun, makeChoice, killAndReset)
- `src/components/story/StoryNodeView.tsx` — typewriter + 3 botons
- `src/components/story/StoryEndingScreen.tsx` / `StoryDeathScreen.tsx`
- `src/pages/StoryModePage.tsx` — phases: loading|intro|ready|playing|ended

### Independent del PvP
🔒 NO toca cap RPC ni taula de partida real (`games`, `game_players`, etc.).
El sistema antic d'`story_progress`+`create_story_game` es manté per compatibilitat però el flux nou no l'usa.

### Placeholder `{pet}`
Tots els textos (narrative + choice labels) substitueixen `{pet}` pel `pet_name` al frontend.
