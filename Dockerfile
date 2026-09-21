# =============================================================================
# InfoHub — imagem única do monolito (API Express + frontend Next.js)
# Deploy no Coolify: build pack "Dockerfile", porta 3000, health em /api/health,
# volume persistente em /app/uploads e variáveis do .env.example configuradas.
# =============================================================================

# ---- build -------------------------------------------------------------------
FROM node:24-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# O prisma.config.ts exige DATABASE_URL até para `prisma generate` (que não
# toca o banco). Este placeholder vale SÓ nesta etapa; em runtime o Coolify
# injeta a URL real.
ARG DATABASE_URL=postgresql://build:build@localhost:5432/build?schema=build
ENV DATABASE_URL=$DATABASE_URL

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# prisma generate + tsc (backend) + next build (frontend), depois remove devDependencies
RUN npm run build && npm prune --omit=dev

# ---- runtime -----------------------------------------------------------------
FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOST=0.0.0.0
ENV UPLOADS_DIR=/app/uploads
# Prazos e lembretes são calculados no fuso do servidor (fim do dia, 9h da manhã)
ENV TZ=America/Sao_Paulo

COPY --from=build --chown=node:node /app ./
RUN mkdir -p /app/uploads && chown node:node /app/uploads

USER node
EXPOSE 3000

# Segue a variável PORT, caso o Coolify a sobrescreva (ex.: PORT=3008).
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT:-3000}/api/health" || exit 1

# `npm start` = db:preparar (cria o schema da dupla → migrations → seed com o
# cenário da G1) && node dist/server.js — tudo em um comando, a cada deploy.
CMD ["npm", "start"]
