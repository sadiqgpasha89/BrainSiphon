# syntax=docker/dockerfile:1.7
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat dumb-init
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ---- deps: reproducible install, cached until the lockfile changes
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# ---- tools: one-shot jobs (content validation, DB sync); never shipped as the runtime
FROM deps AS tools
COPY . .
RUN npm run content:build
CMD ["npm", "run", "db:sync"]

# ---- builder: validates content, then produces the standalone Next.js server
FROM deps AS builder
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ARG NEXT_PUBLIC_SEARCH_MODE=static
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL NEXT_PUBLIC_SEARCH_MODE=$NEXT_PUBLIC_SEARCH_MODE
COPY . .
RUN npm run validate:content && npm run build

# ---- runner: minimal, non-root, PID 1 handled by dumb-init so SIGTERM drains gracefully
FROM base AS runner
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/content/generated ./content/generated
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 CMD wget -qO- http://127.0.0.1:3000/api/health/liveness >/dev/null || exit 1
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
