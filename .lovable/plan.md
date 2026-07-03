## Pla — 3 millores de UX de Personal Space

### 1) Crear partida amb opció d'espai personal

**Problema:** el botó "➕ Crear" només fa partida normal. El mode 🏠 Personal PvP està amagat com a botó minúscul dins la cerca de rival.

**Decisió:** convertir "Crear" en un diàleg de 2 passos:

```text
[➕ Crear] → Dialog:
   ┌─────────────────────────┐
   │ Escull mode:            │
   │  🎲 Normal (7 sales)    │
   │  🏠 Personal (el meu 4×4)│
   └─────────────────────────┘
```

- **Normal** → `createGame()` actual → obre partida amb codi (com ara).
- **Personal** → pas 2: escollir rival (search inline dins el diàleg, reutilitzant `searchPlayers`) → `create_personal_game(_opponent_id)`.
- Pre-check al frontend: si l'usuari té <4 mobles col·locats, mostrar CTA "Decora primer el teu espai →" cap a `/space` en lloc de deixar-lo intentar-ho (evita l'error `host_min_furniture` post-facto).
- El botó minúscul "🏠" de la cerca es manté (drecera).

**Fitxers:** `src/pages/LobbyPage.tsx` (nou `CreateGameDialog` inline), `src/i18n/{ca,en}.json`.

### 2) Catàleg d'espai personal: més barat i més ampli

**Estat actual:** 20 mobles, preus 5→200🪙. L'usuari els troba pocs i cars.

**Decisió — reajust de preus i ampliació a 32 items:**

- Reducció general de preus (~40% menys): nivell 1 comença a 3🪙, top a 120🪙 (era 200).
- +12 mobles nous distribuïts en categories existents i noves:
  - `nature`: 🌸 (flors, 6🪙 lv1), 🌵 (cactus, 10🪙 lv2), 🍄 (bolet, 15🪙 lv3)
  - `pet`: 🦴 (os, 8🪙 lv1), 🎾 (pilota, 10🪙 lv1), 🐟 (peixera, 40🪙 lv4)
  - `tech`: 💻 (portàtil, 55🪙 lv5), 🎧 (auriculars, 30🪙 lv3)
  - `music`: 🎹 (piano, 90🪙 lv6), 🥁 (bateria, 65🪙 lv5)
  - `decor`: 🪞 (mirall, 20🪙 lv2), 🕯️ (espelmes, 8🪙 lv1)
- Actualitzar `furniture_catalog_category_check` per acceptar `nature` i `pet`.
- Migració SQL + traduccions ca/en.

### 3) Reutilitzar `reward_items` com a decoració opcional

**Interpretació:** els 50 items de la col·lecció (`reward_items` + `player_rewards`) que el jugador guanya en partides també haurien de poder col·locar-se al `/space` com a decoració, sense pagar coins.

**Decisió arquitectònica:**

- No dupliquem les dades. Ampliem l'espai personal perquè accepti **dos orígens** d'ítems al `layout`:
  - `{ slot, source: "furniture", furniture_id }` (actual, retro-compatible amb el vell format sense `source`).
  - `{ slot, source: "reward", reward_item_id }` (nou).
- `SpacePage` afegeix una segona pestanya a l'inventari: **"Mobles" | "Col·lecció"**. La pestanya de col·lecció llista `reward_items` del jugador, seleccionables i col·locables als 16 slots amb la mateixa mecànica.
- `happiness_bonus` per reward items = `rarity_tier` (1-5) per no haver de tocar la taula.
- `personal-pvp-adapter.ts` — `loadFurnitureCatalog` s'amplia amb un `loadRewardItems` i el merger tracta ambdós tipus com "objecte" sintètic. Els mobles del rival es veuen igual (tots dos jugadors amaguen als seus propis ítems, siguin mobles o col·lecció).
- Retro-compat: parser de layout actual tracta l'entrada sense `source` com `source: "furniture"`.

**Fitxers:** `src/pages/SpacePage.tsx`, `src/lib/personal-pvp-adapter.ts`, tests unitaris del parser (`personal-pvp-adapter.test.ts`), i2n.

---

## Ordre d'execució

1. **Migració SQL** (catàleg + check constraint).
2. **Adapter + parser retro-compat** amb tests.
3. **SpacePage** (pestanyes Mobles/Col·lecció).
4. **LobbyPage CreateGameDialog** (mode selector + guard <4 mobles).
5. **i18n** ca/en per tot.
6. Verificar: `bun run test`, `bunx tsgo --noEmit`.

## Fora d'abast

- Random matchmaking personal (requereix veure espais decorats disponibles).
- Rebalancejar recompenses de coins post-partida (només toquem preus, no ingressos).
