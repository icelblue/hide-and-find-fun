---
name: Game Mechanics v2
description: Progressive hints, explored spots tracking (look vs confirm separate), banana blocks 1 spot, smoke bomb 1x/game
type: feature
---

## Actions
- **Observar (0.3🪙)**: Gives progressive hints only. ❄️ cold (wrong scenario), 🌡️ warm (right scenario wrong item), 🔥 hot (right item wrong position). NEVER finds the object.
- **Confirmar (1.5🪙)**: The ONLY way to find the object. If correct item+position, player wins.
- **Moure (0.5🪙)**: Move to connected scenario.

## Explored Spots
- **Looked spots**: Disable only the look button (can still confirm there)
- **Confirmed spots**: Disable both look and confirm buttons
- Critical: after looking and getting 🔥 hot, player MUST be able to confirm there

## Banana (Social Item)
- Blocks 1 random position button (item:position combo)
- Shows 🍌 on the blocked spot
- Unblocks when player spends tokens on ANY other action (move, look, or confirm elsewhere)
- Does NOT block entire screen anymore

## Smoke Bomb
- Limited to 1 use per game per player (smoke_bomb_used column)
- Moves YOUR hidden object to a different position (not item, just position)
