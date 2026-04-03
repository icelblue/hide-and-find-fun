---
name: Interactive Furniture System v1.2
description: Tag-based actions (dirty→clean, breakable→break+martell, broken→fix+tornavís), tools (drap, martell, tornavís, llanterna), light toggle indoor, llanterna reveals outdoor hidden items (Baúl, Gerro)
type: feature
---

## Tag-Based Actions (v1.2)
Items have `tags text[]` column. Actions derived from tags dynamically:

| Tag | Action | Tool | Cost | Effect |
|-----|--------|------|------|--------|
| `dirty` | 🧹 Netejar | 🧹 Drap ✓ | 0.2🪙 | 50% mini bonus, consumes drap |
| `breakable` | 💥 Trencar | 🔨 Martell ✓ | 0.3🪙 | Notifies rival, spawns 🔧 for BOTH, consumes martell |
| `broken` | 🔧 Arreglar | 🔧 Tornavís ✓ | 0.2🪙 | Fixes item, 40% mini bonus, consumes tornavís |

## Tools
- Stored in `game_players.tools` JSONB: `{"drap": 0, "tornavis": 0, "martell": 0, "llanterna": 0}`
- Only last during the game (not persistent)
- Max 3 of each
- Found: 20% chance on look/confirm (5% each: martell, tornavís, drap, llanterna)
- Breaking spawns tornavís for BOTH players

## Light System (v1.2)
- **Indoor** (Cuina, Habitació, Menjador, Lavabo, Despatx): Light starts ON
  - Toggle ON/OFF costs 0.2🪙, affects BOTH players
  - Light OFF → no furniture visible, can't investigate
  - Tracked via game_moves bonus_value: `tag:light_off:{scenario_id}` / `tag:light_on:{scenario_id}`
- **Outdoor** (Jardí, Balcó): No light switch
  - Need 🔦 Llanterna to reveal hidden items
  - Llanterna NOT consumed (reutilitzable), costs 0.2🪙
  - Jardí → reveals "Baúl" (hidden)
  - Balcó → reveals "Gerro" (hidden)
  - Tracked via `tag:flashlight:{scenario_id}` (per player)

## Tagged Items
- `dirty`: Catifa, Cistella, Paperera, Rentadora
- `breakable`: Vitrina, Llum, Quadre
- `dirty+breakable`: Armari mirall

## Game State Tracking
- Breaks tracked via `game_moves.bonus_value = "tag:break:{item_id}"`
- Fixes tracked via `tag:fix:{item_id}`
- Cleans tracked via `tag:clean:{item_id}`
- Light states tracked via `tag:light_off:{scenario_id}` / `tag:light_on:{scenario_id}`
- Flashlight reveals tracked via `tag:flashlight:{scenario_id}` (per player)

## Key Design Principles
- All actions serve the core objective: finding the rival's hidden object
- Netejar = facilitador (bonus tokens/tools)
- Trencar = dificultador (reveals your position to rival), requires martell
- Arreglar = easy (tornavís spawns automatically when something breaks)
- Light OFF = strategic sabotage (both players lose visibility)
- Llanterna = exploration reward for outdoor areas
