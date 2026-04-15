---
name: PWA Install Banner
description: PWA instal·lable amb banner intel·ligent Android/iOS, sense service worker
type: feature
---

## Estat actual (v1.10.0)

### Implementat ✅
- `public/manifest.json` — standalone, portrait, icones 192+512 (separades `any` i `maskable`)
- `src/components/InstallBanner.tsx` — banner intel·ligent
- Meta tags iOS a `index.html` (apple-touch-icon, apple-mobile-web-app-capable, status-bar-style)
- Tests a `InstallBanner.test.tsx` (8 tests)
- CSS safe-area en standalone mode (notch, home indicator)

### Com funciona
- **Android (Chrome)**: intercepta `beforeinstallprompt` → botó "Instal·lar" → 1 clic
- **Android (Firefox/Samsung)**: guia visual manual per navegador específic
- **iOS (Safari)**: guia visual 3 passos (Compartir → Afegir a pantalla d'inici)
- **iPadOS 13+**: detectat via `navigator.maxTouchPoints` (reporta com Mac)
- **Desktop**: no mostra banner
- **Ja instal·lada**: no mostra (detecta `display-mode: standalone` + `navigator.standalone`)
- **Iframe/preview**: no mostra (detecta `window.self !== window.top`)
- **Descartat**: no torna fins sessió nova (`sessionStorage`)

### Pendent (fase futura)
- Notificacions push amb VAPID keys
- Taula `push_subscriptions` (user_id, endpoint, keys, platform)
- Edge function `send-push` per disparar alertes
- Triggers: inici partida, ítems socials, invitacions
- iOS requereix PWA instal·lada per notificacions (Safari 16.4+)
