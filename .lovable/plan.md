# Refactor de GamePage.tsx en hooks

## Objectiu
Reduir `GamePage.tsx` de ~1960 línies a **~600-800 línies** (només JSX + orquestració), sense canviar cap comportament ni cap test. Extreure la lògica en 5 hooks amb responsabilitats netes. Deixar el fitxer preparat per Wave D sense fer-hi cirurgia futura de risc.

## Principis (no negociables)
- **Zero canvi de comportament**: mateix ordre d'efectes, mateixes dependències, mateix RPC. Els 260 tests han de passar sense modificar-ne cap.
- **Un hook = una responsabilitat**. No barrejar estat de UI amb estat de partida.
- **Refs compartides es passen com a arguments**, no s'amaguen dins hooks separats que caldria sincronitzar.
- **Sense abstraccions especulatives**: si un estat només l'usa el JSX, es queda al component.

## Arquitectura de destí

```text
src/pages/GamePage.tsx                       (~700 línies: JSX + orquestració)
src/hooks/game/
  ├─ useGameLoader.ts        loadGame + scheduleLoadGame + refs de reload
  ├─ useGameRealtime.ts      subscripció a game_moves / social_items + reload debounced
  ├─ usePersonalCombat.ts    override d'scenaris/objectes per mode personal_pvp
  ├─ useHidingFlow.ts        estat i handlers de la fase "hide" (steps, custom object, special)
  └─ useSearchFlow.ts        estat de "search" (lookedSpots, sheetItemId, handleLook, handleMove, tools)
src/lib/game/
  └─ game-derived.ts         helpers purs (derivats: isPersonalGame, isOutdoor, tokensRemaining, …)
```

## Ordre d'extracció (5 passes petits, cadascun verificable amb tests)

**Pas 1 — `usePersonalCombat`** (~60 línies, risc baix)
- Encapsula l'`useEffect` de línies 555-579 + `personalDataRef`.
- Retorna `{ isPersonalGame, personalData, scenariosOverride, objectsOverride }`.
- GamePage substitueix `setScenarios/setObjects` per l'ús directe del retorn quan `isPersonalGame`.

**Pas 2 — `useGameLoader`** (~320 línies, risc mitjà)
- Mou `loadGame` (línies 182-477) + `scheduleLoadGame` + `isLoadingGameRef` + `pendingReloadRef` + `realtimeReloadTimeoutRef`.
- Rep com a paràmetre `{ gameId, user, isPersonalGame, personalData }` i setters d'estat que ja viuen al component (via un objecte `setters`).
- Retorna `{ loadGame, scheduleLoadGame }`.
- **Nota**: no mou l'estat, només la funció. Això evita rewire complet dels 20+ `useState`.

**Pas 3 — `useGameRealtime`** (~200 línies, risc mitjà)
- Encapsula els dos `useEffect` grans (530-553 i 557-1101) que subscriuen canals de Supabase.
- Rep `{ gameId, user, loadGame, scheduleLoadGame, handleRealtimeSocialItem, isStory }`.
- Manté `seenRevealMoveIdsRef` internament (només aquest hook el consumeix).

**Pas 4 — `useHidingFlow`** (~120 línies, risc baix)
- Agrupa tot l'estat de la fase "hide": `selectedScenario`, `selectedObject`, `selectedItem`, `selectedPosition`, `hideStep`, `objectSpecial`, `specialInput`, `selectedVariant`, `hideMessage`, `showHideMessagePopup`, tots els `customObject*`.
- Exposa handlers: `handleSelectScenario`, `handleSelectObject`, `handleHide`, `resetHiding`.

**Pas 5 — `useSearchFlow`** (~100 línies, risc baix)
- Agrupa estat de "search": `sheetItemId`, `connectedScenarios`, `moveHistory`, `actionLoading`, `itemInteractions`, `playerTools`, `dirtyItems`, `breakableItems`, `gameBreaks`, `illuminatedScenarios`, `scenarioIsDarkState`.
- Handlers: `handleLook`, `handleMove`, `handleToggleLight`, `handleTagAction`.

## Detalls tècnics

**Estat que NO es mou** (queda al component perquè el consumeix el JSX directament):
- `game`, `player`, `rival`, `phase`, `scenarios`, `objects`, `items`, `currentScenarioItems`
- Estat de popups: `pendingReveal`, `showSpecialFoundPopup`, `winFoundPopup`, `trollEffect`, `receivedMessage`, `bananaBlockedSpot`, `rivalSmokeBombAt`
- `pixelView`, `showSocialPanel`, `showMyHideout`, `myHideoutData`

**Contracte dels hooks** (exemple `useGameLoader`):
```ts
export function useGameLoader(opts: {
  gameId: string | undefined;
  user: User | null;
  isPersonalGame: boolean;
  personalDataRef: MutableRefObject<PersonalCombatData | null>;
  setters: {
    setGame: Dispatch<SetStateAction<any>>;
    setPlayer: Dispatch<SetStateAction<any>>;
    // …tots els setters que loadGame toca
  };
}): {
  loadGame: () => Promise<void>;
  scheduleLoadGame: (delay?: number) => void;
};
```
Passem el paquet de setters explícit → cap acoblament ocult, cap "context màgic".

**Els refs (`isLoadingGameRef`, `pendingReloadRef`, `realtimeReloadTimeoutRef`, `seenRevealMoveIdsRef`, `personalDataRef`)** viuen al hook que els usa. Si dos hooks els comparteixen (`useGameLoader` + `useGameRealtime` comparteixen `isLoadingGameRef`), es creen al component i es passen per opts.

## Verificació per pas
Després de cada pas:
1. `bunx tsgo --noEmit` (typecheck)
2. `bunx vitest run` (260 tests han de continuar en verd)
3. Smoke manual mental: waiting → hide → search → finished renderitzen igual

Si algun pas falla en tests, es reverteix aquell pas sol (no tota la refactor).

## Cost estimat
- Pas 1: 0.3 crèdits
- Pas 2: 0.7 crèdits (el més gran)
- Pas 3: 0.6 crèdits
- Pas 4: 0.4 crèdits
- Pas 5: 0.4 crèdits
- **Total: ~2.4 crèdits**

## Resultat final
`GamePage.tsx` queda amb: imports, declaració de tots els `useState` que sobreviuen, 5 crides a hooks, els handlers de UI simples, i el JSX. Res més. Wave D podrà tocar mecàniques sense navegar per 1960 línies.

## Fora d'aquesta feina (deixem per després)
- Extreure sub-components de render (ex. `<HidePhase>`, `<SearchPhase>`). El JSX es queda tal qual — un altre dia.
- Tipar bé els `any` (`game`, `player`, `rival`). No és refactor, és tipatge; es fa quan calgui.
- Tests unitaris nous per als hooks. Els regressions actuals ja cobreixen el comportament end-to-end.
