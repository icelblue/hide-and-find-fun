---
name: Tools & Tag Actions
description: SOURCE OF TRUTH per eines. Pool per partida martell 5, drap 5, llanterna 5, tornavis 5. Drap/martell/llanterna consumibles; tornavís no es consumeix.
type: feature
---

## Eines i Accions de Mobles

### Eines inicials (cada jugador)
- 🔧 Tornavís ×1 (per arreglar mobles trencats — pot quedar a 0, és fàcil de trobar/robar)
- 🔦 Llanterna ×1 inicial (encendre Jardí/Balcó/Terrassa/Pati la consumeix)
- 🧹 Drap: auto-donat via RPC `execute_grant_drap_if_available` (només si pool encara té)

### Pool COMPETITIU per partida (compartit entre els 2 jugadors)
| Eina | Pool | Prob roll look | Prob roll tag/light |
|------|------|----------------|---------------------|
| 🔨 Martell | 5 | 2% | 5% |
| 🔧 Tornavís | 5 | 5% | 10% |
| 🧹 Drap | 5 | 3% | 5% |
| 🔦 Llanterna | 5 | 5% | 10% |

- **Anti-bloqueig llanterna**: `execute_toggle_light` regala una llanterna gratuïta del pool si vols encendre exterior i no en té ningú.
- **Anti-bloqueig tornavís**: pot quedar a 0, però roll prioritari + `execute_robar_tornavis` social.
- **Consumibles single-use**: drap, martell, llanterna.
- **Tornavís UNLIMITED en ús**: no es consumeix en arreglar (per no bloquejar el joc), però el rival te'l pot robar.
- **Pool check** server-side a totes les RPCs.

### Costs i bloquejos
| Tag | Acció | Eina | Cost | Efecte |
|-----|-------|------|------|--------|
| `dirty` | 🧹 Netejar | Drap | 0.2🪙 | Consumeix drap. +0.3🪙 garantit |
| `breakable` | 💥 Trencar | Martell | 0.3🪙 | Trenca per AMB DOS jugadors. Notifica rival |
| `broken` | 🔧 Arreglar | Tornavís | 0.2🪙 | No consumeix tornavís. Desbloqueja sobre+dins. 40% mini bonus |

### Determinisme dirty/breakable
- `getDirtyItemsForGame(items, gameId)` selecciona ~60% subset via hash determinístic.
- `getBreakableItemsForGame(items, gameId)` mateix patró (~60% via `hash(id + gameId + ":break")`).
- Mateixa partida → mateixos mobles bruts/trencables.

### Validació server-side
`execute_tag_action` valida que el moble tingui el tag correcte abans de processar (clean→dirty, break→breakable, fix→prèviament trencat).

