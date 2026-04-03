---
name: Game Mechanics v2
description: Progressive hints, explored spots tracking, banana blocks 1 spot, smoke bomb 1x/game, espia reveals rival location
type: feature
---

## Actions
- **Observar (0.3🪙)**: Gives progressive hints only. ❄️ cold (wrong scenario), 🌡️ warm (right scenario wrong item), 🔥 hot (right item wrong position). NEVER finds the object. hint_level stored in game_moves.
- **Confirmar (1.5🪙)**: The ONLY way to find the object. If correct item+position, player wins.
- **Moure (0.5🪙)**: Move to connected scenario.

## Explored Spots
- **Looked spots**: Disable only the look button (can still confirm there)
- **Confirmed spots**: Disable both look and confirm buttons
- Critical: after looking and getting 🔥 hot, player MUST be able to confirm there

## Social Items (1/day)
- 🍌 **Plàtan**: Blocks 1 random position button. Unblocks on any other action.
- 💣 **Bomba de fum**: Moves YOUR hidden object to different position (1x/game). NOT blocked by shield.
- 🛡️ **Escut**: Protects from next banana ONLY. Deactivates after blocking. Does NOT block smoke bomb or espia.
- 🕵️ **Espia**: Reveals which scenario the rival is currently in. Self-targeted (no notification to rival).
- 💡 **Pista personalitzada**: Send a message/bluff to the rival.
- ~~🔮 Pista falsa~~: REMOVED from game.

## Hide Message
- When hiding ANY object, player can optionally write a message (100 chars)
- Message stored in special_data.hide_message
- Shown to finder via toast when they win
- Saved in trophy special_data.custom_message

## Bonuses
- hint_yes / hint_no bonuses from scenario_bonuses are IGNORED (replaced by progressive hints)
- extra_token bonuses still work
