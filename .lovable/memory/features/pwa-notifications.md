---
name: PWA + Push Notifications
description: PWA instal·lable + notificacions push completes (VAPID, SW, edge function)
type: feature
---

## Estat actual (v1.11.0)

### PWA Instal·lable ✅
- `public/manifest.json` — standalone, portrait, icones 192+512
- `src/components/InstallBanner.tsx` — banner intel·ligent Android/iOS/iPadOS
- Meta tags iOS a `index.html`
- CSS safe-area en standalone mode
- Tests a `InstallBanner.test.tsx`

### Push Notifications ✅
- **Service Worker**: `public/sw.js` — rep push, mostra notificació, gestiona clic
- **Client**: `src/lib/push-notifications.ts` — registra SW, subscriu, gestiona permisos
- **Edge function**: `supabase/functions/send-push/index.ts` — envia via web-push + VAPID
- **Taula**: `push_subscriptions` (user_id, endpoint, p256dh, auth_key, platform) amb RLS
- **Auto-subscribe**: `useAuth.tsx` registra SW i subscriu 3s després del login
- **Neteja automàtica**: endpoint expirats (404/410) eliminats automàticament

### Triggers de notificació
- 🎯 **Repte rebut** — quan et repten a una partida (`createGame` amb invitedUserId)
- 🎮 **Partida iniciada** — quan algú s'uneix a la teva partida (`joinGame`)
- 📦 **Ítem social rebut** — banana, bomba fum, pista falsa, missatge, swap, robatori (`sendSocialItem`)

### Claus VAPID
- Pública: hardcoded al client (`BGyv-wk...`)
- Privada: secret `VAPID_PRIVATE_KEY`
- Subject: `mailto:maricel11alsina@gmail.com`

### Notes iOS
- iOS 16.4+ suporta push NOMÉS amb PWA instal·lada (standalone)
- Cal que l'usuari accepti el permís de notificació
- El banner guia l'usuari a instal·lar primer
