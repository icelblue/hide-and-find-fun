---
name: Regression tracking
description: Tests de regressió a src/test/regressions.test.ts — cada bug corregit té un test REG-XXX que evita que torni
type: feature
---

## Sistema de regressions

Fitxer: `src/test/regressions.test.ts`

Cada regressió documentada amb:
- Codi REG-XXX
- Data de detecció
- Descripció del bug
- Fix aplicat
- Test que ho valida

### Regressions registrades

| Codi | Bug | Fix |
|------|-----|-----|
| REG-001 | Trofeus duplicats per clics ràpids | actionLoading + unique index DB |
| REG-002 | Bonus tokens infinits | RPC redeem_bonus_tokens atòmic |
| REG-003 | Bomba de fum → rival no pot guanyar | rivalSmokeBombAt + filter lookedSpots |
| REG-004 | Doble-clic ítems socials | actionLoading prop a SocialItemsPanel |
| REG-005 | Popup especial desapareix | re-fetch objectSpecial a handleSelectPosition |
| REG-006 | Foto doble comportament | find_special_type + find_prompt_text |
| REG-007 | Pistes (traits) mai visibles | RPC get_rival_traits (server-side) |
| REG-008 | Lag bomba de fum (6 queries) | RPC execute_smoke_bomb (1 transacció) |

### Protocol per noves regressions

1. Afegir test REG-XXX a `regressions.test.ts`
2. Actualitzar aquesta memòria
3. Corregir el bug
4. Verificar que el test passa
