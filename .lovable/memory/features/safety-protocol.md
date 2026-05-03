---
name: Safety protocol
description: Protocol obligatori abans de qualsevol canvi — pre-flight, zones crítiques marcades amb 🔒 CRITICAL, smoke tests E2E
type: preference
---

## 🛡️ Protocol obligatori (l'usuari ho vol SEMPRE)

### 1. Pre-flight ABANS de qualsevol canvi
Cal anunciar a l'usuari en text ABANS de modificar codi:
- **Tocaré**: fitxers concrets
- **Risc**: què pot trencar-se
- **Tests que executaré**: REG-XXX rellevants + smoke E2E si cal
- Esperar validació de l'usuari abans de procedir.

Excepció: bugs evidents d'1 línia (typo, import). Tot la resta = pre-flight.

### 2. Marcadors 🔒 CRITICAL al codi
Blocs de codi sensibles porten comentari `// 🔒 CRITICAL: <motiu>`.
Si l'IA toca una línia dins d'un bloc CRITICAL, ha d'avisar l'usuari i executar tests REG abans + després.

Zones marcades:
- `src/lib/supabase-helpers.ts` — getObjects() normalització object_specials
- `src/lib/custom-object.ts` — validació icona/nom custom
- `src/lib/object-specials.ts` — efectes especials
- `src/pages/GamePage.tsx` — fase amagar (amagatall + custom + missatges + traits)
- `src/components/game/GameFinishedPhase.tsx` — render objecte trobat (custom icon/name)
- `src/components/game/GamePopups.tsx` — winFoundPopup amb custom
- `src/components/HelpButton.tsx` — onClick pestanyes amb stopPropagation
- RPCs DB: `get_rival_traits`, `execute_game_move`, `execute_smoke_bomb`, `execute_barricada`, `execute_trampa`, `redeem_bonus_tokens`

### 3. Tests obligatoris
- Unit: `src/test/regressions.test.ts` (REG-XXX) — passar TOTS després de cada canvi
- E2E: `tests/e2e/smoke.spec.ts` — fluxos crítics (login, lobby, obrir partida, panell ajuda amb pestanyes)
- Si trenques un test, NO marquis com fet.

### 4. Nova regressió detectada → REG-XXX
1. Afegir test a `regressions.test.ts`
2. Marcar el codi afectat amb `// 🔒 CRITICAL: REG-XXX`
3. Actualitzar `regressions.md`
