---
name: Social Items v3.1
description: Daily social interactions - banana, smoke bomb, shield, swap, espia, message, robar_tornavis, barricada (2/day), trampa (2/day). Double-click protected via actionLoading.
type: feature
---

## Ítems Socials

| Ítem | Icon | Efecte | Bloq. Escut | Usos/dia |
|------|------|--------|-------------|----------|
| Plàtan | 🍌 | Bloqueja 1 posició del rival | SÍ | 1 |
| Bomba de fum | 💣 | Mou objecte propi a DIFERENT escenari + moble (1x/partida) | NO | 1 |
| Escut | 🛡️ | Bloqueja pròxim plàtan/swap/robar/barricada (1 ús) | — | 1 |
| Intercanvi | 🔄 | Intercanvia posició actual (sala) entre jugadors | SÍ | 1 |
| Espia | 🕵️ | Descobreix on és el rival ara | NO | 1 |
| Barricada | 🚧 | Bloqueja camí entre 2 escenaris (3 torns rival, +1🪙 forçar) | SÍ | **2** |
| Trampa | 🪤 | Col·loca trampa en moble (-0.2🪙 si rival mira) | NO | **2** |
| Missatge | 💡 | Envia pista o farol (max 80 chars) | NO | 1 |
| Robar tornavís | 🔧 | Roba 1 tornavís del rival | SÍ | 1 |

### Comptador 2/dia (Barricada + Trampa)
- Usen `special_data.barricada_today` / `special_data.trampa_today` (int)
- Es resetejen automàticament amb el reset diari de tokens
- NO consumeixen el `social_item_used_today` boolean (els altres sí)
- RPCs (`execute_barricada`, `execute_trampa`) gestionen el comptador
