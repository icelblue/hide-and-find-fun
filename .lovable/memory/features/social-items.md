---
name: Social Items v2.0
description: Daily social interactions - banana, smoke bomb (changes scenario+item), shield, swap (exchanges current scenarios), espia, message, robar_tornavis
type: feature
---

## Ítems Socials (1/dia)

| Ítem | Icon | Efecte | Bloq. Escut |
|------|------|--------|-------------|
| Plàtan | 🍌 | Bloqueja 1 posició del rival | SÍ |
| Bomba de fum | 💣 | Mou objecte propi a DIFERENT escenari + moble (1x/partida) | NO |
| Escut | 🛡️ | Bloqueja pròxim plàtan/swap/robar (1 ús) | — |
| Intercanvi | 🔄 | Intercanvia posició actual (sala) entre jugadors | SÍ |
| Espia | 🕵️ | Descobreix on és el rival ara | NO |
| Missatge | 💡 | Envia pista o farol (max 80 chars) | NO |
| Robar tornavís | 🔧 | Roba 1 tornavís del rival | SÍ |

### Bomba de fum — SEMPRE canvia d'escenari
- Selecciona escenari diferent de l'actual
- Selecciona moble aleatori dins del nou escenari
- Posició (sobre/sota/dins) aleatòria dins del nou moble
- MAI es queda al mateix escenari o moble

### Swap — intercanvi de sales
- Agafa `current_scenario_id` de cada jugador
- Intercanvia: jugador A → sala de B, jugador B → sala de A
