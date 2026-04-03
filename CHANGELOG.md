# 📋 CHANGELOG — Deduction Duel

Segueix [Semantic Versioning](https://semver.org/): **MAJOR.MINOR.PATCH**
- **MAJOR**: canvis que trenquen compatibilitat
- **MINOR**: funcionalitats noves (compatibles)
- **PATCH**: correccions de bugs

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
