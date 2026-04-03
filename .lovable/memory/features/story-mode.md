---
name: Story Mode
description: Single-player tutorial mode with pet companion, evolution, death/rebirth, progressive chapters, accessories + consumables
type: feature
---

## Mode Història (v1.1)

### Concepte
Tutorial single-player progressiu per nous jugadors. No afecta PvP (Elo/Lligues).

### Mascota
- 5 animals: 🐕 Gos, 🐱 Gat, 🐰 Conill, 🐹 Hàmster, 🐢 Tortuga
- Jugador tria nom (max 20 chars)
- Acumula XP (visible al perfil públic)
- Taula: `player_pets` (user_id unique, pet_type, pet_name, pet_icon, xp)

### Evolució (XP tiers)
| XP | Nivell | Badge |
|----|--------|-------|
| 0+ | Bebè | 🥚 |
| 500+ | Jove | 🌱 |
| 1500+ | Adult | ⭐ |
| 3000+ | Veterà | 🔥 |
| 4500+ | Llegendari | 👑 |

- Visual: glow ring al voltant de la icona, progressivament intens
- MAX_PET_XP = 5000 → mascota "mor" → restart des de capítol 1

### Mort i renaixement
- Al arribar a 5000 XP: pantalla de comiat
- S'esborren: player_pets, story_progress, pet_accessories
- L'usuari adopta nova mascota (intro completa)

### Capítols
1. **"Troba la mascota"** — 1 escenari, sense moure's. Base 100 XP.
2. **"S'ha escapat!"** — 3 escenaris random. Base 200 XP.
3-8. **Accesoris** — Partida vs CPU. 1 accessori per capítol (no repetit). Base 150 XP.

### Fase post-accesoris
- Un cop es tenen tots 6 accesoris (📿🎀⚽🦴🧣🧸)
- Capítols 3-8 es poden repetir infinitament
- Cada victòria dóna XP + consumible random (🍖🥤💉)
- Consumibles són cosmètics (no s'emmagatzemen, només XP)

### XP System
- Base per capítol + bonus per eficiència (menys moviments = més XP)
- Fórmula: `base + max(1, 10 - moves) * 10`

### UI
- Lobby: botó 🐾 al grid principal + menú hamburguesa
- Animació typewriter per intro
- Obrir regal → animal random → posar nom
- Hub amb llista de capítols (locked/active/completed)
- Perfil: mostra mascota amb evolució visual (glow ring + badge + barra XP)
- "Vitrina" al perfil (abans "Col·lecció")

### Taules DB
- `player_pets` — mascota (1 per user)
- `story_progress` — progrés capítols (user_id, chapter, status, moves_used, best_moves)
- `pet_accessories` — accesoris guanyats

### Ruta
- `/story` — StoryModePage.tsx
