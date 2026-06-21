
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

## C — Mini-puzzles d'ordre d'ingredients

**Decisió tancada:** seqüència correcta d'ítems de l'inventari. Recompensa: ítem únic + 50 XP.

### Esquema DB
- Nova columna `story_nodes.puzzle_data jsonb` (nullable). Estructura:
  ```json
  {
    "type": "ingredient_order",
    "slots": 3,
    "valid_items": ["herba_lluna","aigua_pura","cristall"],
    "correct_order": ["aigua_pura","herba_lluna","cristall"],
    "reward_item": "elixir_sagrat",
    "reward_xp": 50,
    "fail_message_key": "story.puzzle.fail.generic"
  }
  ```
- Nova taula `story_puzzle_attempts` (run_id, node_id, attempts, solved_at). Límit 3 intents → opció saltar amb penalització -1 vida.

### Frontend
- Nou component `PuzzleNodeView.tsx` (s'invoca des de `StoryNodeView` quan `puzzle_data != null`).
- UI: 3 slots buits → tap a ítem inventari → s'insereix al primer slot lliure. Botó "Comprovar".
- Animacions: glow verd si correcte, shake vermell si no. Toast amb pista després del 2n intent.

### Cobertura
- 3 puzzles inicials: Capítol 3 (poció calma), Capítol 6 (amulet seafire), Capítol 9 (clau final).
- Tests: validació d'ordre, gestió d'intents, atorgament de recompensa.

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
