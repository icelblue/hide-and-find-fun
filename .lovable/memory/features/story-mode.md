---
name: Story Mode
description: Single-player tutorial using real game engine with CPU opponent, pet companion, evolution, death/rebirth, health events (virus/fever/falls), consumables to heal, progressive chapters, accessories
type: feature
---

## Mode Història (v2.1 — Salut mascota)

### Arquitectura
- Partides de història utilitzen el **motor real de GamePage**
- CPU virtual amb UUID fix: `00000000-0000-0000-0000-000000000001`
- `is_story=true` a la taula `games`

### Mascota
- 5 animals: 🐕 Gos, 🐱 Gat, 🐰 Conill, 🐹 Hàmster, 🐢 Tortuga
- MAX_PET_XP = 5000 → mascota "mor" (icona 🪦) → restart
- Evolució: Bebè→Jove→Adult→Veterà→Llegendari

### Events de salut (v1.9)
- 25% probabilitat al completar capítol
- 🤒 Virus: +200 XP | 🤕 Caiguda: +150 XP | 🫠 Febre: +100 XP
- Taula `pet_events` (user_id, event_type, xp_change, resolved)

### Consumibles (curen = redueixen XP)
- 🍖 Menjar: -100 XP | 💧 Aigua: -50 XP | 💉 Vacuna: -200 XP
- Desbloquejats després de tenir tots els accesoris
- `useConsumable()` marca consumible usat + resol events actius

### Capítols
1-2: Tutorial | 3-8: Accesoris | Repetibles per XP + consumibles
