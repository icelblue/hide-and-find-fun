## Mode Història v3 — Aventura narrativa ramificada

**Independent del PvP**: cap canvi a `games`, `game_players`, `game_moves`, RPCs de partida, etc. Tot el nou viu en taules pròpies del story mode.

---

### Concepte

8 capítols. A cada capítol: text animat (typewriter, com ara) + 3 botons de decisió. Cada decisió porta a un **node** diferent del següent capítol. Arbre ramificat ampli amb ~15-20 finals possibles. Si la mascota mor → **Reset total** (nova adopció des de zero).

Recompenses lligades a la branca: cada node pot donar XP, accessoris, consumibles, o danyar la mascota.

---

### Estructura de l'arbre

```text
Cap 1 (1 node inicial)
 └─ A / B / C
Cap 2 (3 nodes) → cada un amb 3 opcions = 9
Cap 3 (fins a 9 nodes, algunes opcions ja porten a "mort prematura")
 ...
Cap 8 (finals: heroic / tràgic / pacífic / ric / solitari / llegendari ...)
```

Mort possible des del capítol 3 en endavant amb decisions "imprudents" clarament marcades amb to de risc al text (no com a trampa).

---

### Model de dades (noves taules, no toquem res existent)

**`story_nodes`** — catàleg estàtic de nodes
- `id` (text, ex: `c1_start`, `c2_park_dog`)
- `chapter` (1-8)
- `title`, `narrative` (text llarg per typewriter)
- `is_ending` (bool), `ending_type` (text nullable: `death`, `hero`, etc.)

**`story_choices`** — opcions per node
- `node_id` → `story_nodes.id`
- `choice_order` (1-3)
- `label` (text del botó), `next_node_id`
- `reward_type` (nullable: `xp`, `accessory`, `consumable`, `damage`, `none`)
- `reward_value` (jsonb: `{xp:200}` / `{accessory:"Collar"}` / `{damage:300}` ...)

**`story_runs`** — partida actual del jugador
- `user_id`, `current_node_id`, `path` (jsonb array de node_ids visitats), `status` (`active`/`dead`/`completed`), `ending_type`, `started_at`, `ended_at`

RLS: `story_nodes`/`story_choices` lectura pública autenticada; `story_runs` només propietari.

---

### Game Over (Reset total)

Quan mascota mor (XP ≥ max o decisió `damage` letal):
- Borrar `player_pets`, `pet_accessories`, `pet_consumables`, `pet_events`, `story_progress` (legacy), `story_runs` del user
- Pantalla "💔 Final tràgic — La teva història acaba aquí" + botó "Adoptar nova mascota"

(Mantenim `story_progress` legacy per compatibilitat, però el flux nou usa `story_runs`.)

---

### UI / Pàgines

`StoryModePage.tsx` reescrit en 3 vistes segons estat:
1. **Sense mascota** → adopció (igual que ara)
2. **Mascota viva, sense run o run completed** → botó "Començar nova aventura" (crea `story_runs`)
3. **Run actiu** → `StoryNodeView`: typewriter narratiu + 3 botons d'opció. En clicar: aplica recompensa, avança node, anima sortida.

Components nous:
- `src/components/story/StoryNodeView.tsx`
- `src/components/story/StoryEndingScreen.tsx`
- `src/components/story/StoryDeathScreen.tsx`

Helpers nous a `src/lib/story-helpers.ts` (afegim, no esborrem):
- `getCurrentRun(userId)`, `startRun(userId)`, `chooseOption(runId, choiceId)`, `applyReward(...)`

---

### Contingut narratiu inicial

Escric un arbre coherent amb ~30-40 nodes que cobreixi cap. 1-8 amb diverses branques:
- Tema: vida amb la mascota a casa, parc, vet, viatge, festa, perill, descoberta màgica.
- 5-6 finals: **Heroic** (mascota llegendària), **Tràgic** (mort), **Pacífic** (vida tranquil·la al jardí), **Aventurer** (volta al món), **Místic** (descoberta sobrenatural), **Solitari** (decisions egoistes).
- Pre-validat: cada `next_node_id` existeix, cada node no-final té 3 opcions.

Tot el contingut català (UI bilingüe es manté en futures iteracions).

---

### 🔒 Seguretat (Pre-flight)

**Fitxers nous** (no risc):
- Migració SQL (3 taules + RLS + seed contingut)
- `src/components/story/*` (3 fitxers)
- `src/lib/story-helpers.ts` (afegir funcions, no tocar les existents)

**Fitxers modificats**:
- `src/pages/StoryModePage.tsx` — reescrit (només afecta mode història)

**NO es toca**:
- Cap fitxer de `src/components/game/`, `src/lib/supabase-helpers.ts`, `src/lib/custom-object.ts`, `src/lib/object-specials.ts`, RPCs de PvP, `GamePage.tsx`, `LobbyPage.tsx`, etc.

**Tests**:
- Nou `src/test/story-mode-v3.test.ts`: validar que tots els `next_node_id` existeixen, tots els nodes no-final tenen exactament 3 opcions, hi ha almenys 1 final per branca principal.
- Re-córrer els 168 tests existents per confirmar zero regressió.
- Smoke E2E: començar run, fer 2 decisions, comprovar avenç.

**Risc**: Baix — codi nou aïllat. Únic punt sensible: la mort esborra `pet_accessories`/`pet_consumables`, que també existeixen al sistema actual; ja era així abans (`resetPetAndProgress`), ho reutilitzem.

---

### Pla d'execució

1. Migració: crear `story_nodes`, `story_choices`, `story_runs` + RLS
2. Seed: insert dels ~35 nodes i ~80 opcions amb història coherent
3. Helpers TS + tipus
4. Components UI (NodeView, EndingScreen, DeathScreen)
5. Reescriure `StoryModePage.tsx`
6. Tests + actualitzar memòria (`mem://features/story-mode.md` + `regressions.md`)
