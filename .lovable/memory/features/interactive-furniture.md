---
name: Interactive Furniture System v1.3
description: Tag-based actions, UNLIMITED tools (drap, martell, tornavís, llanterna), tornavís default, dirty random per game, drap auto-near-dirty, llanterna prominent outdoor
type: feature
---

## Tag-Based Actions (v1.3)
| Tag | Action | Tool | Cost | Effect |
|-----|--------|------|------|--------|
| `dirty` | 🧹 Netejar | 🧹 Drap ✓ | 0.2🪙 | 50% mini bonus |
| `breakable` | 💥 Trencar | 🔨 Martell ✓ | 0.3🪙 | Notifies rival |
| `broken` | 🔧 Arreglar | 🔧 Tornavís ✓ | 0.2🪙 | Fixes item, 40% mini bonus |

## Tools (v1.3 — UNLIMITED USE)
- **UNLIMITED**: Once you have a tool, it's never consumed
- **Tornavís**: Everyone starts with 1 (DB default `tornavis: 1`)
- **Drap**: Auto-given (1) when entering a scenario with dirty items (toast notification)
- **Martell & Llanterna**: Found randomly (5% each on look/confirm)
- Max 3 displayed, found: 20% total chance on look/confirm

## Dirty Furniture — Random Per Game
- Items tagged `dirty` in DB = eligible candidates
- `getDirtyItemsForGame(items, gameId)` selects ~60% via deterministic hash
- Same game always has same dirty items; different games = different dirty items
- Visual: dirty items show 🧹 icon, accent border

## Espia Social Item
- Shows rival's current scenario. If rival has no scenario yet: "El rival encara no s'ha mogut!"
- Result shown via toast with 8s duration
