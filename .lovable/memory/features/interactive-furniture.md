---
name: Interactive Furniture System v1.3
description: Tag-based actions, UNLIMITED tools (drap, martell, tornavís, llanterna), tornavís default, dirty random per game, drap auto-given near dirty, llanterna prominent outdoor
type: feature
---

## Tag-Based Actions (v1.3)
Items have `tags text[]` column. Actions derived from tags dynamically:

| Tag | Action | Tool | Cost | Effect |
|-----|--------|------|------|--------|
| `dirty` | 🧹 Netejar | 🧹 Drap ✓ | 0.2🪙 | 50% mini bonus |
| `breakable` | 💥 Trencar | 🔨 Martell ✓ | 0.3🪙 | Notifies rival |
| `broken` | 🔧 Arreglar | 🔧 Tornavís ✓ | 0.2🪙 | Fixes item, 40% mini bonus |

## Tools (v1.3 — UNLIMITED USE)
- Stored in `game_players.tools` JSONB
- **Tornavís**: Everyone starts with 1 (DB default)
- **All tools: UNLIMITED use** within the same game (NOT consumed)
- Max 3 of each (for display), found: 20% chance on look/confirm
- Drap: auto-given (1) when entering a scenario with dirty items

## Dirty Furniture — Random Per Game (v1.3)
- Items tagged `dirty` in DB are ELIGIBLE, not always dirty
- `getDirtyItemsForGame(items, gameId)` uses deterministic hash to select ~60%
- Same game always has same dirty items (seeded by gameId)
- At least 1 dirty item guaranteed if eligible items exist

## Light System (v1.2)
- **Indoor**: Light toggle ON/OFF costs 0.2🪙, affects BOTH players
- **Outdoor** (Jardí, Balcó): Need 🔦 Llanterna to reveal hidden items
  - Llanterna NOT consumed (reutilitzable)
  - Button is prominent (large, animated) at outdoor scenarios
  - Jardí → reveals "Baúl" (hidden), Balcó → reveals "Gerro" (hidden)

## Key Design Principles
- All tools unlimited = less friction, more strategic
- Dirty = random per game = replayability
- Drap auto-given near dirty = no dead-end situations
- Tornavís default = arreglar always possible after breaks
