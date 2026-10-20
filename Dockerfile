FROM node:24-bookworm-slim AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run db:generate && npm run build
RUN npm prune --omit=dev

FROM node:24-bookworm-slim AS runner

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl sqlite3 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/src ./src
COPY --from=builder /app/worker ./worker
COPY --from=builder /app/next.config.ts /app/tsconfig.json ./

ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm", "start"]
