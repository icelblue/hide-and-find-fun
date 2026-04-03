---
name: Interactive Furniture System v1.1
description: Tag-based actions (dirty→clean, breakable→break, broken→fix), tools (drap, tornavís), item_interactions for specials (encendre)
type: feature
---

## Tag-Based Actions (v1.1)
Items have `tags text[]` column. Actions derived from tags dynamically:

| Tag | Action | Tool | Cost | Effect |
|-----|--------|------|------|--------|
| `dirty` | 🧹 Netejar | Drap ✓ | 0.2🪙 | 50% mini bonus, consumes drap |
| `breakable` | 💥 Trencar | — | 0.3🪙 | Notifies rival, blocks item visually, spawns 🔧 for BOTH players |
| `broken` | 🔧 Arreglar | Tornavís ✓ | 0.2🪙 | Fixes item, 40% mini bonus, consumes tornavís |

## Tools
- Stored in `game_players.tools` JSONB: `{"drap": 0, "tornavis": 0}`
- Only last during the game (not persistent)
- Max 3 of each
- Found: 10% chance on look/confirm actions
- Breaking spawns tornavís for BOTH players (easy to fix)

## Tagged Items
- `dirty`: Catifa, Cistella, Paperera, Rentadora
- `breakable`: Vitrina, Llum, Quadre
- `dirty+breakable`: Armari mirall

## Special Interactions (item_interactions table)
Still used for unique effects like:
- 💡 Encendre el llum (Menjador) → reveal_items, 0.2🪙

## Game State Tracking
- Breaks tracked via `game_moves.bonus_value = "tag:break:{item_id}"`
- Fixes tracked via `tag:fix:{item_id}`
- Cleans tracked via `tag:clean:{item_id}`
- gameBreaks Set computed from all players' moves

## Key Design Principles
- All actions serve the core objective: finding the rival's hidden object
- Netejar = facilitador (bonus tokens/tools)
- Trencar = dificultador (reveals your position to rival)
- Arreglar = easy (tornavís spawns automatically when something breaks)
- "Obrir" action REMOVED — conflicts with confirm (1.5🪙)
