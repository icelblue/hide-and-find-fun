
## 1. Límit de mobles per escenari

Afegir columna `max_items` a la taula `scenarios` (default 20). Quan un jugador vol col·locar un moble-recompensa, es comprova que no superi el límit. Fàcil de canviar per escenari des de la BD.

| Escenari | Mobles actuals | max_items proposat |
|----------|---------------|-------------------|
| Cuina | 8 | 15 |
| Jardí | 8 | 15 |
| Balcó | 8 | 12 |
| Habitació | 8 | 15 |
| Menjador | 9 | 15 |
| Lavabo | 10 | 12 |
| Despatx | 8 | 15 |

## 2. Mobles interactius — Arquitectura

### Taula `item_interactions`
```
item_id       → UUID (FK a items)
action_name   → TEXT ("encendre", "netejar", "obrir", "moure")
action_icon   → TEXT ("💡", "🧹", "🚪", "↔️")
action_label  → TEXT ("Encendre el llum")
cost          → NUMERIC (0.2 tokens per defecte)
effect_type   → TEXT enum:
  - "reveal_items" → mostra mobles ocults
  - "enable_position" → desbloqueja posició d'un moble
  - "give_hint" → dóna una pista extra
  - "reveal_content" → mostra contingut (ex: netejar finestra)
effect_data   → JSONB (dades específiques per cada efecte)
requires      → JSONB (precondicions opcionals)
one_time      → BOOLEAN (true = només es pot fer un cop)
```

### Exemples concrets per començar (3 interaccions simples)

**1. 💡 Encendre el llum** (a Habitació)
- `effect_type: "reveal_items"`
- `effect_data: { "item_names": ["Tauleta de nit", "Calaixera"] }`
- Quan cliques "Encendre", apareixen 2 mobles que estaven ocults (hidden=true)
- Cost: 0.2🪙, one_time: true

**2. 🧹 Netejar la taula** (a Cuina)  
- `effect_type: "enable_position"`
- `effect_data: { "position": "sobre", "hint": "Ara pots veure què hi ha sobre la taula" }`
- Desbloqueja la posició "sobre" d'un moble que la tenia bloquejada
- Cost: 0.3🪙, one_time: true

**3. 🚪 Obrir l'armari** (a Habitació)
- `effect_type: "reveal_content"`  
- `effect_data: { "message": "Dins l'armari hi veus roba i una capsa" }`
- Mostra un missatge descriptiu i desbloqueja "dins"
- Cost: 0.2🪙, one_time: true

### Com funciona al joc
1. Jugador veu un moble amb icona ⚡ (indica interacció disponible)
2. Al clicar, a més de sobre/sota/dins apareix el botó d'acció ("💡 Encendre")
3. Paga el cost → s'aplica l'efecte → es guarda a `game_moves` com a acció "interact"
4. Si `one_time=true`, no es pot repetir (es trackeja als moves del jugador)

### Per què és fàcil d'ampliar
- Afegir un nou moble interactiu = 1 INSERT a `item_interactions`
- Nous tipus d'efecte = afegir un case al handler sense tocar l'estructura
- Tot configurable per BD, zero codi per afegir contingut

### Fases d'implementació
- **Fase 1 (ara)**: Crear taula + columna `max_items`. NO implementar la UI encara.
- **Fase 2 (futur)**: Afegir la UI al GamePage + inserir les 3 interaccions d'exemple.

## 3. Versió de l'app
Afegir `APP_VERSION` a un fitxer constant i mostrar-lo al footer del Lobby (ex: "v0.1.0-beta").
