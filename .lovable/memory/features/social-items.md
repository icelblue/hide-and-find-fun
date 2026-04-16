---
name: Social Items v3.0
description: Daily social interactions - banana, smoke bomb, shield, swap, espia, message, robar_tornavis, barricada, trampa. Double-click protected via actionLoading.
type: feature
---

## Ítems Socials (1/dia)

| Ítem | Icon | Efecte | Bloq. Escut |
|------|------|--------|-------------|
| Plàtan | 🍌 | Bloqueja 1 posició del rival | SÍ |
| Bomba de fum | 💣 | Mou objecte propi a DIFERENT escenari + moble (1x/partida) | NO |
| Escut | 🛡️ | Bloqueja pròxim plàtan/swap/robar/barricada (1 ús) | — |
| Intercanvi | 🔄 | Intercanvia posició actual (sala) entre jugadors | SÍ |
| Espia | 🕵️ | Descobreix on és el rival ara | NO |
| Barricada | 🚧 | Bloqueja camí entre 2 escenaris (3 torns rival, +1🪙 forçar) | SÍ |
| Trampa | 🪤 | Col·loca trampa en moble (-0.2🪙 si rival mira, o resta el que té) | NO |
| Missatge | 💡 | Envia pista o farol (max 80 chars) | NO |
| Robar tornavís | 🔧 | Roba 1 tornavís del rival | SÍ |

### Barricada — RPC execute_barricada
- Jugador selecciona camí des de la seva sala actual
- Rival paga +1🪙 extra per forçar el pas
- Dura 3 moviments del rival (countdown a cada move)
- Bloquejable per escut

### Trampa — RPC execute_trampa
- Jugador selecciona moble on col·locar trampa
- Si rival mira aquell moble, perd 0.2🪙 (o el que li quedi)
- Un sol ús (es desactiva al activar-se)
- NO bloquejable per escut

### false_clue eliminat
- Existeix a l'enum DB però mai s'ha usat (0 registres)
- No apareix a SOCIAL_ITEMS del frontend
