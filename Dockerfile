# ============================================================
# Dockerfile — Deduction Duel
# ============================================================
# Multi-stage build per a una imatge lleugera de producció.
#
# VARIABLES D'ENTORN REQUERIDES (build-time):
#   VITE_SUPABASE_URL           — URL del teu projecte Supabase
#   VITE_SUPABASE_PUBLISHABLE_KEY — Clau anon/pública de Supabase
#
# EXEMPLE:
#   docker build \
#     --build-arg VITE_SUPABASE_URL=https://xxx.supabase.co \
#     --build-arg VITE_SUPABASE_PUBLISHABLE_KEY=eyJ... \
#     -t deduction-duel .
#
#   docker run -p 8080:80 deduction-duel
#
# L'app es serveix via nginx a l'arrel (/). Totes les rutes
# redirigeixen a index.html (SPA fallback).
# ============================================================

# --- Stage 1: Build -------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar dependències primer per aprofitar la cache de Docker
COPY package.json bun.lock* package-lock.json* ./

# Instal·lar dependències (npm o bun)
RUN npm ci --ignore-scripts 2>/dev/null || npm install

# Copiar la resta del codi
COPY . .

# Variables d'entorn per al build de Vite (s'injecten al JS estàtic)
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_SUPABASE_PROJECT_ID

ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_SUPABASE_PROJECT_ID=$VITE_SUPABASE_PROJECT_ID

# Build de producció
RUN npm run build

# --- Stage 2: Serve -------------------------------------------
FROM nginx:alpine AS production

# Copiar configuració nginx personalitzada (SPA fallback)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar els fitxers estàtics generats per Vite
COPY --from=builder /app/dist /usr/share/nginx/html

# Port per defecte
EXPOSE 80

# Healthcheck bàsic
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -qO- http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
