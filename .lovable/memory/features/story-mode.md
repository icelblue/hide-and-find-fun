---
name: Story Mode
description: Single-player tutorial using real game engine with CPU opponent, pet companion, evolution, death/rebirth, progressive chapters, accessories + consumables
type: feature
---

## Mode Història (v2.0 — Motor real)

### Arquitectura
- Les partides de història utilitzen el **motor real de GamePage** (mateixa lògica que PvP)
- CPU virtual amb UUID fix: `00000000-0000-0000-0000-000000000001`
- Funció DB `create_story_game(_user_id, _chapter)` crea partida real (games + game_players)
- `is_story=true` a la taula `games` → `handle_game_finished` ignora Elo/Lligues/Recompenses
- GamePage detecta `is_story` i:
  - Desactiva realtime (CPU no actua)
  - Amaga panell social / items socials
  - Amaga info del rival (nearby, traits, shield)
  - Mostra header "← Mode Història" + capítol
  - Al guanyar: crida `completeChapter` per XP + accesoris
  - Pantalla de fi personalitzada amb XP i accesoris

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

- MAX_PET_XP = 5000 → mascota "mor" → restart des de capítol 1

### Capítols
1. **"Troba la mascota"** — partida real vs CPU. Base 100 XP.
2. **"S'ha escapat!"** — partida real vs CPU. Base 200 XP.
3-8. **Accesoris** — Partida vs CPU. 1 accessori per capítol. Base 150 XP.

### Funcions DB
- `create_story_game` — SECURITY DEFINER, crea partida + game_players per user i CPU
- `insert_cpu_move` — per insertar moviments de la CPU (bypass RLS)
- `finish_story_game` — per tancar partida de història

### Taules DB
- `player_pets` — mascota (1 per user)
- `story_progress` — progrés capítols (user_id, chapter, status, moves_used, best_moves)
- `pet_accessories` — accesoris guanyats
- `games.is_story` + `games.story_chapter` — identifiquen partides de història

### Ruta
- `/story` — StoryModePage.tsx (hub + adopció)
- `/game/{gameId}` — GamePage.tsx (partida real amb mode story)
