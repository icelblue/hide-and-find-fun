
# Mode Història v1.0

## Concepte
Tutorial single-player progressiu amb mascota virtual. Reaprofita mecàniques existents, no afecta PvP.

## Canvis UI Lobby
- Agrupar botons (ajuda, perfil, bug, logout) en menú hamburguesa (☰)
- Afegir botó visible **"🐾 Mode Història"** al grid principal (al costat de 🎲 i ➕)

## Base de dades (3 taules noves)

### `player_pets`
| Camp | Tipus | Descripció |
|------|-------|------------|
| user_id | uuid | Propietari |
| pet_type | text | animal (gos/gat/conill/hamster/tortuga) |
| pet_name | text | Nom posat per l'usuari |
| pet_icon | text | Emoji de l'animal |
| xp | integer | Experiència acumulada |

### `story_progress`  
| Camp | Tipus | Descripció |
|------|-------|------------|
| user_id | uuid | Jugador |
| chapter | smallint | Capítol (1, 2, 3...) |
| status | text | 'locked'/'active'/'completed' |
| moves_used | integer | Moviments fets |
| best_moves | integer | Millor resultat |

### `pet_accessories`
| Camp | Tipus | Descripció |
|------|-------|------------|
| user_id | uuid | Propietari |
| accessory_name | text | Nom accessori |
| accessory_icon | text | Icona |
| obtained_at | timestamp | Quan s'ha aconseguit |

## Capítols

1. **"Troba la mascota"** — 1 escenari, sense moure's. Aprèn: observar, confirmar.
2. **"S'ha escapat!"** — 3 escenaris random. Aprèn: moure's entre escenaris.
3. **"Accesoris"** — Partida completa vs CPU (decisions random). Aprèn: joc complet. Repetible per cada accessori (5-8 accesoris).

## XP System
- Capítol 1: base 100 XP, bonus per menys moviments
- Capítol 2: base 200 XP, bonus per menys moviments  
- Capítol 3+: base 150 XP per accessori trobat

## CPU Rival
- Amaga objecte random en posició random
- No fa accions actives (simplificat)

## Components nous
- `StoryModePage.tsx` — Pàgina principal del mode
- `TypewriterText.tsx` — Animació text màquina d'escriure
- `PetReveal.tsx` — Animació obrir regal + triar nom
- `StoryChapter.tsx` — Wrapper per cada capítol (reutilitza GamePage internament)
- `LobbyMenu.tsx` — Menú hamburguesa extret del lobby

## Perfil públic
- Mostrar mascota (icona + nom) + XP al perfil
- Visible també al `PlayerProfilePage`

## Fora d'abast (v1)
- No afecta Elo/Lligues
- No hi ha social items al mode història
- No hi ha tokens diaris (il·limitats)
