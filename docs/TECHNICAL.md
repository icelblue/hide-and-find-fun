<div align="center">

# 📘 DEDUCTION DUEL — Documentació Tècnica

### _Tot el que necessites per entendre, modificar, depurar i escalar el projecte._

<br/>

<img src="https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=white&style=flat-square" />
<img src="https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white&style=flat-square" />
<img src="https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white&style=flat-square" />
<img src="https://img.shields.io/badge/Tailwind-3.4-06B6D4?logo=tailwindcss&logoColor=white&style=flat-square" />
<img src="https://img.shields.io/badge/Supabase-Realtime-3FCF8E?logo=supabase&logoColor=white&style=flat-square" />
<img src="https://img.shields.io/badge/PostgreSQL-15+-336791?logo=postgresql&logoColor=white&style=flat-square" />

</div>

<br/>

---

<br/>

## 📑 Índex

| # | Secció | Descripció |
|:-:|:-------|:-----------|
| 1 | [Stack tecnològic](#-1-stack-tecnològic) | Llenguatges, frameworks i serveis |
| 2 | [Arquitectura general](#-2-arquitectura-general) | Diagrama complet client↔backend |
| 3 | [Estructura de fitxers](#-3-estructura-de-fitxers) | Mapa del projecte amb anotacions |
| 4 | [Base de dades](#-4-base-de-dades) | ER, taules, enums, funcions SQL |
| 5 | [Mecàniques de joc](#-5-mecàniques-de-joc) | Cicle de vida, validacions, accions |
| 6 | [Matchmaking](#-6-sistema-de-matchmaking) | Públic, repte directe, aleatori |
| 7 | [Realtime i dades](#-7-flux-de-dades-i-realtime) | WebSocket, tokens, subscripcions |
| 8 | [Recompenses](#-8-sistema-de-recompenses) | Loot, venda, col·locació, trofeus |
| 9 | [Edge Functions](#-9-edge-functions) | Cleanup automàtic |
| 10 | [Seguretat (RLS)](#-10-seguretat-rls) | Matriu completa de polítiques |
| 11 | [Instal·lació local](#-11-installació-local) | Entorn compartit + entorn aïllat |
| 12 | [Guia de modificació](#-12-guia-de-modificació) | Escenaris, objectes, ítems, Elo |
| 13 | [Debugging](#-13-debugging) | Eines, problemes comuns, consultes |
| 14 | [Escalabilitat](#-14-opcions-descalabilitat) | De desenes a centenars de milers |

<br/>

---

<br/>

## 🔧 1. Stack tecnològic

<br/>

### Infraestructura principal

| Capa | Tecnologia | Versió | Per a què serveix |
|:-----|:-----------|:------:|:------------------|
| 🖥️ **Frontend** | React + TypeScript | 18.3 / 5.8 | SPA amb hooks i components funcionals |
| ⚡ **Build** | Vite (SWC) | 5.4 | Compilació sub-segon, tree-shaking |
| 🎨 **Estil** | Tailwind CSS | 3.4 | Utility-first amb design tokens HSL |
| 🧩 **Components** | shadcn/ui (Radix) | — | 40+ components accessibles |
| 🧭 **Routing** | React Router DOM | 6.30 | Rutes protegides amb `AuthProvider` |
| 📦 **State** | TanStack Query | 5.83 | Cache del servidor + invalidació |
| 🔐 **Auth** | Supabase Auth | — | Email/password amb verificació |
| 🗄️ **DB** | PostgreSQL | 15+ | Via Supabase amb RLS complet |
| 📡 **Realtime** | Supabase Realtime | — | WebSocket amb `postgres_changes` |
| ☁️ **Serverless** | Deno (Edge Fn) | — | Tasques periòdiques |
| 🔔 **Notificacions** | Sonner | 1.7 | Toast notifications |
| ✅ **Validació** | Zod | 3.25 | Schemas de dades |

<br/>

### 🎨 Disseny visual

| Aspecte | Detall |
|:--------|:-------|
| **Tema** | Dark-first amb glassmorphism (`backdrop-blur-xl`) |
| **Paleta** | Violeta neon `#8B5CF6` · Verd-blau `#2DD4BF` · Taronja `#F59E0B` |
| **Títol** | Orbitron (neon glow) |
| **Headings** | Space Grotesk |
| **Cos** | Inter |
| **Target** | Mobile-first 390px · `max-width: 448px` · responsive fins 1920px |

<br/>

### 📱 Compatibilitat cross-platform

| Plataforma | Status | Notes |
|:-----------|:------:|:------|
| iOS Safari | ✅ | `safe-area-inset`, `-webkit-tap-highlight` |
| Android Chrome | ✅ | Samsung Internet inclòs |
| Firefox / Edge / Chrome | ✅ | Desktop i mòbil |
| Font-size inputs | ✅ | 16px mínim (evita zoom iOS) |
| Text consistency | ✅ | `-webkit-text-size-adjust` |

<br/>

---

<br/>

## 🏗️ 2. Arquitectura general

<br/>

```
┌──────────────────────────────────────────────────────────────┐
│                        CLIENT (SPA)                           │
│                                                               │
│   App.tsx ── React Router amb AuthProvider                     │
│      │                                                        │
│      ├── /auth ──────────── AuthPage.tsx                       │
│      ├── / ──────────────── LobbyPage.tsx                     │
│      ├── /game/:id ──────── GamePage.tsx        ⭐ ~1550 línies│
│      ├── /profile ────────── ProfilePage.tsx                  │
│      ├── /player/:id ────── PlayerProfilePage.tsx             │
│      └── /reset-password ── ResetPasswordPage.tsx             │
│                                                               │
│   Lògica de negoci:                                           │
│      ├── lib/supabase-helpers.ts    ⭐ ~1250 línies           │
│      └── lib/reward-helpers.ts         93 línies              │
│                                                               │
│   Comunicació:                                                │
│      └── @supabase/supabase-js (client auto-generat)          │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       │  HTTPS + WebSocket (wss://)
                       ▼
┌──────────────────────────────────────────────────────────────┐
│                 SUPABASE (LOVABLE CLOUD)                       │
│                                                               │
│   ┌───────────────┐   ┌──────────────────┐                   │
│   │  PostgreSQL    │   │   Auth Service    │                   │
│   │  15 taules     │   │  email + password │                   │
│   │  6 funcions    │   │  handle_new_user  │                   │
│   │  RLS complet   │   └──────────────────┘                   │
│   └───────────────┘                                           │
│                                                               │
│   ┌───────────────┐   ┌──────────────────┐                   │
│   │   Realtime     │   │  Edge Functions   │                   │
│   │  3 canals per  │   │  cleanup-old-     │                   │
│   │  partida       │   │  games (cron)     │                   │
│   └───────────────┘   └──────────────────┘                   │
└──────────────────────────────────────────────────────────────┘
```

<br/>

### 💡 Principis d'arquitectura

| Principi | Descripció |
|:---------|:-----------|
| **Client-side first** | Tota la lògica de joc viu al client (`supabase-helpers.ts`). No hi ha API custom — tot via Supabase SDK. |
| **Seguretat per RLS** | Polítiques de fila garanteixen que cada jugador només veu i modifica les seves dades. |
| **Realtime reactiu** | `GamePage` es re-renderitza automàticament quan qualsevol taula rellevant canvia. |
| **Triggers per integritat** | Elo, lligues, recompenses i perfils s'actualitzen via triggers PostgreSQL. |

<br/>

---

<br/>

## 📂 3. Estructura de fitxers

<br/>

```
📦 deduction-duel/
│
├── 📄 index.html                    ← Entry HTML (SPA)
├── 📄 vite.config.ts                ← Port 8080, alias @, env vars
├── 📄 tailwind.config.ts            ← Tokens personalitzats HSL
├── 📄 tsconfig.app.json             ← Paths: @/ → src/
├── 📄 vitest.config.ts              ← Tests unitaris
│
├── 📁 src/
│   │
│   ├── 📄 App.tsx                   ← ⭐ Router + QueryClient + AuthProvider
│   ├── 📄 main.tsx                  ← ReactDOM.createRoot
│   ├── 📄 index.css                 ← 🎨 Design tokens, fonts, animacions
│   ├── 📄 App.css                   ← Animacions extra (neon glow, etc.)
│   │
│   ├── 📁 pages/
│   │   ├── 📄 AuthPage.tsx          ← Login / Signup (email + password)
│   │   ├── 📄 ResetPasswordPage.tsx ← Recuperació de contrasenya
│   │   ├── 📄 LobbyPage.tsx         ← 🎯 Matchmaking (~421 línies)
│   │   │     · Crear partida / rival aleatori / buscar jugador
│   │   │     · Unir-se per codi / partides obertes
│   │   │     · Les meves partides (reptes pendents) / bug report
│   │   ├── 📄 GamePage.tsx          ← 🎮 Motor de joc (~1550 línies)
│   │   │     · Fase amagar (4 passos) + missatge opcional
│   │   │     · Ítems socials + pistes progressives
│   │   │     · Eines, llum, llanterna, mobles bruts
│   │   │     · Pistes progressives + bonus picker
│   │   ├── 📄 ProfilePage.tsx       ← 👤 Perfil propi (~491 línies)
│   │   │     · Stats, Elo, lliga, recompenses
│   │   │     · Vendre/col·locar mobles, mur, rival favorit
│   │   ├── 📄 PlayerProfilePage.tsx ← 👥 Perfil d'altri
│   │   │     · Stats públiques, mur interactiu, repte directe
│   │   └── 📄 NotFound.tsx          ← 404 en català
│   │
│   ├── 📁 hooks/
│   │   ├── 📄 useAuth.tsx           ← AuthContext: user, signUp/In/Out
│   │   └── 📄 use-mobile.tsx        ← Hook per detectar mòbil
│   │
│   ├── 📁 lib/
│   │   ├── 📄 supabase-helpers.ts   ← ⭐ TOTA la lògica de negoci (~1250 línies)
│   │   │     · DATA: scenarios, items, objects, connections
│   │   │     · LIFECYCLE: create, join, delete, available, myGames
│   │   │     · MATCHMAKING: findRandom, search, challenge
│   │   │     · HIDING: hideObject, checkBothHidden, startGame
│   │   │     · TAGS: getTagActions, performTagAction, rollForTool
│   │   │     · LIGHT: toggleLight, isLightOff, useLlanterna
│   │   │     · SEARCH: performMove, ensureTokensReset, TOKEN_COSTS
│   │   │     · SOCIAL: sendSocialItem, getUnprocessed, markProcessed
│   │   │     · INVENTORY: getPlayerInventory, giftInventoryItem
│   │   │     · BONUS: redeemBonusTokens
│   │   ├── 📄 reward-helpers.ts     ← Recompenses via Supabase RPC
│   │   ├── 📄 constants.ts         ← APP_VERSION, constants globals
│   │   └── 📄 utils.ts             ← cn() per Tailwind merge
│   │
│   ├── 📁 components/
│   │   ├── 📄 ErrorBoundary.tsx     ← Error boundary + log a DB
│   │   ├── 📄 HelpButton.tsx        ← Modal regles + component Tip
│   │   └── 📁 ui/                   ← 40+ shadcn/ui components
│   │
│   └── 📁 integrations/supabase/
│       ├── 📄 client.ts             ← ⚠️ AUTO-GENERAT — NO TOCAR
│       └── 📄 types.ts              ← ⚠️ AUTO-GENERAT — NO TOCAR
│
├── 📁 supabase/
│   ├── 📄 config.toml               ← Config Supabase (auto-gestionat)
│   ├── 📁 functions/
│   │   └── 📁 cleanup-old-games/
│   │       └── 📄 index.ts          ← Edge fn: neteja automàtica
│   └── 📁 migrations/               ← ⚠️ NO TOCAR — gestionat per Lovable
│       └── 37 fitxers .sql           ← Esquema complet de la DB
│
└── 📁 docs/
    └── 📄 TECHNICAL.md              ← 📘 Aquest document
```

<br/>

---

<br/>

## 🗄️ 4. Base de dades

<br/>

### 4.1 Diagrama Entitat-Relació

```
  ┌─────────────────┐        ┌────────────────────────┐        ┌─────────────────┐
  │    scenarios     │◄──────►│  scenario_connections   │◄──────►│    scenarios     │
  │─────────────────│        │────────────────────────│        │   (mateixa)      │
  │ id    (uuid PK) │        │ scenario_a  (uuid FK)  │        └─────────────────┘
  │ name  (text)    │        │ scenario_b  (uuid FK)  │
  │ icon  (text)    │        └────────────────────────┘
  │ display_order   │
  │ max_items       │
  └────────┬────────┘
           │ 1:N
           ▼
  ┌─────────────────┐        ┌────────────────────────┐
  │     items        │───────►│  item_interactions      │
  │─────────────────│        │────────────────────────│
  │ id    (uuid PK) │        │ item_id    (uuid FK)   │
  │ name  (text)    │        │ action_name (text)     │
  │ icon  (text)    │        │ effect_type (text)     │
  │ environment     │        │ effect_data (jsonb)    │
  │ inner_capacity  │        │ cost (numeric)         │
  │ scenario_id FK  │        │ one_time (boolean)     │
  └─────────────────┘        └────────────────────────┘

  ┌─────────────────┐        ┌────────────────────────┐        ┌─────────────────┐
  │    objects       │───────►│    object_traits        │        │ object_specials  │
  │─────────────────│        │────────────────────────│        │─────────────────│
  │ id    (uuid PK) │        │ object_id  (uuid FK)   │        │ object_id (FK)  │
  │ name  (text)    │        │ trait_number (1 o 2)   │        │ special_type    │
  │ icon  (text)    │        │ trait_text  (text)     │        │ prompt_on       │
  │ size  (smallint)│        └────────────────────────┘        │ prompt_text     │
  │ material (enum) │                                          │ variants (JSON) │
  └─────────────────┘                                          └─────────────────┘


                          ┌──── auth.users ────┐
                          │  (Supabase Auth)    │
                          │  NO tocar mai       │
                          └───┬─────────────┬──┘
                              │             │
                    trigger:  │             │
                 handle_new_user()          │
                              │             │
                              ▼             │
                    ┌─────────────────┐     │
                    │    profiles      │     │
                    │─────────────────│     │
                    │ user_id (uuid)  │     │
                    │ display_name    │     │
                    │ elo, league     │     │
                    │ games_played/won│     │
                    │ streaks         │     │
                    │ bonus_tokens    │     │
                    └─────────────────┘     │
                                            │
                    ┌─────────────────┐     │
                    │     games       │◄────┘ created_by / invited_user_id
                    │─────────────────│
                    │ code (6 chars)  │
                    │ status (enum)   │──── waiting → hiding → playing → finished
                    │ winner_id       │
                    │ scenario_id FK  │
                    └───┬──────┬────┬┘
                        │      │    │
           ┌────────────┘      │    └──────────────┐
           ▼                   ▼                   ▼
  ┌─────────────────┐ ┌──────────────┐ ┌──────────────────┐
  │  game_players    │ │  game_moves   │ │ game_social_items │
  │─────────────────│ │──────────────│ │──────────────────│
  │ game_id FK      │ │ action (enum)│ │ item_type (enum) │
  │ user_id         │ │ token_cost   │ │ from/to_player   │
  │ hidden_obj/item │ │ target_*     │ │ blocked_by_shield│
  │ hidden_position │ │ found_object │ │ processed        │
  │ tokens_remaining│ │ found_bonus  │ │ message_text     │
  │ shield_active   │ │ turn_number  │ └──────────────────┘
  │ smoke_bomb_used │ └──────────────┘
  └─────────────────┘


  ┌─────────────────┐         ┌─────────────────┐
  │  player_rewards  │────────►│  reward_items    │
  │─────────────────│         │─────────────────│
  │ user_id         │         │ name, icon      │
  │ reward_item_id  │         │ rarity (enum)   │
  │ game_id FK      │         │ sell_value      │
  │ status          │         │ placed_in_*     │
  │ (owned/sold/    │         └─────────────────┘
  │  placed)        │
  └─────────────────┘

  ┌─────────────────┐         ┌─────────────────┐
  │ player_inventory │         │  wall_messages   │
  │─────────────────│         │─────────────────│
  │ user_id         │         │ author_user_id  │
  │ game_id FK      │         │ target_user_id  │
  │ item_type       │         │ message (text)  │
  │ item_value      │         │ TTL: 22 hores   │
  │ special_data    │         └─────────────────┘
  │ gifted_to/at    │
  └─────────────────┘         ┌─────────────────┐
                              │   error_logs     │
                              │ error_message    │
                              │ error_stack      │
                              │ component, url   │
                              └─────────────────┘
```

<br/>

### 4.2 Detall de taules principals

<br/>

<details>
<summary>📋 <strong>games</strong> — Partides</summary>

| Columna | Tipus | Descripció |
|:--------|:------|:-----------|
| `id` | uuid PK | Identificador únic |
| `code` | text | Codi 6 caràcters (A-Z, 2-9) per compartir |
| `status` | `game_status` | `waiting` → `hiding` → `playing` → `finished` |
| `created_by` | uuid | Jugador creador |
| `invited_user_id` | uuid? | `NULL` = pública · Valor = repte privat |
| `scenario_id` | uuid? FK→scenarios | Escenari seleccionat |
| `winner_id` | uuid? | Guanyador (quan `finished`) |
| `created_at` | timestamptz | Data creació |
| `updated_at` | timestamptz | Últim canvi |

</details>

<details>
<summary>👥 <strong>game_players</strong> — Jugadors d'una partida (2 per partida)</summary>

| Columna | Tipus | Descripció |
|:--------|:------|:-----------|
| `game_id` | uuid FK→games | Partida |
| `user_id` | uuid | Jugador |
| `hidden_object_id` | uuid? FK→objects | Objecte amagat |
| `hidden_item_id` | uuid? FK→items | Moble on l'ha amagat |
| `hidden_position` | `position_type`? | `sobre` / `sota` / `dins` |
| `has_hidden` | boolean | Ha completat la fase? |
| `current_scenario_id` | uuid? FK→scenarios | Habitació actual |
| `tokens_remaining` | numeric | Tokens disponibles (inici: 5) |
| `tokens_last_reset` | date | Últim reinici diari |
| `social_item_used_today` | boolean | Ja ha usat ítem social avui? |
| `shield_active` | boolean | Té l'escut activat? |
| `smoke_bomb_used` | boolean | Ja ha usat bomba fum? (1/partida) |
| `special_data` | jsonb? | Dades extra d'objectes especials |

</details>

<details>
<summary>🎯 <strong>game_moves</strong> — Historial de moviments</summary>

| Columna | Tipus | Descripció |
|:--------|:------|:-----------|
| `action` | `action_type` | `move` / `look` / `confirm` |
| `token_cost` | numeric | Cost de l'acció |
| `target_scenario_id` | uuid? | Destí (per `move`) |
| `target_item_id` | uuid? | Moble investigat (per `look`/`confirm`) |
| `target_position` | `position_type`? | Posició investigada |
| `found_object` | boolean? | Ha trobat l'objecte? |
| `found_bonus` | `bonus_type`? | Bonus descobert |
| `turn_number` | integer | Número de torn (pistes progressives) |

</details>

<details>
<summary>📊 <strong>profiles</strong> — Perfils de jugador</summary>

| Columna | Tipus | Descripció |
|:--------|:------|:-----------|
| `user_id` | uuid | Referència a auth.users |
| `display_name` | text? | Nom visible |
| `elo` | integer | Puntuació (inici: 1000) |
| `league` | `league_tier` | Bronze → Diamond |
| `games_played` / `games_won` | integer | Estadístiques |
| `current_streak` / `best_streak` | integer | Ratxes |
| `bonus_tokens` | numeric | Tokens extres (de vendes) |

</details>

<br/>

### 4.3 Enums

```sql
CREATE TYPE game_status     AS ENUM ('waiting', 'hiding', 'playing', 'finished');
CREATE TYPE action_type     AS ENUM ('move', 'look', 'confirm');
CREATE TYPE position_type   AS ENUM ('sobre', 'sota', 'dins');
CREATE TYPE bonus_type      AS ENUM ('extra_token', 'hint_yes', 'hint_no');
CREATE TYPE social_item_type AS ENUM ('banana', 'smoke_bomb', 'false_clue', 'shield', 'message', 'espia', 'swap');
CREATE TYPE league_tier     AS ENUM ('bronze', 'silver', 'gold', 'platinum', 'diamond');
CREATE TYPE item_rarity     AS ENUM ('common', 'uncommon', 'rare', 'epic', 'legendary');
CREATE TYPE object_material AS ENUM ('generic', 'paper', 'glass', 'metal', 'plastic', 'fabric', 'wood', 'cardboard', 'rubber', 'ceramic', 'electronic', 'leather', 'stone');
CREATE TYPE item_environment AS ENUM ('generic', 'wet', 'hot', 'dirty', 'outdoor', 'frozen', 'sorrenc', 'ventós', 'submergit', 'químic');
```

<br/>

### 4.4 Funcions de base de dades

<br/>

<details>
<summary>🔑 <strong>handle_new_user()</strong> — Trigger on INSERT auth.users</summary>

Crea automàticament un perfil a `public.profiles`:
```
user_id      ← NEW.id
display_name ← raw_user_meta_data->>'display_name' o email
```

</details>

<details>
<summary>🏆 <strong>handle_game_finished()</strong> — Trigger on UPDATE games</summary>

Quan `status` canvia de `playing` → `finished` i `winner_id ≠ NULL`:

**Guanyador:**
```
games_played   += 1
games_won      += 1
current_streak += 1
best_streak     = MAX(best_streak, current_streak + 1)
elo            += 25
```

**Perdedor:**
```
games_played   += 1
current_streak  = 0
elo             = MAX(elo - 20, 100)
```

**Ambdós jugadors → recalcular lliga:**
```
elo ≥ 1800 → diamond
elo ≥ 1600 → platinum
elo ≥ 1400 → gold
elo ≥ 1200 → silver
else       → bronze
```

**Recompensa (guanyador):**
```
random() → rarity:
  < 0.02 → legendary    (2%)
  < 0.07 → epic         (5%)
  < 0.20 → rare        (13%)
  < 0.50 → uncommon    (30%)
  else   → common      (50%)

INSERT player_rewards amb reward_item aleatori d'aquesta rarity
```

</details>

<details>
<summary>💰 <strong>sell_reward_item()</strong> — RPC SECURITY DEFINER</summary>

```
1. Verifica que player_reward pertany a auth.uid() amb status='owned'
2. Obté sell_value del reward_item vinculat
3. UPDATE player_rewards SET status = 'sold'
4. UPDATE profiles SET bonus_tokens += sell_value
5. RETURN sell_value
```

</details>

<details>
<summary>📍 <strong>place_reward_item()</strong> — RPC SECURITY DEFINER</summary>

```
1. Verifica ownership i status = 'owned'
2. Verifica que el reward_item no està ja col·locat
3. Comprova que l'escenari no supera max_items
4. INSERT nou item a l'escenari (display_order automàtic)
5. UPDATE reward_items SET placed_in_scenario_id, placed_by, placed_at
6. UPDATE player_rewards SET status = 'placed'
```

</details>

<details>
<summary>🔒 <strong>is_player_in_game()</strong> — SECURITY DEFINER</summary>

```
Retorna TRUE si existeix un game_players amb user_id + game_id.
Usat dins polítiques RLS per restringir accés a dades de partida.
```

</details>

<br/>

---

<br/>

## 🎮 5. Mecàniques de joc

<br/>

### 5.1 Cicle de vida d'una partida

```
                    ┌───────────┐
                    │  WAITING   │ ← createGame()
                    └─────┬─────┘
                          │  joinGame() (2n jugador)
                          ▼
                    ┌───────────┐
                    │  HIDING    │ ← status = 'hiding' automàtic
                    └─────┬─────┘
                          │  hideObject() × 2 jugadors
                          │  checkBothPlayersHidden() → true
                          │  startGame()
                          ▼
                     ┌───────────┐
                     │  PLAYING   │ ← performMove() repetidament
                     └─────┬─────┘
                           │  performMove('look') → found = true
                           ▼
                    ┌───────────┐
                    │ FINISHED   │ ← trigger handle_game_finished()
                    └───────────┘
```

<br/>

### 5.2 Fase d'amagar — Validacions pas a pas

| Pas | Acció | Funció | Detall |
|:---:|:------|:-------|:-------|
| 1️⃣ | Escollir escenari | `getScenarios()` | Tots els escenaris disponibles |
| 2️⃣ | Escollir objecte | `getObjects()` + `getObjectSpecial()` | Comprova si té comportament especial |
| 3️⃣ | Escollir moble | `getItemsByScenario(scenarioId)` | Mobles de l'escenari triat |
| 4️⃣ | Escollir posició | — | `sobre` / `sota` / `dins` |
| 5️⃣ | Input especial (opcional) | Si `objectSpecial.prompt_on === 'hide'` | Es desa a `special_data` |

**Validacions de posició "dins":**

| Condició | Resultat |
|:---------|:---------|
| `object.size > item.inner_capacity` | ❌ "Massa gran per cabre dins" |
| `paper` + `wet` | ❌ "Es mullaria" |
| `paper` + `hot` | ❌ "Es cremaria" |
| `glass` + `hot` | ❌ "Es trencaria" |

<br/>

### 5.3 Fase de cerca — Accions detallades

<br/>

#### 🚶 MOVE — 0.5 tokens

```
1. Validar connexió bidireccional: scenario_connections(current ↔ target)
2. UPDATE game_players.current_scenario_id = target
3. Deduir 0.5 tokens
4. INSERT game_moves
```

#### 👀 LOOK — 0.3 tokens (troba l'objecte si encerta!)

```
1. Obtenir hidden_item_id i hidden_position del rival
2. Obtenir scenario_id del moble investigat vs moble del rival
3. Calcular hintLevel:
   ├── rivalScenario ≠ targetScenario → 0 (fred ❄️)
   ├── same scenario, diferent moble  → 1 (calent 🌡️)
   ├── same moble, diferent posició   → 2 (molt calent 🔥)
   └── same moble, same posició       → 3 (TROBAT! ✅)
4. Si hintLevel = 3:
   ├── foundObject = true
   ├── UPDATE games SET status = 'finished', winner_id = playerId
   └── (trigger handle_game_finished s'executa automàticament)
5. Bonus aleatori (~15% probabilitat):
   ├── 5% → +1 token extra
   └── 10% → +0.5 token extra
6. Tool roll (~20% probabilitat):
   ├── 5% → 🔨 Martell
   ├── 5% → 🔧 Tornavís
   ├── 5% → 🧹 Drap
   └── 5% → 🔦 Llanterna
7. INSERT game_moves (amb hint_level)
```

> ⚠️ L'acció **Confirmar** (1.5🪙) va ser **ELIMINADA** a la v1.5.0. Observar ara troba l'objecte directament.

<br/>

### 5.4 Pistes progressives de l'objecte rival

| Condició | Pista |
|:---------|:------|
| `totalMoves < 2` | Cap pista |
| `totalMoves ≥ 2` | `object_traits.trait_number = 1` (ex: "És metàl·lic") |
| `totalMoves ≥ 5` | `object_traits.trait_number = 2` (ex: "Cap a una mà") |

<br/>

### 5.5 Ítems socials

> Cada jugador pot usar **1 ítem per dia** (controlat per `social_item_used_today`).

| Ítem | Mecànica | Límit | Bloquejat per escut? |
|:-----|:---------|:------|:---------------------|
| 🍌 **Banana** | Bloqueja un spot aleatori al tauler del rival | 1/dia | ✅ Sí |
| 💣 **Bomba de fum** | Canvia `hidden_position` del PROPI objecte aleatòriament | 1/partida | ❌ No |
| 🛡️ **Escut** | Protegeix del pròxim plàtan o intercanvi. Es desactiva després. | 1/dia | — |
| 🔄 **Intercanvi** | Intercanvia `current_scenario_id` amb el rival | 1/dia | ✅ Sí |
| 🕵️ **Espia** | Revela l'escenari actual del rival (auto-orientat, sense notificació) | 1/dia | ❌ No |
| 💡 **Missatge** | Envia text lliure al rival (bluff, provocació) | 1/dia | ❌ No |

> ⚠️ `false_clue` (pista falsa) està ELIMINADA del joc. L'enum existeix a la DB per retrocompatibilitat però no s'usa.

### 5.6 Bonus aleatoris

> Els bonus ja NO estan fixos per posició. Cada cop que un jugador observa, hi ha un **15% de probabilitat** de trobar tokens extra (5% → 1 token, 10% → 0.5 tokens). A més, 20% de trobar eines (5% cadascuna: martell, tornavís, drap, llanterna).

### 5.7 Missatge al amagar

> Qualsevol objecte pot incloure un missatge opcional (≤100 chars) en amagar-lo. Es guarda a `game_players.special_data.hide_message` i es mostra al rival quan guanya.

### 5.8 Detecció de proximitat

```
Si el rival està a l'habitació on TU has amagat l'objecte:
  → rivalNearby = true
  → Avís visual ⚠️ al teu tauler
```

### 5.9 Mobles interactius (v1.3+)

> El sistema de mobles interactius usa **tags** per definir accions disponibles. A més, existeix `item_interactions` per accions especials.

#### Sistema de tags

| Tag | Acció | Eina | Cost | Efecte |
|:-----|:-------|:------|:------|:--------|
| `dirty` | 🧹 Netejar | 🧹 Drap | 0.2🪙 | 50% mini bonus |
| `breakable` | 💥 Trencar | 🔨 Martell | 0.3🪙 | Notifica rival, 30% bonus |
| `broken` | 🔧 Arreglar | 🔧 Tornavís | 0.2🪙 | 40% mini bonus |

#### Eines (il·limitades dins la partida)

| Eina | Obtenció |
|:-----|:---------|
| 🔧 Tornavís | Tothom comença amb 1 (DB default) |
| 🧹 Drap | Auto-obtingut en entrar a escenari amb mobles bruts |
| 🔨 Martell | 5% trobable en observar |
| 🔦 Llanterna | 5% trobable en observar |

#### Mobles bruts aleatoris per partida

- Items amb tag `dirty` al DB = candidats elegibles
- `getDirtyItemsForGame(items, gameId)` selecciona ~60% via hash determinístic
- Mateixa partida = mateixos bruts; diferent partida = diferent combinació

### 5.10 Sistema de llum (v1.2+)

#### Interiors
- Cuina, Habitació, Menjador, Lavabo, Despatx comencen amb llum **ENCÈS**
- Qualsevol jugador pot **apagar** (0.2🪙) → cap jugador veu els mobles
- Qualsevol jugador pot **encendre** (0.2🪙) → tots veuen els mobles
- Afecta **AMBDÓS** jugadors (estratègic)

#### Exteriors (Jardí, Balcó)
- Necessiten 🔦 **Llanterna** per revelar mobles ocults
- Reutilitzable (no es consumeix), costa 0.2🪙
- Jardí → revela 📦 Baúl | Balcó → revela 🏺 Gerro

| Efecte (item_interactions) | Descripció |
|:-------|:-----------|
| `reveal_items` | Mostra mobles ocults de l'escenari |
| `enable_position` | Desbloqueja una posició d'un moble |
| `give_hint` | Dona una pista addicional |
| `reveal_content` | Mostra contingut descriptiu |

### 5.10 Límit de mobles per escenari

> Cada escenari té un `max_items` que limita quants mobles hi pot haver. La funció `place_reward_item` ho valida.

<br/>

---

<br/>

## 🎲 6. Sistema de matchmaking

<br/>

### 6.1 Tres modalitats

<br/>

#### ➕ Partida pública

```typescript
createGame(userId)
// invited_user_id = NULL
// Apareix a "Partides obertes" per TOTS els altres jugadors
// Qualsevol pot unir-s'hi amb joinGame()
```

#### ⚔️ Repte directe

```typescript
challengePlayer(userId, rivalUserId)
// invited_user_id = rivalUserId
// NOMÉS el rival la veu a "Les meves partides"
// NO apareix a "Partides obertes"
// El rival pot Acceptar (joinGame) o Rebutjar (deleteGame)
```

#### 🎲 Rival aleatori

```typescript
findRandomMatch(userId)
// 1. Busca partida pública existent → joinGame()
// 2. Si no n'hi ha → selecciona 1 dels 20 jugadors més actius
//    → crea repte privat (invited_user_id = randomRival)
// 3. Si no hi ha cap jugador → crea partida pública
```

<br/>

### 6.2 Validació de `joinGame`

```
1. ❌ No ja unit a la partida
2. ❌ Partida NO en status "waiting" → rebutjat
3. ❌ Si invited_user_id existeix i NO és el jugador → rebutjat
4. ❌ Ja hi ha 2 jugadors → rebutjat
5. ✅ INSERT game_players
6. ✅ UPDATE games SET status = 'hiding'
```

<br/>

### 6.3 Consultes del lobby

| Consulta | Filtre | Resultat |
|:---------|:-------|:---------|
| **Partides obertes** | `status='waiting'` AND `invited_user_id IS NULL` AND `created_by ≠ userId` | Partides públiques d'altres |
| **Les meves partides** | `game_players.user_id = userId` UNION `invited_user_id = userId` | Totes les meves + reptes pendents |

> Les partides `finished` només es mostren si tenen menys de 24h. Ordre: `playing` > `hiding` > `waiting` > `finished`.

<br/>

---

<br/>

## 📡 7. Flux de dades i Realtime

<br/>

### 7.1 Subscripcions WebSocket (GamePage)

```typescript
const channel = supabase
  .channel(`game-${gameId}`)
  .on("postgres_changes", {
    event: "*", schema: "public", table: "games",
    filter: `id=eq.${gameId}`
  }, () => loadGame())
  .on("postgres_changes", {
    event: "*", schema: "public", table: "game_players",
    filter: `game_id=eq.${gameId}`
  }, () => loadGame())
  .on("postgres_changes", {
    event: "INSERT", schema: "public", table: "game_social_items",
    filter: `game_id=eq.${gameId}`
  }, () => loadGame())
  .subscribe();
```

> **Efecte**: Qualsevol canvi del rival (amagar objecte, moure, enviar ítem social) provoca una recàrrega completa de l'estat de la partida a l'altre client.

<br/>

### 7.2 Flux de tokens

```
┌──────────────────────────────────────────────────┐
│ DIA 1                                            │
│   tokens_remaining = 5.0                         │
│   Juga: move(0.5) + look(0.3) + look(0.3)       │
│   → tokens_remaining = 3.9                       │
└──────────────────────────────────────────────────┘
                        │
                        ▼ canvi de dia
┌──────────────────────────────────────────────────┐
│ DIA 2                                            │
│   ensureTokensReset() detecta nova data          │
│   → tokens = 5.0 (reset fix, NO s'afegeixen bonus│
│     automàticament)                               │
│   → social_item_used_today = false               │
│                                                   │
│   Bonus tokens: el jugador pot afegir-los         │
│   manualment via redeemBonusTokens() (picker UI)  │
└──────────────────────────────────────────────────┘
```

<br/>

---

<br/>

## 🎁 8. Sistema de recompenses

<br/>

### 8.1 Obtenció (automàtica via trigger)

```
Guanyar partida
  → handle_game_finished() s'executa
  → random() determina rarity:
     ├── 50% common
     ├── 30% uncommon
     ├── 13% rare
     ├──  5% epic
     └──  2% legendary
  → SELECT aleatori un reward_item d'aquesta rarity
  → INSERT player_rewards (status = 'owned')
```

<br/>

### 8.2 Accions disponibles

| Acció | Funció | Efecte |
|:------|:-------|:-------|
| 💰 **Vendre** | `sellRewardItem()` → RPC `sell_reward_item` | `status='sold'` · `bonus_tokens += sell_value` |
| 📍 **Col·locar** | `placeRewardItem()` → RPC `place_reward_item` | `status='placed'` · Nou moble visible per a TOTS |

<br/>

### 8.3 Trofeus especials

```
Quan trobes un objecte amb object_specials (prompt_on = 'find'):
  → Popup interactiu (ex: "Dona un nom a aquesta joguina!")
  → INSERT player_inventory (item_type = 'special_trophy')
  → Visible al perfil propi i d'altres jugadors
```

<br/>

---

<br/>

## ☁️ 9. Edge Functions

<br/>

### `cleanup-old-games`

| Aspecte | Detall |
|:--------|:-------|
| **Ubicació** | `supabase/functions/cleanup-old-games/index.ts` |
| **Invocació** | `POST /functions/v1/cleanup-old-games` |
| **Recomanació** | Cron job diari a les 03:00 UTC |

**Lògica de neteja:**

```
1. Partides finished amb updated_at > 7 dies:
   ├── DELETE player_inventory (excepte special_trophy)
   ├── DELETE game_moves
   ├── DELETE game_social_items
   ├── DELETE game_players
   └── DELETE games

2. Wall messages amb created_at > 22 hores:
   └── DELETE wall_messages

⚠️ Preserva SEMPRE:
   ├── player_rewards (trofeus i recompenses)
   └── player_inventory WHERE item_type = 'special_trophy'
```

<br/>

---

<br/>

## 🔒 10. Seguretat (RLS)

<br/>

### Matriu completa de polítiques

| Taula | SELECT | INSERT | UPDATE | DELETE |
|:------|:-------|:-------|:-------|:-------|
| `profiles` | ✅ Tots auth | ✅ Propi | ✅ Propi | ❌ |
| `games` | ✅ Tots auth | ✅ Propi (`created_by`) | ✅ Creador OR jugador | ✅ `waiting` AND creador/convidat |
| `game_players` | 🔐 `is_player_in_game()` | ✅ Propi | ✅ Propi | ✅ Propi OR creador (`waiting`) |
| `game_moves` | 🔐 `is_player_in_game()` | ✅ Propi | ❌ | ❌ |
| `game_social_items` | ✅ Emissor OR receptor | ✅ Propi (`from`) | ✅ Receptor | ❌ |
| `player_inventory` | ✅ Propi/regalat/trophy | ✅ Propi | ✅ Propi | ❌ |
| `player_rewards` | ✅ Propi | ❌ (via trigger) | ✅ Propi | ❌ |
| `wall_messages` | ✅ Tots auth | ✅ Propi (no auto-msg) | ❌ | ✅ Autor |
| `scenarios` | ✅ Tots auth | ❌ | ❌ | ❌ |
| `items` | ✅ Tots auth | ❌ | ❌ | ❌ |
| `objects` | ✅ Tots auth | ❌ | ❌ | ❌ |
| `object_traits` | ✅ Tots auth | ❌ | ❌ | ❌ |
| `object_specials` | ✅ Tots auth | ❌ | ❌ | ❌ |
| `scenario_bonuses` | ✅ Tots auth | ❌ | ❌ | ❌ |
| `scenario_connections` | ✅ Tots auth | ❌ | ❌ | ❌ |
| `reward_items` | ✅ Tots auth | ❌ | ❌ | ❌ |
| `error_logs` | ✅ Propi | ✅ Propi/anon | ❌ | ❌ |

<br/>

### 🔑 Notes de seguretat

- **`is_player_in_game()`** → `SECURITY DEFINER` per evitar recursió RLS
- **`handle_game_finished()`** → `SECURITY DEFINER` per modificar perfils d'altres
- Taules de contingut (`scenarios`, `items`, `objects`...) → **read-only** per usuaris
- `invited_user_id` controla la privacitat de partides a nivell de consulta

<br/>

---

<br/>

## 💻 11. Instal·lació local

<br/>

### 🅰️ Opció ràpida — Entorn connectat a producció

> ⚠️ Aquesta opció usa la **mateixa base de dades de producció**. Les teves accions afectaran les dades reals.

<br/>

#### Prerequisits

| Software | Versió mínima | Instal·lació |
|:---------|:------------:|:-------------|
| **Node.js** | 18+ (recom. 20+) | [nodejs.org](https://nodejs.org) |
| **npm** o **bun** | qualsevol | bun: `curl -fsSL https://bun.sh/install \| bash` |
| **Git** | 2.30+ | [git-scm.com](https://git-scm.com) |

<br/>

#### Pas a pas

```bash
# 1. Clonar el repositori
git clone <url-del-teu-repositori>
cd deduction-duel

# 2. Instal·lar dependències
bun install          # o: npm install

# 3. Crear fitxer .env a l'arrel
# (les claus de producció estan al vite.config.ts com a fallback,
#  però és bona pràctica tenir un .env explícit)
cat > .env << 'EOF'
VITE_SUPABASE_URL=https://wqbjvceezgokqhrqckcg.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndxYmp2Y2Vlemdva3FocnFja2NnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3MjMzMjgsImV4cCI6MjA5MDI5OTMyOH0.Dk1OiEj5sX9CXnSsgDf9UTlbM9dI4xaWSPdlYTQ_aQc
VITE_SUPABASE_PROJECT_ID=wqbjvceezgokqhrqckcg
EOF

# 4. Executar en mode desenvolupament
npm run dev          # → http://localhost:8080

# 5. Build de producció (opcional)
npm run build        # → genera dist/

# 6. Executar tests (opcional)
npm test             # vitest
```

<br/>

#### ⚠️ Fitxers que NO has de tocar MAI

| Fitxer | Per què |
|:-------|:--------|
| `src/integrations/supabase/client.ts` | Auto-generat pel sistema |
| `src/integrations/supabase/types.ts` | Auto-generat des de la DB |
| `.env` (si treballes amb Lovable Cloud) | Gestionat automàticament |
| `supabase/migrations/*` | Esquema DB gestionat per Lovable |

<br/>

---

<br/>

### 🅱️ Opció completa — Entorn aïllat amb Supabase propi

> ✅ Recomanada per desenvolupament real. Base de dades pròpia, sense afectar producció.

<br/>

#### Prerequisits addicionals

| Software | Versió mínima | Instal·lació |
|:---------|:------------:|:-------------|
| Tot de l'Opció A | — | Veure més amunt |
| **Docker Desktop** | 20+ | [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop) |
| **Supabase CLI** | 1.100+ | `npm install -g supabase` |

<br/>

#### Pas 1 — Crear compte i projecte a Supabase

1. Ves a **[supabase.com](https://supabase.com)** i crea un compte gratuït (GitHub o email)
2. Un cop dins el dashboard, clica **"New Project"**
3. Omple els camps:
   - **Name**: `deduction-duel-dev` (o el que vulguis)
   - **Database Password**: genera'n una segura i **guarda-la** (la necessitaràs)
   - **Region**: tria la més propera a tu (ex: `eu-west-1` per Europa)
4. Espera ~2 minuts fins que el projecte estigui llest (barra de progrés)

<br/>

#### Pas 2 — Obtenir les claus del projecte

Un cop creat el projecte, ves a **Settings → API** al dashboard de Supabase:

| Dada | On la trobes | Per a què serveix |
|:-----|:-------------|:------------------|
| **Project URL** | `Settings → API → Project URL` | Ex: `https://abcdefghij.supabase.co` |
| **anon key** | `Settings → API → Project API keys → anon public` | Clau pública per al client |
| **service_role key** | `Settings → API → Project API keys → service_role secret` | ⚠️ Clau admin (només edge functions) |
| **Project Ref** | L'últim segment de la URL: `abcdefghij` | Identificador del projecte |

> 💡 La **anon key** és pública i segura d'incloure al codi client. La **service_role key** és **secreta** i mai ha d'estar al frontend.

<br/>

#### Pas 3 — Configurar Supabase CLI i vincular el projecte

```bash
# Iniciar sessió a la CLI de Supabase
npx supabase login
# → S'obrirà el navegador per autoritzar

# Vincular el teu projecte local amb el remot
npx supabase link --project-ref <el-teu-project-ref>
# Ex: npx supabase link --project-ref abcdefghij
# → Et demanarà la Database Password que vas guardar al Pas 1
```

<br/>

#### Pas 4 — Aplicar totes les migracions

Les migracions estan a `supabase/migrations/` i contenen tot l'esquema:

```bash
# Aplicar totes les migracions a la base de dades remota
npx supabase db push
```

Això executarà els 19 fitxers de migració en ordre cronològic, creant:
- ✅ Totes les taules (15)
- ✅ Tots els enums (9 tipus)
- ✅ Totes les funcions (6)
- ✅ Tots els triggers
- ✅ Totes les polítiques RLS
- ✅ Dades inicials (escenaris, mobles, objectes, connexions, bonuses)

> 💡 Si vols verificar que tot s'ha aplicat correctament, ves al **Supabase Dashboard → Table Editor** i comprova que les taules existeixin.

<br/>

#### Pas 5 — Configurar l'autenticació

Al dashboard de Supabase, ves a **Authentication → Providers**:

1. **Email**: ha d'estar activat (ja ho està per defecte)
2. **Confirm email**: decideix si vols que els usuaris confirmin el correu
   - Per desenvolupament, pots desactivar-ho a `Authentication → Settings → Enable email confirmations`
   - Per producció, deixa-ho activat

<br/>

#### Pas 6 — Configurar els secrets per a Edge Functions

Les Edge Functions necessiten secrets per funcionar. Configura'ls des del dashboard:

Ves a **Settings → Edge Functions → Secrets** i afegeix:

| Nom del secret | Valor | D'on l'obtens |
|:---------------|:------|:--------------|
| `SUPABASE_URL` | `https://abcdefghij.supabase.co` | Pas 2 → Project URL |
| `SUPABASE_ANON_KEY` | La teva anon key | Pas 2 → anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | La teva service_role key | Pas 2 → service_role secret |

<br/>

#### Pas 7 — Desplegar Edge Functions

```bash
# Desplegar la funció de cleanup
npx supabase functions deploy cleanup-old-games --project-ref <el-teu-project-ref>
```

<br/>

#### Pas 8 — Apuntar l'aplicació al teu Supabase

Modifica **`vite.config.ts`** — canvia les constants del principi del fitxer:

```typescript
// CANVIA AQUESTES LÍNIES amb les dades del teu projecte:
const PUBLIC_SUPABASE_URL = "https://abcdefghij.supabase.co";           // ← La teva URL
const PUBLIC_SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJ...la-teva-key";    // ← La teva anon key
const PUBLIC_SUPABASE_PROJECT_ID = "abcdefghij";                         // ← El teu project ref
```

I crea el teu `.env`:

```bash
cat > .env << 'EOF'
VITE_SUPABASE_URL=https://abcdefghij.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJ...la-teva-key
VITE_SUPABASE_PROJECT_ID=abcdefghij
EOF
```

<br/>

#### Pas 9 — Poblar dades inicials (si cal)

Si les migracions **no** inclouen dades inicials (seed), hauràs de crear-les manualment. Comprova al dashboard si les taules `scenarios`, `items`, `objects`, etc. tenen dades.

Si estan buides, pots inserir dades d'exemple:

```sql
-- Escenaris inicials
INSERT INTO scenarios (name, icon, display_order) VALUES
  ('Cuina', '🍳', 1),
  ('Biblioteca', '📚', 2),
  ('Garatge', '🔧', 3);

-- Mobles per escenari (exemple per Cuina)
INSERT INTO items (name, icon, scenario_id, display_order, inner_capacity, environment) VALUES
  ('Nevera', '🧊', '<cuina_id>', 1, 3, 'wet'),
  ('Forn', '♨️', '<cuina_id>', 2, 2, 'hot'),
  ('Armari', '🗄️', '<cuina_id>', 3, 3, 'generic');

-- Connexions entre escenaris
INSERT INTO scenario_connections (scenario_a, scenario_b) VALUES
  ('<cuina_id>', '<biblioteca_id>'),
  ('<biblioteca_id>', '<garatge_id>'),
  ('<garatge_id>', '<cuina_id>');

-- Objectes amagables
INSERT INTO objects (name, icon, display_order, size, material) VALUES
  ('Clau', '🔑', 1, 1, 'metal'),
  ('Llibre', '📕', 2, 2, 'paper'),
  ('Got', '🥛', 3, 2, 'glass');

-- Recompenses (mobles-premi)
INSERT INTO reward_items (name, icon, rarity, sell_value) VALUES
  ('Tamburet', '🪑', 'common', 1),
  ('Prestatgeria', '📚', 'uncommon', 2),
  ('Vitrina', '🪟', 'rare', 3),
  ('Piano', '🎹', 'epic', 5),
  ('Tron daurat', '👑', 'legendary', 8);
```

> ⚠️ Substitueix `<cuina_id>`, `<biblioteca_id>`, etc. pels UUIDs reals generats a la inserció dels escenaris. Pots obtenir-los amb `SELECT id, name FROM scenarios;`

<br/>

#### Pas 10 — Arrancar i verificar

```bash
# Instal·lar dependències (si no ho has fet)
bun install

# Arrancar el servidor de desenvolupament
npm run dev

# Verificar:
# 1. Obre http://localhost:8080
# 2. Crea un compte nou (registra't)
# 3. Comprova que pots crear una partida
# 4. Comprova que els escenaris i mobles es carreguen
```

<br/>

#### 🎯 Resum ràpid de l'Opció B

```
1. Crear projecte a supabase.com           ← ~2 min
2. Obtenir URL + claus (Settings → API)     ← ~1 min
3. npx supabase login                       ← ~1 min
4. npx supabase link --project-ref <ref>    ← ~1 min
5. npx supabase db push                     ← ~2 min (aplica 19 migracions)
6. Configurar secrets a Edge Functions      ← ~2 min
7. npx supabase functions deploy            ← ~1 min
8. Editar vite.config.ts + .env             ← ~2 min
9. Verificar dades inicials / seed          ← ~5 min
10. npm run dev → http://localhost:8080     ← ✅ Llest!
                                     Total: ~15-20 min
```

<br/>

#### 🔄 Opció alternativa: Supabase local amb Docker

Si prefereixes **no usar cap servei remot** i treballar 100% local:

```bash
# 1. Iniciar Supabase local (Docker ha d'estar corrent)
npx supabase start
# → Arrencarà PostgreSQL, Auth, Realtime, Storage i Studio localment
# → Et mostrarà les claus locals per pantalla

# 2. Copia les claus que et dóna la CLI:
#    API URL:    http://localhost:54321
#    anon key:   eyJhbG...
#    service_role key: eyJhbG...
#    Studio URL: http://localhost:54323  ← Dashboard local

# 3. Aplica migracions a la DB local
npx supabase db reset
# → Aplica totes les migracions + seed des de zero

# 4. Configura .env amb les claus locals
cat > .env << 'EOF'
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_PUBLISHABLE_KEY=<anon-key-local>
VITE_SUPABASE_PROJECT_ID=local
EOF

# 5. Actualitza vite.config.ts amb les mateixes dades

# 6. Arranca l'app
npm run dev

# Per aturar Supabase local:
npx supabase stop
```

> 💡 Amb `supabase start`, tens un **Supabase Studio local** a `http://localhost:54323` que funciona exactament igual que el dashboard web.

<br/>

#### 🐳 Opció C: Docker (producció)

Si vols desplegar l'app com a contenidor Docker:

```bash
# 1. Copia .env.example a .env i omple les variables de Supabase
cp .env.example .env
# Edita .env amb els valors del teu projecte Supabase

# 2. Construeix i arranca amb docker-compose
docker compose up --build -d

# 3. L'app estarà disponible a http://localhost:8080

# 4. Per aturar:
docker compose down
```

**Fitxers de desplegament:**

| Fitxer | Funció |
|:-------|:-------|
| `Dockerfile` | Build multi-stage: Node (build Vite) → nginx (servir SPA) |
| `docker-compose.yml` | Orquestració amb variables d'entorn |
| `nginx.conf` | SPA fallback, gzip, cache d'assets, headers seguretat |
| `.env.example` | Plantilla de variables d'entorn |
| `.dockerignore` | Exclou node_modules, .git, docs del context de build |

**Per producció real**, afegeix:
- Proxy invers (Traefik/Caddy/Cloudflare) amb TLS
- Healthcheck del contenidor (ja inclòs al Dockerfile)
- CI/CD per rebuilds automàtics (GitHub Actions)

<br/>

---

<br/>

## 🛠️ 12. Guia de modificació

> ⚠️ **IMPORTANT**: Les taules de contingut (`scenarios`, `items`, `objects`, etc.) tenen RLS **read-only** per a usuaris autenticats. Per inserir/modificar dades, cal usar la **eina de migració de Lovable** o executar SQL amb la **service_role key**. No es pot fer INSERT directament des del client.

<br/>

### 12.1 Afegir un nou escenari

```sql
-- ⚠️ Executar via migració (no des del client!)

-- 1. Inserir l'escenari
INSERT INTO scenarios (name, icon, display_order)
VALUES ('Soterrani', '🏚️', 8);

-- 2. Obtenir l'UUID generat
SELECT id FROM scenarios WHERE name = 'Soterrani';

-- 3. Inserir mobles (substitueix <scenario_id> pel UUID)
INSERT INTO items (name, icon, scenario_id, display_order, inner_capacity, environment, tags)
VALUES
  ('Caixa forta', '🔐', '<scenario_id>', 1, 3, 'generic', '{}'),
  ('Estanteria', '📚', '<scenario_id>', 2, 2, 'dirty', '{dirty}'),
  ('Caldera', '♨️', '<scenario_id>', 3, 2, 'hot', '{breakable}');

-- 4. Connectar amb escenaris existents
INSERT INTO scenario_connections (scenario_a, scenario_b)
VALUES
  ('<soterrani_id>', '<cuina_id>'),
  ('<soterrani_id>', '<despatx_id>');
```

<br/>

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

-- 3. Afegir comportament especial (opcional)
-- special_type: 'custom_name' (el trobador li posa nom), 'custom_message' (l'amagador escriu),
--               'choose_variant' (tria variant), 'troll_effect' (animació broma)
-- prompt_on: 'hide' (quan s'amaga) o 'find' (quan es troba)
INSERT INTO object_specials (object_id, special_type, prompt_on, prompt_text, variants)
VALUES ('<diamant_id>', 'troll_effect', 'find', '💎 Diamant trobat!',
  '{"emoji": "💎", "animation": "flash"}');
-- Animacions disponibles: shake, flash, bounce (definides a index.css)
```

<br/>

### 12.3 Afegir un nou ítem social

| Pas | Acció | Fitxer |
|:---:|:------|:-------|
| 1 | Migració SQL: `ALTER TYPE social_item_type ADD VALUE 'trap';` | Nova migració |
| 2 | Afegir a `SOCIAL_ITEMS` array | `supabase-helpers.ts` |
| 3 | Implementar lògica a `sendSocialItem()` | `supabase-helpers.ts` |
| 4 | Implementar recepció UI | `GamePage.tsx` |

<br/>

### 12.4 Modificar costos de tokens

Editar **una sola línia** a `supabase-helpers.ts`:

```typescript
export const TOKEN_COSTS = { move: 0.5, look: 0.3, confirm: 1.5 } as const;
```

<br/>

### 12.5 Modificar sistema Elo / Lligues

Editar la funció SQL `handle_game_finished()` via migració:

```sql
-- Exemple: canviar punts
elo = elo + 30          -- era +25
elo = GREATEST(elo - 15, 100)  -- era -20

-- Exemple: canviar llindars de lliga
WHEN elo >= 2000 THEN 'diamond'  -- era 1800
```

<br/>

### 12.6 Afegir nous mobles-premi

```sql
INSERT INTO reward_items (name, icon, rarity, sell_value) VALUES
  ('Cadira elegant', '🪑', 'rare', 3),
  ('Tron daurat', '👑', 'legendary', 8);
```


### 12.7 Afegir un nou material (ex: "menjar")

El sistema de materials controla la compatibilitat entre objectes i entorns. Per afegir un nou material:

**Pas 1 — Migració SQL**: Afegir el material a l'enum `object_material`:
```sql
ALTER TYPE object_material ADD VALUE 'menjar';
```

**Pas 2 — Definir compatibilitats**: Editar `getMaterialBlockReason()` a `supabase-helpers.ts`:
```typescript
menjar: {
  hot: "es fondria amb la calor 🔥",
  frozen: "es congelaria 🧊",
  dirty: "no és higiènic 🗑️",
  químic: "seria tòxic ☣️",
  outdoor: "s'ho menjarien els animals 🐾",
},
```

**Pas 3 — Crear objectes amb el material**:
```sql
INSERT INTO objects (name, icon, display_order, size, material)
VALUES ('Pastís', '🎂', 15, 2, 'menjar');
```

> 💡 **Regenerar types**: Després de la migració, el fitxer `types.ts` s'actualitza automàticament.

<br/>

### 12.8 Editar entorns i compatibilitats

Els **entorns** (`item_environment`) defineixen les propietats d'un moble. La matriu de compatibilitat està a `getMaterialBlockReason()` dins `supabase-helpers.ts`.

#### Afegir un nou entorn
```sql
ALTER TYPE item_environment ADD VALUE 'radioactiu';
UPDATE items SET environment = 'radioactiu' WHERE name = 'Reactor';
```

Després, editar `getMaterialBlockReason()` i afegir regles per al nou entorn:

```typescript
paper: { radioactiu: "es desintegraria ☢️" },
metal: { radioactiu: "✅" },  // "✅" = explícitament permès
```

#### Editar compatibilitat d'un entorn existent (ex: "ventós")
Busca `ventós` dins `rules` de `getMaterialBlockReason()`. Per canviar, afegeix/elimina entrades.

<br/>

### 12.9 Administració — Editar taules read-only

Les taules de contingut tenen RLS **read-only** per a clients. Per editar-les:

| Opció | Quan usar | Com |
|:------|:----------|:----|
| **Lovable** (recomanat) | Sempre que sigui possible | Demana a Lovable la migració SQL |
| **service_role key** | Accés directe a DB | `psql "$SUPABASE_DB_URL" -c "INSERT INTO ..."` |
| **Studio local** | Desenvolupament local | `npx supabase start` → `http://localhost:54323` |

> ⚠️ La **service_role key** ignora RLS. Mai usar-la en codi client.

<br/>

### 12.10 Com detectar i diagnosticar problemes

| Pas | Acció |
|:---:|:------|
| 1 | L'usuari reporta un bug (🐛 al Lobby) → es guarda a `error_logs` |
| 2 | `SELECT * FROM error_logs ORDER BY created_at DESC LIMIT 20;` |
| 3 | Filtrar: `WHERE component = 'GamePage' AND created_at > now() - interval '1 day'` |
| 4 | Comprovar la partida: `SELECT * FROM games WHERE code = '<CODI>';` |

#### Fitxers clau per àrea

| Àrea | Fitxer |
|:-----|:-------|
| Lògica de joc | `src/lib/supabase-helpers.ts` |
| UI del joc | `src/pages/GamePage.tsx` |
| Compatibilitat materials | `supabase-helpers.ts` → `getMaterialBlockReason()` |
| Cleanup | `supabase/functions/cleanup-old-games/index.ts` |

<br/>

---

<br/>

## 🐛 13. Debugging

<br/>

### 13.1 Eines disponibles

| Eina | Com accedir | Què mostra |
|:-----|:-----------|:-----------|
| `error_logs` (DB) | Consulta directa | Errors amb stack, component, URL |
| Console del navegador | DevTools → Console | Errors JS en temps real |
| Network tab | DevTools → Network | Peticions Supabase (REST + WS) |
| Edge Function logs | Dashboard | Logs de cleanup i errors |
| `ErrorBoundary` | Automàtic | Captura errors React → `error_logs` |

<br/>

### 13.2 Problemes comuns

| Símptoma | Causa probable | Solució |
|:---------|:--------------|:--------|
| "No tens prou tokens" | Tokens no reiniciats | Verificar `ensureTokensReset()` i comparació de dates |
| Partida bloquejada a "hiding" | Un jugador no ha amagat | Comprovar `game_players.has_hidden` |
| Repte no visible al rival | Query incorrecta | Verificar `invited_user_id` a la query de `getMyGames` |
| Rival no pot unir-se | Validació de `joinGame` | `invited_user_id !== userId` si és repte privat |
| Partida no a "Partides obertes" | `invited_user_id` no és NULL | Hauria de ser NULL per a partides públiques |
| Tokens bonus no s'apliquen | `bonus_tokens` no consumits | Verificar flux a `ensureTokensReset()` |
| Ítem social bloquejat | Escut actiu del rival | Comportament esperat |
| "Massa gran per dins" | `object.size > item.inner_capacity` | Validació correcta |

<br/>

### 13.3 Consultes SQL útils

```sql
-- 🔍 Estat d'una partida per codi
SELECT g.code, g.status, g.winner_id, g.invited_user_id,
       p.display_name AS created_by_name
FROM games g
JOIN profiles p ON p.user_id = g.created_by
WHERE g.code = 'ABC123';

-- 👥 Jugadors d'una partida
SELECT gp.has_hidden, gp.tokens_remaining, gp.current_scenario_id,
       p.display_name
FROM game_players gp
JOIN profiles p ON p.user_id = gp.user_id
WHERE gp.game_id = '<game_id>';

-- 🎯 Historial de moviments
SELECT gm.turn_number, gm.action, gm.token_cost,
       gm.found_object, gm.found_bonus,
       s.name AS scenario, i.name AS item,
       gm.target_position
FROM game_moves gm
LEFT JOIN scenarios s ON s.id = gm.target_scenario_id
LEFT JOIN items i ON i.id = gm.target_item_id
WHERE gm.game_id = '<game_id>'
ORDER BY gm.turn_number;

-- 🐛 Errors recents
SELECT created_at, error_message, component, url
FROM error_logs
ORDER BY created_at DESC
LIMIT 20;

-- 📊 Top jugadors per Elo
SELECT display_name, elo, league, games_won, best_streak
FROM profiles
ORDER BY elo DESC
LIMIT 10;
```

<br/>

---

<br/>

## 📈 14. Opcions d'escalabilitat

<br/>

### 📊 Nivell actual — Desenes d'usuaris

> ✅ Tot funciona correctament amb la configuració actual.

<br/>

### ✅ Centenars d'usuaris — JA IMPLEMENTAT

| Acció | Estat | Detalls |
|:------|:-----:|:--------|
| **Cron job** diari per cleanup | ✅ | `pg_cron` programa `cleanup-old-games` cada dia a les 3:00 UTC |
| Índex a `games(status, invited_user_id)` | ✅ | `idx_games_status_invited` |
| Índex a `game_players(user_id, game_id)` | ✅ | `idx_game_players_user_game` |
| Índex a `game_moves(game_id, player_id)` | ✅ | `idx_game_moves_game_player` |
| Índex a `game_social_items(game_id, to_player_id)` | ✅ | `idx_game_social_items_game_to` |
| Índex a `player_inventory(user_id, game_id)` | ✅ | `idx_player_inventory_user` |
| Índex a `profiles(user_id)` | ✅ | `idx_profiles_user_id` |
| **TanStack Query** amb `staleTime` + `refetchInterval` | ✅ | Cache intel·ligent al Lobby (15-60s staleTime) |

<br/>

### 🟣 Milers d'usuaris

| Acció | Benefici | Esforç |
|:------|:---------|:------:|
| **Instància Supabase major** | Més memòria i CPU | 🟡 Mig |
| Moure `performMove()` a **Edge Function** | Menys round-trips | 🟡 Mig |
| Particionament `game_moves` per dates | Consultes ràpides | 🟡 Mig |
| CDN per la SPA (Cloudflare/Vercel) | Latència global mínima | 🟢 Baix |

<br/>

### 🟠 Desenes de milers

| Acció | Benefici | Esforç |
|:------|:---------|:------:|
| **Read replicas** (Supabase Pro) | Distribuir lectura | 🟡 Mig |
| Matchmaking com a **servei propi** | Desacoblar flux | 🔴 Alt |
| **Connection pooling** (PgBouncer) | Més connexions | 🟡 Mig |
| **Rate limiting** a Edge Functions | Protecció abús | 🟡 Mig |

<br/>

### 🔴 Centenars de milers

| Acció | Benefici | Esforç |
|:------|:---------|:------:|
| **Sharding** per regió | Latència geogràfica | 🔴 Alt |
| **WebSocket dedicat** (Socket.io/Ably) | Escalar Realtime | 🔴 Alt |
| **Microserveis** per domini | Escalat independent | 🔴 Alt |
| **Redis** per cache de partides actives | Menys pressió a DB | 🟡 Mig |

<br/>

---

<br/>

## 📎 Apèndix: Variables d'entorn

| Variable | Ús | On es defineix |
|:---------|:---|:---------------|
| `VITE_SUPABASE_URL` | URL del projecte Supabase | `.env` + `vite.config.ts` (fallback) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Clau pública (anon) | `.env` + `vite.config.ts` (fallback) |
| `VITE_SUPABASE_PROJECT_ID` | ID del projecte | `.env` + `vite.config.ts` (fallback) |
| `SUPABASE_URL` | URL (edge functions) | Secret automàtic |
| `SUPABASE_SERVICE_ROLE_KEY` | Clau admin (edge fn) | Secret automàtic |
| `SUPABASE_ANON_KEY` | Clau anon (edge fn) | Secret automàtic |

<br/>

---

<br/>

<div align="center">
<sub>📘 Última actualització: 2026-04-03 · Generat amb 💜 per <a href="https://lovable.dev">Lovable</a></sub>
</div>
