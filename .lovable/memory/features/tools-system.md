---
name: Tools & Tag Actions
description: Dirty items block 'dins', broken items block 'sobre'+'dins'. Tools are strategic. Pool: martell 5, drap 5, llanterna 1, tornavis 5. Start with 1 llanterna + 1 tornavis.
type: feature
---

## Eines i Accions de Mobles

### Eines inicials
- 🔦 Llanterna ×1 (per escenaris foscos: Jardí, Balcó)
- 🔧 Tornavís ×1 (per arreglar mobles trencats)

### Pool per partida (compartit entre jugadors)
| Eina | Pool | Prob. roll |
|------|------|-----------|
| 🔨 Martell | 5 | 10% |
| 🧹 Drap | 5 | 8% |
| 🔧 Tornavís | 5 | 4% |
| 🔦 Llanterna | 1 | 3% |

### Bloqueig de posicions (ESTRATÈGIC)
- **Moble brut** 🧹 → bloqueja "dins" fins netejar (cal drap, 0.3🪙)
- **Moble trencat** 💥 → bloqueja "sobre" + "dins" fins arreglar (cal tornavís, 0.3🪙)
- **Trencar** moble (cal martell, 0.4🪙) → ofensiu, notifica rival en PvP

### Determinisme
- ~60% dels mobles amb tag "dirty" es marquen bruts per partida (hash del gameId)
