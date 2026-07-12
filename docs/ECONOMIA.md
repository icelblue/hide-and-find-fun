# 💰 Economia del joc — taula completa i anàlisi d'equilibri

*Auditoria del 12/07/2026. Font: codi client + migracions SQL (valors reals en producció).*

## Monedes del sistema

| Moneda | On viu | Com s'obté | Per a què serveix |
|---|---|---|---|
| **Tokens de partida** 🪙 | `game_players.tokens_remaining` (per partida) | 5,0/dia (reset diari per partida) | Accions dins la partida |
| **Monedes (bonus)** 🪙 | `profiles.bonus_tokens` (global) | Guanyar/perdre partides, vendre ítems, jardí, referrals | Comprar sales i mobles, convertir en tokens |

⚠️ Les dues comparteixen icona 🪙 però són comptadors diferents. La conversió monedes→tokens és **1:1 sense límit diari** (`redeem_bonus_tokens`).

## Costos dins la partida (per acció)

| Acció | Cost | Accions/dia amb 5 tokens |
|---|---|---|
| Moure's d'escenari | 0,5 | 10 |
| Mirar un moble | 0,3 | ~16 |
| 🍌 Plàtan / 🚧 Barricada / 🪤 Trampa / 🕵️ Espia / 🔧 Robar tornavís | 0,5 | — |
| 🔄 Intercanvi | 1,0 | — |
| 🛡️ Escut / 💡 Pista / 💣 Bomba de fum / 🔦 Robar llanterna | 0 | — |
| Forçar barricada del rival | +1,0 (peatge) | — |

**Lectura:** un dia típic dona ~7 moviments + 5 mirades, o combinacions. És estret però genera decisions interessants — correcte per a un joc de deducció per torns diaris.

## Ingressos per jugar

| Esdeveniment | Recompensa |
|---|---|
| Guanyar | +2🪙 monedes, +25 Elo, 1 ítem de recompensa |
| Perdre | +0,5🪙 monedes, −20 Elo |
| Venda d'ítem | ⚪1 (50%) · 🟢2 (30%) · 🔵3 (13%) · 🟣5 (5%) · 🟡8 (2%) → **EV ≈ 1,9🪙** |

**EV per partida** (50% de victòries): `0,5·(2+1,9) + 0,5·0,5 ≈ 2,2🪙`.

## Preus (monedes)

| Sales | Preu | Nivell | | Mobles | rang |
|---|---|---|---|---|---|
| Hall | 30 | 1 | | majoria | 3–15 |
| Balcó / Oficina | 40 | 2–3 | | | |
| Menjador | 50 | 2 | | | |
| Jardí | 60 | 4 | | | |
| Cuina / Bany | 80 | 3–4 | | | |

→ Una sala mitjana (50🪙) costa **~23 partides** només jugant. El jardí ho accelera (vegeu sota).

## Jardí (després del reequilibri del 12/07)

| Llavor | Creixement | Collita | 🪙/hora |
|---|---|---|---|
| 🥕 Pastanaga | 4h | 0,5 | 0,125 |
| 🍅 Tomàquet | 8h | 1,0 | 0,125 |
| 🍓 Maduixa | 24h | 2,0 | 0,083 |

Màxim 4 parcel·les/sala. Jugador casual (1 login/dia, maduixes): **8🪙/dia**. Jugador molt actiu (tomàquets ×2 cicles): ~8🪙/dia també — el sostre és pla per disseny.

### Per què s'ha reequilibrat
Amb els valors inicials (1/2/4), 4 maduixes donaven **16🪙/dia amb un sol login** — 7× l'EV d'una partida. Combinat amb la conversió 1:1 a tokens, cultivar dominava jugar (més accions comprades que guanyades). Ara el jardí és un **complement** (≈3,5× l'EV de jugar si es cuida cada dia, però exigeix la inversió de 60🪙 i logins constants) i jugar torna a ser el camí competitiu.

## ⚠️ Punts de vigilància (recomanacions, no aplicats)

1. **Conversió monedes→tokens sense límit**: un jugador amb estalvis pot comprar molts tokens extres en una partida concreta. Recomanació: **cap de +3 tokens/partida/dia** via `redeem_bonus_tokens`. És l'única porta oberta a "pagar per guanyar" (encara que es pagui amb temps de jardí).
2. **Elo asimètric** (+25/−20): inflació lleu d'Elo global amb el temps. Acceptable per a un joc casual; vigilar si apareixen lligues competitives.
3. **Ítems socials gratuïts** (escut, bomba de fum): correctes com a defensa, però si les dades mostren ús sistemàtic, considerar cost 0,2.

## Veredicte

**L'economia està ben anivellada per divertir-se** després del reequilibri: els tokens diaris creen escassetat interessant, la progressió de sales és un objectiu a mitjà termini assolible (2–4 setmanes la primera sala gran), i el jardí dona motiu de tornada diària sense trencar la competició. El risc principal que queda és el punt 1 (conversió il·limitada).
