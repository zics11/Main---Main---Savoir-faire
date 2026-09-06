# syntax=docker/dockerfile:1

FROM node:22.23-alpine AS base
WORKDIR /app
# better-sqlite3 / sharp native prebuilds expect these on Alpine (musl)
RUN apk add --no-cache libc6-compat

# ─── deps: install exact versions from the lockfile ───
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# ─── builder: compile the Next.js app ───
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ─── runner: minimal production image ───
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs \
  && mkdir -p /app/data /app/uploads \
  && chown nextjs:nodejs /app/data /app/uploads

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/drizzle/migrations ./drizzle/migrations
COPY --from=builder --chown=nextjs:nodejs /app/scripts/migrate.mjs ./scripts/migrate.mjs

USER nextjs
EXPOSE 3000
VOLUME ["/app/data", "/app/uploads"]

# Apply any pending migrations, then start the standalone server.
CMD ["sh", "-c", "node scripts/migrate.mjs && node server.js"]
