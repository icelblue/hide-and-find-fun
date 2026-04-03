---
name: Story Mode
description: Single-player tutorial mode with pet companion, progressive chapters, accessories
type: feature
---

## Mode Història (v1.0)

### Concepte
Tutorial single-player progressiu per nous jugadors. No afecta PvP (Elo/Lligues).

### Mascota
- 5 animals: 🐕 Gos, 🐱 Gat, 🐰 Conill, 🐹 Hàmster, 🐢 Tortuga
- Jugador tria nom (max 20 chars)
- Acumula XP (visible al perfil públic)
- Taula: `player_pets` (user_id unique, pet_type, pet_name, pet_icon, xp)

### Capítols
1. **"Troba la mascota"** — 1 escenari, sense moure's. Aprèn: observar, confirmar. Base 100 XP.
2. **"S'ha escapat!"** — 3 escenaris random. Aprèn: moure's. Base 200 XP.
3-8. **Accesoris** — Partida completa vs CPU. 1 accessori per capítol. Base 150 XP.

### Accesoris
📿 Collar, 🎀 Llaç, ⚽ Pilota, 🦴 Os, 🧣 Manta, 🧸 Joguina

### XP System
- Base per capítol + bonus per eficiència (menys moviments = més XP)
- Fórmula: `base + max(1, 10 - moves) * 10`

### CPU Rival
- Amaga objecte en posició completament aleatòria
- No fa accions actives (simplificat)

### UI
- Lobby: botó 🐾 al grid principal + menú hamburguesa
- Animació typewriter per intro
- Obrir regal → animal random → posar nom
- Hub amb llista de capítols (locked/active/completed)
- Perfil: mostra mascota + XP + accesoris (públic)

### Taules DB
- `player_pets` — mascota (1 per user)
- `story_progress` — progrés capítols (user_id, chapter, status, moves_used, best_moves)
- `pet_accessories` — accesoris guanyats

### Ruta
- `/story` — StoryModePage.tsx
