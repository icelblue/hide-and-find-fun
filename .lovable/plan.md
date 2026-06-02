
# Pla de millores (auditat, peça a peça)

## 1. Bug: pestanyes "How to play" no clicables al Lobby

**Causa real (auditada)**: `HelpButton variant="menu"` està dins de `{menuOpen && (...)}` al dropdown de LobbyPage. Quan el modal s'obre i fas clic a una pestanya, el listener d'outside-click del menú detecta el clic fora del dropdown → `setMenuOpen(false)` → React desmunta `HelpButton` → el portal del modal també desapareix. Sembla que "les pestanyes no es seleccionen" però en realitat el modal s'està tancant.

**Fix**:
- Aixecar el `HelpButton` fora del bloc `{menuOpen && ...}`: muntar-lo sempre al Lobby, i exposar una API perquè el botó del menú l'obri.
- Solució neta: convertir el modal de HelpButton en estat controlat opcional (`open`, `onOpenChange`), o exposar una ref `helpButtonRef.openHelp()`. Decisió: afegir prop opcional `controlled` amb `useImperativeHandle` + un wrapper invisible quan `variant="menu"` només renderitza l'item del menú però el modal viu al pare.
- Implementació mínima: separar `HelpButton` en `<HelpMenuItem onClick={openHelp}/>` (dins el menú) + `<HelpModal open={open} onClose={…}/>` (sempre muntat a Lobby/GamePage).

## 2. Story Mode: motxilla no tradueix objectes a EN

**Auditoria**: `InventoryDrawer.tsx` mostra items però `loadItems()`/render no passa pels noms per `translateRows`. Els items venen de `story_items` (entity `story_item_name`).

**Fix**:
- Afegir entity_type `story_item_name` (i `story_item_description` si cal) al sistema i18n.
- Migració: inserir traduccions EN existents dels ítems story (via Lovable AI Gateway si calen massives, o manual per als ~20-40 ítems).
- `InventoryDrawer` + qualsevol lloc on es mostri nom d'ítem story → passar per `translateRows` o `translateContent`.

## 3. Receptes i ítems Story: més freqüents i variats

**Estat actual** (per memòria pet-personality + story-mode): probabilitat baixa de drop, poca varietat percebuda.

**Pla de balanç (sense trencar saves)**:
- Auditar `story_nodes` choices que donen items: pujar pes de drop d'ítems comuns 1.5–2x.
- Receptes: reduir cost (ingredients) en 1 per receptes bàsiques; afegir 3-5 receptes noves de combinació senzilla.
- Afegir un node "Taller / Mercat" recurrent que aparegui cada X passos amb pool d'ítems aleatori.
- Tot via migració de dades (UPDATE story_choices SET item_drop_weight, INSERT story_recipes). Sense canvis d'esquema.
- Traduir els ítems/receptes nous a EN dins la mateixa migració.

## 4. PvP: botó compartir + enllaç segur a partida

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

## 5. Mode Demo / Guest sense registre

**Objectiu**: provar el joc abans de registrar-se.

**Opció escollida (segura i mínima)**: tutorial interactiu en frontend, no requereix backend ni anonymous auth (prohibida per política):
- Pàgina `/demo` accessible des d'Auth/Landing.
- Mode "sandbox" 100% client-side: estat en memòria/localStorage que simula una partida PvP curta contra una IA scriptada (bot que fa moviments predefinits).
- Reutilitza components `ScenarioPicker`, `ItemActions`, etc. amb un adapter que llegeix d'un store local en lloc de Supabase.
- Mostra CTA "Registra't per jugar real" al final.

**Per què no anonymous auth**: la política del projecte ho prohibeix explícitament i obriria forat de seguretat (creació massiva de comptes). El mode demo client-side és més segur, no consumeix recursos i és immediat.

## 6. Bug menor (screenshot): historial pistes en català

Confirmar a `GamePopups.tsx` o on es renderitza l'historial que els labels `sobre`/`sota`/etc. passen per `t()`. Probablement venen de constants posicionals no traduïdes.

## 7. Actualització de documentació

Al final, actualitzar:
- `.lovable/memory/features/i18n.md`: afegir `story_item_name`, share-link, mode demo.
- `.lovable/memory/features/game-mechanics-v2.md`: documentar share-link RPC.
- Nou: `.lovable/memory/features/demo-mode.md` amb com afegir nous escenaris al sandbox.
- `CHANGELOG.md`: entrada amb totes les millores.

---

## Ordre d'execució proposat (commits separats per seguretat)

1. **Fix Lobby tabs** (frontend, 1 fitxer) — risc nul.
2. **Bug pistes EN** (sobre/sota) — risc nul.
3. **Story items i18n + motxilla** (migració dades + frontend) — risc baix.
4. **Share-link PvP** (migració RPC + ruta nova + botó) — risc mitjà, requereix tests.
5. **Mode demo** (ruta nova, sandbox aïllat) — risc nul (no toca BD).
6. **Balanç receptes/ítems** (migració dades) — risc mitjà, reversible.
7. **Docs + memory updates**.

## Validacions abans de tancar

- Tests existents passen (`regressions.test.ts` ja cobreix REG-015 tabs HelpButton).
- Linter Supabase net.
- Manual QA: alternar CA/EN a Lobby, Story, PvP; provar enllaç PvP amb 2 usuaris i amb un no-rival; provar /demo sense login.

## Confirmació necessària

És un pla gran (6 àrees). Vols que executi **tot** en aquest torn, o prefereixes que comenci pels punts 1-3 (fix bugs + traducció) i en el següent torn fem 4-6 (share-link, demo, balanç)? Recomano dividir per mantenir cada canvi auditable.
