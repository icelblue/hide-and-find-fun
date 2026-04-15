---
name: PWA Install Banner
description: PWA instal·lable amb banner intel·ligent Android/iOS, sense service worker
type: feature
---

## Estat actual (v1.10.0)

### Implementat ✅
- `public/manifest.json` — standalone, portrait, icones 192+512
- `src/components/InstallBanner.tsx` — banner intel·ligent
- Meta tags iOS a `index.html`
- Tests a `InstallBanner.test.tsx`

### Com funciona
- **Android**: intercepta `beforeinstallprompt` → botó "Instal·lar" → 1 clic
- **iOS**: guia visual 3 passos (Compartir → Afegir a pantalla d'inici)
- **Desktop**: no mostra banner
- **Ja instal·lada**: no mostra (detecta `display-mode: standalone`)
- **Iframe/preview**: no mostra (detecta `window.self !== window.top`)
- **Descartat**: no torna en 7 dies (`localStorage`)

### Pendent (fase futura)
- Notificacions push amb VAPID keys
- Taula `push_subscriptions` (user_id, endpoint, keys, platform)
- Edge function `send-push` per disparar alertes
- Triggers: inici partida, ítems socials, invitacions
- iOS requereix PWA instal·lada per notificacions (Safari 16.4+)
