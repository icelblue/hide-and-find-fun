---
name: Tools & Tag Actions
description: SOURCE OF TRUTH per eines. Pool per partida martell 5, drap 5, llanterna 1, tornavis 5. Inici 1 tornavís + 1 llanterna automàtica si escenari fosc.
type: feature
---

## Eines i Accions de Mobles

### Eines inicials (cada jugador)
- 🔧 Tornavís ×1 (per arreglar mobles trencats)
- 🔦 Llanterna: auto-donada quan entres a escenari fosc (Jardí, Balcó)
- 🧹 Drap: auto-donat (1) quan entres a escenari amb mobles bruts

### Pool COMPETITIU per partida (compartit entre els 2 jugadors)
Verificat a `src/lib/supabase-helpers.ts:271-274`:
| Eina | Pool | Prob. roll on look |
|------|------|--------------------|
| 🔨 Martell | 5 | 5% |
| 🔧 Tornavís | 5 (extra) | 5% |
| 🧹 Drap | 5 | 5% |
| 🔦 Llanterna | 1 | 5% |

- **Qui la troba se la queda** — el rival es queda sense.
- **UNLIMITED USE** un cop trobada (no es gasta).
- **Pool check** a `getRemainingToolPool()` consulta `game_players.tools` de tots dos.

### Costs i bloquejos (verificat a supabase-helpers.ts:170-173)
| Tag | Acció | Eina | Cost | Efecte |
|-----|-------|------|------|--------|
| `dirty` | 🧹 Netejar | Drap | 0.2🪙 | Desbloqueja "dins". 50% mini bonus |
| `breakable` | 💥 Trencar | Martell | 0.3🪙 | Trenca per AMB DOS jugadors. Notifica rival |
| `broken` | 🔧 Arreglar | Tornavís | 0.2🪙 | Desbloqueja sobre+dins. 40% mini bonus |

### Determinisme dirty
- `getDirtyItemsForGame(items, gameId)` selecciona ~60% dels mobles `dirty` via hash determinístic del gameId
- Mateixa partida → mateixos mobles bruts
