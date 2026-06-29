## Adaptador `personal_pvp` per a `GamePage` + verificació visual

### Objectiu
Quan `game.game_mode === 'personal_pvp'`, el motor de combat ha d'utilitzar el **snapshot del grid 4×4** del jugador rival com a "escenari" enlloc de la taula `scenarios`. Mínim canvi al motor, màxim aïllament.

### Peça nova: `src/lib/personal-pvp-adapter.ts`
Helper pur que tradueix un `space_snapshot` (`{slot, furniture_id}[]`) + catàleg de mobles a les formes que `GamePage` ja consumeix:

```text
snapshot ──► synthScenario(roomId, ownerName)  → 1 escenari "🏠 Habitació de X"
         ├─► synthObjects(snapshot, catalog)   → 1 objecte per moble (icon, name, is_special=false)
         ├─► synthItems(snapshot, catalog)     → 1 item per moble (hidden=false)
         └─► synthConnections()                → [] (sense connexions, 1 sola sala)
```

Sense `object_specials`, sense `item_interactions`, sense fosca. Mode "net": amagar i buscar nu.

### Patch a `GamePage.tsx` (4 punts d'enganxall, tots condicionats per `isPersonal`)

1. `useEffect` inicial (`getScenarios`, `getObjects`):
   - Si `game.game_mode === 'personal_pvp'` → cridar adaptador amb el snapshot **del rival** (l'amfitrió busca al guest_snapshot i viceversa).
2. `loadGame` BATCH 2 → `batch.items = getItemsByScenario(currentScenId)` i `batch.connected` → substituir per `synthItems`/`synthConnections` (no toquen Supabase).
3. Mecàniques bloquejades en mode personal:
   - Custom object: amagat (només mobles del rival com a object).
   - `item_interactions` buides → la UI ja gestiona array buit.
   - `dirtyItems` / `breakableItems` / `OUTDOOR_SCENARIOS` → tot off (cap moble és tag-target).
4. Hide flow: l'usuari tria 1 dels seus mobles (snapshot propi) com a object; el rival busca al snapshot del cercador.

### Sense canvis a la DB
La migració del torn anterior ja deixa `host_space_snapshot` i `guest_space_snapshot` a `games`. L'adaptador només els llegeix.

### Verificació visual (Playwright)
`LOVABLE_BROWSER_AUTH_STATUS` injectat → script que:
1. Restaura sessió, va a `/space`, comprova que hi ha ≥4 mobles col·locats (si no, els compra i col·loca).
2. Va a `/` (Lobby), busca un jugador, clica `🏠 PvP`, confirma codi generat.
3. Captura: `space.png`, `lobby_pvp.png`, `game_personal.png` mostrant la sala sintètica.

Si l'sessió no està injectada o no hi ha rival amb espai, el pas 2-3 queda registrat com a "no reproduïble end-to-end" i deixem només la validació de l'editor d'espai + càrrega de codi via `create_personal_game` RPC (smoke).

### Tests unitaris
`src/test/personal-pvp-adapter.test.ts`:
- snapshot buit → 0 objectes, 1 escenari.
- snapshot 4 mobles → 4 objectes amb icons del catàleg, items hidden=false.
- furniture_id desconegut → es filtra (no peta).

### Què NO toca
- Recompenses, social items, eines, traits del rival: idèntics al flux estàndard.
- `StoryModePage`, `SpacePage`: cap canvi.
- Migracions noves: cap.

### Risc conegut
`GamePage` és gros (1735 línies). L'adaptador encapsula la divergència en una única funció `loadCombatData(game, user)` per evitar `if` repartits — si emergeix més divergència en el futur, refactor cap a un hook `useCombatSource`.
