## Pla — Espai personal multi-sala amb connexions

### Concepte

Ara mateix `/space` = **1 sala** de 4×4. Objectiu: cada jugador té un **apartament** amb N sales (menjador, balcó, cuina…), cada una amb el seu grid 4×4 i mobles, i **portes** que les connecten en un graf que el jugador dibuixa lliurement. Al Personal PvP, aquest graf reemplaça els 7 escenaris fixos actuals.

### Peces del puzle

1. **Plantilla de sala (room template)** — el que ara és `furniture_catalog` per mobles; nova taula per tipus de sala (menjador, cuina, balcó, dormitori, lavabo, despatx, jardí, hall). Cada plantilla té icona, categoria, `price_coins`, `unlock_level`.
2. **Instància de sala** — cada sala que el jugador compra i col·loca al seu apartament. Té nom editable ("Menjador principal"), plantilla d'origen, i grid propi de 16 slots.
3. **Connexió (porta)** — parell ordenat `(sala_A, sala_B)` amb màxim configurable (per defecte 2 portes per sala, ajustable).
4. **Layout de mobles** — passa de guardar-se global (`player_spaces.layout`) a guardar-se **per instància de sala** (`player_rooms.layout`).
5. **Adapter Personal PvP** — expandeix `personal-pvp-adapter.ts` per convertir un graf de sales en `scenarios[]` + `scenario_connections[]` + `objects[]` + `items[]` sintètics (avui només genera 1 sala plana).

### Estructura de dades

```text
room_catalog                  (nou — plantilles)
  id text PK
  name_key text
  category text (bedroom|kitchen|dining|bath|garden|balcony|office|hall)
  icon text
  price_coins int
  unlock_level int
  max_doors int default 2

player_rooms                  (nou — instàncies)
  id uuid PK
  user_id uuid FK auth.users
  room_template_id text FK room_catalog
  custom_name text            -- "Menjador 1", "Balcó estrella"
  layout jsonb                -- [{slot, furniture_id}], mateix format que avui
  position_x int, position_y int  -- coord al mapa de l'apartament
  created_at, updated_at

room_connections              (nou — portes)
  id uuid PK
  user_id uuid FK
  room_a_id uuid FK player_rooms
  room_b_id uuid FK player_rooms
  UNIQUE(user_id, LEAST(room_a_id,room_b_id), GREATEST(room_a_id,room_b_id))

-- Migració retrocompat:
-- Cada jugador amb `player_spaces` existent → generar 1 sala "Habitació"
--   a `player_rooms` copiant el `layout` actual. `player_spaces` queda deprecada
--   però es manté per no trencar codi antic durant una release.
```

Preus inicials sala:

- Sala inicial gratuïta (regalada a la migració).
- Sales extres: 50🪙 (bedroom/dining), 40🪙 (balcony/office), 80🪙 (kitchen/bath) — nivells 2-5.

### Canvis a UI (`/space`)

Nova jerarquia de dues vistes:

```text
┌───────────── /space (Apartament) ──────────────┐
│  Mapa de sales (grid llibre + portes)          │
│    [Menjador]──[Balcó]                          │
│         │                                       │
│    [Cuina]──[Habitació]                         │
│                                                 │
│  Botons: [+ Sala nova] [+ Connectar] [Editar]  │
└─────────────────────────────────────────────────┘
    ↓ tap a una sala
┌───────── /space/room/:id (Sala) ───────────────┐
│  Nom editable + grid 4×4 actual                 │
│  Inventari (mobles + col·lecció) igual que avui │
└─────────────────────────────────────────────────┘
```

- Vista **Apartament**: mostra sales com a targetes/nodes en un grid lliure (drag simple o coordenades snap). Les connexions es dibuixen com a línies entre nodes.
- Vista **Sala**: idèntica a l'actual `/space` (grid 4×4 + inventari + col·lecció).
- Diàleg "+ Sala nova": llista `room_catalog` amb preus i nivell requerit; en comprar, s'insereix a `player_rooms` amb `custom_name = template.name + " " + n`.
- Diàleg "+ Connectar": escollir 2 sales; valida que cap superi `max_doors` i que no existeixi ja la connexió.
- "Editar sala": renombrar, moure de posició, eliminar (retorna preu × 50%).

### Canvis a Personal PvP (`personal-pvp-adapter.ts`)

Substituir el `mergeSnapshots` monolític per un adapter multi-sala:

- Load `player_rooms` + `room_connections` per host i guest.
- Per cada sala instància generar `SynthScenario` (id = `room:<uuid>`, name = `custom_name`, icon = plantilla).
- Per cada `room_connections` generar `SynthConnection { scenario_a_id, scenario_b_id }` (bidireccional).
- Els mobles de cada sala → `SynthObject`+`SynthItem` (mantenim la lògica actual per sala).
- **Merge host+guest**: cada un juga al seu propi apartament (dues cases separades). Decidim que el host amaga a *l'apartament del host*, guest amaga a *l'apartament del guest*, i cada un busca a l'apartament del rival. Això elimina el merge asimètric d'ara.

Requeriment mínim per Personal PvP: **≥2 sales connectades** i **≥4 mobles totals**. Actualitzar `create_personal_game` RPC i tornar nous codis d'error `host_min_rooms` / `opponent_min_rooms`.

### Migració retrocompat (peça crítica del puzle)

Peça 1 — Insert plantilles a `room_catalog` (8 tipus).
Peça 2 — Per cada fila de `player_spaces` amb layout no buit, inserir 1 `player_rooms` amb `room_template_id='bedroom'`, `custom_name='Habitació'`, `layout=<mateix layout>`, `position_x=0, position_y=0`.
Peça 3 — `player_spaces` es marca com a legacy però no s'elimina fins la següent iteració.

### Fases d'execució (crèdits estimats)

- **Fase 1 — BD + migració (1 crèdit)**: `room_catalog`, `player_rooms`, `room_connections`, GRANT+RLS, migració retrocompat, actualització RPC `create_personal_game`.
- **Fase 2 — Vista Apartament (2 crèdits)**: nova ruta `/space`, mapa de sales amb nodes i línies, diàleg "afegir sala", diàleg "connectar", renombrar.
- **Fase 3 — Vista Sala (0.5 crèdits)**: refactor de l'actual `SpacePage` a `RoomPage` (`/space/room/:id`), reutilitzant grid i inventari.
- **Fase 4 — Adapter Personal PvP multi-sala (1 crèdit)**: expandir `personal-pvp-adapter.ts` + tests unitaris del graf.
- **Fase 5 — i18n + polish (0.5 crèdits)**.

**Total estimat: ~5 crèdits.** Es pot partir per fases; la Fase 1 sola ja obre el sistema sense trencar res.

### Decisions tancades a confirmar

D1. **Layout del mapa d'apartament** — coordenades lliures (drag) o snap a grid 3×3 fix? Recomanació: snap 3×3 per simplicitat mobile.
D2. **Portes per sala** — 2 fixes o configurable per plantilla? Recomanació: 2 fixes v1, ampliable via `max_doors` a la taula.
D3. **Preu i límit total de sales** — cap límit dur, només econòmic? O límit 8 sales v1? Recomanació: 8 v1.
D4. **Personal PvP** — cada jugador juga a l'apartament del rival (proposta), o mantenim el merge de tots dos com ara? Recomanació: apartaments separats (més clar).

### Fora d'abast

- Temes visuals per apartament (fons, papers pintats).
- Compartir apartament amb visitants no-PvP.
- Portes especials (tancades amb clau, secretes).
