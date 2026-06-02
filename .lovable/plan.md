# Pla complet — Traducció EN restant + ProfilePage a pestanyes

## Diagnòstic (què vas veure i per què)

Tens raó: **el sistema EN està a mig fer**. La traducció anterior (Mode Història) està al 100%, però **tot el PvP, el botó d'Ajuda principal, els ítems socials, els materials i molta part del Perfil estan hardcoded en català**. A més, **cap entitat de PvP** (escenaris, mobles, objectes, pistes, interaccions) té files a la taula `translations`.

### Les 5 forats principals
1. **Constants hardcoded en codi**: `POS_LABELS`, `getToolName()`, `MATERIAL_LABELS`, `ENVIRONMENT_LABELS`, `TAG_ACTIONS`, `SOCIAL_ITEMS`, raons de bloqueig de material.
2. **`HelpButton.tsx` (PvP)** — 0 crides a `t()`. Tot el modal (Bàsic / Regles / Premis) en català.
3. **Contingut BD del PvP** — `scenarios.name`, `items.name`, `objects.name`, `object_traits.trait_text`, `object_specials.prompt_text`/`find_prompt_text`, `item_interactions.action_label`. Cap té entrades a `translations`.
4. **Historial de pistes i finished screen** — `GameFinishedPhase` importa `POS_LABELS` directament (no passa per `t()`).
5. **ProfilePage** — gran part de strings encara en català + estructura monolítica amb scroll molt llarg.

### Riscos crítics detectats (NO trencar)
- **`OUTDOOR_SCENARIOS = ["Jardí", "Balcó"]`** a `supabase-helpers.ts:174` compara `scenario.name` per decidir si cal llanterna. Si traduïm `scenarios.name` a la BD, aquesta lògica es trenca silenciosament → 🔴 cal migrar a un camp `is_outdoor` boolean o a `scenario.id`.
- **`ToolType`** (`drap`/`tornavis`/`martell`/`llanterna`) són **claus JSONB** de `game_players.tools` → mai traduir, només etiquetes.
- **`position_type` enum** (`sobre`/`sota`/`dins`/`darrere`) són valors de BD → mai traduir, només labels.
- **`item_interactions.action_name`** és identificador lògic → només traduir `action_label`.
- **`TAG_ACTIONS` keys** (`dirty`/`breakable`/`broken`) es matchegen contra `items.tags[]` → només traduir `label`.

---

## Pla per fases (segur, incremental, testable)

Cada fase es pot tirar i verificar **independentment**. PvP segueix funcionant igual durant tot el procés.

### Fase 0 — Pre-flight (sense codi)
- Afegir claus i18n necessàries a `ca.json` + `en.json` per Fases 1-4 d'una tacada (`game.pos.*`, `game.tools.*`, `game.materials.*`, `game.env.*`, `game.tagActions.*`, `socialItems.*`, `help.*`, `profile.*`).
- Crear migració que **afegeix `is_outdoor BOOLEAN`** a `scenarios` i el marca a `true` per Jardí/Balcó. Refactoritzar `supabase-helpers.ts` per usar aquest camp en comptes de `OUTDOOR_SCENARIOS`. **Aquesta és la única peça que toca lògica de joc** — desbloqueja poder traduir `scenarios.name` sense por.
- Test: `bunx vitest run` ha de passar 171 tests + verificar manualment que la llanterna encara és necessària a Jardí.

### Fase 1 — Constants UI hardcoded (frontend pur, risc 0)
Substituir per `t()`:
- `src/lib/game-types.ts` → eliminar Catalan de `POSITIONS[].label`, `POS_LABELS`, `getToolName()`. Convertir en helpers que reben `t` o esborrar i moure als consumidors.
- `src/components/HelpButton.tsx` → reescriure `RULES`, `BASICS`, `DROP_RATES`, tab labels amb `useT()`.
- `src/lib/supabase-helpers.ts` → `MATERIAL_LABELS`, `ENVIRONMENT_LABELS`, `TAG_ACTIONS.label`, `SOCIAL_ITEMS.name/desc`, `getMaterialBlockReason()`, totes les `toast.error()` i missatges throw.
- `src/lib/custom-object.ts` → 2 missatges de validació.
- `GamePage.tsx` → eliminar les 4 duplicacions de `getToolName()`, usar el helper `posLabel` ja existent també a `m.target_position` del historial.
- `GameFinishedPhase.tsx` → afegir `useT()` i traduir `POS_LABELS` via `t("game.pos.{p}")`.
- `ItemActions.tsx` → traduir labels de posició.

Tot 100% frontend. Tests existents validen comportament.

### Fase 2 — ProfilePage a pestanyes (UI pur)
Reestructurar `ProfilePage.tsx` amb el component `Tabs` de shadcn. Proposta de 4 pestanyes (mobile-first, 390px):

| Pestanya | Conté |
|---|---|
| **🏠 Resum** | Header (nom + lliga), stats grid, Elo bar, mascota, rival favorit |
| **🎮 Joc** | Partides actives, historial recent |
| **🎒 Col·lecció** | Inventari, Vitrina, Trofeus |
| **⚙️ Compte** | Mur, Convida amics, Idioma, Tancar sessió, Zona perillosa |

Traduir totes les strings de Profile amb `t("profile.*")` com a part d'aquest pas.

Risc: 0 lògica. Només mou JSX dins de `<TabsContent>`. Conservar tots els `useEffect`, fetches i state al nivell pare.

### Fase 3 — Esquema de traduccions PvP (BD)
Migració que estén `translations.entity_type` amb 6 nous valors:
- `pvp_scenario_name`
- `pvp_item_name`
- `pvp_object_name`
- `pvp_object_trait`
- `pvp_object_special_prompt`
- `pvp_item_interaction_label`

**Sense tocar les taules originals.** El català es queda com a fallback; EN viu només a `translations`.

### Fase 4 — Helpers de traducció contingut PvP
Estendre `src/i18n/translate-data.ts` amb:
- `translateScenarios(list, lang)`
- `translateItems(list, lang)`
- `translateObjects(list, lang)`
- `translateTraits(list, lang)` (per `object_traits.trait_text` mostrat als torns 2 i 5)
- `translateInteractions(list, lang)` (només `action_label`, `action_name` intacte)

Aplicar als punts de càrrega: `ScenarioPicker`, `ItemActions`, hide flow, hint history, finished phase.

### Fase 5 — Seed EN de contingut PvP (BD)
Script (estil `/tmp/i18n/translate.mjs`) que:
1. Llegeix totes les files de les 6 taules.
2. Crida Lovable AI Gateway (`google/gemini-2.5-flash`) en batch amb prompt curador (terminologia consistent: "Sofà" → "Sofa", "Prestatgeria" → "Bookshelf", etc.).
3. Insereix a `translations` amb `ON CONFLICT DO NOTHING`.
4. Logs de cada batch + report final amb total per `entity_type`.

Volum estimat: ~3 escenaris + ~30-50 ítems + ~50-100 objectes + ~200 traits + ~30 specials + ~10 interactions = **~400-500 traduccions noves**. Cost mínim amb Flash.

### Fase 6 — QA visual EN end-to-end
- Canvi d'idioma a EN al perfil.
- Recórrer: Lobby → Triar escenari (noms EN) → Amagar (materials EN, posicions EN, ítems EN) → Buscar (pistes EN, historial EN) → Finished (posicions EN, eines EN) → Help (totes 5 tabs EN) → Social items EN → Profile (4 pestanyes EN).
- Llista de regressió: 5 escenaris × 2 idiomes, verificar zero strings en català.

---

## Ordre proposat d'execució

Tiro **Fase 0** (pre-flight `is_outdoor` + claus i18n massives) i **Fase 1** (constants UI) juntes en aquest torn perquè són la base. Després pares, jugues una partida en EN per validar, i tirem Fase 2 (Profile a pestanyes). BD i seed (3-5) es fan en un tercer bloc per limitar el blast radius.

## Tests / verificació per fase
| Fase | Verificació |
|---|---|
| 0 | `bunx vitest run` + jugar 1 partida a Jardí amb llanterna |
| 1 | Veure tot en EN al canviar idioma; partida funciona |
| 2 | Profile carrega, totes 4 pestanyes mostren contingut, sense scroll horitzontal |
| 3 | `supabase--linter` net |
| 4 | Visualment EN apareix a tots els llocs de PvP |
| 5 | Query: `SELECT entity_type, count(*) FROM translations WHERE lang='en' GROUP BY 1` mostra 6 noves files |
| 6 | Llista de regressió manual + actualitzar `i18n.md` memory |

## Documentació a actualitzar al final
- `.lovable/memory/features/i18n.md` (afegir 6 nous entity_types + checklist completa)
- `CHANGELOG.md` (v1.23.0 — Full EN coverage + Profile tabs)

**Confirmes el pla i començo per Fase 0+1?**