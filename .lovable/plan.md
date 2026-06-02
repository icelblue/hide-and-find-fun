# Pla de millores (auditat, peça a peça)

## Estat de les tasques

| # | Tasca | Estat | Notes |
|---|-------|-------|-------|
| 1 | Fix pestanyes "How to play" al Lobby | ✅ Fet | `onMouseDown stopPropagation` a l'overlay de HelpButton |
| 2 | Story mode: motxilla tradueix objectes a EN | ✅ Fet | `story_item_name` + `fetchTranslations` a `InventoryDrawer.tsx`, 25 traduccions EN inserides |
| 3 | Receptes i ítems Story: més freqüents i variats | ❌ Cancel·lat | Usuari no vol canvis de moment |
| 4 | PvP: botó compartir + enllaç segur a partida | 🔲 Pendent | Ruta `/join/:gameId` + RPC `join_game_by_link` + botó compartir |
| 5 | Mode Demo / Guest sense registre | 🔲 Pendent | Pendent decisió arquitectònica (tutorial guiat vs sandbox PvP complet) |
| 6 | Bug pistes EN (sobre/sota/dins/darrere) | ✅ Fet | `posLabel()` a `GamePage.tsx` + `t("game.pos.*")` a `ItemActions.tsx` |
| 7 | PetEvolutionCard "Lv Lv" duplicat | ✅ Fet | Eliminat duplicat de label a `PetEvolutionCard.tsx` |
| 8 | Traducció completa tabs HelpButton (Bàsic/Regles/Premis) | 🔲 Pendent | ~50 strings nous a `ca.json`/`en.json` |
| 9 | Constants hardcoded: MATERIAL_LABELS, ENVIRONMENT_LABELS, SOCIAL_ITEMS, errors | ✅ Fet | Constants ja eren i18n keys; 9 errors `throw new Error(...)` ara via `tt()` (nou `lib/i18n-helpers.ts`) |
| 10 | Posicions dins mobles no traduïdes | ✅ Fet | Corregit a `ItemActions.tsx` (línies 128, 136) |
| 11 | `getObjects()` no tradueix | 🔲 Pendent | Només l'usen alguns punts; traduir a fase següent |

---

## 3. Receptes i ítems Story: més freqüents i variats [PENDENT]

**Estat actual**: probabilitat baixa de drop, poca varietat percebuda.

**Pla de balanç (sense trencar saves)**:
- Auditar `story_nodes` choices que donen items: pujar pes de drop d'ítems comuns 1.5–2x.
- Receptes: reduir cost (ingredients) en 1 per receptes bàsiques; afegir 3-5 receptes noves de combinació senzilla.
- Afegir un node "Taller / Mercat" recurrent que aparegui cada X passos amb pool d'ítems aleatori.
- Tot via migració de dades (UPDATE story_choices SET item_drop_weight, INSERT story_recipes). Sense canvis d'esquema.
- Traduir els ítems/receptes nous a EN dins la mateixa migració.

**Decisions pendents de l'usuari**:
- Quants ítems comuns nous? (suggereixo 8-10)
- % d'augment de drop rate? (suggereixo +50% per comuns, +20% per rars)
- Quantes receptes noves? (suggereixo 3-5 senzilles de 2 ingredients)
- Tema preferent? (cuina, alquímia, natura, màgia…)

---

## 4. PvP: botó compartir + enllaç segur a partida [PENDENT]

**Requisits del usuari**:
- Botó "Compartir" a partida PvP → genera enllaç (WhatsApp, copia, etc.).
- Si la partida té rival assignat: només aquest rival pot entrar (validació per `auth.uid()`).
- Si la partida està oberta (sense rival): qui obri l'enllaç i estigui logat pot acceptar com a rival.

**Implementació**:
- Ruta nova: `/join/:gameId` → component `JoinGamePage`.
  - Si no logat → redirigir a `/auth?redirect=/join/:gameId`.
  - Si logat: cridar RPC `join_game_by_link(game_id)` que:
    - Si `rival_user_id` és NULL → assigna `auth.uid()` com a rival, retorna OK.
    - Si `rival_user_id = auth.uid()` → OK, navega a partida.
    - Si `rival_user_id != auth.uid()` → error "Aquesta partida ja té rival".
    - Si `creator_user_id = auth.uid()` → navega a la pròpia partida.
- Botó "Compartir" a `GamePage` (fase waiting + qualsevol fase): obre Web Share API si suportat, fallback a copy + WhatsApp link (`https://wa.me/?text=...`).
- Seguretat: la RPC és `security definer` amb `set search_path = public`, valida amb `auth.uid()` (no client-side). RLS de `games` ja restringeix lectura; afegim política de UPDATE per `rival_user_id` només quan és NULL.
- Edge cases: partida finished/expired → bloquejar join amb missatge clar.

---

## 5. Mode Demo / Guest sense registre [PENDENT]

**Objectiu**: provar el joc abans de registrar-se.

**Opció escollida (segura i mínima)**: tutorial interactiu en frontend, no requereix backend ni anonymous auth (prohibida per política):
- Pàgina `/demo` accessible des d'Auth/Landing.
- Mode "sandbox" 100% client-side: estat en memòria/localStorage que simula una partida PvP curta contra una IA scriptada (bot que fa moviments predefinits).
- Reutilitza components `ScenarioPicker`, `ItemActions`, etc. amb un adapter que llegeix d'un store local en lloc de Supabase.
- Mostra CTA "Registra't per jugar real" al final.

**Per què no anonymous auth**: la política del projecte ho prohibeix explícitament i obriria forat de seguretat (creació massiva de comptes). El mode demo client-side és més segur, no consumeix recursos i és immediat.

---

## 8. Traducció completa tabs HelpButton [PENDENT]

**Àmbit**: Pests "Bàsic / Regles / Premis" dins del modal HelpButton (variant PvP).

**Tasca**: ~50 strings nous a `ca.json`/`en.json`. No fet per pressupost de temps a torn anterior.

---

## 9. Constants hardcoded a supabase-helpers.ts [PENDENT]

**Llista de constants**:
- `MATERIAL_LABELS` — traduir a i18n keys
- `ENVIRONMENT_LABELS` — traduir a i18n keys
- `SOCIAL_ITEMS` — traduir a i18n keys
- Errors hardcoded — traduir a i18n keys

---

## 11. getObjects() traducció [PENDENT]

**Nota**: Només l'usen alguns punts aïllats del joc. Traducció planificada per a fase posterior.

---

## Ordre d'execució proposat (commits separats per seguretat)

1. **Traducció tabs HelpButton** (frontend, JSONs) — risc nul.
2. **Constants hardcoded supabase-helpers** (frontend, refactor) — risc nul.
3. **Share-link PvP** (migració RPC + ruta nova + botó) — risc mitjà, requereix tests.
4. **Mode demo** (ruta nova, sandbox aïllat) — risc nul (no toca BD).
5. **Balanç receptes/ítems** (migració dades) — risc mitjà, reversible. Necessita confirmació prèvia.
6. **getObjects() traducció** (frontend) — risc nul.
7. **Docs + memory updates**.

## Validacions abans de tancar

- Tests existents passen (`regressions.test.ts` ja cobreix REG-015 tabs HelpButton).
- Linter Supabase net.
- Manual QA: alternar CA/EN a Lobby, Story, PvP; provar enllaç PvP amb 2 usuaris i amb un no-rival; provar /demo sense login.
