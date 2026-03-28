# 🔍 DEDUCTION DUEL

<div align="center">

**Joc PvP de deducció en temps real — Amaga, busca i guanya!**

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Tailwind](https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Supabase](https://img.shields.io/badge/Supabase-Realtime-3FCF8E?logo=supabase&logoColor=white)](https://supabase.com)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)

[🎮 Jugar ara](https://hide-and-find-fun.lovable.app) · [📖 Com jugar](#-com-jugar) · [🏗️ Arquitectura](#%EF%B8%8F-arquitectura)

</div>

---

## 🎯 Què és?

**Deduction Duel** és un joc 1v1 on dos jugadors amaguen un objecte en una casa i han de trobar el de l'altre. Combina estratègia, deducció i una mica de sort en partides asíncrones que poden durar fins a 7 dies.

```
🏠 EL CIRCUIT DE LA CASA (7 habitacions)

   🍳 Cuina ←→ 🍽️ Menjador ←→ 🌿 Jardí ←→ 🌅 Balcó
      ↕                                          ↕
   🚿 Lavabo ←→ 💼 Despatx ←→ 🛏️ Habitació ←──┘
```

---

## 📖 Com jugar

### Fase 1 — Amagar 🫣

| Pas | Acció | Descripció |
|-----|-------|------------|
| 1 | 📍 Escenari | Tria una de les 7 habitacions |
| 2 | 🎯 Objecte | Escull l'objecte a amagar |
| 3 | 🪑 Moble | Selecciona el moble del escenari |
| 4 | 📌 Posició | Sobre ⬆️ · Sota ⬇️ · Dins 📦 |

> Tots dos jugadors amaguen **simultàniament** — no saps on amaga el rival!

### Fase 2 — Buscar 🔍

| Acció | Cost | Descripció |
|-------|------|------------|
| 🚶 Moure's | 0.5 🪙 | Ves a una habitació adjacent |
| 👀 Observar | 0.3 🪙 | Mira una posició — pot revelar bonus! |
| 🔍 Confirmar | 1.5 🪙 | Aposta que l'objecte és aquí! |

- **5 tokens/dia** que es reinicien automàticament
- **7 dies** de límit per partida
- El primer que **confirma** correctament → **GUANYA** 🏆

---

## ⚡ Ítems Socials (1/dia)

| Ítem | Efecte |
|------|--------|
| 🍌 Plàtan | Pantalla borrosa del rival 3s |
| 💣 Bomba de fum | Mou el teu objecte a altra posició |
| 🔮 Pista falsa | Indicador fals al rival |
| 🛡️ Escut | Bloqueja el pròxim ítem social |
| 💬 Missatge | Envia text al rival |

---

## 📈 Sistema de Ranking

### Elo + Lligues

| Lliga | Elo | Icona |
|-------|-----|-------|
| Bronze | < 1200 | 🥉 |
| Silver | 1200+ | 🥈 |
| Gold | 1400+ | 🥇 |
| Platinum | 1600+ | 💎 |
| Diamond | 1800+ | 👑 |

- **Victòria**: +25 Elo
- **Derrota**: -20 Elo (mínim 100)

### Rival Favorit ⚔️

El perfil mostra amb quin jugador has fet més partides — el teu etern rival!

---

## 🎁 Sistema de Recompenses

Cada victòria atorga un **moble aleatori** amb rareses ponderades:

| Raresa | Prob. | Valor | Color |
|--------|-------|-------|-------|
| ⚪ Comú | 50% | 1 🪙 | — |
| 🟢 Poc comú | 30% | 2 🪙 | Verd |
| 🔵 Rar | 13% | 3 🪙 | Blau |
| 🟣 Èpic | 5% | 5 🪙 | Porpra |
| 🟡 Llegendari | 2% | 8 🪙 | Daurat |

Amb els mobles pots:
- **📍 Col·locar-los** en escenaris → amplien el joc amb nous amagatalls
- **🪙 Vendre'ls** → tokens bonus al pròxim reset diari

---

## 💬 Mur de Perfil

Cada jugador té un mur on altres poden deixar missatges curts. Els missatges **desapareixen en 22h** — efímers com les partides!

---

## 🏗️ Arquitectura

### Stack

| Capa | Tecnologia |
|------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Estils | Tailwind CSS + Design system semàntic |
| UI | shadcn/ui + glassmorphism custom |
| Backend | Supabase (Lovable Cloud) |
| Realtime | Supabase Realtime (postgres_changes) |
| Auth | Supabase Auth (email + password) |
| Fonts | Orbitron (títols neon) · Space Grotesk (headings) · Inter (body) |

### Estructura

```
src/
├── pages/
│   ├── AuthPage.tsx        # Login / Registre
│   ├── LobbyPage.tsx       # Crear, buscar, unir-se a partides
│   ├── GamePage.tsx         # Fases: amagar → jugar → resultat
│   ├── ProfilePage.tsx      # Stats, inventari, mur, rival favorit
│   └── PlayerProfilePage.tsx # Perfil públic + mur d'altres jugadors
├── components/
│   ├── HelpButton.tsx       # Panell d'ajuda amb regles completes
│   └── ui/                  # shadcn/ui components
├── hooks/
│   └── useAuth.tsx          # Context d'autenticació
├── lib/
│   ├── supabase-helpers.ts  # Lògica de joc, matchmaking, social
│   └── reward-helpers.ts    # Recompenses, venda, col·locació
└── integrations/
    └── supabase/            # Client + tipus auto-generats
```

### Base de dades

```
scenarios ←→ scenario_connections    # Graf d'habitacions
    ↓
  items ← scenario_bonuses          # Mobles + bonus ocults
    
games ← game_players                # Partides + jugadors
    ↓
game_moves                           # Historial de moviments
game_social_items                    # Ítems socials enviats

profiles                             # Stats, elo, lliga
player_rewards ← reward_items        # Inventari de mobles
wall_messages                        # Mur efímer 22h
objects                              # Objectes amagables
```

### Seguretat

- **RLS (Row Level Security)** a totes les taules
- Funcions `SECURITY DEFINER` per operacions crítiques
- `is_player_in_game()` per validar accés a dades de partida
- Trigger `handle_game_finished()` per Elo, recompenses i estadístiques

---

## 🚀 Desenvolupament

```bash
# El projecte es construeix i desplega automàticament amb Lovable
# URL pública: https://hide-and-find-fun.lovable.app
```

---

<div align="center">

Fet amb 💜 a Catalunya · Powered by [Lovable](https://lovable.dev)

</div>
