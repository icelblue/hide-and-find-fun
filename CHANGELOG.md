# 📋 CHANGELOG — Deduction Duel

Segueix [Semantic Versioning](https://semver.org/): **MAJOR.MINOR.PATCH**
- **MAJOR**: canvis que trenquen compatibilitat
- **MINOR**: funcionalitats noves (compatibles)
- **PATCH**: correccions de bugs

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
