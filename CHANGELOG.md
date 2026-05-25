# 📋 CHANGELOG — Deduction Duel

Segueix [Semantic Versioning](https://semver.org/): **MAJOR.MINOR.PATCH**
- **MAJOR**: canvis que trenquen compatibilitat
- **MINOR**: funcionalitats noves (compatibles)
- **PATCH**: correccions de bugs


## [1.17.0] — 2026-05-25 — i18n CA/EN base (MINOR)

### Afegit
- **Taula `translations`** (entity_type, entity_id, lang, value): emmagatzema traduccions de contingut narratiu (story_nodes, story_choices, story_worlds, story_recipes, reward_items). Índex per lookups ràpids.
- **Camp `profiles.language`** (default `'ca'`, CHECK ca/en).
- **Funció `get_translation(entity_type, entity_id, lang, fallback)`** amb fallback automàtic a CA si l'EN no existeix.
- **Seed automàtic CA**: copiat tot el contingut existent a `translations` amb `lang='ca'`.
- **Frontend i18n híbrid**:
  - `src/i18n/{ca,en}.json` — strings d'UI.
  - `src/i18n/LanguageProvider.tsx` — context React, `useT()` hook, helpers `fetchTranslations()` i `translateContent()` per BD.
  - Sincronització bidireccional `localStorage` ↔ `profiles.language`.
- **Selector d'idioma al perfil** (CA / EN) amb persistència a BD.

### Arquitectura
- UI strings: JSON (ràpides, versionades amb git).
- Contingut narratiu: BD (editable sense desplegar, fallback CA si EN buit).

### Següent
- Refactor punts de lectura (StoryNodeView, WorldMap, RewardReveal, InventoryDrawer) perquè facin servir `fetchTranslations()` per mostrar contingut en l'idioma triat.
- Omplir traduccions EN progressivament (admin task).

---

## [1.16.0] — 2026-05-24 — Personalitat retroactiva (FASE 5) (MINOR)

### Afegit
- **87 opcions actualitzades** als capítols 3-7 (Carrer, Bosc antic, Castell preludi/final) amb `requires_traits` i `trait_reward_multiplier`. Ara totes les decisions del Mode Història reflecteixen la personalitat de la mascota.
- Distribució per tret: brave (decisions arriscades/protectores), loyal (compromís/vincle), curious (exploració/secrets), calm (reflexió/relax), gluttonous (plaer/golafreria).

### Següent
- Roadmap personalitat: **COMPLET** ✅ (FASES 1-5)
- Pendent: i18n CA/EN amb taula `translations` manual.

---

## [1.15.0] — 2026-05-24 — Casa Abandonada + Fira del Poble (FASE 4) (MINOR)


### Afegit
- **🏚️ Món Casa Abandonada** (unlock: level ≥5): 8 nodes (Entrada, Hall, Golfes, Soterrani, Biblioteca, Mirall, Infant fantasma, Pati) + 3 finals (Amic per sempre, Tresor amagat, Atrapat pel mirall)
- **🎪 Món Fira del Poble** (unlock: bond ≥50): 8 nodes (Entrada, Tómbola, Mag, Dolços, Atraccions, Concurs, Escenari, Darrere) + 4 finals (Campió, Golafre, Heroi, Expulsat)
- **24+ opcions noves** amb `requires_traits` i `trait_reward_multiplier` (bonus fins ×1.7)
- **10 ítems de recompensa nous**: Nina antiga, Tresor antic, Llibre encantat, Amulet fantasmal, Premi tómbola, Barret de mag, Cotó sucre, Corona fira, Pilota brillant, Medalla heroi

### Resum del roadmap
- ✅ FASE 1-4 completes. Pendent: FASE 5 (retroactiu a Castell/Casa antiga) + i18n CA/EN.

---

## [1.14.0] — 2026-05-23 — Bosc Encantat (FASE 3) (MINOR)


### Afegit
- **Món Bosc expandit**: 8 nodes nous (Cercle de fades, Tempesta, Bèstia, Cadell perdut, Móres, Riu, Santuari, Llop)
- **Final nou** `ending_wolf_friend`: només accessible amb mascota molt valenta i lleial (brave ≥7, loyal ≥6)
- **28 opcions noves** amb requisits i bonificacions de personalitat
- **8 ítems nous** com a recompenses: ploma de fada, pols màgica, móra encantada, cristall del riu, pedra del santuari, etc.
- **Límit d'opcions per node** ampliat de 6 a 10 (constraint SQL)

### Cada trait té el seu camí
- 🔍 Curiós → Cercle fades, Riu encantat
- ⚔️ Valent → Bèstia, Llop, Tempesta sota pluja
- 🌿 Calmat → Santuari, refugi tempesta
- 🤝 Lleial → Cadell perdut, vincle amb el llop
- 🍖 Gormand → Móres salvatges, alimentar la bèstia

---



## [1.13.1] — 2026-05-23 — Personalitat aplicada a nodes existents (PATCH)

### Modificat
- **Mode història — FASE 2**: aplicats `requires_traits` i `trait_reward_multiplier` a 11 opcions dels nodes inicials (`c1_start`, `c2_garden`, `c2_kitchen`, `c2_living`)
- Algunes opcions ara només són visibles si la mascota té el trait mínim (ex: obrir caixa misteriosa requereix valentia ≥7)
- Bonificacions d'XP visibles via badge "Bonus" quan el trait dominant ≥7

### Per validar
- Crear partida amb mascotes de traits oposats (gat curiós vs tortuga calmada) i veure les opcions diferents

---



## [1.12.0] — 2026-04-26 — Eliminació de compte (GDPR) (MINOR)

### Afegit
- **Botó "Eliminar el meu compte"** a `ProfilePage` → secció "⚠️ Zona perillosa"
- **Confirmació segura**: cal escriure el `display_name` per evitar clics accidentals
- **RPC `delete_user_account()`** (SECURITY DEFINER): neteja totes les dades de l'usuari en una sola transacció
- **Edge function `delete-account`**: orquestra neteja de dades + eliminació de `auth.users` (admin API)
- **Política d'històric**: partides finalitzades i wall messages s'**anonimitzen** (es manté l'històric Elo i estadístiques dels rivals)
- **Eliminació immediata** (sense període de gràcia): el compte desapareix a l'instant i l'email queda lliure per re-registrar-se

### Esborrat per usuari
Perfil, mascota, accessoris, consumibles, esdeveniments, inventari, recompenses, mobles col·locats (alliberats), referrals, progrés història, subscripcions push, logs de recordatoris i errors, partides en curs cancel·lades.

---

## [1.11.0] — 2026-04-16 — Barricada, Trampa, rendiment i mobles trencables (MINOR)

### Afegit
- **Ítem social: 🚧 Barricada** — Bloqueja un camí entre 2 escenaris durant 3 torns del rival. El rival pot forçar el pas pagant +1🪙 extra. Bloquejable per escut.
- **Ítem social: 🪤 Trampa** — Col·loca una trampa en un moble concret. Si el rival mira aquell moble, perd 0.2🪙 (o el que li quedi). Un sol ús, NO bloquejable per escut.
- **Mobles trencables**: Afegit tag `breakable` a ~15 mobles nous (Microones, Nevera, Ordinador, Televisió, Aparador, Estanteria, etc.)
- **Etiquetes contextuals d'entorn**: Els objectes mostren estat segons el moble (💧 Mullat, 🔥 Cremat, 🧹 Brut, etc.)
- **RPC `execute_barricada`**: Lògica de barricada 100% al servidor (zero latència extra)
- **RPC `execute_trampa`**: Lògica de trampa 100% al servidor
- **Tests de regressió**: REG-009 (barricada), REG-010 (trampa), REG-011 (etiquetes entorn)

### Millorat
- **Rendiment crític**: Debounce Realtime de 120ms → 300ms, control de càrrega amb `isLoadingGameRef` per evitar tempestes de recàrrega
- **RPC `execute_smoke_bomb`**: Tota la lògica al servidor en 1 transacció (abans eren 6 crides seqüencials)
- **RPC `get_rival_traits`**: Corregit bug on les pistes del rival no es mostraven (RLS bloquejava `hidden_object_id`)
- **Martell més útil**: Més mobles amb tag `breakable` per estratègia defensiva

### Corregit
- **Pistes (traits) del rival**: Ara es mostren correctament gràcies a la RPC que bypassa RLS
- **Lag en bomba de fum**: Eliminat completament (1 RPC vs 6 crides)
- **Botons desactivats massa temps**: Controlat amb semàfor de càrrega

### Validat
- 17 tests de regressió ✅ (tots passen)
- Cap regressió detectada

---

## [1.10.0] — 2026-04-15 — PWA instal·lable amb banner intel·ligent (MINOR)

### Afegit
- **PWA manifest**: `public/manifest.json` amb icones 192x512, standalone, portrait
- **Banner d'instal·lació intel·ligent** (`InstallBanner`):
  - Detecta automàticament Android / iOS / Desktop
  - Android: intercepta `beforeinstallprompt` → instal·lació en 1 clic
  - iOS: guia visual pas a pas (Compartir → Afegir a pantalla d'inici)
  - No apareix si ja està instal·lada, en desktop, o en iframe (preview)
  - Es pot descartar — no torna en 7 dies (localStorage)
- **Meta tags iOS**: `apple-mobile-web-app-capable`, `apple-touch-icon`, `status-bar-style`
- **Icones PWA**: 192px i 512px amb temàtica del joc (lupa + interrogant)
- **Tests**: 6 tests nous per la lògica de detecció del banner

### Validat
- 112 tests ✅ (tots passen, cap regressió)
- Cap service worker — zero risc de cache antiga
- L'app funciona exactament igual que abans

---

## [1.9.4] — 2026-04-10 — Mobile speed & accessibility hardening (PATCH)

### Millorat
- **Fonts self-hosted**: eliminades les peticions externes a Google Fonts i la cadena crítica CSS→fonts; ara es preloadegen des de `/public/fonts`
- **JS inicial més lleuger**: eliminat el toaster Radix no utilitzat del bootstrap i simplificat el toaster actiu perquè no carregui `next-themes`
- **Accessibility mobile**: restaurat el zoom natiu eliminant `maximum-scale=1` i `user-scalable=no` del viewport

### Validat
- Build de producció correcte després dels canvis
- Cap canvi de lògica de joc ni de flux funcional

---

## [1.9.3] — 2026-04-10 — Performance, accessibility & bug fixes (PATCH)

### Millorat
- **Performance (FCP -1.1s)**: Google Fonts carregat via `<link>` amb `preconnect` i `media=print` → eliminat render blocking CSS
- **Performance (JS -67%)**: Code splitting amb `React.lazy` — cada pàgina és un chunk separat (GamePage 52KB, LobbyPage 25KB, AuthPage 6KB)
- **Performance**: Manual chunks per vendor (React 160KB), Supabase (194KB), UI (90KB) — millor cache a llarg termini
- **Accessibility**: Afegit `aria-label` als inputs de login/registre, `autoComplete` per email/password, `aria-label` al formulari

### Corregit
- **BUG CRÍTIC — Ítems socials**: `social_item_used_today` es marcava ABANS d'executar l'acció → si l'acció fallava (p.ex. rival sense tornavís), l'usuari perdia el seu ítem diari sense efecte. Ara es marca DESPRÉS de l'acció exitosa
- **Robar tornavís**: validat que el RPC `execute_robar_tornavis` resta correctament 1 unitat del rival i la suma al jugador. Si el rival té 0, llença error i l'ítem diari NO es consumeix
- **Swap**: validat que `execute_swap` intercanvia correctament `current_scenario_id` entre ambdós jugadors
- **QueryClient duplicat**: eliminat el duplicat a App.tsx (ja existia a main.tsx)

---

## [1.9.2] — 2026-04-09 — Correccions objectes especials & ítems socials (PATCH)

### Corregit
- **Carta**: ja no mostra el camp "Missatge secret" redundant al pas de posició — es gestiona al seu propi pas especial
- **Carta**: ja no es guarda com a trofeu quan es troba — només objectes amb `prompt_on=find` generen popup de trofeu
- **Objectes especials (foto, anell, cor de vidre, pilota, joguina, mitjó, rellotge)**: restaurat popup de trofeu al trobar-los
- **Troll effects (petardo, plàtan podrit, nas pallasso, mitjó pudent)**: restaurat efecte visual animat
- **Plàtan (ítem social)**: efecte instantani via Realtime
- **Swap**: corregit amb RPC `execute_swap` per evitar errors RLS
- **Robar tornavís**: corregit amb RPC `execute_robar_tornavis` — resta correctament del rival
- **Mode Història cap. 1**: bloquejat moviment entre habitacions
- **Rendiment**: `loadGame` optimitzat amb `Promise.all`

---

## [1.9.1] — 2026-04-07 — Vitrina, Salut i Regal 💊🏆 (PATCH)

### Afegit
- **Vitrina pública**: Els jugadors poden veure la col·lecció de mobles d'altres jugadors al perfil
- **Estat de salut visible**: Saludable ✅ / Malalt 🤒 / Mort 🪦 a perfil propi i d'altres
- **Regalar consumibles**: Usa un consumible propi per curar la mascota d'un altre jugador (`gift_consumable` RPC)
- **PetHealthBadge**: Component centralitzat per mostrar l'estat de salut (compact + full)
- **Regles Mode Història** al panell "Com jugar": virus, consumibles, evolucions, regal

### Canviat
- **player_rewards RLS**: SELECT obert a tots els autenticats (vitrina pública)
- **pet_events RLS**: SELECT obert per veure si mascotes d'altres estan malaltes
- Documentació completa actualitzada (README, TECHNICAL, CHANGELOG)

---

## [1.9.0] — 2026-04-07 — UX & Mascota Health 🐾🩺 (MINOR)

### Afegit
- **Mecànica de virus/malaltia**: 25% probabilitat d'event negatiu (🤒 Virus +200XP, 🤕 Caiguda +150XP, 🫠 Febre +100XP) al completar capítols
- **Consumibles curatius**: Menjar (-100XP), Aigua (-50XP), Vacuna (-200XP) per curar la mascota
- **Mapa d'habitacions** al panell "Com jugar": mostra connexions entre escenaris
- **Swipe-to-delete** a "Les meves partides": lliscar per eliminar (confirmació per partides obertes)
- Taula `pet_events` per rastrejar events de salut

### Canviat
- **Menú**: Perfil primer, Mode Història segon
- **Rival favorit**: Filtra CPU i jugadors anònims — només mostra rivals reals
- **Mascota morta**: Icona 🪦 (tombstone) en lloc de la icona de mascota amb opacitat
- Eliminat botó 🗑️ de partides (substituït per swipe)

---

## [1.8.1] — 2026-04-07 — Seguretat Avançada & RPC 🔒🛡️ (PATCH)

### 🔒 Moviments via RPC (Server-Side)
- **`execute_game_move`**: Calcul de hints, tokens, bonus i eines 100% al servidor (SECURITY DEFINER)
- **`execute_toggle_light`**: Validació d'eines i tokens al servidor
- **`execute_tag_action`**: Accions de tags (netejar/trencar/arreglar) amb bonus rolls al servidor
- Client ja NO pot inserir `game_moves` directament — només via RPC
- Dades del rival (hidden_object, hidden_item, hidden_position) mai arriben al client

### 🛡️ Protecció de Perfils
- Política `UPDATE` restringida: només `display_name` i `avatar_url` editables pel client
- Estadístiques (elo, victòries, tokens) només modificables via funcions SECURITY DEFINER

### 📡 Realtime Segur
- `game_players` eliminat de `supabase_realtime` publication
- Funció `get_safe_game_players(_game_id)` emmascara dades sensibles dels oponents

### ✅ Validació de Moviments (Trigger)
- `validate_game_move_trigger` (BEFORE INSERT ON game_moves):
  - Jugador pertany a la partida
  - Cost de tokens vàlid (0.1 - 2.0)
  - Tokens suficients
  - `found_object` només permès en accions `look`

### 🔧 Robar Tornavís
- Nou ítem social `robar_tornavis`: roba 1 tornavís del rival
- Bloquejable amb escut

### 🧹 Neteja
- Error logs: eliminada inserció anònima, stack trace limitat
- Storage backups: RLS restringit a `service_role`

---

## [1.8.0] — 2026-04-06 — Refactorització & Seguretat 🏗️🔒 (MINOR)

### 🏗️ Modularització de GamePage.tsx
- Reduït de ~1650 a ~1190 línies extraient 4 components:
  - `GameFinishedPhase.tsx`: resultats, recompenses, info rival
  - `GamePopups.tsx`: modals d'especials, troll effects, bonus tokens
  - `SocialItemsPanel.tsx`: panel d'ítems socials i missatges
  - `ItemActions.tsx`: moble expandible amb accions de tags i posicions

### 🔦 Unificació Llum/Llanterna
- Sistema de visibilitat unificat: indoor (interruptor) i outdoor (llanterna) amb el mateix botó toggle
- Outdoor ara permet encendre I apagar (abans només encendre)
- Estat de llum derivat correctament dels moviments (no heurístic)
- Backwards compatible amb moviments `tag:flashlight:` antics

### 🔧 Eines Tipades
- `PlayerTools` tipus i `DEFAULT_TOOLS` constant a `game-types.ts`
- `parseTools()` helper elimina 6+ fallbacks hardcodejats `{ drap: 0, tornavis: 1, ... }`
- `Phase` type centralitzat

### 🔒 Validació servidor del flux d'amagar
- Trigger PostgreSQL `BEFORE UPDATE ON game_players` valida:
  - Existència d'objecte i moble
  - Mida vs capacitat interior (posició "dins")
  - Compatibilitat material vs entorn
- Impossible bypassar des del client

### 🧹 Neteja
- Eliminat `showConfirmDialog` state mort
- Eliminat `useLlanterna()` duplicat
- `cleanup-old-games` ara neteja partides d'història acabades >24h

---

## [1.7.0] — 2026-04-04 — Mode Història + aïllament PvP 🐾🎮 (MINOR)

### 🐾 Mode Història (single-player)
- Tutorial progressiu amb mascota virtual (gos/gat/conill/hàmster/tortuga)
- Adopció: animació d'obrir regal + posar nom a la mascota
- 3 tipus de capítols: Troba la mascota, S'ha escapat!, Accesoris vs CPU
- CPU rival amb decisions aleatòries (simplificat)
- Sistema d'XP: bonus per eficiència de moviments
- Evolucions: Bebè → Jove → Adult → Veterà → Llegendari → Mort (renaixement)
- 6 accesoris + 3 consumibles post-accesoris

### 🔒 Aïllament complet PvP ↔ Història
- Partides del Mode Història NO afecten Elo, lligues ni estadístiques
- Tokens il·limitats (99) al mode història — UI de tokens oculta
- No hi ha bonus rolls ni inventory drops en partides de història
- `handle_game_finished` ignora completament partides `is_story=true`
- Partides de història excloses del llistat "Les meves partides"

### 🖼️ Foto — missatge secret dual
- Nou camp `has_hide_message` a `object_specials`
- La Foto ara permet missatge secret al amagar I nom personalitzat al trobar
- El missatge del rival es mostra al popup quan trobes l'objecte especial

### 📱 UX Lobby
- Botó gran "Mode Història" eliminat del grid (resta al menú hamburguesa)
- Swipe-to-dismiss: partides acabades s'oculten lliscant d'esquerra a dreta
- Partides ocultes persistides a `localStorage`
- Menú hamburguesa optimitzat: totes les opcions amb text clar

### 🐛 Correccions
- Fix FK constraint `game_players.user_id` per permetre CPU virtual
- Fix missatge secret: només per objectes amb `has_hide_message` o `prompt_on=hide`
- Menu "Com jugar" amb text visible (era només ❓)

---

## [1.6.0] — 2026-04-03 — UX mòbil i bonus picker 📱💰 (MINOR)

### 📱 Panell social millorat
- Icones més grans (3xl) amb grid 3 columnes
- Tooltips descriptius al hover/focus
- Millor usabilitat en pantalles petites

### 📜 Historial compacte
- Moviments dins `<details>` plegable
- Text compacte (10px) per reduir densitat vertical en mòbil

### 💰 Bonus Token Picker millorat
- Modal dedicat amb controls ±0.1
- Botons ràpids: 0.1🪙, 0.5🪙, 1🪙, Tot
- Suport per saldos decimals (0.1, 0.2, 0.4...)
- Precisió amb `Math.round(value * 10) / 10`

### 🧹 Neteja de codi legacy
- Eliminades totes les referències funcionals a `confirm`
- Eliminat `confirmedSpots` i props associats

---

## [1.5.0] — 2026-04-03 — Observar troba objectes 🔍✨ (MINOR)

### 🔍 Observar unificat
- **Observar** ara troba l'objecte directament si la posició és correcta
- Eliminada l'acció **Confirmar** (1.5🪙) — ja no existeix
- Pistes progressives: ❄️ fred → 🌡️ calent → 🔥 molt calent → ✅ trobat!
- `hint_level`: 0=fred, 1=calent, 2=molt calent, 3=trobat

### 🪙 Costos simplificats
- Només 2 accions: Moure (0.5🪙) i Observar (0.3🪙)
- `TOKEN_COSTS` reduït a `{ move: 0.5, look: 0.3 }`

---

## [1.4.0] — 2026-04-03 — UX i qualitat de vida 🐛👁️💌 (MINOR)

### 💌 Missatge amagat millorat
- Card dedicada amb estil accent al pas de posició (ja no es passa per alt)
- Comptador de caràcters visible (X/100)

### 👁️ Derrota informativa
- Quan perds, botó "Veure on era l'objecte" mostra: objecte, escenari, moble, posició i missatge
- Ajuda a saber si estaves a prop o lluny de guanyar

### 👤 Nom del rival a "Les meves partides"
- Cada partida mostra "vs NomRival" al Lobby
- Fàcil identificar contra qui jugues

### 🐛 Report de bugs
- Botó 🐛 al header del Lobby
- Modal amb textarea per descriure el problema
- Es desa a error_logs amb tag [BUG REPORT]

---

## [1.3.0] — 2026-04-03 — Eines il·limitades i mobles bruts aleatoris 🧹♻️ (MINOR)

### ♻️ Eines il·limitades
- 🧹 Drap, 🔨 Martell, 🔧 Tornavís i 🔦 Llanterna ja NO es consumeixen
- Un cop tens una eina, la pots usar tantes vegades com vulguis dins la partida
- 🔧 Tornavís: tothom comença amb 1 per defecte

### 🧹 Drap intel·ligent
- El drap s'obté automàticament quan entres a un escenari amb mobles bruts
- Toast: "🧹 Has trobat un Drap a prop d'un moble brut!"
- No cal trobar-lo aleatòriament (però també es pot trobar per atzar)

### 🎲 Mobles bruts aleatoris
- Quins mobles estan bruts canvia cada partida (~60% dels elegibles)
- Determinístic per gameId (mateixa partida = mateixos bruts)
- Indicador visual 🧹 als mobles bruts + borde accent

### 🕵️ Fix espia
- L'ítem social Espia ara mostra missatge clar si el rival no té ubicació
- "🤷 El rival encara no s'ha mogut!" si el rival no s'ha posicionat

---

## [1.2.0] — 2026-04-03 — Llum i llanterna 💡🔦 (MINOR)

### 💡 Sistema de llum
- Escenaris interiors (Cuina, Habitació, Menjador, Lavabo, Despatx) comencen amb llum ENCÈS
- Pots apagar el llum (0.2🪙) → cap jugador veu els mobles
- Qualsevol jugador pot encendre'l de nou (0.2🪙)
- Afecta AMBDÓS jugadors (estratègic)

### 🔦 Llanterna
- Nova eina (trobable 5% en look/confirm)
- Usable en escenaris exteriors (Jardí, Balcó) per revelar mobles ocults
- Reutilitzable (no es consumeix), costa 0.2🪙
- Jardí → revela 📦 Baúl | Balcó → revela 🏺 Gerro
- Botó gran i destacat als escenaris exteriors

### 🔄 Canvis
- ❌ Eliminada interacció antiga "Encendre el llum" del Menjador
- ❌ Eliminat moble ocult "Racó fosc" del Menjador
- 📈 Probabilitat eines pujada a 20% (5% × 4 eines)

---

## [1.1.0] — 2026-04-03 — Mobles interactius amb tags 🧹💥🔧 (MINOR)

### ⚡ Noves accions de mobles
- 🧹 **Netejar** — mobles amb tag `dirty` (Catifa, Cistella, Paperera, Rentadora, Armari mirall)
  - Requereix eina 🧹 Drap, costa 0.2🪙, 50% de trobar mini bonus
- 💥 **Trencar** — mobles amb tag `breakable` (Vitrina, Llum, Quadre, Armari mirall)
  - Requereix eina 🔨 Martell, notifica el rival on ets, costa 0.3🪙, 30% bonus
  - Genera 🔧 Tornavís per AMBDÓS jugadors (fàcil d'arreglar)
- 🔧 **Arreglar** — mobles trencats per un altre jugador
  - Requereix 🔧 Tornavís, costa 0.2🪙, 40% de trobar mini bonus

### 🎒 Sistema d'eines
- 3 eines: 🧹 Drap, 🔨 Martell, 🔧 Tornavís
- Eines guardades a `game_players.tools` (només duren la partida)
- 15% de trobar eines en accions look/confirm (5% cada)
- Màxim 3 de cada eina
- Indicador d'eines a la barra d'estat

### 🔄 Canvis
- ❌ Eliminada acció "Obrir l'armari" (conflicte amb Confirmar)
- ❌ Eliminat moble ocult "Capsa de sabates"
- ✅ Mantinguda 💡 "Encendre el llum" (Menjador)

---

## [1.0.0] — 2026-04-03 — Primera versió estable 🎉

### 🎮 Mecàniques de joc
- Joc PvP de deducció: amaga un objecte i busca el del rival
- Fase simultània: tots dos amaguen alhora
- 3 accions: Moure (0.5🪙), Observar (0.3🪙), Confirmar (1.5🪙)
- Pistes progressives: ❄️ fred → 🌡️ calent → 🔥 molt calent
- 5 tokens/dia amb reinici automàtic
- Límit de 7 dies per partida
- Pistes de l'objecte rival als torns 2 i 5

### 🗺️ Escenaris
- 7 escenaris: Cuina, Jardí, Balcó, Habitació, Menjador, Lavabo, Despatx
- Camins predefinits entre escenaris
- Límit de mobles per escenari (max_items: 12-15)

### ⚡ Mobles interactius
- Sistema extensible via taula `item_interactions`
- 💡 Encendre el llum (Menjador) → revela "Racó fosc"
- 🚪 Obrir l'armari (Habitació) → revela "Capsa de sabates"
- Mobles ocults (`hidden=true`) apareixen només després d'interaccions
- Indicador ⚡ als mobles amb accions disponibles

### 🎯 Objectes
- Diccionari predefinit amb icones i propietats
- Validació material vs entorn (paper+aigua, vidre+calor, etc.)
- Restricció de mida: objectes grans no caben dins mobles petits (inner_capacity)
- Objectes especials: Foto (🖼️) → trofeu personalitzat

### ⚡ Ítems socials (1/dia)
- 🍌 Plàtan — bloqueja 1 posició del rival
- 💣 Bomba de fum — mou el teu objecte (1x/partida)
- 🛡️ Escut — protegeix de plàtan i intercanvi
- 🔄 Intercanvi — intercanvia ubicació amb el rival
- 🕵️ Espia — revela l'habitació del rival
- 💡 Missatge — envia text/farol al rival

### 🎁 Recompenses
- Mobles decoratius aleatoris al guanyar (5 raritats)
- Vendre per tokens bonus o col·locar en escenaris
- Foto → trofeu amb nom personalitzat i missatge

### 📈 Ranking
- Elo: +25 guanyar, -20 perdre (mínim 100)
- Lligues: 🥉 Bronze → 🥈 Silver → 🥇 Gold → 💎 Platinum → 👑 Diamond
- Estadístiques: partides, victòries, ratxes

### 🔧 Infraestructura
- Bonus aleatoris (15% per acció, no fixos)
- Missatge opcional al amagar objecte
- Alerta de proximitat del rival
- Backup automàtic (edge function)
- Cleanup de partides antigues (7 dies)
- Error logging a base de dades
- Documentació tècnica completa (TECHNICAL.md)
- Ajuda in-app (botó ❓)

### 🔒 Seguretat
- RLS complet a totes les taules
- Funcions SECURITY DEFINER per operacions crítiques
- Validació client + servidor
