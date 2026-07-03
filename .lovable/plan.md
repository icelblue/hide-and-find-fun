# Pla: Backdrops pixel art per escenari PvP

## Problema

Ara mateix els mobles "floten" sobre el terra: la pica de la cuina apareix directament sobre la rajola, l'ordinador del despatx sense taula sota, el vàter sense paret enrajolada al darrere. Falta **mobiliari-context** que aguanti visualment els items interactius.

## Solució: capa de "backdrop" per cel·la

Afegim una **segona capa de sprites decoratius no interactius** que es pinta a sota dels mobles jugables, definida per escenari. No canvia lògica de joc — només render.

### Arquitectura (3 peces)

1. **Nous sprites de "mobiliari base"** (~8 sprites reutilitzables):
   - `spr-counter.png` — encimera de cuina (rectangle horitzontal, marbre/fusta)
   - `spr-desk-surface.png` — superfície d'escriptori (per despatx)
   - `spr-tiled-wall.png` — paret enrajolada (bany + cuina back)
   - `spr-bath-tiles.png` — terra/paret lavabo amb sanefa
   - `spr-nightstand.png` — tauleta petita (habitació, sota làmpada)
   - `spr-garden-fence.png` — tanca de fusta (jardí, balcó)
   - `spr-window.png` — finestra amb cel (paret superior sales interiors)
   - `spr-curtain.png` — cortina lateral (menjador, habitació)

2. **`SCENARIO_BACKDROPS`** a `pvp-scenario-themes.ts`:
   ```ts
   { cell: 6, sprite: sprCounter, span: 3 }  // encimera cel·les 6-8
   { cell: 0, sprite: sprWindow, span: 2 }   // finestra paret superior
   ```
   Cada escenari té la seva llista fixa de decoracions posicionades.

3. **`PixelRoomGrid` renderitza en 2 capes**:
   - Capa 0: textura terreny (ja existeix)
   - **Capa 1 (nova): backdrops** — sprites decoratius, `pointer-events: none`
   - Capa 2: mobles interactius (ja existeix)

### Layouts per escenari (context visual)

| Escenari | Backdrops |
|---|---|
| **Cuina** | Encimera continua a fila 1 (sota nevera/forn/pica/microones), finestra paret superior |
| **Lavabo** | Paret enrajolada superior, terra amb sanefa, encimera sota la pica |
| **Despatx** | Superfície d'escriptori sota laptop/monitor, finestra, prestatgeria de fons |
| **Habitació** | Tauleta al costat del llit, catifa de fons, finestra amb cortines |
| **Menjador** | Cortines laterals, paret amb sanefa decorativa |
| **Jardí** | Tanca perimetral, cel de fons a fila 0 |
| **Balcó** | Barana inferior contínua, cel a fils 0-1 |

També ajusto els `SCENARIO_LAYOUTS` perquè els mobles jugables encaixin **sobre** els seus backdrops (ex: la pica a cel·la 7 justament sobre l'encimera 6-8).

## Fases

**Fase 1** — Generació sprites backdrop (~8 imatges, ~0.5 crèdits) + tipus a `room-sprites.ts`.

**Fase 2** — `SCENARIO_BACKDROPS` map + render de capa 1 a `PixelRoomGrid`.

**Fase 3** — Reajust de `SCENARIO_LAYOUTS` perquè cada moble caigui sobre el seu backdrop (pica sobre encimera, laptop sobre escriptori, vàter contra paret enrajolada).

## Cost estimat

~1 crèdit total (0.5 sprites + 0.5 codi).

## Fora d'abast

- Animar backdrops (aigua a la pica, foc al forn) → fase posterior si vols.
- Backdrops per Espai Personal → primer validem a PvP, després reutilitzem.

## Confirmar abans de construir

1. **Els 8 backdrops proposats són suficients** o vols algun específic (ex: llar de foc al menjador, mirall gran al lavabo com a peça central)?
2. **Reajusto els layouts** perquè els mobles quedin ben posicionats sobre els backdrops (recomanat) o mantinc les cel·les actuals?
