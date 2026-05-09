
# Pla — Mode Història v3.1 (UX polit + Reptes diaris)

🔒 **Aïllament total del PvP**: només es toquen fitxers de `src/pages/StoryModePage.tsx`, `src/components/story/*`, `src/lib/story-runs.ts` i una migració additiva. Cap fitxer de `src/components/game/`, `src/lib/supabase-helpers.ts`, RPCs PvP, `GamePage.tsx` o `LobbyPage.tsx` es modifica.

## 1. Ocultar recompenses (decideix sense saber el resultat)

- A `StoryNodeView.tsx`: eliminar `rewardBadge` i la línia `{badge}` sota cada opció. Només queda el text de la decisió numerada.
- Després de triar, el toast existent ja revela què ha passat (XP, accessori, dany, mort).
- Afegir un breu "reveal" visual: petit overlay animat de 1.2s amb la recompensa real abans de carregar el següent node (`RewardReveal.tsx` nou — emoji + nom centrat amb fade-in/out).

## 2. Checkpoint per capítol (resum + pausa)

- Detectar a `handleChoose` quan `result.nextNode.chapter > node.chapter` i `!result.runEnded`.
- Acumulem en estat `chapterRewards: RewardOutcome[]` cada recompensa del capítol actual; al canviar de capítol passem a una nova fase `chapter_break`.
- Nou component `ChapterCompleteScreen.tsx`:
  - Títol: "Capítol N completat"
  - Llista de recompenses obtingudes en aquest capítol (icones + noms)
  - Estat actual: ❤️ salut (xp barra), evolució mascota
  - 2 botons: **"Continuar capítol N+1"** i **"Pausar aventura"** (= torna al lobby; el run ja està autosalvat a BD).
- En tornar a entrar al Mode Història, si hi ha run actiu, es reprèn directament al node actual (ja funciona així). Afegim un petit indicador "✓ Aventura desada" al Ready/Playing perquè es noti.

## 3. Repte diari (1 decisió especial cada 24h)

### Esquema BD (migració additiva)

```sql
ALTER TABLE story_nodes ADD COLUMN is_daily boolean NOT NULL DEFAULT false;

CREATE TABLE daily_challenge_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  challenge_date date NOT NULL,
  node_id text NOT NULL,
  choice_id uuid NOT NULL,
  reward_type text,
  reward_value jsonb,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, challenge_date)
);
-- RLS: SELECT/INSERT propi (user_id = auth.uid())
```

### Contingut

Seed de **7 nodes diaris** (un per dia de la setmana, rotació determinista per `EXTRACT(DOW FROM today)`). Cada node:
- Narrativa curta (2-3 frases) sobre la mascota.
- 3 opcions amb recompenses **cosmètiques o consumibles** (mai mort, mai dany >10). Exemples: 🍖 Menjar, 💧 Aigua, 🎀 accessoris exclusius daily, +50 XP.

### Lògica (`story-runs.ts`)

- `getTodayChallenge(userId)` → `{ node, choices, alreadyDone, lastReward? }`. Selecciona node per `dow`. Comprova si avui ja s'ha completat.
- `submitDailyChoice(userId, choice)` → aplica recompensa via `applyReward` existent + insert a `daily_challenge_log`.

### UI

- Nou `DailyChallengeCard.tsx` mostrat **només a la fase `ready`** (sota el botó "Començar aventura"). 
- Estat "disponible": card destacada amb 🌟 i "Repte diari · acaba en Xh".
- En clicar → modal/full-screen amb la decisió. Després de triar, mostra recompensa i "Tornar". 
- Estat "completat": card grisa amb ✓ i recompensa obtinguda + "Torna demà".

## 4. Tests + safety

- Re-córrer `bun test` (169 tests existents + smoke E2E) → han de passar tots iguals.
- Nou test mínim `story-runs-daily.test.ts`: que `getTodayChallenge` és determinista per dia i que no es pot completar dos cops el mateix dia.
- Marcador `// 🔒 CRITICAL` mantingut a tots els fitxers nous/modificats del Mode Història.

## Fitxers afectats

**Modificats** (3):
- `src/components/story/StoryNodeView.tsx` — elimina badges
- `src/pages/StoryModePage.tsx` — fase `chapter_break`, integra `RewardReveal` i `DailyChallengeCard`
- `src/lib/story-runs.ts` — helpers `getTodayChallenge` + `submitDailyChoice` + tipus

**Nous** (4):
- `src/components/story/RewardReveal.tsx`
- `src/components/story/ChapterCompleteScreen.tsx`
- `src/components/story/DailyChallengeCard.tsx`
- `src/test/story-runs-daily.test.ts`

**Migració + seed**:
- `supabase/migrations/<timestamp>_daily_challenges.sql` — afegeix columna `is_daily`, crea `daily_challenge_log` amb RLS
- Seed dels 7 nodes daily via insert tool (data, no migració)

## Què NO faig en aquesta tanda

Per acord previ: l'**espai propi amb mobles** i la integració al PvP queda per una tanda futura (és un sistema gran que requereix taules d'inventari de mobles, editor d'habitació, selector d'escenari personalitzat al crear partida i validació de simetria/justícia per al rival). Ho faig en un segon pla quan tu ho diguis.

## Risc

Baix. Tots els canvis són additius. La columna `is_daily` té default `false` (els 48 nodes existents queden iguals). La nova taula no afecta cap query existent. La fase `chapter_break` només intercepta entre dos nodes — si fallés, el run resta intacte a BD i l'usuari pot recarregar i continuar.
