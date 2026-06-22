
# Pla: Blocs C + D + E

Tres peces independents però connectades pel mateix eix: la mascota i el seu espai.

```text
  ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
  │  C: Puzzles     │      │  D: Espai propi │  →   │  E: PvP Personal│
  │  Mode Història  │      │  1 habitació    │      │  Mode separat   │
  └─────────────────┘      └─────────────────┘      └─────────────────┘
       (independent)         (desbloqueja a E)         (depèn de D)
```

---

## C — Mini-puzzles d'ordre d'ingredients ✅ IMPLEMENTAT

- DB: `story_nodes.puzzle_data jsonb` + taula `story_puzzle_attempts` (run_id, node_id, attempts, solved_at, skipped_at) amb RLS per propietari.
- Lògica pura: `src/lib/story-puzzle.ts` (parsePuzzle, checkOrder, submitPuzzleOrder, skipPuzzle, MAX=3).
- UI: `src/components/story/PuzzleNodeView.tsx` — slots seqüencials, palette d'ítems, comprovació, shake/glow, skip amb penalització (fear +20 / bond -10).
- Integració: `StoryModePage` detecta `puzzle_data` al node actiu, oculta choices fins resoldre/saltar, atorga ítem + XP en cas d'èxit.
- i18n CA/EN al namespace `puzzle.*`.
- Tests: 11 nous (parse, check order, defaults). Total: 197/197 ✅.
- Pendent dades: seed de 3 puzzles (Capítol 3 / 6 / 9) — la infraestructura ja accepta `puzzle_data` a qualsevol node existent.

---

## D — Espai propi (1 habitació, mobles desbloquejables)

**Decisió tancada:** una sola habitació amb grid fix 4×4, mobles comprats amb monedes.

### Esquema DB
- `player_spaces` (user_id PK, layout jsonb, updated_at). `layout` = `[{slot:0, furniture_id:"bed_basic"}, ...]`.
- `furniture_catalog` (id, name_key, price_coins, icon, category, unlock_level). Seed 12 mobles inicials (3 llits, 3 catifes, 3 plantes, 3 decoracions).
- `player_furniture` (user_id, furniture_id, acquired_at). Inventari de mobles posseïts.
- RLS: només propietari pot llegir/escriure el seu espai i inventari de mobles. `furniture_catalog` lectura pública.

### Frontend
- Nova ruta `/space` accessible des de `Index` (card "El meu espai").
- Component `SpaceEditor.tsx`: grid 4×4, drag&drop de mobles d'inventari a slots. Botó "Botiga" obre `FurnitureShop.tsx`.
- Mascota es renderitza al centre, reacciona als mobles (bonus felicitat segons categoria).

### Cobertura
- Tests: validació de slot únic per moble, càlcul de preu, persistència del layout.
- i18n CA/EN per noms de mobles i UI botiga.

---

## E — Mode PvP Personal (cua separada)

**Decisió tancada:** cua independent. Només jugadors amb espai configurat poden entrar.

### Esquema DB
- `games.game_mode text` (default `"standard"`, nou valor `"personal_pvp"`).
- `games.host_space_snapshot jsonb` — congela el layout del host al moment de crear la partida (evita que canviï mentre juguen).
- RPC `create_personal_game(opponent_id)`: valida que ambdós jugadors tinguin ≥4 mobles col·locats, crea partida amb mode personal, snapshotegen els 2 espais.
- `execute_game_move` adaptat: si `game_mode = personal_pvp`, busca a `host_space_snapshot` enlloc d'escenari oficial.

### Frontend
- Botó "PvP Personal" al `LobbyPage` (disabled amb tooltip si l'espai no compleix mínim).
- `GamePage` detecta `game_mode` i renderitza el grid del snapshot enlloc d'escenari fix.
- Sense canvis a la lògica de Observar/Moure/items — només canvia la font del layout.

### Cobertura
- Validació mínim mobles abans de crear partida.
- Test: partida personal no es trenca si el host modifica el seu espai post-creació.

---

## Ordre d'execució proposat

1. **D primer** (espai propi) — base per E, peça autònoma, valor immediat.
2. **C en paral·lel** (puzzles) — independent, no bloqueja res.
3. **E al final** — depèn de D consolidat.

Cada bloc s'envia amb migració pròpia + UI + tests. Total estimat: 3 sessions denses (una per bloc).

---

## Què NO inclou aquest pla

- Múltiples habitacions, expansió de mascotes, comerç entre jugadors, mobles animats, decoració estacional. Tot això són ampliacions posteriors un cop la base estigui sòlida.

Aprova i començo per **D**. Si vols invertir l'ordre (C abans), digues-ho.
