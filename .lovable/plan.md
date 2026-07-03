
## Pla: Terreny 2D + Mascota al mapa + QA traduccions

Executo els 3 blocs en un sol torn. Decisions ja tancades (D7 seed determinista, D8 bonus sense restricció, D9 mascota estàtica).

---

### Bloc A — Terreny 2D estil pixel-art clàssic

**Objectiu:** El grid 5×5 de `SpacePage.tsx` deixa de ser cel·les buides i passa a ser un mapa amb terrenys (gespa, terra, aigua, roca, sorra). Quan hi col·loques una sala, es tapa amb el tile temàtic de la sala.

**Model de terreny:**
```
5 tipus: grass | dirt | water | rock | sand
```

**Generació:** funció pura `generateTerrain(userId: string): TerrainType[][]` amb PRNG seedejat (mulberry32 + hash del uuid). Mateix usuari → mateix mapa sempre. Sense BD nova.

**Regles de generació (per fer mapes creïbles, no soroll):**
- 1 massa d'aigua contínua (2-4 cel·les) a un cantó aleatori.
- 1-2 roques dispersades.
- 1 zona de sorra tocant l'aigua.
- Resta: gespa (majoritari) + alguna cel·la de terra.

**Bonus terreny-sala (D8):** taula constant al frontend:
```
Jardí   → prefereix grass  (+10% happiness_multiplier)
Balcó   → prefereix rock   (+10%)
Bany    → prefereix water  (+10%)
Cuina   → prefereix dirt   (+10%)
Menjador→ prefereix grass  (+5%)
```
Es mostra al tooltip de la sala i al càlcul de felicitat de `RoomPage`.

**Estil visual:** SVG inline (no assets externs, zero pes extra). Cada tile 48×48px amb patró CSS + colors del design system. Estil top-down tipus Stardew:
- `grass`: verd tou amb 2-3 puntets més foscos
- `water`: blau amb ones (2 línies clares)
- `rock`: gris amb esquerdes
- `dirt`: marró amb textura granulada
- `sand`: groc clar

**Sales col·locades:** overlay damunt del terreny amb la icona del tipus + `custom_name`. Quan arrossegues per moure (D5 ja implementat), el terreny de sota es fa visible transitòriament.

---

### Bloc B — Mascota al mapa (estàtica)

**Objectiu:** Sprite petit de la mascota apareix a la cel·la de la sala "preferida".

**Regla de sala preferida (determinista, sense estat nou):**
- Si el jugador té una sala tipus `dormitori` → la mascota va allà.
- Si no, primera sala per ordre de compra.

**Renderitzat:** dins la targeta de la sala al mapa, un `<span>🐾</span>` amb l'icona de l'espècie de `player_pets` (o emoji fallback). Posició absoluta cantonada inferior-dreta de la cel·la. Animació sutil `animate-bounce` cada 3s.

**Interacció:** clicar la mascota obre un `Sheet` amb `PetStatsBar` + accés ràpid a la sala on és.

**Zero canvis a BD.** Només llegir `player_pets` (ja carregat a `SpacePage`).

---

### Bloc C — QA final traduccions

Passada agressiva:
1. `grep -r "ca:" src/` i `grep -rn '["'\'']>[A-Z]' src/pages src/components` per detectar strings hardcoded.
2. Diff estructural `ca.json` vs `en.json` (ja sincronitzats, però reverifico).
3. Afegir claus noves d'aquesta iteració: `terrain.grass`, `terrain.water`, `apartment.terrainBonus`, `apartment.petHere`, etc. a ambdós idiomes.
4. Report final al xat amb qualsevol string trobat sense traduir.

---

### Fitxers a tocar

- `src/lib/terrain.ts` (nou) — generador PRNG + tipus + bonus map.
- `src/components/space/TerrainTile.tsx` (nou) — SVG tile per tipus.
- `src/components/space/PetOnMap.tsx` (nou) — sprite mascota + sheet.
- `src/pages/SpacePage.tsx` — integració terreny + mascota + tooltip bonus.
- `src/pages/RoomPage.tsx` — aplicar `terrain_bonus` al càlcul de felicitat.
- `src/i18n/ca.json` + `en.json` — claus noves.
- `src/test/terrain.test.ts` (nou) — verificar determinisme i regles de generació.

**Sense migracions SQL.** Tot al frontend perquè és presentació + càlcul derivat.

---

### Verificació

- Tests unitaris del generador (determinisme + coherència).
- 205+ tests existents han de continuar passant.
- Screenshot Playwright del `SpacePage` per confirmar visual.

**Estimació:** ~1.5 crèdits. Risc: baix (0 canvis a BD, 0 canvis a lògica de joc).
