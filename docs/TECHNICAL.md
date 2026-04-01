# 📘 Documentació Tècnica — Deduction Duel

> Guia completa per entendre, modificar, depurar i escalar el projecte.

---

## 📑 Índex

1. [Stack tecnològic](#1-stack-tecnològic)
2. [Arquitectura general](#2-arquitectura-general)
3. [Estructura de fitxers](#3-estructura-de-fitxers)
4. [Base de dades](#4-base-de-dades)
5. [Mecàniques de joc (detallat)](#5-mecàniques-de-joc-detallat)
6. [Sistema de matchmaking](#6-sistema-de-matchmaking)
7. [Flux de dades i Realtime](#7-flux-de-dades-i-realtime)
8. [Sistema de recompenses](#8-sistema-de-recompenses)
9. [Edge Functions](#9-edge-functions)
10. [Seguretat (RLS)](#10-seguretat-rls)
11. [Instal·lació local](#11-installació-local)
12. [Guia de modificació](#12-guia-de-modificació)
13. [Debugging](#13-debugging)
14. [Opcions d'escalabilitat](#14-opcions-descalabilitat)

---

## 1. Stack tecnològic

| Capa | Tecnologia | Versió | Rol |
|------|-----------|--------|-----|
| **Frontend** | React + TypeScript | 18.3 / 5.8 | SPA amb hooks i components funcionals |
| **Build** | Vite (SWC) | 5.4 | HMR sub-segon, tree-shaking |
| **Estil** | Tailwind CSS | 3.4 | Utility-first amb design tokens HSL |
| **Components UI** | shadcn/ui (Radix) | — | 40+ components accessibles |
| **Routing** | React Router DOM | 6.30 | Rutes protegides amb AuthProvider |
| **State server** | TanStack Query | 5.83 | Cache i invalidació automàtica |
| **Backend** | Supabase (Lovable Cloud) | — | Auth, DB, Realtime, RPC, Edge Fn |
| **Auth** | Supabase Auth | — | Email/password amb verificació |
| **DB** | PostgreSQL | 15+ | Via Supabase amb RLS complet |
| **Realtime** | Supabase Realtime | — | WebSocket amb postgres_changes |
| **Edge Functions** | Deno | — | Serverless per tasques periòdiques |
| **Notifications** | Sonner | 1.7 | Toast notifications |
| **Validació** | Zod | 3.25 | Validació de schemas |

### Fonts

- **Orbitron**: Títol neon del joc
- **Space Grotesk**: Headings
- **Inter**: Cos del text

### Paleta (HSL, definida a `index.css`)

| Token | HSL | Ús |
|-------|-----|-----|
| `--primary` | 265 90% 65% | Violeta neon — accions principals |
| `--secondary` | 175 70% 42% | Verd-blau — accions secundàries |
| `--accent` | 30 100% 58% | Taronja — destacats i alertes |
| `--background` | 230 15% 10% | Fons fosc |
| `--card` | 230 12% 14% | Cards amb glassmorphism |
| `--destructive` | 0 80% 58% | Errors i accions perilloses |
| `--success` | 155 72% 40% | Encerts i confirmacions |
| `--warning` | 42 100% 55% | Avisos |

---

## 2. Arquitectura general

```
┌─────────────────────────────────────────────────────┐
│                     CLIENT (SPA)                     │
│                                                      │
│  App.tsx ── Routes protegides amb AuthProvider        │
│     │                                                │
│     ├── /auth ─────────── AuthPage.tsx                │
│     ├── / ─────────────── LobbyPage.tsx               │
│     ├── /game/:id ─────── GamePage.tsx                │
│     ├── /profile ──────── ProfilePage.tsx             │
│     ├── /player/:id ───── PlayerProfilePage.tsx       │
│     └── /reset-password ─ ResetPasswordPage.tsx       │
│                                                      │
│  Lògica de negoci:                                   │
│     ├── supabase-helpers.ts (577 línies)              │
│     └── reward-helpers.ts (55 línies)                │
│                                                      │
│  Comunicació amb backend:                            │
│     └── @supabase/supabase-js (client auto-generat)  │
└──────────────────────┬──────────────────────────────┘
                       │ HTTPS + WebSocket
                       ▼
┌─────────────────────────────────────────────────────┐
│              SUPABASE (LOVABLE CLOUD)                │
│                                                      │
│  ┌──────────────┐  ┌─────────────────┐              │
│  │  PostgreSQL   │  │   Auth Service   │              │
│  │  15 taules    │  │  email/password  │              │
│  │  6 funcions   │  │  handle_new_user │              │
│  │  RLS complet  │  └─────────────────┘              │
│  └──────────────┘                                    │
│                                                      │
│  ┌──────────────┐  ┌─────────────────┐              │
│  │   Realtime    │  │  Edge Functions  │              │
│  │  3 canals per │  │  cleanup-old-    │              │
│  │  partida      │  │  games (cron)    │              │
│  └──────────────┘  └─────────────────┘              │
└─────────────────────────────────────────────────────┘
```

### Principis d'arquitectura

1. **Client-side first**: Tota la lògica de joc viu al client (`supabase-helpers.ts`). No hi ha API custom; tot passa via Supabase SDK.
2. **Seguretat per RLS**: Les polítiques de fila garanteixen que cada jugador només veu i modifica les seves dades.
3. **Realtime reactiu**: El `GamePage` es re-renderitza automàticament quan qualsevol taula rellevant canvia.
4. **Triggers DB per integritat**: Elo, lligues, recompenses i perfils s'actualitzen automàticament via triggers PostgreSQL.

---

## 3. Estructura de fitxers

```
📦 deduction-duel/
├── 📄 index.html                    # Entry HTML (SPA)
├── 📄 vite.config.ts                # Vite config: port 8080, alias @
├── 📄 tailwind.config.ts            # Tailwind amb tokens personalitzats
├── 📄 tsconfig.app.json             # TypeScript paths (@/ → src/)
├── 📄 vitest.config.ts              # Config de tests
│
├── 📁 src/
│   ├── 📄 App.tsx                   # ⭐ Router + providers globals
│   ├── 📄 main.tsx                  # ReactDOM.createRoot
│   ├── 📄 index.css                 # 🎨 Design tokens, fonts, animacions
│   ├── 📄 App.css                   # Animacions addicionals
│   │
│   ├── 📁 pages/
│   │   ├── 📄 AuthPage.tsx          # Login / Signup (email + password)
│   │   ├── 📄 ResetPasswordPage.tsx # Recuperació de contrasenya
│   │   ├── 📄 LobbyPage.tsx         # 🎯 Matchmaking complet (336 línies)
│   │   │     Inclou: crear partida, rival aleatori, buscar jugador,
│   │   │     unir-se per codi, les meves partides (amb reptes pendents),
│   │   │     partides obertes
│   │   ├── 📄 GamePage.tsx          # 🎮 Motor de joc (940 línies)
│   │   │     Inclou: fase d'amagar (4 passos), fase de cerca,
│   │   │     ítems socials, pistes progressives, confirmació,
│   │   │     resultats, trofeus especials, realtime
│   │   ├── 📄 ProfilePage.tsx       # 👤 Perfil propi (474 línies)
│   │   │     Inclou: stats, Elo, lliga, recompenses (vendre/col·locar),
│   │   │     mur de missatges, partides actives, rival favorit, trofeus
│   │   ├── 📄 PlayerProfilePage.tsx # 👥 Perfil d'altri
│   │   │     Inclou: stats públiques, mur interactiu, repte directe,
│   │   │     trofeus visibles
│   │   └── 📄 NotFound.tsx          # 404
│   │
│   ├── 📁 hooks/
│   │   ├── 📄 useAuth.tsx           # AuthContext: user, signUp/In/Out
│   │   └── 📄 use-mobile.tsx        # Hook per detectar mòbil
│   │
│   ├── 📁 lib/
│   │   ├── 📄 supabase-helpers.ts   # ⭐ TOTA la lògica de negoci
│   │   │     Seccions:
│   │   │     • DATA FETCHING: scenarios, items, objects, connections
│   │   │     • GAME LIFECYCLE: create, join, delete, available, myGames
│   │   │     • MATCHMAKING: findRandom, search, challenge, getMyInvites
│   │   │     • HIDING: hideObject, checkBothHidden, startGame
│   │   │     • OBJECT SPECIALS: getSpecial, autoFixMissingScenario
│   │   │     • SEARCH: performMove, ensureTokensReset, TOKEN_COSTS
│   │   │     • SOCIAL: sendSocialItem, getUnprocessed, markProcessed
│   │   │     • INVENTORY: getPlayerInventory, giftInventoryItem
│   │   ├── 📄 reward-helpers.ts     # Recompenses via Supabase RPC
│   │   └── 📄 utils.ts             # cn() per Tailwind class merge
│   │
│   ├── 📁 components/
│   │   ├── 📄 ErrorBoundary.tsx     # Error boundary + log automàtic a DB
│   │   ├── 📄 HelpButton.tsx        # Modal regles + component Tip
│   │   └── 📁 ui/                   # 40+ shadcn/ui components
│   │
│   └── 📁 integrations/supabase/
│       ├── 📄 client.ts            # ⚠️ AUTO-GENERAT. NO TOCAR.
│       └── 📄 types.ts             # ⚠️ AUTO-GENERAT. NO TOCAR.
│
├── 📁 supabase/
│   ├── 📄 config.toml              # Config Supabase (auto-gestionat)
│   ├── 📁 functions/
│   │   └── 📁 cleanup-old-games/
│   │       └── 📄 index.ts         # Edge fn: neteja partides velles
│   └── 📁 migrations/              # ⚠️ NO TOCAR. Gestionat per Lovable.
│
├── 📁 docs/
│   └── 📄 TECHNICAL.md             # 📘 Aquest document
│
└── 📁 .lovable/memory/             # Memòria persistent del projecte
```

---

## 4. Base de dades

### 4.1 Diagrama ER complet

```
┌────────────────┐      ┌──────────────────┐      ┌────────────────┐
│   scenarios     │◄────►│scenario_connections│◄────►│   scenarios    │
│ id, name, icon  │      │ scenario_a/b      │      │  (mateixa)     │
│ display_order   │      └──────────────────┘      └────────────────┘
└───────┬────────┘
        │ 1:N
        ▼
┌────────────────┐      ┌──────────────────┐
│     items       │─────►│ scenario_bonuses  │
│ (mobles)        │      │ bonus_type, value │
│ name, icon      │      │ position          │
│ environment     │      └──────────────────┘
│ inner_capacity  │
└────────────────┘

┌────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│    objects      │─────►│  object_traits    │      │ object_specials   │
│ (amagables)     │      │ trait_number 1-2  │      │ special_type      │
│ name, icon      │      │ trait_text        │      │ prompt_on         │
│ size, material  │      └──────────────────┘      │ prompt_text       │
└────────────────┘                                  │ variants (JSON)   │
                                                    └──────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│                         auth.users                                 │
│  (gestionat per Supabase Auth — NO tocar directament)              │
└────────┬──────────────────┬──────────────────┬────────────────────┘
         │                  │                  │
    trigger:          1:N (created_by)    1:N (user_id)
  handle_new_user()         │                  │
         │                  ▼                  │
         ▼           ┌──────────────┐          │
  ┌──────────────┐   │    games      │          │
  │   profiles   │   │ code (6 char) │          │
  │ display_name │   │ status (enum) │          │
  │ elo, league  │   │ invited_user  │          │
  │ games_played │   │ scenario_id   │          │
  │ games_won    │   │ winner_id     │          │
  │ streaks      │   └──────┬───────┘          │
  │ bonus_tokens │          │                  │
  └──────────────┘     ┌────┼────┐             │
                       │    │    │             │
                       ▼    ▼    ▼             │
          ┌──────────┐ ┌──────┐ ┌──────────┐  │
          │game_     │ │game_ │ │game_     │  │
          │players   │ │moves │ │social_   │  │
          │(2/partida│ │      │ │items     │  │
          │has_hidden│ │action│ │item_type │  │
          │tokens_   │ │target│ │blocked   │  │
          │remaining │ │found │ │processed │  │
          └──────────┘ └──────┘ └──────────┘  │
                                               │
          ┌──────────┐ ┌──────────────┐        │
          │player_   │ │player_       │        │
          │rewards   │ │inventory     │◄───────┘
          │status:   │ │item_type     │
          │owned/    │ │item_value    │
          │sold/     │ │special_data  │
          │placed    │ │gifted_to     │
          └────┬─────┘ └──────────────┘
               │
               ▼
          ┌──────────────┐
          │ reward_items  │
          │ (catàleg)     │
          │ rarity, icon  │
          │ sell_value    │
          │ placed_in_    │
          │ scenario_id   │
          └──────────────┘

          ┌──────────────┐
          │wall_messages  │
          │author_user_id │
          │target_user_id │
          │message        │
          │created_at     │
          │(TTL 22 hores) │
          └──────────────┘

          ┌──────────────┐
          │ error_logs    │
          │ (debugging)   │
          │ error_message │
          │ error_stack   │
          │ component     │
          │ url, ua       │
          └──────────────┘
```

### 4.2 Taules detallades

#### `games`
| Columna | Tipus | Descripció |
|---------|-------|------------|
| `id` | uuid (PK) | Identificador únic |
| `code` | text | Codi de 6 caràcters (A-Z, 2-9) |
| `status` | game_status | waiting → hiding → playing → finished |
| `created_by` | uuid | Jugador que ha creat la partida |
| `invited_user_id` | uuid? | Si és NULL = pública. Si té valor = repte privat |
| `scenario_id` | uuid? | Escenari seleccionat (no sempre usat) |
| `winner_id` | uuid? | Jugador guanyador |
| `created_at` | timestamptz | Data de creació |
| `updated_at` | timestamptz | Últim canvi (per cleanup) |

#### `game_players`
| Columna | Tipus | Descripció |
|---------|-------|------------|
| `id` | uuid (PK) | |
| `game_id` | uuid (FK→games) | |
| `user_id` | uuid | |
| `hidden_object_id` | uuid? (FK→objects) | Objecte amagat |
| `hidden_item_id` | uuid? (FK→items) | Moble on l'ha amagat |
| `hidden_position` | position_type? | sobre/sota/dins |
| `has_hidden` | boolean | Ha completat la fase d'amagar? |
| `current_scenario_id` | uuid? (FK→scenarios) | Habitació actual (fase de cerca) |
| `tokens_remaining` | numeric | Tokens disponibles avui |
| `tokens_last_reset` | date | Última data de reinici |
| `social_item_used_today` | boolean | Ja ha usat un ítem social? |
| `shield_active` | boolean | Té l'escut actiu? |
| `smoke_bomb_used` | boolean | Ja ha usat bomba de fum? (1/partida) |
| `special_data` | jsonb? | Dades extra d'objectes especials |

#### `game_moves`
| Columna | Tipus | Descripció |
|---------|-------|------------|
| `action` | action_type | move / look / confirm |
| `token_cost` | numeric | Cost de l'acció |
| `target_scenario_id` | uuid? | Destí (per move) |
| `target_item_id` | uuid? | Moble investigat (per look/confirm) |
| `target_position` | position_type? | Posició investigada |
| `found_object` | boolean? | Ha trobat l'objecte? (per confirm) |
| `found_bonus` | bonus_type? | Bonus trobat (extra_token, hint_yes/no) |
| `turn_number` | integer | Número de torn (per pistes progressives) |

### 4.3 Enums

```sql
-- Estats de partida
CREATE TYPE game_status AS ENUM ('waiting', 'hiding', 'playing', 'finished');

-- Accions del jugador
CREATE TYPE action_type AS ENUM ('move', 'look', 'confirm');

-- Posicions d'amagatall
CREATE TYPE position_type AS ENUM ('sobre', 'sota', 'dins');

-- Tipus de bonus
CREATE TYPE bonus_type AS ENUM ('extra_token', 'hint_yes', 'hint_no');

-- Ítems socials
CREATE TYPE social_item_type AS ENUM ('banana', 'smoke_bomb', 'false_clue', 'shield', 'message');

-- Lligues
CREATE TYPE league_tier AS ENUM ('bronze', 'silver', 'gold', 'platinum', 'diamond');

-- Raresa de recompenses
CREATE TYPE item_rarity AS ENUM ('common', 'uncommon', 'rare', 'epic', 'legendary');

-- Material dels objectes
CREATE TYPE object_material AS ENUM ('generic', 'paper', 'glass', 'metal', 'plastic', 'fabric');

-- Ambient dels mobles
CREATE TYPE item_environment AS ENUM ('generic', 'wet', 'hot');
```

### 4.4 Funcions de base de dades

#### `handle_new_user()` — Trigger on INSERT auth.users
```
Crea automàticament un perfil a public.profiles amb:
- user_id = NEW.id
- display_name = raw_user_meta_data->>'display_name' o email
```

#### `handle_game_finished()` — Trigger on UPDATE games
```
Quan status canvia de 'playing' a 'finished' i winner_id no és NULL:

GUANYADOR:
  games_played += 1
  games_won += 1
  current_streak += 1
  best_streak = MAX(best_streak, current_streak + 1)
  elo += 25

PERDEDOR:
  games_played += 1
  current_streak = 0
  elo = MAX(elo - 20, 100)

AMBDÓS → recalcular lliga:
  elo ≥ 1800 → diamond
  elo ≥ 1600 → platinum
  elo ≥ 1400 → gold
  elo ≥ 1200 → silver
  else → bronze

RECOMPENSA (guanyador):
  random() → rarity:
    < 0.02 → legendary
    < 0.07 → epic
    < 0.20 → rare
    < 0.50 → uncommon
    else → common
  INSERT player_rewards amb reward_item aleatori d'aquesta rarity
```

#### `sell_reward_item(_player_reward_id)` — RPC SECURITY DEFINER
```
1. Verifica que el player_reward pertany a auth.uid() i status='owned'
2. Obté sell_value del reward_item
3. UPDATE player_rewards SET status='sold'
4. UPDATE profiles SET bonus_tokens += sell_value
5. RETURN sell_value
```

#### `place_reward_item(_player_reward_id, _scenario_id)` — RPC SECURITY DEFINER
```
1. Verifica ownership i status='owned'
2. Verifica que el reward_item no està ja col·locat
3. INSERT nou item al escenari (amb display_order automàtic)
4. UPDATE reward_items SET placed_in_scenario_id, placed_by, placed_at
5. UPDATE player_rewards SET status='placed'
```

#### `is_player_in_game(_user_id, _game_id)` — SECURITY DEFINER
```
Retorna TRUE si existeix un game_players amb user_id i game_id.
Usat a les polítiques RLS per restringir accés a dades de partida.
```

---

## 5. Mecàniques de joc (detallat)

### 5.1 Cicle de vida d'una partida

```
                    ┌─────────┐
                    │ WAITING  │ ← createGame()
                    └────┬────┘
                         │ joinGame() (2n jugador)
                         ▼
                    ┌─────────┐
                    │ HIDING   │ ← status='hiding' automàtic
                    └────┬────┘
                         │ hideObject() × 2 jugadors
                         │ checkBothPlayersHidden() → true
                         │ startGame()
                         ▼
                    ┌─────────┐
                    │ PLAYING  │ ← performMove() repetidament
                    └────┬────┘
                         │ performMove('confirm') → foundObject=true
                         ▼
                    ┌─────────┐
                    │FINISHED  │ ← trigger handle_game_finished()
                    └─────────┘
```

### 5.2 Fase d'amagar — Validacions

```
Pas 1: Escollir escenari
  → getScenarios() → tots disponibles

Pas 2: Escollir objecte
  → getObjects() → tots disponibles
  → getObjectSpecial(objectId) → comprova si té comportament especial

Pas 3: Escollir moble
  → getItemsByScenario(scenarioId) → mobles de l'escenari triat

Pas 4: Escollir posició (sobre/sota/dins)
  Validació "dins":
    object.size ≤ item.inner_capacity
    Si no → error "massa gran"
  
  Validació material/ambient:
    paper + wet → error "es mullaria"
    paper + hot → error "es cremaria"
    glass + hot → error "es trencaria"

Pas 5 (opcional): Input especial
  Si objectSpecial.prompt_on === "hide" → mostra prompt extra
  Ex: posar nom personalitzat a l'objecte
  Es desa a game_players.special_data
```

### 5.3 Fase de cerca — Accions

#### MOVE (0.5 tokens)
```
1. Validar connexió: scenario_connections(current ↔ target)
2. UPDATE game_players.current_scenario_id = target
3. Deduir cost
```

#### LOOK (0.3 tokens)
```
1. Obtenir hidden_item_id i hidden_position del rival
2. Obtenir scenario_id del moble investigat i del moble del rival
3. Calcular hintLevel:
   - rivalScenario ≠ targetScenario → 0 (fred ❄️)
   - same scenario, diferent moble → 1 (calent 🌡️)
   - same moble, diferent posició → 2 (molt calent 🔥)
   - same moble, same posició → 2 (però cal confirmar!)
4. Comprovar scenario_bonuses(item_id, position):
   - extra_token → +N tokens
   - hint_yes/hint_no → desar a inventari
5. INSERT game_moves
```

#### CONFIRM (1.5 tokens)
```
1. Comparar targetItemId + targetPosition amb rival
2. Si coincideix:
   - foundObject = true
   - UPDATE games SET status='finished', winner_id=playerId
   - (trigger handle_game_finished s'executa automàticament)
3. Si no coincideix:
   - foundObject = false
   - Es perden 1.5 tokens sense resultat
4. INSERT game_moves
```

### 5.4 Pistes progressives d'objecte rival

```
totalMoves < 2  → cap pista
totalMoves ≥ 2  → object_traits.trait_number = 1 (ex: "És metàl·lic")
totalMoves ≥ 5  → object_traits.trait_number = 2 (ex: "Cap a una mà")
```

### 5.5 Ítems socials

Cada jugador pot usar **1 ítem per dia** (controlat per `social_item_used_today`).

```
BANANA:
  → Bloqueja un spot aleatori al tauler del rival
  → UI: bananaEffect + bananaBlockedSpot

SMOKE BOMB:
  → Canvia hidden_position del propi objecte aleatòriament
  → Només 1 cop per partida (smoke_bomb_used)

FALSE CLUE:
  → Activa indicador fals a la UI del rival durant 10s

SHIELD:
  → Activa shield_active al propi game_players
  → Bloqueja el PRÒXIM ítem social rebut
  → Es consumeix en bloquejar (shield_active → false)

MESSAGE:
  → Envia text lliure al rival (message_text)
  → Pot ser pista real o farol
```

### 5.6 Detecció de proximitat
```
Si el rival està a l'habitació on tu has amagat l'objecte:
  → rivalNearby = true
  → Es mostra un avís visual ⚠️
```

---

## 6. Sistema de matchmaking

### 6.1 Tres tipus de creació

#### Partida pública (botó ➕)
```typescript
createGame(userId)
// → invited_user_id = NULL
// → Apareix a "Partides obertes" per TOTS els altres jugadors
// → Qualsevol pot unir-s'hi
```

#### Repte directe (botó ⚔️ Repte)
```typescript
challengePlayer(userId, rivalUserId)
// → createGame(userId, rivalUserId)
// → invited_user_id = rivalUserId
// → NOMÉS el rival la veu a "Les meves partides" com a repte pendent
// → NO apareix a "Partides obertes"
// → El rival pot Acceptar (joinGame) o Rebutjar (deleteGame)
```

#### Rival aleatori (botó 🎲)
```typescript
findRandomMatch(userId)
// 1. Busca partida pública existent → joinGame
// 2. Si no n'hi ha → selecciona 1 dels 20 jugadors més actius
//    → createGame(userId, randomRivalId) [repte privat]
// 3. Si no hi ha cap jugador → createGame(userId) [pública]
```

### 6.2 Validació de joinGame

```typescript
async function joinGame(gameId, userId) {
  // 1. No ja unit a la partida
  // 2. Partida en status "waiting"
  // 3. Si invited_user_id existeix → NOMÉS ell pot unir-s'hi
  // 4. Menys de 2 jugadors
  // → INSERT game_players
  // → UPDATE games SET status = 'hiding'
}
```

### 6.3 Lobby — Consultes

```
getAvailableGames(userId):
  SELECT * FROM games
  WHERE status='waiting'
    AND invited_user_id IS NULL     ← només públiques!
    AND created_by ≠ userId         ← no les pròpies
  ORDER BY created_at DESC

getMyGames(userId):
  1. game_players WHERE user_id = userId (partides on participo)
  2. games WHERE invited_user_id = userId AND status='waiting' (reptes pendents)
  3. Combina, marca _pending=true els que falten per acceptar
  4. Filtra: finished només si < 24h
  5. Ordena: playing > hiding > waiting > finished
```

---

## 7. Flux de dades i Realtime

### 7.1 Subscripcions (GamePage)

```typescript
const channel = supabase
  .channel(`game-${gameId}`)
  .on("postgres_changes", {
    event: "*",
    schema: "public",
    table: "games",
    filter: `id=eq.${gameId}`
  }, () => loadGame())
  .on("postgres_changes", {
    event: "*",
    schema: "public",
    table: "game_players",
    filter: `game_id=eq.${gameId}`
  }, () => loadGame())
  .on("postgres_changes", {
    event: "INSERT",
    schema: "public",
    table: "game_social_items",
    filter: `game_id=eq.${gameId}`
  }, () => loadGame())
  .subscribe();
```

**Efecte**: Qualsevol canvi del rival (amagar objecte, moure, enviar ítem social) provoca una recàrrega completa de l'estat de la partida al client de l'altre jugador.

### 7.2 Flux de tokens

```
Dia 1: tokens_remaining = 5
       Usa 3 tokens → resta 2

Dia 2: ensureTokensReset() detecta nova data
       → tokens = 5 + bonus_tokens (del perfil)
       → bonus_tokens es posa a 0 al perfil
       → social_item_used_today = false
```

---

## 8. Sistema de recompenses

### 8.1 Obtenció

```
Guanyar partida
  → handle_game_finished() (trigger automàtic)
  → random() determina rarity:
     50% common, 30% uncommon, 13% rare, 5% epic, 2% legendary
  → SELECT aleatori un reward_item d'aquesta rarity
  → INSERT player_rewards (user_id, reward_item_id, game_id, status='owned')
```

### 8.2 Accions amb recompenses

#### Vendre
```typescript
sellRewardItem(playerRewardId)
// → RPC: sell_reward_item
// → player_rewards.status = 'sold'
// → profiles.bonus_tokens += reward_items.sell_value
// → Retorna sell_value
// → Els bonus_tokens s'afegeixen al reset diari de tokens
```

#### Col·locar en un escenari
```typescript
placeRewardItem(playerRewardId, scenarioId)
// → RPC: place_reward_item
// → INSERT items (nou moble a l'escenari)
// → reward_items.placed_in_scenario_id = scenarioId
// → player_rewards.status = 'placed'
// → TOTS els jugadors veuen el nou moble!
```

### 8.3 Trofeus especials
```
Quan trobes un objecte amb object_specials (prompt_on='find'):
  → Popup per interactuar (ex: posar nom a joguina)
  → INSERT player_inventory (item_type='special_trophy')
  → Visible al perfil propi i d'altres jugadors
```

---

## 9. Edge Functions

### `cleanup-old-games`

**Ubicació**: `supabase/functions/cleanup-old-games/index.ts`

**Funció**: Neteja automàtica de dades caducades.

**Lògica**:
```
1. Partides finished amb updated_at > 7 dies:
   - DELETE player_inventory WHERE game_id IN (...) AND item_type ≠ 'special_trophy'
   - DELETE game_moves WHERE game_id IN (...)
   - DELETE game_social_items WHERE game_id IN (...)
   - DELETE game_players WHERE game_id IN (...)
   - DELETE games WHERE id IN (...)

2. Wall messages amb created_at > 22 hores:
   - DELETE wall_messages WHERE created_at < cutoff

Preserva SEMPRE:
  - player_rewards (trofeus i recompenses)
  - player_inventory WHERE item_type = 'special_trophy'
```

**Invocació**: `POST /functions/v1/cleanup-old-games`

**Recomanació**: Configurar cron job diari (ex: 03:00 UTC) via `pg_cron` + `pg_net`.

---

## 10. Seguretat (RLS)

### Matriu de polítiques

| Taula | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| `profiles` | Tots auth | Propi (uid=user_id) | Propi | ❌ |
| `games` | Tots auth | Propi (uid=created_by) | Creador OR jugador | waiting AND (creador OR convidat) |
| `game_players` | Via is_player_in_game() | Propi (uid=user_id) | Propi | Propi OR creador amb status=waiting |
| `game_moves` | Via is_player_in_game() | Propi (uid=player_id) | ❌ | ❌ |
| `game_social_items` | Emissor OR receptor | Propi (uid=from_player_id) | Receptor | ❌ |
| `player_inventory` | Propi OR regalat OR trophy | Propi | Propi | ❌ |
| `player_rewards` | Propi | ❌ (via trigger) | Propi | ❌ |
| `wall_messages` | Tots auth | Propi (no auto-msg) | ❌ | Autor |
| `scenarios` | Tots auth | ❌ | ❌ | ❌ |
| `items` | Tots auth | ❌ | ❌ | ❌ |
| `objects` | Tots auth | ❌ | ❌ | ❌ |
| `object_traits` | Tots auth | ❌ | ❌ | ❌ |
| `object_specials` | Tots auth | ❌ | ❌ | ❌ |
| `scenario_bonuses` | Tots auth | ❌ | ❌ | ❌ |
| `scenario_connections` | Tots auth | ❌ | ❌ | ❌ |
| `reward_items` | Tots auth | ❌ | ❌ | ❌ |
| `error_logs` | Propi | Propi o anon | ❌ | ❌ |

### Notes de seguretat

- **is_player_in_game()** és `SECURITY DEFINER` per evitar recursió RLS
- **handle_game_finished()** és `SECURITY DEFINER` per poder modificar altres perfils
- Les taules de contingut del joc (scenarios, items, objects...) són **read-only** per usuaris
- `invited_user_id` controla la privacitat de les partides a nivell de consulta

---

## 11. Instal·lació local

### Prerequisits

| Software | Versió mínima | Nota |
|----------|--------------|------|
| Node.js | 18+ | Recomanat 20+ |
| npm / bun | qualsevol | bun recomanat (lock file present) |
| Git | 2.30+ | Per clonar |

### Passos

```bash
# 1. Clonar
git clone <repo-url>
cd deduction-duel

# 2. Instal·lar dependències
bun install     # o: npm install

# 3. Variables d'entorn
# Crear .env a l'arrel (ja existeix si és Lovable Cloud):
cat > .env << 'EOF'
VITE_SUPABASE_URL=https://wqbjvceezgokqhrqckcg.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndxYmp2Y2Vlemdva3FocnFja2NnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3MjMzMjgsImV4cCI6MjA5MDI5OTMyOH0.Dk1OiEj5sX9CXnSsgDf9UTlbM9dI4xaWSPdlYTQ_aQc
VITE_SUPABASE_PROJECT_ID=wqbjvceezgokqhrqckcg
EOF

# 4. Executar en mode dev
npm run dev     # → http://localhost:8080

# 5. Build de producció
npm run build   # → dist/

# 6. Executar tests
npm test        # vitest
```

### ⚠️ Advertiments importants

1. **NO modificar mai**:
   - `src/integrations/supabase/client.ts`
   - `src/integrations/supabase/types.ts`
   - `.env` (si treballes amb Lovable Cloud)
   - `supabase/migrations/`

2. **Base de dades compartida**: La instal·lació local usa la mateixa DB de producció (Lovable Cloud). Per un entorn completament aïllat, caldria:
   - Crear un projecte Supabase propi
   - Aplicar totes les migracions
   - Canviar les variables d'entorn

3. **Port**: El servidor dev escolta al port **8080** (configurat a `vite.config.ts`)

4. **Alias**: `@` resol a `./src` (configurat a vite i tsconfig)

---

## 12. Guia de modificació

### 12.1 Afegir un nou escenari

```sql
-- 1. Inserir l'escenari
INSERT INTO scenarios (name, icon, display_order)
VALUES ('Jardí', '🌿', 4);

-- 2. Inserir mobles
INSERT INTO items (name, icon, scenario_id, display_order, inner_capacity, environment)
VALUES
  ('Caseta', '🏠', '<scenario_id>', 1, 3, 'generic'),
  ('Bassa', '💧', '<scenario_id>', 2, 1, 'wet'),
  ('Barbacoa', '🔥', '<scenario_id>', 3, 2, 'hot');

-- 3. Connectar amb escenaris existents
INSERT INTO scenario_connections (scenario_a, scenario_b)
VALUES
  ('<jardi_id>', '<cuina_id>'),
  ('<jardi_id>', '<garatge_id>');

-- 4. Opcionalment, afegir bonuses
INSERT INTO scenario_bonuses (item_id, position, bonus_type, value)
VALUES ('<caseta_id>', 'dins', 'extra_token', '0.5');
```

### 12.2 Afegir un nou objecte

```sql
-- 1. Inserir l'objecte
INSERT INTO objects (name, icon, display_order, size, material)
VALUES ('Diamant', '💎', 10, 1, 'glass');

-- 2. Afegir pistes progressives
INSERT INTO object_traits (object_id, trait_number, trait_text)
VALUES
  ('<diamant_id>', 1, 'Brilla intensament'),
  ('<diamant_id>', 2, 'És molt dur i petit');

-- 3. Opcionalment, afegir comportament especial
INSERT INTO object_specials (object_id, special_type, prompt_on, prompt_text)
VALUES ('<diamant_id>', 'custom_name', 'find', 'Dona un nom a aquest diamant!');
```

### 12.3 Afegir un nou ítem social

1. **Migració SQL**: Afegir valor al enum
```sql
ALTER TYPE social_item_type ADD VALUE 'trap';
```

2. **supabase-helpers.ts**: Afegir a `SOCIAL_ITEMS`
```typescript
{ type: "trap" as const, icon: "🪤", name: "Trampa", desc: "Efecte de la trampa" },
```

3. **supabase-helpers.ts**: Implementar lògica a `sendSocialItem()`
```typescript
} else if (itemType === "trap") {
  // Implementar efecte
}
```

4. **GamePage.tsx**: Implementar recepció a la secció de `getUnprocessedSocialItems`

### 12.4 Modificar costos de tokens

Editar una sola constant a `supabase-helpers.ts`:
```typescript
export const TOKEN_COSTS = { move: 0.5, look: 0.3, confirm: 1.5 } as const;
```

### 12.5 Modificar sistema Elo/Lligues

Editar la funció SQL `handle_game_finished()` (via migració):
```sql
-- Canviar punts: guanyador +30 (era +25)
elo = elo + 30
-- Canviar perdedor: -15 (era -20)
elo = GREATEST(elo - 15, 100)
-- Canviar llindars de lliga
WHEN elo >= 2000 THEN 'diamond'  -- era 1800
```

### 12.6 Afegir nous mobles-premi

```sql
INSERT INTO reward_items (name, icon, rarity, sell_value)
VALUES
  ('Cadira elegant', '🪑', 'rare', 3),
  ('Tron daurat', '👑', 'legendary', 8);
```

---

## 13. Debugging

### 13.1 Eines

| Eina | Com accedir | Què mostra |
|------|-------------|------------|
| `error_logs` (DB) | Consulta directa | Errors amb stack, component, URL, UA |
| Console del navegador | DevTools | Errors JS en temps real |
| Network tab | DevTools | Peticions Supabase (REST + Realtime) |
| Edge Function logs | Lovable Cloud | Logs de cleanup i errors |
| `window.onerror` | Automàtic | Errors no capturats → error_logs |

### 13.2 Problemes comuns i solucions

| Símptoma | Causa probable | On mirar | Solució |
|----------|---------------|----------|---------|
| "No tens prou tokens" | Tokens no reiniciats | `ensureTokensReset()` | Verificar comparació de dates |
| Partida bloquejada a "hiding" | Un jugador no ha amagat | `game_players.has_hidden` | `checkBothPlayersHidden()` |
| Repte no visible al rival | RLS o query incorrecta | Network tab → `getMyGames` | Verificar `invited_user_id` query |
| Rival no pot unir-se | Validació de `joinGame` | Console errors | `invited_user_id !== userId` |
| Partida no a "Partides obertes" | `invited_user_id` no NULL | DB → games | Hauria de ser NULL per públiques |
| Tokens bonus no s'apliquen | `bonus_tokens` no consumits | `profiles.bonus_tokens` | Verificar `ensureTokensReset()` |
| Ítem social bloquejat | Escut actiu | `game_players.shield_active` | Normal si rival tenia shield |
| "Ja has usat l'ítem social" | `social_item_used_today=true` | `game_players` | S'ha de esperar al reset diari |
| Error "massa gran per dins" | `object.size > item.inner_capacity` | Comparar valors | Normal, validació correcta |

### 13.3 Consultes útils de debug

```sql
-- Veure estat d'una partida
SELECT g.code, g.status, g.winner_id, g.invited_user_id,
       p.display_name as created_by_name
FROM games g
JOIN profiles p ON p.user_id = g.created_by
WHERE g.code = 'YKA5RX';

-- Veure jugadors d'una partida
SELECT gp.*, p.display_name
FROM game_players gp
JOIN profiles p ON p.user_id = gp.user_id
WHERE gp.game_id = '<game_id>';

-- Veure moviments d'una partida
SELECT gm.turn_number, gm.action, gm.token_cost,
       gm.found_object, gm.found_bonus,
       s.name as scenario, i.name as item,
       gm.target_position
FROM game_moves gm
LEFT JOIN scenarios s ON s.id = gm.target_scenario_id
LEFT JOIN items i ON i.id = gm.target_item_id
WHERE gm.game_id = '<game_id>'
ORDER BY gm.turn_number;

-- Errors recents
SELECT created_at, error_message, component, url
FROM error_logs
ORDER BY created_at DESC LIMIT 20;
```

---

## 14. Opcions d'escalabilitat

### Nivell actual (desenes d'usuaris)
✅ Tot funciona correctament amb la configuració actual.

### Centenars d'usuaris
| Acció | Benefici |
|-------|---------|
| Configurar **cron job** diari per cleanup | Manté la DB neta automàticament |
| Afegir **índex** a `games(status, invited_user_id)` | Accelera consultes del lobby |
| Afegir **índex** a `game_players(user_id, game_id)` | Accelera getMyGames |
| **Cache TanStack Query** amb staleTime | Redueix peticions repetides |

### Milers d'usuaris
| Acció | Benefici |
|-------|---------|
| **Instància Supabase major** | Més memòria i CPU per PostgreSQL |
| Moure `performMove()` a **Edge Function** | Redueix round-trips client→DB |
| **Particionament** de `game_moves` per dates | Consultes més ràpides |
| **CDN** per la SPA (Cloudflare/Vercel) | Latència mínima global |

### Desenes de milers
| Acció | Benefici |
|-------|---------|
| **Read replicas** (Supabase Pro) | Distribueix càrrega de lectura |
| Separar **matchmaking** en servei propi | Desacoblar del flow principal |
| **Connection pooling** (PgBouncer) | Més connexions simultànies |
| **Rate limiting** a Edge Functions | Protecció contra abús |

### Centenars de milers
| Acció | Benefici |
|-------|---------|
| **Sharding** per regió | Reduir latència geogràfica |
| **WebSocket dedicat** (Socket.io/Ably) | Si Supabase Realtime no escala |
| **Microserveis** per cada domini | Escalabilitat independent |
| **Redis** per cache de partides actives | Menys pressió a PostgreSQL |

---

## Apèndix: Variables d'entorn

| Variable | Ús | On es defineix |
|----------|-----|---------------|
| `VITE_SUPABASE_URL` | URL del projecte Supabase | `.env` (auto) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Clau pública (anon) | `.env` (auto) |
| `VITE_SUPABASE_PROJECT_ID` | ID del projecte | `.env` (auto) |
| `SUPABASE_URL` | URL (edge functions) | Secret automàtic |
| `SUPABASE_SERVICE_ROLE_KEY` | Clau admin (edge fn) | Secret automàtic |
| `SUPABASE_ANON_KEY` | Clau anon (edge fn) | Secret automàtic |

---

*Última actualització: 2026-04-01*
*Generat per Lovable AI*
