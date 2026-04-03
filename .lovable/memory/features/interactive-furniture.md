---
name: Interactive Furniture System
description: item_interactions table for reveal_items, enable_position, give_hint, reveal_content effects. Fase 1 DB ready, Fase 2 UI pending.
type: feature
---

## Architecture
- Table `item_interactions` linked to `items` via item_id
- effect_type: reveal_items | enable_position | give_hint | reveal_content
- effect_data: JSONB with type-specific params
- cost: tokens, one_time: bool
- Tracked in game_moves as action "interact"

## Scenario Limits
- `max_items` column on scenarios (default 20)
- Cuina/Jardí/Habitació/Menjador/Despatx: 15
- Balcó/Lavabo: 12
- Enforced in place_reward_item function

## Status
- Fase 1 ✅: DB tables + max_items + function updated
- Fase 2 🔲: UI in GamePage + example interactions data
