<div align="center">

<br/>

# 🔍 DEDUCTION DUEL

### _Amaga. Dedueix. Guanya._

**El joc PvP de deducció estratègica on cada decisió compta.**

<br/>

[![Play Now](https://img.shields.io/badge/▶%20JUGAR%20ARA-deductionduel.lovable.app-blueviolet?style=for-the-badge&logo=googlechrome&logoColor=white)](https://deductionduel.lovable.app)

<br/>

<img src="https://img.shields.io/badge/1v1-PvP%20Asíncron-FF6B6B?style=flat-square" />
<img src="https://img.shields.io/badge/Mobile--First-Responsive-06B6D4?style=flat-square" />
<img src="https://img.shields.io/badge/Realtime-WebSocket-3FCF8E?style=flat-square" />
<img src="https://img.shields.io/badge/Ranked-Elo%20%2B%20Lligues-FFD700?style=flat-square" />

<br/><br/>

<img src="https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=white&style=flat-square" />
<img src="https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white&style=flat-square" />
<img src="https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white&style=flat-square" />
<img src="https://img.shields.io/badge/Tailwind-3.4-06B6D4?logo=tailwindcss&logoColor=white&style=flat-square" />
<img src="https://img.shields.io/badge/Supabase-Realtime-3FCF8E?logo=supabase&logoColor=white&style=flat-square" />

</div>

<br/>

---

<br/>

## 🎮 Què és Deduction Duel?

Imagina un **Cluedo minimalista, asíncron i competitiu**. Dos jugadors amaguen un objecte dins una casa interconnectada i han de trobar el de l'altre mitjançant deducció lògica — però amb un pressupost limitat de **5 tokens diaris** que obliga a cada moviment a ser calculat.

No és un joc de sort. **És un puzle mental contra un rival humà.**

<br/>

> 🧠 _"Tinc 2.5 tokens. El rival ha estat 3 torns a la Cuina. Gasto 0.3 per observar sota la nevera... fred! No és aquí. Però trobo un token extra! Demà investigo el Menjador."_

<br/>

### ✨ Per què és addictiu?

| | |
|:---|:---|
| 🏠 **7 habitacions connectades** | Circuit de portes bidireccionals — planifica la teva ruta |
| 🪙 **Economia de tokens** | 5/dia, costos de 0.2 a 0.5 — cada acció compta |
| 🧹 **Mobles interactius** | Netejar, trencar, arreglar — amb eines il·limitades |
| 💡 **Sistema de llum** | Apaga la llum per cegar el rival, usa la llanterna a l'exterior |
| ⚡ **Ítems socials** | Plàtan, bomba de fum, escuts, espia, intercanvi, missatges |
| 🏆 **Sistema ranked** | Elo + 5 lligues visuals (Bronze → Diamond) |
| 🎁 **Loot de mobles** | Guanya mobiliari rar que amplia el joc per a tothom |
| 🐾 **Mode Història** | Tutorial single-player amb mascota virtual i capítols progressius |
| 💬 **Murs efímers** | Deixa missatges al perfil del rival — desapareixen en 22h |
| 📱 **Juga des de qualsevol lloc** | Mobile-first, compatible amb tots els navegadors |

<br/>

---

<br/>

## 📖 Com es juga

<br/>

### Fase 1 — Amagar 🫣

Cada jugador tria **simultàniament i en secret**:

```
📍 Habitació  →  🎯 Objecte  →  🪑 Moble  →  📌 Posició (sobre / sota / dins)
```

Opcionalment, pot escriure un **missatge** (≤100 chars) que el rival veurà si guanya. Quan els dos han amagat, la partida comença automàticament i cada jugador apareix en una habitació aleatòria (mai on ha amagat el seu objecte).

<br/>

### Fase 2 — Deduir 🔍

Navega per les habitacions interconnectades buscant l'objecte del rival:

| Acció | Cost | Què fa |
|:------|:----:|:-------|
| 🚶 **Moure's** | `0.5` 🪙 | Vés a una habitació adjacent per les portes del circuit |
| 👀 **Observar** | `0.3` 🪙 | Inspecciona una posició d'un moble — pistes progressives |

> 💡 **Observar** dóna pistes progressives:
> - ❄️ **Fred** — escenari equivocat
> - 🌡️ **Calent** — escenari correcte, moble equivocat
> - 🔥 **Molt calent** — moble correcte, posició equivocada
> - ✅ **Trobat!** — moble + posició correctes = **Victòria!**

<br/>

### Accions addicionals

| Acció | Cost | Requereix |
|:------|:----:|:----------|
| 🧹 **Netejar** moble brut | `0.2` 🪙 | 🧹 Drap |
| 💥 **Trencar** moble trencable | `0.3` 🪙 | 🔨 Martell |
| 🔧 **Arreglar** moble trencat | `0.2` 🪙 | 🔧 Tornavís |
| 💡 **Apagar/Encendre llum** | `0.2` 🪙 | Interior |
| 🔦 **Llanterna** | `0.2` 🪙 | 🔦 Llanterna (exterior) |

> Les eines són **il·limitades** — un cop les tens, les pots usar sense límit dins la partida.

<br/>

### Fase 3 — Victòria 🏆

El primer jugador que **observa** la posició exacta de l'objecte rival guanya i rep:

- **+25 Elo** (el perdedor rep −20, mínim 100)
- **Un moble aleatori** amb raresa ponderada (del 50% comú al 2% llegendari)
- Actualització de **ratxa**, **lliga** i **estadístiques**

<br/>

---

<br/>

## 🛠️ Eines i mobles interactius

### Eines (il·limitades dins la partida)

| Eina | Com obtenir-la |
|:-----|:---------------|
| 🔧 **Tornavís** | Tothom comença amb 1 |
| 🧹 **Drap** | Auto-obtingut en entrar a escenari amb mobles bruts |
| 🔨 **Martell** | 5% trobable en observar |
| 🔦 **Llanterna** | 5% trobable en observar |

### Sistema de llum

- **Interiors** (Cuina, Habitació, Menjador, Lavabo, Despatx): llum encès per defecte
- Qualsevol jugador pot **apagar** o **encendre** el llum (0.2🪙) — afecta **ambdós**
- **Exteriors** (Jardí, Balcó): llanterna necessària per revelar mobles ocults

### Mobles bruts aleatoris

- ~60% dels mobles elegibles estan bruts cada partida (determinístic per gameId)
- Mateixa partida = mateixos mobles bruts; partida diferent = combinació diferent

<br/>

---

<br/>

## ⚡ Ítems socials — La sal del joc

Cada jugador pot usar **1 ítem per dia**. Afegeixen caos estratègic:

| Ítem | Efecte | Contrarestable? |
|:-----|:-------|:---------------:|
| 🍌 **Plàtan** | Bloqueja 1 posició del rival | 🛡️ Sí |
| 💣 **Bomba de fum** | Mou el **teu** objecte a una posició diferent (1x/partida) | — |
| 🛡️ **Escut** | Bloqueja el pròxim plàtan o intercanvi | — |
| 🔄 **Intercanvi** | Intercanvia la teva ubicació amb la del rival | 🛡️ Sí |
| 🕵️ **Espia** | Descobreix en quina habitació és el rival | — |
| 💬 **Missatge** | Envia text curt al rival (bluff, provocació) | — |

> L'escut es consumeix en bloquejar. **Timing és tot**: activar-lo massa aviat és malgastar-lo.

<br/>

---

<br/>

## 📈 Sistema competitiu

<br/>

### Lligues i Elo

| Lliga | Elo | Icona | Sensació |
|:------|:---:|:-----:|:---------|
| **Bronze** | 0+ | 🥉 | Estàs aprenent el mapa |
| **Silver** | 1200+ | 🥈 | Saps deduir per eliminació |
| **Gold** | 1400+ | 🥇 | Domines el tempo de tokens |
| **Platinum** | 1600+ | 💎 | Llegeixes els patrons del rival |
| **Diamond** | 1800+ | 👑 | Mestre de la deducció |

<br/>

### Perfil del jugador

Cada jugador té un **perfil públic** amb:

- 📊 Partides, victòries, win rate, millor ratxa
- ⚔️ **Rival favorit** — amb qui has jugat més
- 🎒 **Inventari** — mobles obtinguts per col·locar o vendre
- 💬 **Mur** — missatges efímers d'altres jugadors (TTL 22h)

<br/>

---

<br/>

## 🎁 Recompenses i economia

<br/>

### Loot de mobles

Cada victòria atorga un moble aleatori:

| Raresa | Drop rate | Venda | Indicador |
|:-------|:---------:|:-----:|:---------:|
| ⚪ Comú | 50% | 1 🪙 | Borde gris |
| 🟢 Poc comú | 30% | 2 🪙 | Borde verd |
| 🔵 Rar | 13% | 3 🪙 | Borde blau |
| 🟣 Èpic | 5% | 5 🪙 | Borde violeta |
| 🟡 Llegendari | 2% | 8 🪙 | Borde daurat |

### Què fer amb els mobles?

- **📍 Col·locar** en un escenari → Afegeix un nou moble al joc per a **tots els jugadors**
- **🪙 Vendre** → Obté tokens bonus que pots afegir manualment a qualsevol partida

### Bonus tokens

- Els tokens bonus **NO s'afegeixen automàticament**. Els jugadors trien quants afegir i a quina partida.
- Picker amb controls ±0.1 i botons ràpids (0.1, 0.5, 1, Tot).

> Els mobles col·locats fan el joc **progressivament més complex** — més amagatalls, més deducció necessària.

<br/>

---

<br/>

## 🏗️ Arquitectura tècnica

<br/>

### Stack

| Capa | Tecnologia | Rol |
|:-----|:-----------|:----|
| **UI** | React 18 + TypeScript 5.8 | SPA amb hooks, context i components funcionals |
| **Build** | Vite 5 | HMR sub-segon, tree-shaking, code-splitting |
| **Estils** | Tailwind CSS 3.4 + shadcn/ui | Design system semàntic amb glassmorphism |
| **Backend** | Supabase (Lovable Cloud) | Auth, PostgreSQL, Realtime, RPC, RLS |
| **Realtime** | Postgres Changes (WebSocket) | Subscripcions filtrades per `game_id` |
| **Routing** | React Router v6 | Rutes protegides amb `AuthProvider` |
| **State** | TanStack Query + `useState` | Cache del servidor + estat UI local |

<br/>

### Disseny visual

| Aspecte | Detall |
|:--------|:-------|
| **Tema** | Dark-first amb glassmorphism (`backdrop-blur-xl`) |
| **Paleta** | Violeta neon `#8B5CF6` · Verd-blau `#2DD4BF` · Taronja `#F59E0B` |
| **Tipografia** | Orbitron (títol neon) · Space Grotesk (headings) · Inter (cos) |
| **Target** | Mobile-first 390px · max-width 448px · responsive fins a 1920px |

<br/>

### 📱 Cross-platform

| Plataforma | Status |
|:-----------|:------:|
| iOS Safari | ✅ `safe-area-inset`, `-webkit-tap-highlight` |
| Android Chrome / Samsung | ✅ |
| Firefox, Edge, Chrome | ✅ |
| Font-size inputs 16px | ✅ Evita zoom iOS |

<br/>

---

<br/>

## 📁 Estructura del projecte

```
src/
├── pages/
│   ├── AuthPage.tsx              ← Login / registre amb email
│   ├── LobbyPage.tsx             ← Matchmaking: aleatori, codi, reptes, cerca
│   ├── GamePage.tsx              ← Motor de joc complet (~1550 línies)
│   ├── ProfilePage.tsx           ← Perfil: stats, Elo, inventari, mur
│   ├── PlayerProfilePage.tsx     ← Perfil públic amb mur interactiu
│   └── NotFound.tsx              ← 404 en català
│
├── components/
│   ├── ErrorBoundary.tsx         ← Error boundary + log a DB
│   ├── HelpButton.tsx            ← Panel flotant amb regles
│   └── ui/                       ← 40+ components shadcn/ui
│
├── hooks/
│   └── useAuth.tsx               ← AuthProvider amb Context API
│
├── lib/
│   ├── supabase-helpers.ts       ← ⭐ Lògica core del joc (~1250 línies)
│   ├── reward-helpers.ts         ← Recompenses via RPC (~93 línies)
│   └── constants.ts              ← APP_VERSION i constants globals
│
└── integrations/supabase/        ← Client + tipus auto-generats

supabase/
├── functions/
│   ├── cleanup-old-games/        ← Edge fn: neteja partides >7d
│   └── backup-database/          ← Edge fn: backup automàtic
└── migrations/                   ← 37 migracions SQL
```

<br/>

---

<br/>

## 📘 Documentació tècnica completa

Per a una guia detallada d'arquitectura, base de dades, debugging, instal·lació local (compartida i aïllada), modificació i escalabilitat:

### **→ [docs/TECHNICAL.md](docs/TECHNICAL.md)**

Inclou:
- 📊 Diagrama ER complet amb 16 taules
- 🔒 Matriu RLS de 17 taules
- 🎮 Mecàniques detallades (amagar, buscar, eines, llum, ítems socials)
- 💻 Guia d'instal·lació local pas a pas (amb entorn aïllat)
- 🐳 Desplegament Docker (Dockerfile + docker-compose)
- 🛠️ Com afegir escenaris, objectes, ítems socials
- 🐛 Consultes SQL de debug
- 📈 Roadmap d'escalabilitat (desenes → centenars de milers)

<br/>

## 🐳 Desplegament Docker

```bash
# 1. Copia i configura variables d'entorn
cp .env.example .env
# Edita .env amb les teves credencials Supabase

# 2. Construeix i arranca
docker compose up --build -d

# 3. Obre http://localhost:8080
```

**Requisits**: Docker + Docker Compose + projecte Supabase amb esquema aplicat.
Veure [docs/TECHNICAL.md](docs/TECHNICAL.md) per instruccions completes.

<br/>

---

<br/>

## 🚀 Juga ara

El joc està live i desplegat sobre **Lovable Cloud** (autenticació, base de dades, realtime i funcions serverless integrades).

<div align="center">

<br/>

[![Jugar](https://img.shields.io/badge/🔍%20JUGAR%20ARA-deductionduel.lovable.app-blueviolet?style=for-the-badge)](https://deductionduel.lovable.app)

<br/>

**Crea un compte en 10 segons → Busca rival → Amaga i dedueix.**

<br/>

</div>

---

<div align="center">
<br/>
<sub>Fet amb 💜 a Catalunya · Powered by <a href="https://lovable.dev">Lovable</a></sub>
<br/><br/>
</div>