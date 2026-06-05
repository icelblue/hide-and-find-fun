# Pla: Pressió i Bluff — CORE v1

Objectiu: més decisió psicològica, menys marge d'error, eines amb pes real. Tot reversible i sense entitats noves.

## Decisions tancades
| # | Decisió | Valor |
|---|---------|-------|
| 1 | Tokens diaris | **5 → 4🪙/dia** |
| 2 | Cost socials ofensius | SÍ (defensius gratis) |
| 3 | Caselles maleïdes | **-0.3 base**, **-0.5 si Elo alt** (llindar ≥1400) |
| 4 | Ordre | CORE sol, validar abans d'opcionals |
| 5 | Eines | **Consumibles single-use** (drap, martell, llanterna). Llanterna pool **3**. Tornavís UNLIMITED (no bloquejar joc) |
| 6 | Pool drap | Pujar RPC 2→**5** (alinear amb client) |

## Checklist persistent
Es guarda a `mem://features/pressure-bluff-checklist.md` i s'actualitza marcant `[x]` cada pas. Així si perdo memòria, només cal llegir-la.

```
[x] 1. Migració: token_reset 5→4
[ ] 2. Migració: costs socials (RPCs execute_*)
[x] 3. Migració: scenario_bonuses negatius (-0.3) inserts
[x] 4. Migració: aplicar -0.5 quan rival.elo>=1400 a execute_game_move
[x] 5. Migració: execute_tag_action revela escenari trencat
[x] 6. Migració: TOOLS pool drap 2→5 + llanterna 3 + consumir eina post-ús
[ ] 7. Frontend: actualitzar TOKEN_COSTS i UI socials (mostrar cost) — **Wave B pendent**
[x] 8. Frontend: marcar drap/martell/llanterna com consumibles a UI
[x] 9. i18n: textos nous (casella maleïda, consum eina, 4 tokens, llanterna ×3)
[x] 10. Memory: actualitzar game-mechanics-v2 + social-items + tools-system
[x] 11. Validació: tests REG-016 + REG-017 client↔RPC
```

## Detall tècnic

### Bloc 1 — Tokens 5→4
- `daily_token_reset` cron + funció de reset: canviar literal `5` → `4`
- `profiles.tokens` default → 4
- Frontend: cap canvi (llegeix de BD)

### Bloc 2 — Cost socials
RPCs a tocar amb deducció abans del check de slot:
| Ítem | Cost |
|------|------|
| Plàtan | 0.5🪙 |
| Barricada | 0.5🪙 |
| Trampa | 0.5🪙 |
| Espia | 0.5🪙 |
| Robar tornavís | 0.5🪙 |
| Swap | 1.0🪙 |
| Escut, Missatge, Bomba fum | gratis |

Frontend: mostrar `🪙` al SocialItemsPanel.

### Bloc 3+4 — Caselles maleïdes
1. INSERT a `scenario_bonuses`: 2 files per escenari amb `bonus_value='-0.3'` a posicions concretes.
2. A `execute_look`: si `_bonus_value < 0` i `rival.elo >= 1400` → multiplicar per `5/3` (≈-0.5).
3. Feedback toast: "💀 Casella maleïda! -0.3🪙"

### Bloc 5 — Trencar revela escenari
`execute_tag_action` (cas `break`): incloure `scenario_id` al payload del missatge cap al rival → notificació "💥 Han trencat un moble al Lavabo".

### Bloc 6 — Eines consumibles
Canvi gros però net:
- **Drap**: es consumeix en netejar. Bonus garantit en netejar: +0.3🪙 (palpable).
- **Martell**: es consumeix en trencar.
- **Llanterna**: es consumeix per look en fosc (Jardí/Balcó). Si no en tens, look bloquejat en fosc.
- **Tornavís**: **UNLIMITED** (com ara). Justificació: arreglar és la única manera de desbloquejar "sobre/dins" d'un moble que tu mateix pots haver trencat → no podem bloquejar joc.
- Pool partida: drap 5, martell 5, llanterna 3, tornavís 5 extra.
- `playerTools` decrement al RPC post-acció.
- UI: badge "1 ús" als consumibles.

## Out of scope (validem CORE primer)
- Reduir loot 15%→8%
- Espia mostra trail
- Barricada 2 peatges
- Mode Història

## Tests manuals post-deploy
1. Reset diari → 4🪙
2. Plàtan costa 0.5🪙, escut gratis
3. Trobar casella -0.3 a Elo baix, -0.5 a Elo alt
4. Trencar moble → rival rep toast amb escenari
5. Netejar consumeix drap + dona +0.3🪙
6. Sense llanterna → no pots mirar a Jardí
