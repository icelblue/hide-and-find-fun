---
name: Interactive Furniture System v1.9
description: Tag-based actions (breakable 63 mobles, dirty 7, hidden 0). Tool pool COMPETITIU (veure tools-system.md). Estat trencat COMPARTIT entre jugadors.
type: feature
---

## Tag-Based Actions
Veure `tools-system.md` per costos i pool. Resum:
| Tag | Acció | Eina | Cost |
|-----|-------|------|------|
| `dirty` | 🧹 Netejar | 🧹 Drap | 0.2🪙 |
| `breakable` | 💥 Trencar | 🔨 Martell | 0.3🪙 |
| `broken` | 🔧 Arreglar | 🔧 Tornavís | 0.2🪙 |

## Inventari actual de mobles interactius (verificat a BD)

### Breakable: **63 mobles** (gairebé tots)
L'únic NO breakable a la BD és **Caixa de cartró**. Tota la resta (Aparador, Armari, Arxivador, Banyera, Barbacoa, Baúl, Cadires, Caixa, Calaix, Calaixera, Còmoda, Despensa, Escriptori, Llum, Quadre, Televisió, Vitrina, etc.) tenen `breakable` al tag.

### Dirty: **7 mobles** (verificat a BD)
- Armari mirall
- Catifa ×3 (instàncies diferents)
- Cistella
- Paperera
- Rentadora

`getDirtyItemsForGame()` agafa ~60% d'aquests per partida via hash determinístic.

### Hidden: **0 mobles**
El tag `hidden` no s'usa actualment a cap moble (esborrats d'iteracions anteriors).

## Breakable State — COMPARTIT entre jugadors
- Stored as `game_moves` amb `bonus_value: "tag:break:{itemId}"`
- Tots dos jugadors veuen l'estat trencat
- Arreglar elimina el break (consultat per `EXISTS` en moves posteriors)

## Bloqueig de posicions per estat
- **Brut** → bloqueja "dins" fins netejar
- **Trencat** → bloqueja "sobre" + "dins" fins arreglar

## Social Item: Robar Tornavís
Veure `social-items.md` (és un dels 9 ítems actius).
- Type: `robar_tornavis` (enum `social_item_type`)
- Roba 1 tornavís del rival. Bloquejat per escut.
- Error si rival no en té.
