---
name: Story Mode
description: Single-player tutorial with pet companion. Consumables heal specific events AND extend max life. Event↔Consumable mapping: Virus→Vacuna, Caiguda→Menjar, Febre→Aigua.
type: feature
---

## Mode Història (v2.3 — Consumible↔Event matching)

### Mascota
- 5 animals: 🐕🐱🐰🐹🐢
- `max_xp` dinàmic (base 5000, creix amb consumibles)
- Evolució: Bebè→Jove→Adult→Veterà→Llegendari

### Events de salut (25% post-capítol)
| Event | Dany | Cura correcta |
|-------|------|----------------|
| 🤒 Virus | +200 XP | 💉 Vacuna |
| 🤕 Caiguda | +150 XP | 🍖 Menjar |
| 🫠 Febre | +100 XP | 💧 Aigua |

### Consumibles (desbloquejats post-accesoris)
| Consumible | XP Heal | Max XP Boost | Cura event |
|------------|---------|--------------|------------|
| 🍖 Menjar | -100 | +50 | caiguda |
| 💧 Aigua | -50 | +25 | febre |
| 💉 Vacuna | -200 | +100 | virus |

**Comportament**: El consumible SEMPRE cura XP i amplia max_xp. Però NOMÉS resol l'event si coincideix (Vacuna→Virus, etc.). Si uses el consumible incorrecte, la mascota segueix malalta però recupera XP.

### Capítols
1-2: Tutorial | 3-8: Accesoris | Repetibles per XP + consumibles
