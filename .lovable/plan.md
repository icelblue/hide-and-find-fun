# Wave A — Visibilitat de caselles maleïdes i bonus d'escenari

Objectiu: tancar el bucle de feedback de les mecàniques de **bonus/caselles maleïdes** que ja existeixen al backend però són invisibles per al jugador fora del toast puntual.

## Estat actual (auditoria)

- ✅ Backend: `execute_game_move` ja calcula `cursed` i `bonus_tokens` consultant `scenario_bonuses`.
- ✅ Toast: `GamePage.tsx:862` mostra "💀 Casella maleïda −X🪙" en observar-hi.
- ⚠️ Taula `scenario_bonuses`: només té 21 files, **totes `extra_token` amb valor `+1`** → no hi ha cap casella maleïda real a la BD.
- ❌ UI: cap indicador visual ni a `ScenarioPicker` ni al header de partida.
- ❌ Memòria persistent: si trepitges una casella maleïda, no queda marca a la sessió.

## Peces del puzle (per ordre d'execució)

### Peça 1 · Dades (migració)
Sembrar caselles especials per partida. Dues opcions:

- **A — Estàtiques per moble**: afegir ~10 files negatives a `scenario_bonuses` (value `-0.3` o `-0.5`) i ~5 positives addicionals. Senzill, però són sempre les mateixes per a tothom.
- **B — Per partida (recomanat)**: nova columna `games.scenario_bonuses jsonb` generada a `create_game`, amb 3 cursed + 3 bonus aleatoris entre els mobles de l'escenari del rival. Així cada partida és diferent i no cal modificar `scenario_bonuses` global.

Decisió per defecte: **opció B**.

### Peça 2 · Endpoint de revelació
RPC `get_revealed_specials(game_id)` que retorna les caselles ja descobertes (per mi o pel rival quan trenco un moble) amb `{item_id, position, type: 'curse'|'bonus', value}`. Es crida al carregar partida i després de cada moviment.

### Peça 3 · UI `ScenarioPicker` (mapa de mobles)
- Afegir overlay petit a cada `PositionButton` ja revelada:
  - 💀 cantonada inferior-dreta + ring vermell tènue per cursed
  - 🎁 cantonada + ring daurat per bonus
- Tooltip: "Casella maleïda revelada −0.5🪙" / "Bonus +1🪙"
- Storage local només per persistir entre re-renders dins la sessió (font de veritat = backend).

### Peça 4 · Badge al header de partida
A `GamePage` afegir badge compacte sota el comptador de tokens:
- `💀 2 · 🎁 1` (caselles especials restants no revelades de l'escenari del rival)
- Tooltip explica el sistema.
- Es recalcula a partir del retorn del nou RPC.

### Peça 5 · i18n + tests
- Claus noves a `ca.json` / `en.json`: `game.specials.curseRevealed`, `game.specials.bonusRevealed`, `game.specials.headerBadge`.
- Test `REG-019`: després de trepitjar casella maleïda → revelació visible per a tots dos jugadors.

## Fora d'abast

- Re-balanç de probabilitats/valors (es manté `-0.3/-0.5` i `+1`).
- Animacions complexes (només ring + emoji estàtic).
- Notificació push.

## Detalls tècnics

- Migració crea `games.scenario_bonuses jsonb DEFAULT '[]'` + tria 3 mobles aleatoris per escenari del rival amb `ORDER BY random() LIMIT 3`.
- `execute_game_move` passa a llegir de `games.scenario_bonuses` en comptes de la taula global.
- `get_revealed_specials` filtra per `game_moves` on `result_data->>'cursed' = 'true'` o `bonus_tokens > 0`.
- Components nous: cap. Edicions: `ScenarioPicker.tsx`, `GamePage.tsx`, `supabase-helpers.ts`.

## Cost estimat
~3 edicions de codi + 1 migració + 2 RPCs nous. Mitjà.

Vols que ho executi tal qual o prefereixes l'**opció A** (caselles estàtiques) per estalviar la migració de `games`?
