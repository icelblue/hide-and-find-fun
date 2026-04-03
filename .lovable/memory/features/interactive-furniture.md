---
name: Interactive Furniture System
description: item_interactions table for reveal_items, enable_position, give_hint, reveal_content effects. DB + UI implemented.
type: feature
---

## Architecture
- Table `item_interactions` linked to `items` via item_id
- effect_type: reveal_items | enable_position | give_hint | reveal_content
- effect_data: JSONB with type-specific params
- cost: tokens, one_time: bool
- UI shows ⚡ indicator on items with interactions
- Interaction buttons appear above position grid when item expanded

## Scenario Limits
- `max_items` column on scenarios (default 20)
- Cuina/Jardí/Habitació/Menjador/Despatx: 15
- Balcó/Lavabo: 12
- Enforced in place_reward_item function

## Current Interactions
- 💡 Encendre el llum (Menjador) → reveal_content, 0.2🪙
- 🚪 Obrir l'armari (Habitació) → reveal_content, 0.2🪙

## Adding New Interactions
Just INSERT into item_interactions — no code changes needed:
```sql
INSERT INTO item_interactions (item_id, action_name, action_icon, action_label, cost, effect_type, effect_data, one_time)
VALUES ('item-uuid', 'netejar', '🧹', 'Netejar la taula', 0.3, 'reveal_content', '{"message": "..."}', true);
```

## Status: ✅ Fase 1 + Fase 2 complete
