
# Pla: joc 100% pixel art coherent

## Estat actual (auditoria)

**Ja pixel art:**
- 55 sprites `spr-*` + 12 backdrops `bg-*` + 6 textures `tex-*` de terreny.
- 32/32 mobles del `furniture_catalog` mapejats a sprite (`src/lib/room-sprites.ts`).
- Escenaris PvP i Espai Personal ja usen `PixelRoomGrid` amb textures.

**El que trenca la coherència pixel art:**
1. **30 "objectes amagables"** (taula `objects`: Anell, Clau, Cullera, Llibre, Mitjó, Moneda, Pilota, Plàtan podrit, ratolí PC, etc.) → renderitzats amb **emoji del sistema operatiu** (💍🔑🥄📖🧦🪙⚽🍌🖱️…). Trenquen tot l'estil pixel als moments clau: amagar i buscar.
2. **9 items socials** (Plàtan, Bomba fum, Escut, Espia, Swap, Barricada, Trampa, Missatge, Robar tornavís) → emojis al `SocialItemsPanel`.
3. **Icones d'eines** (🔨 martell, 🧹 drap, 🔧 tornavís, 🔦 llanterna) → emoji al HUD i FurnitureActionSheet.
4. **Overlays d'estat** (💥 trencat, 🧹 brut) → emoji sobre sprite pixel.
5. **UI genèrica**: mascota, banner d'inici, avatars, croneta de tokens, cartes de recompensa → mix d'emojis + gradients no-pixel.

## Objectiu

Que **tot** el que apareix dins d'una partida (amagar, buscar, HUD, popups) sigui pixel art amb la mateixa paleta i escala. La UI perimetral (menús, auth, perfil) pot quedar plana — no és on es juga.

## Llistat exhaustiu d'assets a crear

### A. Objectes amagables (30 sprites — **crítics**, són l'ànima del joc)
Anell, Bola de neu, Botó, Calces, Carta, Clau, Cor de vidre, Cullera, Dau, Foto, Gel, Joguina (osset), Llapis, Llibre, Mitjó, Mitjó pudent, Mocador, Moneda, Nas de pallasso, Pastís, Petard, Pilota, Pinta, Plàtan podrit, Ratolí PC, Rellotge, Rosa, Sabatilla, Xapa, Xiulet.
+ 1 placeholder `__custom__` (objecte personalitzat del jugador).

### B. Items socials (9 sprites)
Plàtan, Bomba de fum, Escut, Missatge, Espia, Swap, Barricada, Trampa, Robar tornavís.

### C. Eines (4 sprites) + tokens (2)
Martell, Drap, Llanterna, Tornavís, Moneda (token principal), Cor/vida.

### D. Overlays d'estat (2 sprites petits, 16×16)
Esclat "trencat", núvol de pols "brut". Substitueixen els emojis 💥/🧹.

### E. Retrat de la mascota — pixel (4 estats)
Neutral, feliç, trist, gana. Reutilitzable a `PetHealthBadge`, `WhileAwayDialog`, feed.

### F. Frames decoratius (2-3)
Marc pixel per cartes de recompensa i popup de "trobat!".

**Total: ~55 sprites nous.** Cap altre asset. Tots via `imagegen` amb prompt unificat i pujats amb `lovable-assets`.

## Directrius artístiques (una sola línia visual)

- Estil: **32×32 chunky pixel art**, 4-6 colors per sprite, contorn negre suau (1px), ombra plana sota.
- Paleta: reutilitzar la ja existent dels sprites de mobles (fusta clara/fosca, verd planta, blau bany, taronja cuina) per garantir cohesió.
- Fons: **transparent** (PNG amb canal alpha). Ja tenim un test que ho bloqueja si algú puja un JPG.
- Escala: tots els objectes amagables mateix bounding box perquè encaixin dins la cel·la del grid sense saltar.

## Implementació per ones (ordre de valor)

### Ona 1 — Objectes amagables (crítica, ~4 crèdits)
Sense això, la fase d'amagar/buscar es veu barrejada. És on es passa el 70% del temps de partida.

1. Generar 31 sprites (A) amb `imagegen` batch (transparents).
2. Pujar amb `lovable-assets` → `src/assets/objects/spr-obj-*.png`.
3. Nou fitxer `src/lib/object-sprites.ts`: map `object.name → spriteUrl` (mateix patró que `room-sprites.ts`).
4. Modificar `ItemActions.tsx`, `GamePopups.tsx`, `ScenarioPicker.tsx`, `SocialItemsPanel.tsx` per renderitzar `<img>` en comptes d'emoji quan hi ha sprite. Fallback a emoji si no.
5. Test regressió: cada `objects.name` de la BD ha de tenir sprite o fallback conegut.

### Ona 2 — Items socials + eines + estats (~2 crèdits)
6. Generar B + C + D (15 sprites).
7. Reemplaçar emojis a `SocialItemsPanel`, `FurnitureActionSheet`, HUD de tokens/eines.
8. Substituir badges 💥/🧹 dins `PixelRoomGrid` pels sprites d'overlay.

### Ona 3 — Mascota + frames (~1 crèdit)
9. Generar E + F (7 sprites).
10. Aplicar a `PetHealthBadge`, `RewardReveal`, popup de "trobat".

### Ona 4 — Polir (opcional, 0.5 crèdits)
11. Fons pixel per la `WaitingScreen` i el marc del popup de partida acabada.
12. Font pixel (Press Start 2P o VT323) només per titulars dins la partida — no per tota la UI, mataria la llegibilitat.

## Salvaguardes tècniques

- **Test transparència sprites** (ja existent) cobreix Ones 1-3 automàticament.
- Nou test: cada `objects.name` i cada `social_item_type` té una entrada al map de sprites (fallback controlat, no emoji sorpresa).
- Cap canvi de schema BD. Cap canvi de lògica de joc. Només presentació.
- Reversible: si un sprite queda lleig, l'emoji fallback torna a funcionar sense codi extra.

## Cost i decisió

- Total estimat: **~7.5 crèdits** (Ona 1 = 4, Ona 2 = 2, Ona 3 = 1, Ona 4 = 0.5).
- Recomanació: fer **Ona 1 primer i validar visualment** abans de continuar. Si el resultat convenç, seguir amb 2 i 3 en la mateixa sessió.

## Preguntes abans d'implementar

1. Confirmes fer **només Ona 1** ara (objectes amagables) o vols anar directe fins l'Ona 3?
2. Vols que generi 2-3 sprites d'exemple primer com a **prova d'estil** (0.3 crèdits) perquè validis paleta abans de tirar les 30?
