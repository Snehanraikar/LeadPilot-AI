# ─── Build stage ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
RUN npm ci --ignore-scripts

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ─── Production stage ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

ENV NODE_ENV=production

RUN apk add --no-cache openssl && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 apiuser

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma
# No --ignore-scripts here: prisma's postinstall must run (as root, at build time)
# to download its query-engine binary. Skipping it forces a lazy download at
# container startup instead, which fails once the process drops to the
# non-root `apiuser` below (can't write into node_modules/@prisma/engines).
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

USER apiuser

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:4000/health || exit 1

# Free-tier Render has no separate "pre-deploy" step, so migrations run on every
# container start. `prisma migrate deploy` is idempotent — a no-op if already applied.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
