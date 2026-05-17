# Mode Història v6 — "Vincles entre mascotes"

Tot el que demanes són **7 peces** que encaixen entre elles. Abans de construir, vull tancar decisions per evitar marge d'error. Després ho faig **tot d'una tirada**, sense tocar PvP.

---

## 1) Barres de necessitats — INVERTIR la semàntica

**Problema actual**: `hunger=100` = molt famolenc (barra plena = malament). És contraintuïtiu.

**Decisió proposada**: Invertir-ho tot. Les barres es llegeixen com **"benestar"**:
- 🍗 Sacietat (100 = ple, 0 = famolenc)
- 😴 Descans (100 = descansat, 0 = esgotat)
- 🛡️ Calma (100 = tranquil, 0 = aterrit)
- ❤️ Vincle (100 = inseparable, 0 = fred)

Decay invers (cada 6h: sacietat −15, descans −12, calma +5, vincle −3). Tots els efectes d'items i `state_delta` de la BD s'inverteixen un sol cop via migració.

---

## 2) Més mons amb desbloqueig progressiu (ocult → visible)

**Estat actual**: 4 mons (Casa, Carrer, Bosc, Castell). Carrer i Bosc fixos com a bloquejats.

**Proposta**: 7 mons en 3 capes:

| Capa | Mons | Estat |
|------|------|-------|
| **Visibles d'inici** | 🏠 Casa, 🌳 Carrer | Sempre |
| **Ocults → es revelen** | 🌲 Bosc (revelat amb vincle ≥ 30), 🏖️ Platja (revelat amb nivell ≥ 4), 🏰 Castell (revelat amb 3+ receptes) | "???" fins desbloquejar pista |
| **Secrets profunds** | 🌋 Volcà, 🌌 Somnis | Apareixen només quan compleixes condicions especials (ex: 5 mons visitats) |

**Visual**: mons ocults mostren `???` amb pista críptica ("Algú parla d'un lloc on el sol crema..."). En desbloquejar, animació de revel·lació.

---

## 3) Recompenses més generoses + reparar reptes diaris trencats

**Problema reportat**: Repte diari diu "perxina" però no apareix a la motxilla.

**Causa probable**: El `reward_value` d'aquell choice té un `item_id` que no es processa correctament o el toast diu el nom però no s'insereix.

**Acció**:
- Auditar `daily_challenge_log` i verificar que tot `reward_type='item'` insereix realment a `story_inventory`.
- Millorar recompenses: cada 3 nodes completats → ítem extra aleatori; cada final de capítol → recepta descoberta + 1 item raro.
- Tooltip a cada ítem de la motxilla: "Per què serveix" (ja existeix parcialment, ho ampliem).

---

## 4) Reset de mascota en adoptar nova

Quan la mascota mor i n'adoptes una nova:
- `pet_state` → DEFAULT (50/50/50/50 amb nova semàntica)
- `pet_skills` → buidat (skills són de cada mascota)
- `story_inventory` → es manté (és teu, no de la mascota)
- `story_recipe_book` → es manté (coneixement del jugador)
- `player_pets.level/xp` → reset a 1/0

---

## 5) Allargar vida + Skills amb utilitat real

**Vida més llarga**: Decay actual és massa agressiu. Reduir a meitat (cada 12h enlloc de 6h). Mascota pot viure ~3 setmanes amb cures normals.

**Skills útils** (5 skills actuals: 👃 Olfacte, 💪 Força, ✨ Empatia, 🔥 Coratge, 👑 Llegenda):
- A `story_choices` ja hi ha `requires_skill`. Ampliarem **seeds** perquè cada capítol tingui 1-2 choices exclusius per skill, donant **rutes narratives diferents** segons el caràcter de la mascota.
- Exemple: amb 👃 pots descobrir un objecte amagat al node; amb ✨ pots calmar un NPC enlloc de barallar-t'hi.

---

## 6) **NOU: Sistema de visites entre mascotes (Pet Playdate)**

La peça gran. Arquitectura:

### Taula nova: `pet_visits`
```
id, visitor_user_id, host_user_id, started_at, ends_at (started+30min),
outcome (null | 'friends' | 'enemies' | 'neutral'),
visitor_delta jsonb (canvis a estats de la mascota visitant),
host_delta jsonb (canvis a estats de la mascota amfitriona),
seen_by_host boolean (per notificar)
```

### Taula nova: `pet_relationships`
```
user_a, user_b (sempre ordenats alfabèticament), status ('friends'|'enemies'|'neutral'),
interactions_count, last_interaction_at
```

### Flux:
1. Vas al perfil de @evilreef → botó **"Enviar mascota a jugar"** (cooldown 4h).
2. Es crea `pet_visits` amb `ends_at = now() + 30min`.
3. **Resolució** (via RPC `resolve_pet_visit`, cridada al consultar visites caducades):
   - Compatibilitat = (vincle visitant + vincle amfitrió) / 2 + random(−20, +20).
   - >60 → `friends`: vincle +10 a tots dos, calma +5.
   - 30-60 → `neutral`: vincle +3.
   - <30 → `enemies`: calma −10, vincle −5 a tots dos.
4. Es crea entrada a `pet_relationships` (acumulativa).
5. **Notificacions**:
   - Al perfil públic: badge "🐾 La mascota de @X està jugant aquí" (durant els 30min).
   - Al teu perfil: secció **"Visites recents"** amb qui ha vingut i el resultat.
   - Llista de **"Amics"** i **"Rivals"** al perfil públic (mostra les 5 mascotes amb status més fort).

### Regals (peça extra que has demanat):
- Botó al perfil de @X: **"Regalar item"** → tria un ítem de la teva motxilla (jogui­na/manta/menjar) → es transfereix amb un missatge opcional.
- Crea entrada a `player_inventory` amb `gifted_to` (taula ja existeix!) + notificació.
- L'amfitrió rep notif "@Tu t'ha regalat 🧸 Pilota!" i pot reclamar-lo.

---

## 7) Detalls UX

- Helpdialog ampliat amb pestanya **"Social"** explicant visites i regals.
- Al perfil propi: secció "🐾 Activitat de la mascota" amb historial de visites rebudes i fetes.
- Tooltip permanent sobre cada barra: "Què vol dir cada barra".

---

## Tècnic (per a tu, no és narratiu)

**Migracions**: 
- Invertir semàntica de `pet_state` (UPDATE: hunger = 100 - hunger, etc.) i renombrar columnes? → **Decisió: NO renombrar** per no trencar PvP-adjacent code. Només invertir valors i tot el codi de `story-state.ts` + UI llegeix la nova convenció.
- Crear `pet_visits`, `pet_relationships`.
- Nous mons a `story_worlds` (platja, volcà, somnis) + nodes seed mínims (3 nodes per món nou + 1 ending per món).
- Reduir decay a /12h.
- Funció `resolve_pet_visit` (RPC).

**Tests**: Mantenir 171 tests + afegir 3 nous (resolve_visit logic, gift transfer, state semantics inversion).

**Aïllament**: 0 canvis a `games/game_*/execute_*/scenarios/items/objects`.

---

## Pregunta de tancament (1 sola, crítica)

Abans de tirar endavant amb les 7 peces, vull confirmar:

**Reset de mascota nova (punt 4)**: Quan adoptes una nova mascota, vols mantenir les **amistats/rivalitats** que tenia l'anterior amb altres jugadors (les hereta la nova), o tot a zero? Jo recomanaria **reset total** — cada mascota fa les seves pròpies relacions, més coherent narrativament. Confirma o digues si prefereixes que s'heretin.

Si dius "tira" assumeixo **reset total de relacions** i construeixo les 7 peces sense més preguntes.
