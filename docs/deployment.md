# Deployment

## Docker Compose (Recommended for staging)

From the repository root:

```bash
docker compose up -d --build
```

Services:

| Service | Port | Notes |
|---------|------|-------|
| postgres | 5432 | Persistent volume `postgres_data` |
| backend | 3001 | Runs migrations on start (if configured in Dockerfile) |
| frontend | 5173 | Nginx serving static build |

## Environment Variables

### Backend (required)

- `DATABASE_URL` — PostgreSQL connection string
- `JWT_ACCESS_SECRET` — Strong random secret (rotate in production)
- `JWT_REFRESH_SECRET` — Strong random secret
- `CORS_ORIGIN` — Frontend origin URL
- `NODE_ENV` — `production`

### Frontend build

- `VITE_API_BASE_URL` — Public API URL (e.g. `https://api.stayflow.example.com`)

## Production Checklist

1. Use managed PostgreSQL with SSL
2. Set strong JWT secrets (never use defaults)
3. Enable HTTPS termination at load balancer
4. Restrict `CORS_ORIGIN` to your frontend domain
5. Run `npm run build` for backend and frontend before deploy
6. Apply Prisma migrations: `npx prisma migrate deploy`
7. Seed only non-production environments
8. Monitor `/health/details` for database connectivity
9. Collect structured JSON logs from stdout
10. Set `X-Request-Id` propagation through reverse proxies for traceability

## Manual Deployment

```bash
# Backend
cd backend
npm ci
npm run prisma:generate
npx prisma migrate deploy
npm run build
npm start

# Frontend
cd frontend
npm ci
npm run build
# Serve dist/ via CDN or static host
```

## Scaling Notes

- API is stateless; scale horizontally behind a load balancer
- Rate limiting is in-memory per instance; use Redis-backed limiter for multi-instance production
- Database connection pool sizing should match instance count
