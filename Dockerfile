# StayFlow — Silver submission Dockerfile (repository root)
#
# Builds the full monorepo (backend API + frontend SPA) and produces a
# production-ready backend runtime image with compiled frontend assets included.
#
# Usage:
#   docker build -t stayflow-submission .
#   docker run --rm -p 3001:3001 \
#     -e DATABASE_URL=postgresql://user:pass@host:5432/stayflow \
#     -e JWT_ACCESS_SECRET=your-access-secret \
#     -e JWT_REFRESH_SECRET=your-refresh-secret \
#     -e CORS_ORIGIN=http://localhost:5173 \
#     stayflow-submission
#
# For the full stack (PostgreSQL + API + Nginx frontend), use docker-compose.yml.

# ── Backend: install dependencies ──────────────────────────────────────────────
FROM node:22-alpine AS backend-deps

WORKDIR /app/backend

COPY backend/package.json backend/package-lock.json ./
COPY backend/prisma ./prisma/

RUN npm ci

# ── Backend: compile TypeScript + Prisma client ──────────────────────────────
FROM backend-deps AS backend-build

COPY backend/ ./

RUN npm run prisma:generate && npm run build

# ── Frontend: install dependencies ───────────────────────────────────────────
FROM node:22-alpine AS frontend-deps

WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json ./

RUN npm ci

# ── Frontend: production build ─────────────────────────────────────────────────
FROM frontend-deps AS frontend-build

COPY frontend/ ./

ARG VITE_API_BASE_URL=http://localhost:3001
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build

# ── Production runtime (API server) ────────────────────────────────────────────
FROM node:22-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

COPY backend/package.json backend/package-lock.json ./
COPY backend/prisma ./prisma/

RUN npm ci --omit=dev

COPY --from=backend-build /app/backend/dist ./dist
COPY --from=backend-build /app/backend/node_modules/.prisma ./node_modules/.prisma
COPY --from=frontend-build /app/frontend/dist ./public

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3001/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
