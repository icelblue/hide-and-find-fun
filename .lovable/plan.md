# Mode Història v5 — Mons, Mapa, Evolució i Diari

## Problema actual
- 8 capítols sense explicació de què són ni cap a on van.
- Rejugar = tornar al mateix node `c1_start`; sense progressió persistent.
- L'usuari no veu créixer res entre partides (la mascota té XP però gairebé no es nota).
- Capítols repetitius perquè les opcions no canvien segons el que has fet abans.

## Visió v5: "El Viatge de {pet}"
4 mons que es desbloquegen amb el progrés. Cada món = 2 capítols de la història. La mascota evoluciona visualment i guanya habilitats que obren noves branques.

```text
🏠 CASA          🌳 CARRER         🌲 BOSC           🏰 CASTELL
(cap 1-2)        (cap 3-4)         (cap 5-6)         (cap 7-8)
sempre obert     vincle≥40         3+ receptes       nivell≥7
                 + 1 final         desc.             + ferro mític
```

## Quatre pilars de progressió

### 1. Nivells de mascota (1→10) amb habilitats
Nova columna `player_pets.level` (smallint, default 1). XP/500 = nivell. Cada nivell desbloqueja una habilitat persistent (taula `pet_skills`):
- Nv 2 — 👃 **Olfacte**: troba branques ocultes (choices marcats `requires_skill: 'smell'`).
- Nv 4 — 💪 **Força**: trenca obstacles (obre choices a c4 i c6).
- Nv 6 — ✨ **Empatia**: respostes amistoses sempre disponibles.
- Nv 8 — 🔥 **Coratge**: redueix por +20 a cada decisió.
- Nv 10 — 👑 **Llegenda**: desbloqueja final secret.

### 2. Evolució visual de la mascota
Ja existeix `getPetEvolution`. Reforçar: 4 etapes visuals clares (cadell, jove, adult, llegendari) amb ring + glow + mida diferent al header del playing i al ready. Mostrar a la pantalla "ready" quina és la pròxima evolució i quants XP falten.

### 3. Mapa del viatge
Nova taula `story_world_progress` (user_id, world_id, unlocked, completed_endings jsonb, visits int). Component `WorldMap.tsx` a la pantalla "ready": 4 cartes de món amb estat (🔓 obert / 🔒 bloquejat amb requisit / ✓ completat amb pin). Les noves partides comencen al món més avançat desbloquejat (no sempre c1).

### 4. Diari de descobertes
Component `DiscoveryJournal.tsx` accessible des de "ready" (botó 📖). Tres pestanyes:
- **Objectes** (X/Y trobats — silueta gris si no trobat)
- **Receptes** (X/Y descobertes)
- **Finals** (X/6 vistos)

Estimula completisme. Tots els descobriments persisteixen entre partides.

## Branques noves cada cop (resoldre repetició)
Afegir al `story_choices` el camp `seen_count_min` i `seen_count_max` (smallint nullable). Una decisió pot dir "només surt si has vist aquest node ≥ 2 vegades". Crear noves variants de choices a cada node clau:
- Primera visita: opcions "introductòries"
- Segona visita: opcions "alternatives" (les que no vas triar primer + 1 nova)
- Tercera+: opcions "expertes" amb recompenses millors

Nova taula `story_node_visits` (user_id, node_id, count). S'incrementa a `getChoices`/`makeChoice`.

## Onboarding narratiu (resoldre "no sé per què")
A la pantalla "ready", abans del botó començar:
- Cita inicial: *"{pet} ha de viatjar de Casa fins al Castell. Cada decisió forja qui esdevindrà."*
- Mostrar barra de progressió global: **Mons 1/4 · Nivell 1 · Final 0/6**
- Si retorn: *"Continues el teu viatge al **Carrer**. {pet} recorda haver vist el {item}..."*

A cada node, afegir un subtítol contextual: "Món: 🏠 Casa · Visita #2".

## Pla tècnic (canvis BBDD)

```sql
-- 1. Nivells + habilitats
ALTER TABLE player_pets ADD COLUMN level smallint NOT NULL DEFAULT 1;
CREATE TABLE pet_skills (user_id uuid, skill_id text, unlocked_at timestamptz);

-- 2. Mons
CREATE TABLE story_worlds (id text PK, name, icon, requires jsonb, chapters int[]);
CREATE TABLE story_world_progress (user_id, world_id, visits int, completed_endings jsonb);

-- 3. Visites a nodes (per branques noves cada cop)
CREATE TABLE story_node_visits (user_id, node_id, count);

-- 4. Choices millorats
ALTER TABLE story_choices
  ADD COLUMN requires_skill text,
  ADD COLUMN min_visits smallint,
  ADD COLUMN max_visits smallint;

-- 5. Story_runs sap on començar
ALTER TABLE story_runs ADD COLUMN starting_world text;
```

## Files

**Nous (5)**:
- `src/components/story/WorldMap.tsx` — selector de mons a "ready"
- `src/components/story/DiscoveryJournal.tsx` — diari amb 3 pestanyes
- `src/components/story/PetEvolutionCard.tsx` — etapa actual + propera
- `src/lib/story-progression.ts` — nivells, habilitats, mons, visites
- `src/test/story-progression.test.ts`

**Modificats (4)**:
- `src/pages/StoryModePage.tsx` — nova "ready" amb mapa+diari, onboarding text
- `src/lib/story-runs.ts` — `startRun` accepta `worldId`, incrementa `node_visits`, aplica skills
- `src/components/story/StoryNodeView.tsx` — filtra choices per skill+visits, mostra subtítol món
- `src/lib/story-helpers.ts` — `getPetEvolution` reforçat (4 etapes amb mida visible)

**Seed**:
- 4 entrades a `story_worlds`
- ~12 noves variants de `story_choices` (alternatives per cada node clau dels caps 1-4)
- Mapeig habilitats↔choices

## Risc / scope
- **No toca PvP** (0 fitxers PvP modificats).
- Migració additiva, sense DROP. Compatible amb runs existents.
- Estimació: 1 migració BBDD + 1 insert seed + ~9 fitxers de codi.

## Confirmes?
Si dius sí, executo migració i tot seguit el codi + tests. Si vols retallar (p.ex. saltar habilitats o saltar diari), digues quin pilar treure.