---
name: Game Mechanics v2
description: Progressive hints, explored spots tracking, banana blocks 1 spot, smoke bomb moves to DIFFERENT scenario, espia reveals rival location, swap exchanges positions
type: feature
---

## Actions
- **Observar (0.3🪙)**: Gives progressive hints. ❄️ cold (wrong scenario), 🌡️ warm (right scenario wrong item), 🔥 hot (right item wrong position). **If correct item+position → FINDS the object and wins!** hint_level stored in game_moves (0=cold, 1=warm, 2=hot, 3=found).
  - **Hint noise (v1.9.0)**: 10% probability the returned hint is nudged to an ADJACENT level (0↔1 or 2↔1). Level 3 (found) is NEVER altered — victory is always honest. RPC returns `hint_noisy: true` when nudged. Makes PvP longer and less deterministic.
- **Moure (0.5🪙)**: Move to connected scenario.
- ~~**Confirmar**~~: REMOVED in v1.5.0. Observar now finds the object directly.
## Positions (v1.9.0)
4 posicions: ⬆️ sobre, ⬇️ sota, 📦 dins, 🔙 darrere.
- **dins**: bloquejat si `objSize > inner_capacity` (o capacity=0).
- **darrere**: bloquejat si `can_behind=false` al moble. Bloquejats lògicament: Catifa, Llum, Hamaca, Barana, Fanal, Pedra.
- Validació al frontend (ItemActions + hide UI) i al backend (`hideObject` a supabase-helpers).
- Type `Position` exportat des de `src/lib/game-types.ts` — sempre importar d'allà, mai literals "sobre" | "sota"…

## Furniture inner_capacity=0 (can't hide "dins")
Cadira, Llum, Catifa, Quadre, Taula, Tovalloler, Barana, Hamaca, Pedra, Banc, Ordinador, Televisió, **Arbre, Estenedor, Prestatge, Prestatgeria, Sofà** (added v1.9.0 — logical review).

## Explored Spots
- **Looked spots**: Disable the look button (already checked)
- Critical: only one action per position needed

## Social Items (1/day)
- 🍌 **Plàtan**: Blocks 1 random position button. Unblocks on any other action.
- 💣 **Bomba de fum**: Moves YOUR hidden object to a DIFFERENT scenario (random item + position). 1x/game. Sends self-notification with new location. NOT blocked by shield.
- 🛡️ **Escut**: Protects from next banana, swap, OR robar_tornavis. Deactivates after blocking. Does NOT block smoke bomb or espia.
- 🕵️ **Espia**: Reveals which scenario the rival is currently in. Self-targeted (no notification to rival).
- 🔄 **Intercanvi**: Swaps your current scenario with the rival's. Blocked by shield. Side effects applied BEFORE realtime notification.
- 💡 **Pista personalitzada**: Send a message/bluff to the rival.
- 🔧 **Robar tornavís**: Steals 1 screwdriver from rival. Blocked by shield.
- ~~🔮 Pista falsa~~: REMOVED from game.

## Hide Message
- ONLY available for **special objects** (objects with object_specials entry, e.g. Foto, Joguina)
- Regular objects do NOT have hide message option
- Message stored in special_data.hide_message
- Shown to finder via toast when they win
- Saved in trophy special_data.custom_message

## Foto Trophy
- Foto (🖼️) is a special object with prompt_on="find"
- When rival finds it, popup asks to name it and save as trophy
- Hide message from the hider is saved in the trophy's custom_message

## Material Labels (UI)
- fabric → "Roba", food → "Menjar", metal → "Metall", etc.
- Uses MATERIAL_LABELS map for display

## Material Restrictions (Simplified v1.6.1)
- Paper/Cardboard: blocked in wet, submergit, hot
- Food: blocked in dirty, químic
- Electronic: blocked in wet, submergit
- Wood: blocked in hot, submergit (floats)
- Fabric (Roba): blocked only in hot (can go in washing machine)
- Metal: NO restrictions (stainless steel)
- Plastic/Rubber: blocked in hot
- Leather: blocked in submergit, hot
- Glass/Ceramic/Stone/Generic: NO restrictions

## Furniture Positions
- inner_capacity=0 (can't hide "dins"): Cadira, Llum, Catifa, Quadre, Taula, Tovalloler, Barana, Hamaca, Pedra, Banc, Ordinador, Televisió
- UI blocks "dins" position when object size > inner_capacity

## Bonuses
- **Random per game**: 15% chance on each look action to find extra tokens (5% → 1 token, 10% → 0.5 tokens)
- 20% chance to find tools (drap, martell, tornavís, llanterna)
- Tools are UNLIMITED within a game (never consumed)

## Defeat Reveal
- When losing, player can see: rival's object, scenario, furniture, position, material (using MATERIAL_LABELS), traits, special type, and hide message

## Object Traits (Hints)
- ALL objects have exactly 2 traits in object_traits table
- Trait 1 shown after 2 moves, Trait 2 shown after 5 moves
- Traits help deduce WHAT object the rival hid

## Profile Collection
- Shows all reward_items catalog with owned/total count
- Greyed out items not yet collected
- Grouped by rarity with emoji indicators

## Help Button Reward Catalog
- Lists all reward items grouped by rarity
- Shows drop percentages: Common 50%, Uncommon 30%, Rare 13%, Epic 5%, Legendary 2%
- Shows sell values per rarity

## Bug Fixes (v1.8.1)
- Smoke bomb: now moves to different scenario (not just position), notifies owner of new location
- Added traits for Gel, Cor de vidre, Ratolí de PC (were missing)
