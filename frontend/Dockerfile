# ──────────────────────────────────────────────────────────────────────────────
#  MedStore Pro — Frontend image (multi-stage)
#
#  Stage 1 builds the Vite bundle. Stage 2 is a tiny nginx that serves the
#  static files AND proxies /api + /uploads to the api container via the
#  internal Docker network.
# ──────────────────────────────────────────────────────────────────────────────

# ─── Stage 1: build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Cache deps layer
COPY package*.json ./
RUN npm ci

COPY . .

# Vite reads VITE_* vars at build time. We don't need any here because the
# nginx in stage 2 proxies /api → api:5000, so the frontend just calls
# relative '/api/...' URLs.
RUN npm run build

# ─── Stage 2: serve ──────────────────────────────────────────────────────────
FROM nginx:alpine

# Drop the default vhost; ours below replaces it.
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.docker.conf /etc/nginx/conf.d/default.conf

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

# nginx already runs as a non-root worker after the master forks — leave
# the entrypoint as-is.
