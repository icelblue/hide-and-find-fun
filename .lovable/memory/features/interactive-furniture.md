---
name: Interactive Furniture System v1.6.1
description: Tag-based actions, UNLIMITED tools (per player, not shared), breakable state shared between players, dirty random per game
type: feature
---

## Tag-Based Actions
| Tag | Action | Tool | Cost | Effect |
|-----|--------|------|------|--------|
| `dirty` | 🧹 Netejar | 🧹 Drap ✓ | 0.2🪙 | 50% mini bonus |
| `breakable` | 💥 Trencar | 🔨 Martell ✓ | 0.3🪙 | Notifies rival, moble trencat per TOTS DOS |
| `broken` | 🔧 Arreglar | 🔧 Tornavís ✓ | 0.2🪙 | Fixes item, 40% mini bonus |

## Tools — PER PLAYER (not shared!)
- Each player has OWN tools in `game_players.tools` JSON
- **Default**: `{ drap: 0, tornavis: 1, martell: 0, llanterna: 0 }`
- **UNLIMITED USE**: Once found, never consumed
- **Max 3** of each tool per player
- **Found**: 20% chance on look/light/clean/fix (5% each: martell, tornavis, drap, llanterna)
- **Drap**: Auto-given (1) when entering scenario with dirty items (toast notification)
- **One player CANNOT steal rival's tools** — completely independent inventories

## Breakable State — SHARED between players
- Stored as `game_moves` with `bonus_value: "tag:break:{itemId}"`
- Built from ALL moves (not filtered by player_id) → both see broken state
- Arreglar removes the break from the shared set

## Dirty Furniture — Random Per Game
- `getDirtyItemsForGame(items, gameId)` selects ~60% via deterministic hash
- Same game = same dirty items; different games = different dirty items

## Current Interactive Items (DB)
- **Breakable (5)**: Vitrina, Llum×2, Quadre, Televisió, Armari mirall
- **Dirty (7)**: Catifa×3, Paperera, Armari mirall, Cistella, Rentadora
- **Hidden (2)**: Gerro (Balcó), Baúl (Jardí)

## Espia Social Item
- Shows rival's current scenario via toast (8s)
- If rival has no scenario: "El rival encara no s'ha mogut!"
