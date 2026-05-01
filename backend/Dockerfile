# ──────────────────────────────────────────────────────────────────────────────
#  MedStore Pro — Backend image
#
#  Build:    docker compose build api
#  Internal port: 5000  (not exposed publicly; only the web container talks to
#  it via the medstore-net Docker network).
# ──────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine

# dumb-init reaps zombies and forwards signals — important for clean shutdowns.
RUN apk add --no-cache dumb-init tini

WORKDIR /app

# Install deps first — this layer is cached as long as package.json doesn't
# change, so most rebuilds skip the npm install.
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy source
COPY . .

# Uploads dir is bind-mounted from the host (see docker-compose.yml) so user
# files survive container rebuilds.
RUN mkdir -p uploads/avatars && chown -R node:node /app

USER node
EXPOSE 5000

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
