---
name: Story Mode v3.1
description: Aventura narrativa ramificada single-player. 8 capítols, ~48 nodes, 3 decisions/node, 6 finals + morts. Recompenses ocultes, checkpoint per capítol, repte diari. Independent del PvP.
type: feature
---

## Mode Història v3.1

### Estructura base
- 48 nodes narratius (chapter 1-8) + 7 nodes daily (chapter=1, is_daily=true) a `story_nodes`
- 111 opcions story + 21 opcions daily a `story_choices`
- Run actiu a `story_runs` (autosave a cada decisió)
- Log de reptes diaris a `daily_challenge_log` (UNIQUE user_id+date)

### UX v3.1
- **Recompenses ocultes**: `StoryNodeView` no mostra cap badge. Es revelen amb `RewardReveal` (overlay 1.5s) després de triar.
- **Checkpoint per capítol**: en detectar `nextNode.chapter > node.chapter`, fase `chapter_break` amb `ChapterCompleteScreen` (resum recompenses + Continuar/Pausar). El run està autosalvat.
- **Indicador "✓ Cap. X/8 · desat"** durant playing.
- **Repte diari**: `DailyChallengeCard` a fase `ready`. Node determinista per `dow` (`daily_dow_0`..`daily_dow_6`). Recompenses suaus (mai mort/dany>10). 1 intent/dia.

### Recompenses (`reward_type`)
- `xp` `{xp:N}` — addPetXP
- `damage` `{damage:N}` — addPetXP (>=9999 mata)
- `accessory` `{accessory,icon}` — awardAccessory
- `consumable` `{consumable}` — insert pet_consumables

### Finals
6 endings: peaceful, hero, mystic, redeemed, lonely, adventure + 5 morts. Mort = `killAndReset` (esborra pet, accessoris, consumibles, events, runs).

### Fitxers
- `src/lib/story-runs.ts` — helpers + daily (`getTodayChallenge`, `submitDailyChoice`, `dailyNodeIdForToday`, `rewardToReveal`)
- `src/components/story/StoryNodeView.tsx` — pregunta sense pistes
- `src/components/story/RewardReveal.tsx` — overlay revelació
- `src/components/story/ChapterCompleteScreen.tsx` — checkpoint
- `src/components/story/DailyChallengeCard.tsx` — repte diari
- `src/components/story/StoryEndingScreen.tsx` / `StoryDeathScreen.tsx`
- `src/pages/StoryModePage.tsx` — fases: loading|intro|ready|playing|chapter_break|ended

### Independent del PvP
🔒 NO toca cap RPC ni taula PvP. Sistema antic `story_progress`+`create_story_game` es manté per compatibilitat però no s'usa al flux nou.

### Placeholder `{pet}`
Tots els textos (narrative + labels) substitueixen `{pet}` pel `pet_name` al frontend.

### Pendent (no en aquesta tanda)
- Espai propi amb mobles desbloquejables
- Selector d'espai personalitzat al crear partida PvP
