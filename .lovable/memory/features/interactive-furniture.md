---
name: Interactive Furniture System v1.8
description: Tag-based actions, SHARED COMPETITIVE tool pool (first to find keeps it), breakable state shared, dirty random per game, robar_tornavis social item
type: feature
---

## Tag-Based Actions
| Tag | Action | Tool | Cost | Effect |
|-----|--------|------|------|--------|
| `dirty` | 🧹 Netejar | 🧹 Drap ✓ | 0.2🪙 | 50% mini bonus |
| `breakable` | 💥 Trencar | 🔨 Martell ✓ | 0.3🪙 | Notifies rival, moble trencat per TOTS DOS |
| `broken` | 🔧 Arreglar | 🔧 Tornavís ✓ | 0.2🪙 | Fixes item, 40% mini bonus |

## Tools — SHARED COMPETITIVE POOL
- **Pool per partida** (compartit entre els 2 jugadors):
  - 🔨 Martell: **5** total
  - 🧹 Drap: **2** total
  - 🔦 Llanterna: **1** total
  - 🔧 Tornavís: **5** extra (tothom ja comença amb 1)
- **Qui la troba se la queda!** El rival es queda sense.
- **UNLIMITED USE**: Un cop trobada, no es gasta
- **Found**: 20% chance on look/light/clean/fix (5% each type)
- **Drap**: Auto-donat (1) quan entres a escenari amb mobles bruts
- **Pool check**: Abans d'atorgar, consulta `game_players.tools` de TOTS dos jugadors

## Social Item: Robar Tornavís
- Type: `robar_tornavis` (enum social_item_type)
- Icon: 🔧 | Name: "Robar tornavís"
- Effect: Roba 1 tornavís del rival i l'afegeix al teu inventari
- Blocked by shield: YES
- Error if rival has 0 tornavís

## Breakable State — SHARED between players
- Stored as `game_moves` with `bonus_value: "tag:break:{itemId}"`
- Both players see broken state
- Arreglar removes the break

## Dirty Furniture — Random Per Game
- `getDirtyItemsForGame(items, gameId)` selects ~60% via deterministic hash
- Same game = same dirty items

## Current Interactive Items (DB)
- **Breakable (5)**: Vitrina, Llum×2, Quadre, Televisió, Armari mirall
- **Dirty (7)**: Catifa×3, Paperera, Armari mirall, Cistella, Rentadora
- **Hidden (2)**: Gerro (Balcó), Baúl (Jardí)
