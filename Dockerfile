# ── Build aşaması ──────────────────────────────────────────────
FROM node:20-alpine AS builder

# better-sqlite3 native modülü için build araçları
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ ./src/

RUN npm run build

# ── Production aşaması ─────────────────────────────────────────
FROM node:20-alpine AS runner

# Runtime için de gerekli (native .node dosyası)
RUN apk add --no-cache libstdc++

WORKDIR /app

COPY package*.json ./
RUN apk add --no-cache python3 make g++ && \
    npm ci --omit=dev && \
    apk del python3 make g++

COPY --from=builder /app/dist ./dist

# Kalıcı disk için dizin
RUN mkdir -p /data

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/data/middleware.db

CMD ["node", "dist/index.js"]
