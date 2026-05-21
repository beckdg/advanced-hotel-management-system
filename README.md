# StayFlow

**Production-grade hospitality operations platform** for hotel management — reservations, housekeeping, maintenance, billing, reporting, and staff workflows.

## Architecture

StayFlow is a TypeScript monorepo:

```
stayflow/
├── backend/          # Express + Prisma REST API
├── frontend/         # React + Vite SPA
├── docs/             # Architecture, API, deployment, security, ADRs
├── docker-compose.yml
└── README.md
```

| Layer | Stack |
|-------|-------|
| API | Node.js 22, Express, Prisma, PostgreSQL |
| Web | React 19, Vite, TanStack Query, Zustand, Tailwind |
| Auth | JWT access + refresh tokens, RBAC permissions |
| Observability | Request IDs, structured logging, `/health/details` |

See [docs/architecture.md](docs/architecture.md) for module layout and design principles.

## Quick Start

### Prerequisites

- Node.js 22+
- PostgreSQL 16+ (or Docker)
- npm 10+

### 1. Database

```bash
docker compose up postgres -d
```

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

API: `http://localhost:3001`

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

App: `http://localhost:5173`

### Demo Users (seed)

| Email | Password | Role |
|-------|----------|------|
| admin@stayflow.com | Admin123! | Super Admin |
| manager@stayflow.com | Manager123! | Hotel Manager |
| frontdesk@stayflow.com | Front123! | Front Desk |
| housekeeping@stayflow.com | Clean123! | Housekeeping |
| maintenance@stayflow.com | Fix123! | Maintenance |
| finance@stayflow.com | Bill123! | Finance |

## Docker

Run the full stack:

```bash
docker compose up -d --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| API | http://localhost:3001 |
| PostgreSQL | localhost:5432 |

See [docs/deployment.md](docs/deployment.md) for production checklist.

## Testing

### Backend (200+ tests)

```bash
cd backend
npm test
```

Jest + Supertest with mocked Prisma. Edge-case suites cover auth, RBAC, reservations, billing, operations, search, export, pagination, and observability.

### Frontend (40+ tests)

```bash
cd frontend
npm test
```

Vitest + React Testing Library. Covers login, protected routes, forms, invoice workflow, notifications, search, and pagination.

See [docs/testing.md](docs/testing.md) for suite breakdown.

## API Overview

- Base: `/api` and `/api/v1` (versioned)
- Auth: `POST /api/auth/login`, Bearer token on protected routes
- Pagination: `?page=&limit=&sortBy=&sortOrder=` on list endpoints
- Search: `GET /api/search?q=`
- Export: `GET /api/exports/{reservations|invoices|audit-logs}?format=csv|json`
- Health: `GET /health`, `GET /health/details`

Full reference: [docs/api-overview.md](docs/api-overview.md)

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection | local dev URL |
| `JWT_ACCESS_SECRET` | Access token secret | change in production |
| `JWT_REFRESH_SECRET` | Refresh token secret | change in production |
| `CORS_ORIGIN` | Frontend origin | `http://localhost:5173` |
| `PORT` | API port | `3001` |

### Frontend (`frontend/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | API base URL | `http://localhost:3001` |

## Documentation

| Document | Description |
|----------|-------------|
| [architecture.md](docs/architecture.md) | System design |
| [api-overview.md](docs/api-overview.md) | Endpoints and conventions |
| [deployment.md](docs/deployment.md) | Docker and production deploy |
| [testing.md](docs/testing.md) | Test strategy |
| [security.md](docs/security.md) | Auth, hardening, secrets |
| [adr/](docs/adr/) | Architecture decision records |

## Security

- Helmet, rate limiting, input sanitization
- RBAC on every protected endpoint
- Audit logging for sensitive mutations
- Standardized error responses without stack leakage in production

Details: [docs/security.md](docs/security.md)

## License

MIT
