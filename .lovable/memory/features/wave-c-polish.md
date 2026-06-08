---
name: Wave C — Galleda, Drap mullat, Abrillantar
description: Combo eines galleda + drap → drap mullat → polish +2🪙. Mobles fillable, drop 5%.
type: feature
---

# Wave C — Galleda + Drap mullat + Abrillantar (2026-06-08)

## Mobles fillable (tag `fillable`)
- Banyera, Pica (cuina), Pica (lavabo), Rentadora

## Combo (1 sol clic)
1. Jugador té `galleda > 0` + `drap > 0` + està en moble fillable.
2. Acció **Mullar drap** (cost 0.3🪙) → consumeix galleda + drap, +1 drap_mullat.
3. RPC: `execute_fill_water(_game_id, _item_id)`.

## Polish (Abrillantar)
- Acció sobre qualsevol moble **normal** (no dirty, no broken).
- Requereix `drap_mullat > 0`. Cost 0🪙.
- Recompensa: **+2🪙 GARANTIT**.
- RPC: `execute_polish(_game_id, _item_id)`. Log a game_moves amb `tag:polish:<item_id>`.

## Galleda — origen
- Pool partida = **2** compartit.
- Drop **5%** automàtic després de clean/fix exitós.
- RPC: `roll_galleda_drop(_game_id)` cridat des de client després de tag action.

## Tipus client
- `ToolType` afegeix `galleda` i `drap_mullat`.
- `PlayerTools.galleda`, `PlayerTools.drap_mullat` (default 0).
- `TOOLS_PER_GAME.galleda = 2`, `drap_mullat = 99` (sense límit, només via combo).

## UI
- Acció `fillable` (🪣) + acció `polish` (✨) apareixen a `ItemActions` quan condicions.
- Tools badge mostra `🪣N ✨N`.
- Toasts: `dampClothCreated`, `polishBonus`, `galledaFound`.
