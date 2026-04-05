
# Pla de Refactorització v1.8.0

## 1. 🏗️ Partir GamePage.tsx en components (1653→~300 línies el principal)

**Components nous a crear:**

| Component | Línies actuals | Responsabilitat |
|---|---|---|
| `GameHidePhase.tsx` | ~836-1036 | Tot el flux d'amagar: selecció objecte→escenari→moble→posició→specials |
| `GamePlayPhase.tsx` | ~1047-1280 | Fase de cerca: navegació, llum, investigació, social items |
| `GameFinishedPhase.tsx` | ~1315-1536 | Resultats: victòria/derrota, recompenses, info rival |
| `ItemActions.tsx` | ~1538-1653 | Component ja existent, extreure a fitxer propi |
| `GameHeader.tsx` | ~756-833 | Header amb codi, tokens, bonus picker |
| `SocialItemsPanel.tsx` | ~1238-1280 | Panel d'ítems socials |
| `BonusTokenPicker.tsx` | ~793-828 | Modal de bonus tokens |
| `GamePopups.tsx` | ~706-753 | Popups: special found, message received, troll effect |

**GamePage.tsx quedarà:**
- State centralitzat (useReducer en comptes de 30+ useState)
- loadGame() (movable a custom hook `useGameState`)
- Realtime subscription
- Render amb <Phase> components

## 2. 🔦 Unificar Llum i Llanterna

**Problema actual:** 
- `toggleLight()` → indoor, apaga/encén, costa 0.2, afecta visibilitat de TOTS els mobles
- `useLlanterna()` → outdoor, revela mobles hidden, costa 0.2, requereix eina
- Dos sistemes separats per a la mateixa mecànica conceptual: "il·luminació d'una zona"

**Solució:** Un únic sistema `toggleVisibility(scenarioId)`:
- **Indoor**: funciona com ara (interruptor on/off, 0.2🪙)
- **Outdoor (Jardí/Balcó)**: en comptes de "llanterna", és simplement "il·luminar zona" amb el mateix comportament que indoor. La diferència:
  - Indoor: comença amb llum ON, es pot apagar
  - Outdoor: comença amb llum OFF (fosc), cal encendre (0.2🪙, requereix llanterna com a eina)
  - Un cop il·luminat outdoor, els mobles hidden es revelen

**Canvis:**
- Eliminar `useLlanterna()` i `flashlightRevealed` state
- `toggleLight()` passa a funcionar amb un check `isOutdoor` intern
- El tag `tag:flashlight:X` es converteix en `tag:light_on:X` (outdoor starts off)
- El render es simplifica: "està il·luminat? → mostra mobles"

## 3. 🔧 Eines Tipades (eliminar jsonb lliure)

**Problema:** `{ drap: 0, tornavis: 1, martell: 0, llanterna: 1 }` hardcodejat 6+ vegades.

**Solució:**
```typescript
// src/lib/game-types.ts
export const DEFAULT_TOOLS: PlayerTools = {
  drap: 0, tornavis: 1, martell: 0, llanterna: 1
} as const;

export type PlayerTools = {
  drap: number;
  tornavis: number;
  martell: number;
  llanterna: number;
};

export function parseTools(raw: unknown): PlayerTools {
  if (typeof raw === 'object' && raw !== null) {
    const t = raw as Record<string, number>;
    return {
      drap: t.drap ?? DEFAULT_TOOLS.drap,
      tornavis: t.tornavis ?? DEFAULT_TOOLS.tornavis,
      martell: t.martell ?? DEFAULT_TOOLS.martell,
      llanterna: t.llanterna ?? DEFAULT_TOOLS.llanterna,
    };
  }
  return { ...DEFAULT_TOOLS };
}
```
- Reemplaçar totes les ocurrències de `(player as any).tools ?? { drap: 0, ... }` per `parseTools(player.tools)`

## 4. 🔒 Validació servidor del flux d'amagar (Edge Function)

**Problema:** `hideObject()` valida al client. Un jugador podria enviar dades invàlides via SDK.

**Solució:** Edge function `validate-hide` que:
1. Verifica que l'objecte existeix a la taula `objects`
2. Verifica que el moble existeix i pertany a un escenari vàlid
3. Valida material vs environment
4. Valida size vs inner_capacity per "dins"
5. Actualitza `game_players` via service_role

**Alternativa menys invasiva:** Trigger PostgreSQL `BEFORE UPDATE ON game_players` que valida quan `has_hidden` canvia a `true`. Això és millor perquè:
- No cal canviar el client
- Imposible bypassar
- Valida a nivell de DB

## 5. 📦 Simplificar player_inventory vs player_rewards

**Anàlisi:**
- `player_rewards`: mobles guanyats (sell/place). Vinculat a `reward_items`.
- `player_inventory`: extra_token, special_trophy, tools trobades. Genèric.

**Veredicte:** NO els fusionaria. Són conceptualment diferents:
- `player_rewards` = recompenses permanents amb valor econòmic
- `player_inventory` = registre de coses trobades durant partides

**Millora:** Documentar clarament a memory i afegir comments al codi.

## Ordre d'execució

1. **Crear `game-types.ts`** amb tipus i constants centralitzades (30 min)
2. **Extreure components** de GamePage.tsx un per un (2-3h)
3. **Unificar llum/llanterna** (1h)  
4. **Trigger de validació** per amagar (30 min)
5. **Tests** per verificar que res s'ha trencat
6. **Actualitzar docs** i memory

## Riscos

- El refactoring de GamePage és gran. Faré un component alhora i verificaré que compila.
- El canvi llum/llanterna afecta partides en curs. Migrarem `tag:flashlight:X` → `tag:light_on:X` en la lògica de parsing (backwards compatible).
