
## Pla d'implementació v1.9

### 1. Correccions UI ràpides
- **Menú LobbyPage**: Invertir l'ordre — 👤 Perfil primer, 🐾 Mode Història segon
- **Rival favorit (ProfilePage)**: Filtrar CPU UUID (`00000000-...`) de la query de rival favorit. Si el nom és "Anònim", no mostrar la secció
- **Icona mascota morta (StoryModePage)**: Canviar `pet.pet_icon` amb opacitat per ⚰️ o 🪦 (tombstone) a la fase `dead`

### 2. Swipe-to-delete partides
- Substituir la icona 🗑️ per swipe-to-delete a "Les meves partides" del LobbyPage
- El swipe actual només fa "dismiss" visual per partides acabades → canviar-lo per `deleteGame()` real
- Per partides amb status `waiting` (obertes): mostrar confirmació ("Segur? La partida s'eliminarà")
- Per partides `playing`/`hiding`: no permetre eliminar (estan actives)
- Per partides `finished`: eliminar directament amb swipe

### 3. Mecànica de virus/malaltia mascota
- **Nova migració**: Taula `pet_events` (user_id, event_type, xp_change, created_at, resolved_at)
- **Events aleatoris**: Quan completes un capítol, 25% de probabilitat d'un "event negatiu":
  - 🤒 Virus: +200 XP (s'acosta a la mort)
  - 🤕 Caiguda: +150 XP
  - 🫠 Febre: +100 XP
- **Curar**: Usar consumibles (Menjar -100XP, Aigua -50XP, Vacuna -200XP) per "curar" i baixar XP
- Mostrar alerta visual a StoryModePage si la mascota té un event actiu
- Funció `addPetXP` ja gestiona el cap de MAX_XP, només cal afegir events

### 4. Connexions d'escenaris al HelpButton
- Nova secció "🗺️ Mapa d'habitacions" dins del HelpButton
- Query `scenario_connections` + `scenarios` per mostrar: `Cuina ↔ Menjador ↔ Habitació`
- Format visual: nodes amb fletxes

### 5. Documentació
- **README.md**: Actualitzar amb noves mecàniques (virus, swipe-delete), corregir errors
- **TECHNICAL.md**: Actualitzar matriu RLS, noves taules, noves funcions
- **CHANGELOG.md**: Nova entrada v1.9

### 6. Seguretat
- Escanejar i corregir issues pendents
- Verificar RLS de noves taules

### 7. Tests i verificació
- Executar tests existents
- Verificar build sense errors TypeScript

### 8. Portabilitat
- Verificar `.env.example`, `Dockerfile`, `docker-compose.yml`
- Documentar tot el necessari per self-hosting
