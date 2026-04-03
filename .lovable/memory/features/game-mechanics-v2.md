---
name: Game Mechanics v2
description: Progressive hints, explored spots tracking, banana blocks 1 spot, smoke bomb 1x/game, espia reveals rival location, swap exchanges positions
type: feature
---

## Actions
- **Observar (0.3🪙)**: Gives progressive hints. ❄️ cold (wrong scenario), 🌡️ warm (right scenario wrong item), 🔥 hot (right item wrong position). **If correct item+position → FINDS the object and wins!** hint_level stored in game_moves (0=cold, 1=warm, 2=hot, 3=found).
- **Moure (0.5🪙)**: Move to connected scenario.
- ~~**Confirmar**~~: REMOVED in v1.5.0. Observar now finds the object directly.

## Explored Spots
- **Looked spots**: Disable the look button (already checked)
- Critical: only one action per position needed

## Social Items (1/day)
- 🍌 **Plàtan**: Blocks 1 random position button. Unblocks on any other action.
- 💣 **Bomba de fum**: Moves YOUR hidden object to different position (1x/game). NOT blocked by shield.
- 🛡️ **Escut**: Protects from next banana OR swap. Deactivates after blocking. Does NOT block smoke bomb or espia.
- 🕵️ **Espia**: Reveals which scenario the rival is currently in. Self-targeted (no notification to rival).
- 🔄 **Intercanvi**: Swaps your current scenario with the rival's. Blocked by shield.
- 💡 **Pista personalitzada**: Send a message/bluff to the rival.
- ~~🔮 Pista falsa~~: REMOVED from game.

## Hide Message
- When hiding ANY object, player can optionally write a message (100 chars)
- Message stored in special_data.hide_message
- Shown to finder via toast when they win
- Saved in trophy special_data.custom_message

## Foto Trophy
- Foto (🖼️) is a special object with prompt_on="find"
- When rival finds it, popup asks to name it and save as trophy
- Hide message from the hider is saved in the trophy's custom_message

## Furniture Positions
- inner_capacity=0 (can't hide "dins"): Cadira, Llum, Catifa, Quadre, Taula, Tovalloler, Barana, Hamaca, Pedra, Banc, Ordinador
- UI blocks "dins" position when object size > inner_capacity

## Bonuses
- **Random per game**: 15% chance on each look action to find extra tokens (5% → 1 token, 10% → 0.5 tokens)
- 20% chance to find tools (drap, martell, tornavís, llanterna)
- Tools are UNLIMITED within a game (never consumed)

## Defeat Reveal
- When losing, player can see: rival's object, scenario, furniture, position, material, traits, special type, and hide message
