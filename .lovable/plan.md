# Punt 7 — Tancar Mode Història v5.2

Punt 8 (Wave A — caselles maleïdes/bonus UI) ja es va completar al missatge anterior. Aquest pla ataca només els pendents de `mem://features/story-mode`.

## Pendents detectats

| # | Pendent | Tipus | Cost |
|---|---------|-------|------|
| A | `item_id` explícit a `story_recipes` (eliminar inferència per keyword) | BD + lib | Baix |
| B | Més seeds `requires_skill` capítols 5-8 (Bosc/Castell) | BD only | Baix |
| C | Mini-puzzles dins nodes (ex: posa ingredients en ordre) | Nou component + schema | **Alt** |
| D | Espai propi amb mobles desbloquejables (recompensa Story) | Nova taula + UI | **Alt** |
| E | Selector d'espai personalitzat al crear partida PvP | UI + JOIN PvP | **Alt** |

## Decisió d'aquesta tongada

Faig **A + B** (peces tancades, baix risc, sense disseny obert). C/D/E són blocs grans i toquen PvP — els deixo per una sessió dedicada amb decisions teves.

## Peça A — `item_id` explícit a receptes

### Diagnòstic
`autoDiscoverRecipes` infereix l'item resultat de la recepta per keyword del nom (poma/aigua/manta…). Fràgil: receptes futures amb noms creatius fallen.

### Canvis
1. **Migració**: afegir `story_recipes.result_item_id text` (nullable per compatibilitat). Backfill per matching actual de keywords sobre receptes existents.
2. **`src/lib/story-state.ts`**: `getItemEffect(item_id)` → si la recepta té `result_item_id`, retorna directament; si no, fallback al keyword actual.
3. **Test**: cobrir que una recepta amb `result_item_id` no depèn del nom.

## Peça B — Seeds `requires_skill` 5-8

### Diagnòstic
`story_choices.requires_skill` només té entrades a capítols 1-4. Capítols 5-8 (Bosc + Castell) no premien progressió d'skills.

### Canvis
1. **Migració**: INSERT a `story_choices` 4-6 noves opcions amb:
   - 2 al Bosc (Lv4 💪 Força, Lv6 ✨ Empatia)
   - 2 al Castell (Lv8 🔥 Coratge, Lv10 👑 Llegenda)
   - 1-2 amb `min_visits` per branques re-visita
2. Mantenir balanç: cada node afectat conserva almenys una opció sense `requires_skill` perquè no quedi bloquejat.
3. **Test**: REG nou que verifica que cada node 5-8 té ≥1 opció accessible sense skill.

## Fora d'abast (deixats per sessió dedicada)

- **C — Mini-puzzles**: requereix decidir tipus (ordre d'ingredients, encaix, memòria), schema (`story_nodes.puzzle_data jsonb`?), recompensa.
- **D — Espai propi**: nova taula `player_spaces` + UI selector mobles + integració amb evolució mascota.
- **E — Selector espai PvP**: depèn de D. Modifica `create_game` per acceptar `space_id` del creador.

## Cost estimat
2 migracions + 1 edició de `story-state.ts` + 2 tests nous. Mitjà-baix.

## Següent pas
Si aproves, executo A i B en paral·lel (migració A, migració B, edicions de codi).
