---
name: Story Mode
description: Single-player tutorial using real game engine with CPU opponent, pet companion, evolution, death/rebirth, health events, consumables that heal AND extend max life, progressive chapters, accessories
type: feature
---

## Mode Història (v2.2 — Consumibles amplien vida)

### Arquitectura
- Partides de història utilitzen el **motor real de GamePage**
- CPU virtual amb UUID fix: `00000000-0000-0000-0000-000000000001`
- `is_story=true` a la taula `games`

### Mascota
- 5 animals: 🐕 Gos, 🐱 Gat, 🐰 Conill, 🐹 Hàmster, 🐢 Tortuga
- MAX_PET_XP = 5000 (base, pot créixer amb consumibles)
- `max_xp` dinàmic a `player_pets` — cada consumible l'amplia
- Evolució: Bebè→Jove→Adult→Veterà→Llegendari

### Events de salut
- 25% probabilitat al completar capítol
- 🤒 Virus: +200 XP | 🤕 Caiguda: +150 XP | 🫠 Febre: +100 XP

### Consumibles (curen + amplien límit de vida)
- 🍖 Menjar: -100 XP, +50 max_xp
- 💧 Aigua: -50 XP, +25 max_xp
- 💉 Vacuna: -200 XP, +100 max_xp
- Desbloquejats després de tenir tots els accesoris
- `useConsumable()` marca consumible usat + resol events + amplia max_xp
- `gift_consumable` RPC fa el mateix quan es regala

### Capítols
1-2: Tutorial | 3-8: Accesoris | Repetibles per XP + consumibles
