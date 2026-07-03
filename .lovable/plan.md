# Pla: Grid 2D Pixel Art unificat (PvP + Espai Personal)

## Objectiu

Substituir els `<Select>` de mobles del PvP i el grid abstracte de l'Espai Personal per un **mateix sistema de grid 2D pixel art** on cada sala té un mapa temàtic coherent (cuina té taulell/nevera/foguer; habitació té llit/armari/tauleta; jardí té gespa/arbres/tanca...). Els mobles es col·loquen a caselles fixes del grid; clicar-ne un obre un popover d'accions (PvP) o d'interaccions (Espai).

Un únic motor de renderitzat serveix les dues vistes → cost molt inferior a fer-ho dues vegades.

## Principis (tancats abans de codi)

1. **Un sol motor** `<PixelRoomGrid>` reutilitzat per PvP i Espai. Diferència = mode (`"pvp" | "personal"`) i handler de clic.
2. **Grid fix 6×5** (240 cel·les màx per sala) — encaixa a 390px amb cel·les de 60px + gap 2px.
3. **Layouts declaratius** a `src/lib/room-layouts.ts`: 1 arxiu, 1 layout per sala del catàleg (7 escenaris PvP + N sales personals per tema).
4. **Sprites compartits**: la nevera del PvP "Cuina" és el mateix sprite que la nevera de la cuina personal. 1 sprite = molts usos.
5. **Terreny per tema**, no per seed a l'Espai: la sala "Cuina" sempre té terra de rajola; "Jardí" sempre gespa. El seed que vam introduir queda **només per zones buides** entre sales.
6. **Fallback accessible**: toggle "vista clàssica" (Select) es manté a settings — no eliminem els components actuals fins que el grid estigui validat.

## Fases

### Fase A — Motor + layouts (sense sprites)
- `src/lib/room-layouts.ts` — coordenades `{itemId, x, y, w, h, spriteKey}` per **totes** les sales (7 PvP + tots els `room_catalog` temes personals).
- `src/components/room/PixelRoomGrid.tsx` — grid CSS, cel·les buides = terreny temàtic (color pla), mobles = quadrats de color amb label.
- Integració a `SpacePage` i vista PvP en mode "preview" (rere flag).
- **Verificació**: render correcte a 390px, cap solapament, tots els mobles hi caben.

### Fase B — Popover d'accions (PvP) + interaccions (Personal)
- `src/components/room/FurnitureActionSheet.tsx` — substitueix el `<Select>` del PvP amb el mateix menú d'accions (Observar/Moure), mateix cost, mateix efecte.
- Mode "personal": clic obre accions "Netejar / Interactuar mascota / Moure moble" (les que ja existeixen).
- Manteniment del `<Select>` clàssic sota flag `settings.classicView`.
- **Verificació**: partida PvP completa jugable des del grid, sense regressió de tokens/moviments.

### Fase C — Sprites pixel art
- Generació de sprites (~60 únics: 40 mobles PvP + 20 extres personals) amb `imagegen` en batch, 64×64 transparent PNG.
- 7 tilesets de terreny (rajola cuina, parquet habitació, gespa jardí, terra despatx, aigua lavabo, marbre menjador, fusta balcó).
- Mascota com a sprite estàtic col·locat a la sala escollida (feature ja existent, només canvia el render).
- **Verificació**: batch d'imatges revisat visualment; consistència d'estil (paleta limitada, mateix pixel size).

### Fase D — Polish
- Micro-animacions: hover casella, pulse a moble seleccionat, walk cycle de la mascota (2 frames).
- SFX opcional (clic, obrir popover).
- Traduccions dels nous strings d'acció (ja existeixen la majoria).

## Riscos i mitigació

| Risc | Mitigació |
|---|---|
| **Sales personals sense layout definit** (usuari afegeix sales custom) | Layout per defecte "graella lliure" 6×5 amb mobles auto-col·locats per ordre d'inserció; el layout temàtic només aplica si `room_catalog.theme` coincideix. |
| **Sprites inconsistents** (imagegen varia estil) | Prompt mestre fixat + revisió humana batch abans de fase D. Si un sprite desentona, es regenera individualment. |
| **Cost imagegen alt** (60+ sprites) | Reutilització agressiva: sprite "cadira" serveix a totes les sales. Total real ~35-40 sprites únics. |
| **Regressió jugabilitat PvP** | Flag `classicView`, tests E2E (pla separat ja acordat) abans de retirar el `<Select>`. |
| **Mòbil 390px estret** | Cel·les 60px validades en Fase A abans de fer sprites. Si no cap, baixem a grid 5×5. |
| **Sales personals amb molts mobles** (>30) | Grid amb scroll vertical (afegim files, no columnes). |
| **Terreny per seed vs per tema conflicteix** | Decisió tancada: seed només per zones exteriors entre sales. Dins la sala mana el tema. |

## Cost estimat

| Fase | Cost | Entregable |
|---|---|---|
| A. Motor + layouts | ~1 crèdit | Grid funcional sense art |
| B. Popover + integració | ~1 crèdit | PvP + Personal jugables amb grid |
| C. Sprites pixel art | ~1.5 crèdits | Art complet |
| D. Polish | ~0.5 crèdits | Animacions + so |
| **Total** | **~4 crèdits** | Sistema unificat complet |

## Ordre d'execució recomanat

1. **A+B en un sol lliurament** (2 crèdits) — valida jugabilitat i UX abans d'invertir en art.
2. Pausa: user prova, decideix si continuar.
3. **C** — sprites en batch.
4. **D** — polish final.

## Fora d'abast (plans separats ja acordats)

- Eina admin translations.
- Tests E2E Playwright del flux apartament (recomanable abans de retirar `<Select>` clàssic).
- Refactor `StoryModePage`.

## Decisions que necessito confirmar

1. **Grid 6×5 fix per totes les sales?** (alternativa: mida variable per sala)
2. **A+B junts primer i pausa abans de C+D?** (alternativa: tot d'un cop)
3. **Sales personals custom sense tema** → layout genèric "graella lliure" OK?
