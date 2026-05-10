# Mode Història v4 — Plan

## 1. Fix start error + greeting

- **Greeting**: si `display_name` és buit, usar prefix de l'email (`user.email.split('@')[0]`) com a fallback. Mai mostrar "aventurer" si hi ha email.
- **Start error**: investigar afegint `try/catch` amb log explícit a `handleStartRun` i `loadAll`. Mostrar el missatge d'error real al toast (ara queda "undefined" si l'error és null). Sospita: si l'usuari ja té un run actiu obsolet sense `current_node_id`, falla. Solució: `startRun` ja tanca runs vells; afegir guard si `getNode` retorna null.

## 2. Quatre mecàniques noves (totes integrades, polides)

### A) Estats mascota (gana/son/por) 0-100
- Nova taula `pet_state` (user_id, hunger, sleep, fear, bond, updated_at).
- Cada decisió pot modificar estats via nou camp `state_delta` jsonb a `story_choices`.
- UI: 4 mini-barres horitzontals dalt de la pantalla "playing" (😋 gana, 😴 son, 😨 por, ❤️ vincle).
- Si hunger>80 o sleep>80 → opcions de "menjar"/"dormir" apareixen com a 4a opció extra al següent node (filtrades client-side).
- Si fear>90 → -50 XP penalització i missatge "{pet} està aterrit".

### B) Vincle (bond) — ja inclòs a A
- Bond puja amb decisions empàtiques (`state_delta: {bond: +10}`).
- Bond≥70 desbloqueja branques especials marcades `requires_bond` als choices.

### C) Inventari narratiu
- Nova taula `story_inventory` (user_id, item_id, item_name, item_icon, obtained_at).
- Nou `reward_type='item'` amb `{item_id, name, icon}`.
- Choices poden tenir `requires_items: ['clau_1']` jsonb → si no els tens, opció oculta.
- UI: motxilla 🎒 al header del playing, click obre drawer amb la llista.

### D) Receptes (combinació d'objectes)
- Nova taula `story_recipes` (id, name, icon, requires_items jsonb, result_item_id, result_name, result_icon, unlocks_choice_id).
- Nou `reward_type='recipe'` amb `{recipe_id}` → afegeix a la llibreta de receptes.
- Taula `story_recipe_book` (user_id, recipe_id) — receptes conegudes.
- UI: dins el drawer de motxilla, secció "Receptes". Botó "Combinar" si tens tots els items requerits → crea l'item resultat i pot desbloquejar opcions.
- Inicialment 3 receptes seed (ex: clau+oli=clau_obrible, mapa+brúixola=ruta_secreta, herba+aigua=poció_calma).

### E) Mini-puzzle (cap. 4 i cap. 7)
- Nou camp a `story_nodes`: `puzzle_type` ('order_actions' | null) i `puzzle_data` jsonb.
- Component `PuzzleNode.tsx`: mostra 3 accions barrejades, l'usuari les ordena. Solució correcta = recompensa extra (item).
- 2 nodes seed: `c4_puzzle_dishes` (ordenar pasos cuina), `c7_puzzle_lock` (ordenar combinació pany).

## 3. Neteja BBDD i codi obsolet

- DROP TABLE `story_progress` CASCADE.
- DROP RPC `create_story_game`, `finish_story_game`.
- ALTER TABLE games DROP COLUMN `is_story`, `story_chapter` (i delete previs de les 17 files is_story=true).
- Eliminar de `story-helpers.ts`: `getStoryProgress`, `initChapter`, `completeChapter`, `calculateXP`. També treure referència a `story_progress` de `resetPetAndProgress`.
- Eliminar `cpuChooseHidingSpot` (no s'usa enlloc).
- Buscar i eliminar imports orfes.

## 4. Recompenses (revisió)
Cada decisió genera UNA recompensa visible (mai 2). El `state_delta` és invisible (es revela al moviment de barres després de triar — animació suau).

## 5. Tests + verificació
- Nou test `story-runs-v4.test.ts`: cobreix inventory + recipes + state caps (0-100).
- Run complet vitest (~170 tests + nous).
- Test manual end-to-end al sandbox: nova partida → cap.1 decisió → veure barres moure → checkpoint cap.1→2 → motxilla amb item → arribar a node que requereixi item.

## 6. Files

**Nous (8)**:
- `src/components/story/PetStatsBar.tsx`
- `src/components/story/InventoryDrawer.tsx`
- `src/components/story/PuzzleNode.tsx`
- `src/lib/story-state.ts` (estats + inventari + receptes)
- `src/test/story-runs-v4.test.ts`
- 2 migracions (schema + seed nodes/choices/recipes ampliats)

**Modificats (5)**:
- `src/pages/StoryModePage.tsx` (integració barres, drawer, fix greeting/error)
- `src/components/story/StoryNodeView.tsx` (filtrar choices per items/bond/state)
- `src/lib/story-runs.ts` (aplicar state_delta + items + receptes a `applyReward`/`makeChoice`)
- `src/lib/story-helpers.ts` (cleanup)
- `.lovable/memory/features/story-mode.md`

## Risc
PvP totalment intacte (0 fitxers `src/components/game/`, `src/pages/GamePage.tsx`, `src/pages/LobbyPage.tsx`, `supabase-helpers.ts`, RPCs PvP modificats). Migració DROP de `games.is_story` requereix borrar 17 files prèvies — **destructiu**: confirmaràs abans.

Estimació: ~2 tandes de migració + edits. Vols que ho faci tot d'una o ho dividim per fases?
