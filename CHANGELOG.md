# 📋 CHANGELOG — Deduction Duel

Segueix [Semantic Versioning](https://semver.org/): **MAJOR.MINOR.PATCH**
- **MAJOR**: canvis que trenquen compatibilitat
- **MINOR**: funcionalitats noves (compatibles)
- **PATCH**: correccions de bugs

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
