
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

## E — Mode PvP Personal ⚠️ PARCIALMENT IMPLEMENTAT

### Fet en aquesta sessió
- Migració: `games.game_mode` (default `standard`, check `standard|personal_pvp`), `games.host_space_snapshot jsonb`, `games.guest_space_snapshot jsonb`.
- RPC `create_personal_game(_opponent_id uuid)` (SECURITY DEFINER, només `authenticated`): valida que ambdós jugadors tinguin `player_spaces` amb ≥4 mobles, congela els 2 layouts al moment de crear i emet codi de 6 caràcters.
- Frontend: `LobbyPage` mostra un segon botó `🏠 PvP` sota cada resultat de cerca de jugadors, gestiona els 5 errors (`host_no_space`, `opponent_no_space`, `host_min_furniture`, `opponent_min_furniture`, `cannot_challenge_self`) amb missatges traduïts CA/EN.
- Tests: 197/197 ✅ (sense regressions).

### Seed puzzles (Wave C — completat)
- `c3_kitchen_feed` → flour/egg/milk (reward `🍞 Pa dolç`, +50 XP).
- `haunted_courtyard` → salt/candle/feather (reward `👻 Amulet fantasma`, +75 XP).
- `dreams_choice` → moonwater/dreamleaf/stardust/silver (reward `🌙 Elixir dels somnis`, +100 XP).
- Pistes i18n a `puzzle.hint.{kitchen,ritual,dreams}` (CA/EN).

---

## Pendent per a la propera sessió

1. **Adaptador GamePage per `personal_pvp`**: quan `game.game_mode === 'personal_pvp'`, carregar `host_space_snapshot` / `guest_space_snapshot` enlloc de `scenario_id` i renderitzar els slots del grid 4×4 com a "objectes" amagables. Ara una partida personal es crea correctament però l'UI de joc encara entra al flux estàndard.
2. **Verificació visual end-to-end** (Playwright): crear espai → comprar 4 mobles → enviar repte PvP Personal → confirmar codi/redirecció.
3. **Test unitari `create_personal_game`**: validar errors (no_space, min_furniture, self).

---

## Què NO inclou aquest pla

- Múltiples habitacions, expansió de mascotes, comerç entre jugadors, mobles animats, decoració estacional.

