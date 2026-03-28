<p align="center">
  <img src="https://img.shields.io/badge/Status-Live-brightgreen?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Platform-Mobile--first%20PWA-blueviolet?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Players-1v1-orange?style=for-the-badge" />
</p>

<h1 align="center">🔍 DEDUCTION DUEL</h1>

<p align="center">
  <strong>Joc PvP de deducció estratègica en temps real</strong><br/>
  <em>Amaga un objecte. Dedueix on l'ha amagat el rival. Guanya la partida.</em>
</p>

<p align="center">
  <a href="https://hide-and-find-fun.lovable.app"><strong>▶️ Jugar ara</strong></a>&nbsp;&nbsp;·&nbsp;&nbsp;
  <a href="#-com-funciona">📖 Com funciona</a>&nbsp;&nbsp;·&nbsp;&nbsp;
  <a href="#-stack-tècnic">🏗️ Stack tècnic</a>&nbsp;&nbsp;·&nbsp;&nbsp;
  <a href="#-base-de-dades">🗃️ Base de dades</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?logo=tailwindcss&logoColor=white" />
  <img src="https://img.shields.io/badge/Supabase-Realtime-3FCF8E?logo=supabase&logoColor=white" />
</p>

---

## 🎯 Visió general

**Deduction Duel** és un joc 1v1 asíncron on dos jugadors amaguen un objecte dins una casa interconnectada i han de trobar el de l'altre mitjançant deducció lògica. Les partides es desenvolupen al llarg de diversos dies amb un sistema de **tokens diaris** que limita les accions i obliga a pensar estratègicament.

### ✨ Característiques principals

| Funcionalitat | Descripció |
|:---|:---|
| 🏠 **Casa amb 7 habitacions** | Circuit interconnectat amb escenaris, mobles i posicions |
| ⚔️ **PvP en temps real** | Matchmaking aleatori, reptes directes o codi de partida |
| 🪙 **Economia de tokens** | 5 tokens/dia amb costos variables per acció |
| 🎁 **Sistema de recompenses** | Mobles amb 5 nivells de raresa (Comú → Llegendari) |
| 📈 **Elo + Lligues** | Sistema competitiu de Bronze a Diamond |
| ⚡ **Ítems socials** | Plàtan, bomba de fum, pistes falses, escuts i missatges |
| 💬 **Murs de perfil** | Missatges efímers de 22h entre jugadors |
| 🔔 **Realtime** | Transicions de fase instantànies sense recarregar |
| 📱 **Mobile-first** | Disseny optimitzat per a 390px amb glassmorphism |

---

## 📖 Com funciona

### Fase 1 — Amagar 🫣

Cada jugador selecciona, de manera **simultània i secreta**:

```
📍 Escenari  →  🎯 Objecte  →  🪑 Moble  →  📌 Posició (sobre / sota / dins)
```

Cap jugador sap què ha triat l'altre. Quan tots dos han amagat, la partida comença automàticament.

### Fase 2 — Buscar 🔍

El jugador navega per les habitacions interconnectades buscant l'objecte del rival:

| Acció | Cost | Efecte |
|:------|:----:|:-------|
| 🚶 **Moure's** | 0.5 🪙 | Ves a una habitació adjacent (connexions bidireccionals) |
| 👀 **Observar** | 0.3 🪙 | Inspecciona una posició — pot revelar bonus ocults |
| 🔍 **Confirmar** | 1.5 🪙 | Aposta que l'objecte és aquí — si encertes, **guanyes** |

> **5 tokens/dia** · Es reinicien automàticament a mitjanit · Bonus tokens per mobles venuts

### Victòria 🏆

El primer jugador que executa un **Confirmar** correcte guanya la partida i rep:
- **+25 Elo** (el perdedor rep -20, mínim 100)
- **Un moble aleatori** amb raresa ponderada
- Actualització de **ratxa** i **estadístiques**

---

## ⚡ Ítems socials

Cada jugador pot usar **1 ítem social per dia** per afectar el rival:

| Ítem | Efecte | Bloqueig |
|:-----|:-------|:---------|
| 🍌 **Plàtan** | Borra la pantalla del rival durant 3 segons | 🛡️ Sí |
| 💣 **Bomba de fum** | Mou el teu objecte a una posició diferent | 🛡️ Sí |
| 🔮 **Pista falsa** | Mostra un indicador enganyós al rival | 🛡️ Sí |
| 🛡️ **Escut** | Bloqueja el pròxim ítem social del rival | — |
| 💬 **Missatge** | Envia un text curt al rival | 🛡️ Sí |

L'escut es consumeix en bloquejar un atac. Un ítem bloquejat no té efecte.

---

## 📈 Sistema competitiu

### Lligues

| Lliga | Elo mínim | Icona |
|:------|:---------:|:-----:|
| Bronze | 0 | 🥉 |
| Silver | 1200 | 🥈 |
| Gold | 1400 | 🥇 |
| Platinum | 1600 | 💎 |
| Diamond | 1800 | 👑 |

### Perfil del jugador

- **Estadístiques**: Partides, victòries, win rate, millor ratxa
- **Rival favorit**: El jugador amb qui has jugat més partides
- **Inventari**: Mobles obtinguts per victòries (col·locar o vendre)
- **Mur**: Missatges efímers d'altres jugadors (22h TTL)

---

## 🎁 Recompenses

Cada victòria atorga un moble aleatori amb probabilitat ponderada:

| Raresa | Probabilitat | Valor de venda | Indicador |
|:-------|:------------:|:--------------:|:---------:|
| Comú | 50% | 1 🪙 | ⚪ |
| Poc comú | 30% | 2 🪙 | 🟢 |
| Rar | 13% | 3 🪙 | 🔵 |
| Èpic | 5% | 5 🪙 | 🟣 |
| Llegendari | 2% | 8 🪙 | 🟡 |

**Opcions amb mobles:**
- 📍 **Col·locar** en un escenari → Afegeix un nou moble al joc per a tothom
- 🪙 **Vendre** → Obté tokens bonus que s'afegeixen al reset diari

---

## 🏗️ Stack tècnic

| Capa | Tecnologia | Propòsit |
|:-----|:-----------|:---------|
| **Frontend** | React 18 + TypeScript 5 | SPA amb components funcionals i hooks |
| **Bundler** | Vite 5 | HMR ràpid i build optimitzat |
| **Estils** | Tailwind CSS 3.4 | Design system semàntic amb tokens CSS |
| **Components** | shadcn/ui | Base amb glassmorphism i gradients custom |
| **Backend** | Supabase (Lovable Cloud) | Auth, DB, Realtime, RPC functions |
| **Realtime** | Supabase Postgres Changes | Subscripcions per taula amb filtres |
| **Fonts** | Orbitron · Space Grotesk · Inter | Neon headers · Headings · Body text |
| **Routing** | React Router v6 | Rutes protegides amb AuthProvider |
| **State** | TanStack Query + useState | Server state + UI state local |

### Disseny visual

- **Tema fosc** per defecte amb mode clar opcional
- **Glassmorphism**: `backdrop-blur-xl` + bordes semitransparents
- **Gradients** neon: primari (violeta), secundari (verd-blau), accent (taronja)
- **Tipografia**: Orbitron per al títol neon, Space Grotesk per a headings, Inter per al cos
- **Mobile-first**: Viewport de referència 390px amb max-width 448px

---

## 🗃️ Base de dades

### Diagrama relacional

```
┌─────────────┐     ┌────────────────────┐     ┌───────────┐
│  scenarios   │◄───►│ scenario_connections │     │  objects   │
│  (7 rooms)   │     │   (bidirectional)    │     │ (hideable) │
└──────┬───────┘     └────────────────────┘     └───────────┘
       │
       ▼
┌──────────────┐     ┌──────────────────┐
│    items      │◄───│ scenario_bonuses   │
│ (furniture)   │    │ (hidden bonuses)   │
└──────────────┘    └──────────────────┘

┌──────────┐     ┌──────────────┐     ┌────────────┐
│  games    │◄───│ game_players   │     │ game_moves  │
│ (matches) │    │ (2 per game)   │     │ (history)   │
└────┬─────┘    └──────────────┘     └────────────┘
     │
     ├──► game_social_items (banana, shield, etc.)
     │
     └──► player_rewards ──► reward_items (furniture prizes)

┌───────────┐     ┌────────────────┐
│ profiles   │     │ wall_messages   │
│ (stats/elo)│     │ (ephemeral 22h) │
└───────────┘     └────────────────┘

player_inventory (collected bonuses, gifts)
```

### Seguretat

- **Row Level Security (RLS)** habilitada a totes les taules
- **Funcions SECURITY DEFINER**:
  - `is_player_in_game()` — Valida accés a dades de partida
  - `handle_game_finished()` — Trigger per actualitzar Elo, lligues i recompenses
  - `sell_reward_item()` / `place_reward_item()` — Operacions atòmiques d'inventari
  - `handle_new_user()` — Creació automàtica de perfil al registre
- **Realtime** amb filtres per `game_id` a taules `games`, `game_players`, `game_social_items`

---

## 📁 Estructura del projecte

```
src/
├── pages/
│   ├── AuthPage.tsx            # Login i registre amb email
│   ├── LobbyPage.tsx           # Matchmaking, reptes, cerca de jugadors
│   ├── GamePage.tsx             # Motor de joc: amagar → jugar → resultat
│   ├── ProfilePage.tsx          # Perfil propi: stats, inventari, mur, rival favorit
│   ├── PlayerProfilePage.tsx    # Perfil públic amb mur interactiu
│   └── NotFound.tsx             # Pàgina 404
├── components/
│   ├── HelpButton.tsx           # Panell d'ajuda flotant amb regles completes
│   ├── NavLink.tsx              # Component de navegació
│   └── ui/                      # shadcn/ui (40+ components)
├── hooks/
│   └── useAuth.tsx              # Context d'autenticació amb AuthProvider
├── lib/
│   ├── supabase-helpers.ts      # Lògica de joc, matchmaking, tokens, social items
│   └── reward-helpers.ts        # Recompenses: obtenció, venda, col·locació
└── integrations/
    └── supabase/                # Client auto-configurat + tipus generats
```

---

## 🚀 Desplegament

El projecte es construeix i desplega automàticament amb **Lovable**. El backend (autenticació, base de dades, funcions i realtime) corre sobre **Lovable Cloud**.

```
🌐 URL pública:  https://hide-and-find-fun.lovable.app
```

---

<p align="center">
  <sub>Fet amb 💜 a Catalunya · Powered by <a href="https://lovable.dev">Lovable</a></sub>
</p>
