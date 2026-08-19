# syntax=docker/dockerfile:1
#
# Aetheris control plane - multi-stage image.
# Builds the Next.js app and keeps the runtime image minimal. The same image
# runs both the web server (next start) and the BullMQ workers (npm run
# worker); docker-compose.yml wires the two entrypoints.

# ---------------------------------------------------------------------------
# Stage 1: dependencies
# ---------------------------------------------------------------------------
FROM node:20-bookworm-slim AS deps

WORKDIR /app

# Install system deps required by Prisma engines (openssl) and clean up in the
# same layer to keep the image small.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY prisma ./prisma

# Full install (including devDependencies) so the runner can execute the
# worker via tsx without a second install step.
RUN npm ci

# ---------------------------------------------------------------------------
# Stage 2: build
# ---------------------------------------------------------------------------
FROM node:20-bookworm-slim AS build

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

# Generate the Prisma client and compile the Next.js production bundle
# (npm run build already runs `prisma generate` first).
RUN npm run build

# ---------------------------------------------------------------------------
# Stage 3: runtime
# ---------------------------------------------------------------------------
FROM node:20-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 aetheris

COPY --from=deps --chown=aetheris:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=aetheris:nodejs /app/.next ./.next
COPY --from=build --chown=aetheris:nodejs /app/public ./public
COPY --from=build --chown=aetheris:nodejs /app/prisma ./prisma
COPY --from=build --chown=aetheris:nodejs /app/package.json ./package.json
COPY --from=build --chown=aetheris:nodejs /app/src ./src
COPY --from=build --chown=aetheris:nodejs /app/next.config.mjs ./next.config.mjs
COPY --from=build --chown=aetheris:nodejs /app/tsconfig.json ./tsconfig.json

# Apply pending migrations before boot (web and worker both start with this).
COPY --chown=aetheris:nodejs docker/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

USER aetheris

EXPOSE 3000

ENTRYPOINT ["./entrypoint.sh"]
CMD ["web"]
