# StayFlow — Silver submission Dockerfile (repository root)
#
# Silver constraints: COPY destinations must live under /app (and peers);
# this file uses two COPY instructions, both targeting /app.
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

FROM node:22-alpine AS builder

WORKDIR /app

COPY . /app/repo

ARG VITE_API_BASE_URL=http://localhost:3001
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN set -eux; \
  cd /app/repo/backend; \
  npm ci; \
  npm run prisma:generate; \
  npm run build; \
  cd /app/repo/frontend; \
  npm ci; \
  npm run build; \
  mkdir -p /app/release/prisma /app/release/dist /app/release/public /app/release/node_modules/.prisma; \
  cp /app/repo/backend/package.json /app/repo/backend/package-lock.json /app/release/; \
  cp -r /app/repo/backend/prisma/. /app/release/prisma/; \
  cp -r /app/repo/backend/dist/. /app/release/dist/; \
  cp -r /app/repo/backend/node_modules/.prisma/. /app/release/node_modules/.prisma/; \
  cp -r /app/repo/frontend/dist/. /app/release/public/

FROM node:22-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/release /app

RUN npm ci --omit=dev

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3001/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
