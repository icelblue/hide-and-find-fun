---
name: Story Mode v5
description: Aventura ramificada single-player amb 4 mons que es desbloquegen, evolució de mascota amb 10 nivells i 5 habilitats, mapa del viatge, diari de descobertes i branques noves cada cop que rejugues. Independent del PvP.
type: feature
---

## Mode Història v5 — "El Viatge de {pet}"

### Estructura: 4 mons que es desbloquegen progressivament
| Món | Caps | Desbloqueig |
|-----|------|-------------|
| 🏠 Casa | 1-2 | sempre |
| 🌳 Carrer | 3-4 | vincle ≥ 40 |
| 🌲 Bosc | 5-6 | 3+ receptes descobertes |
| 🏰 Castell | 7-8 | nivell ≥ 7 |

A la pantalla "ready" el jugador veu el `WorldMap` i tria on començar (no sempre c1_start).

### Pilars de progressió persistent
1. **Nivells 1→10** (`player_pets.level`, +1 cada 500 XP). Cada nivell pot desbloquejar habilitat (taula `pet_skills`).
2. **Habilitats** desbloquegen choices marcats `requires_skill`:
   - Lv2 👃 Olfacte · Lv4 💪 Força · Lv6 ✨ Empatia · Lv8 🔥 Coratge · Lv10 👑 Llegenda.
3. **Evolució visual** (`getPetEvolution`): Bebè 🥚 / Jove 🌱 / Adult ⭐ / Veterà 🔥 / Llegendari 👑 — visible al `PetEvolutionCard`.
4. **Diari de descobertes** (`DiscoveryJournal`): objectes, receptes, finals (X/Y).

### Branques noves cada cop
`story_choices` té camps `requires_skill`, `min_visits`, `max_visits`. Visites es registren a `story_node_visits`. Es mostra subtítol "Visita #N" quan n>1. ~12 noves variants seedades a caps 1-4.

### Onboarding narratiu
Pantalla "ready" mostra cita motivacional + barra global "🗺️ Mons X/4 · 🏁 Finals X/6 · 🧪 Receptes X". Subtítol contextual a cada node: "🏠 Casa · Capítol 2 · Visita #2".

### Taules v5 (additives)
- `pet_skills(user_id, skill_id)`
- `story_worlds(id, name, icon, start_node_id, chapters[], unlock_rule jsonb)`
- `story_world_progress(user_id, world_id, visits, completed_endings jsonb)`
- `story_node_visits(user_id, node_id, count)`
- `player_pets.level smallint`
- `story_choices.requires_skill / min_visits / max_visits`
- `story_runs.starting_world`
- Choice order constraint pujat a 1-6.

### Fitxers v5
- `src/lib/story-progression.ts` — nivells, skills, mons, visites, diari
- `src/components/story/{WorldMap,DiscoveryJournal,PetEvolutionCard}.tsx`
- `src/lib/story-runs.ts` — `startRun(userId, startNodeId?, worldId?)`, `makeChoice` registra visites/finals/skills
- `src/components/story/StoryNodeView.tsx` — filtra per skill+visits, subtítol món

### Mecàniques v4 (mantingudes)
Estats `pet_state` (hunger/sleep/fear/bond), inventari, receptes, recompenses ocultes, `RewardReveal`, `ChapterCompleteScreen`, repte diari.

### Independent del PvP 🔒
Cap RPC PvP, cap taula PvP modificada.

### Pendent
- Mini-puzzles (puzzle_type/puzzle_data ja al schema)
- Espai propi amb mobles desbloquejables
- Selector d'espai personalitzat al crear partida PvP
- Més seeds amb requires_skill a capítols 5-8
