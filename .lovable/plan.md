
## Què queda del pla i què cal implementar

He revisat el pla `.lovable/plan.md` (multi-sala) i el codi actual. Les 5 fases del pla original **ja estan fetes**. El que falta és:

- **Peces del pla anterior no tancades** (D1–D6 de la proposta "sales amb personalitat + moure").
- **Bug reportat del mode història**: recompenses visibles abans de decidir.
- **Auditoria general de codi + traduccions**.

Ordeno per prioritat i executo en 3 blocs. Bloc 1 i 2 són cirurgia concreta. Bloc 3 és auditoria (report + fixes petits).

---

## Bloc 1 — Sales amb personalitat i moviment (crític)

**Problema:** Ara totes les sales són funcionalment idèntiques. Renombrar "Bany" com "Menjador" trivialitza tot. Tampoc es poden moure. La progressió no té sentit mecànic.

**Decisions que aplico** (defaults raonables, si vols canviar-ne alguna digues-m'ho abans d'aprovar):

- **D1 Grid variable per tipus**: SÍ. Cada plantilla té `grid_w`/`grid_h`. RoomPage renderitza dinàmic.
- **D2 Categories permeses per tipus**: SÍ. `allowed_categories text[]`. Filtra què pots col·locar a cada sala.
- **D3 Multiplicador felicitat per sala correcta**: SÍ. `happiness_multiplier numeric(3,2)` sobre mobles de categoria pertinent.
- **D4 Portes variables per tipus**: SÍ. Hall=4, Menjador=3, Balcó/Bany/Despatx=1, resta=2.
- **D5 Moviment sales**: **fletxes ↑↓←→** al panell de la sala (més robust en mobile que drag).
- **D6 Renombrar**: llibertat total, però el mapa i llistat mostren SEMPRE la icona del tipus real (impossible enganyar al PvP).

### Canvis tècnics

1. **Migració SQL** — `room_catalog`:
   - `+ grid_w int NOT NULL DEFAULT 4`
   - `+ grid_h int NOT NULL DEFAULT 4`
   - `+ allowed_categories text[] NOT NULL DEFAULT '{}'` (buit = tot permès)
   - `+ happiness_multiplier numeric(3,2) NOT NULL DEFAULT 1.00`
   - `UPDATE` per cada tipus amb els valors definitius (taula sota).

2. **Taula tancada de plantilles**:

```text
Tipus       grid  slots doors  categories permeses            bonus
Dormitori   4×4   16    2      (totes)                         1.00×
Balcó       4×2   8     1      nature,pet                      1.30×
Menjador    5×4   20    3      dining,music,decor              1.20×
Cuina       4×4   16    2      kitchen,tech                    1.50×
Bany        3×3   9     1      bath                            1.30×
Despatx     4×3   12    1      tech,music                      1.40×
Jardí       5×4   20    2      nature,pet                      1.30×
Hall        3×3   9     4      decor                           1.10×
```

3. **`RoomPage.tsx`**:
   - Grid dinàmic (usar `grid_w`/`grid_h` de la plantilla).
   - Filtrar `furniture_catalog` per `allowed_categories`.
   - Mostrar bonus aplicat al comptador de felicitat.
   - Botonera **moure sala** (4 fletxes) que crida un UPDATE de `player_rooms.position_x/y` validant casella lliure.

4. **`SpacePage.tsx`**:
   - Cada targeta de sala del llistat mostra `icona_tipus + nom_editable + tipus_real` per evitar enganys visuals.
   - Diàleg "Sala nova" mostra grid, portes màx i bonus de cada plantilla.

5. **`personal-pvp-adapter.ts`**:
   - Cap canvi funcional (ja llegeix `room_catalog`); només afegir `grid_w/grid_h` als camps si els necessita.

6. **Traduccions**: afegir `apartment.grid`, `apartment.bonus`, `apartment.move`, `apartment.moveHint`, `apartment.blockedMove`, i etiquetes de categoria a `ca` i `en`.

---

## Bloc 2 — Bug mode història (recompenses visibles)

**Investigació:** He revisat `StoryNodeView`, `PuzzleNodeView`, `DailyChallengeCard` i `StoryModePage`. El codi **no** mostra `reward_type`/`reward_value` abans de clicar. Però sí:

- **Icones ✨/❤️ i pastilles morades de trait** als botons de decisió — són indicadors de **requisits**, però visualment el jugador els pot llegir com a "aquesta opció té premi". El comentari `// Bug A fix` a `StoryNodeView.tsx:81` ja va intentar tapar-ho, però només va treure els multiplicadors de trait, no els badges de requisit.
- **`DailyChallengeCard.tsx:96`**: mostra literalment `rewardLabel(reward_type, reward_value)` de l'anterior repte completat. Això sí és preview directe (encara que sigui d'ahir). Discutible.
- **Repte diari nou**: no mostra recompensa (correcte).

**Fixes:**

1. `StoryNodeView.tsx`:
   - Treure icones ✨/❤️ dels labels de decisió. Els requisits es validen amagant l'opció (ja passa) o bloquejant-la — no cal donar pista visual.
   - Treure les pastilles de trait requerit (`usesTraits`). El color de fons morat suau (`border-purple-400/60`) es manté només com a senyal subtil, sense text del trait concret.
2. `DailyChallengeCard.tsx:83-100` (bloc `alreadyDone`): substituir `rewardLabel(...)` per un text genèric "Completat avui" — així no s'insinua què tocarà demà.
3. Afegir test de regressió a `src/test/`: verificar que `StoryNodeView` renderitzat amb un choice amb `reward_type='xp'` no conté cap `+XP`, `Recompensa`, etc.

---

## Bloc 3 — Auditoria de codi i traduccions (report + fixes petits)

Aquesta part la faig en el mateix torn però com a **anàlisi + fixes segurs**, no com a refactor gran. Si detecto res crític, ho separo en un nou pla.

**Checklist auditoria:**

1. **Traduccions**: `grep` de strings hardcoded fora de fallbacks `t("k", "fallback")` a `src/pages/**`, `src/components/**`. Report de claus faltants entre `ca.json` i `en.json` (comparació estructural).
2. **Bones pràctiques React**:
   - `useEffect` amb dependències falses (buscar `// eslint-disable-next-line react-hooks/exhaustive-deps`).
   - Fetches supabase dins render sense cancel·lació.
   - Estats no derivats que podrien ser `useMemo`.
3. **Seguretat**:
   - Rutes protegides sense guard d'auth.
   - Consultes supabase sense filtre `user_id` explícit.
4. **Rendiment**:
   - Imports pesants sense lazy (`StoryModePage`, `GamePage`).
5. **Types**: `any` a ubicacions crítiques (`reward_value: any`, `layout: unknown`).

**Entregable Bloc 3:** report en xat + fixes mínims (afegir traduccions faltants, corregir 2–3 casos evidents). Si trobo deute gran, faig un pla nou per separat.

---

## Ordre d'execució i estimació

1. **Bloc 2 (bug història)** — ràpid, alt impacte percebut. ~0.3 crèdits.
2. **Bloc 1 (sales amb personalitat + moviment)** — migració + refactor `RoomPage`/`SpacePage` + i18n. ~1.5 crèdits.
3. **Bloc 3 (auditoria + traduccions faltants)** — report + fixes petits. ~0.5 crèdits.

**Total estimat: ~2.3 crèdits.**

---

## Fora d'abast (no faig en aquesta tanda)

- Repintar temes visuals de l'apartament (fons, papers pintats).
- Refactor gran de `StoryModePage` (738 línies — mereix pla propi si el vols dividir).
- Migració a React Query / eliminació de `any` sistemàtica.
- Tests E2E de Playwright del flux d'apartament.

## Confirmació

Aprova per començar per **Bloc 2 → Bloc 1 → Bloc 3** en el mateix torn. Si vols canviar alguna decisió D1–D6 o el mapa de plantilles, digues-m'ho ara i actualitzo el pla abans d'executar.
