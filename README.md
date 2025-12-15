# StayFlow

**Hospitality Operations Platform** — a production-grade SaaS monorepo for hotel management.

## Project Structure

```
stayflow/
├── backend/          # Node.js + Express + Prisma API
├── frontend/         # React + Vite web application
├── docs/             # Project documentation
├── docker-compose.yml
└── README.md
```

## Prerequisites

- [Node.js](https://nodejs.org/) 22+
- [npm](https://www.npmjs.com/) 10+
- [PostgreSQL](https://www.postgresql.org/) 16+ (for local development)
- [Docker](https://www.docker.com/) & Docker Compose (for containerized development)

## Environment Variables

### Backend (`backend/.env`)

Copy the example file and adjust values as needed:

```bash
cp backend/.env.example backend/.env
```

| Variable       | Description                          | Default                                              |
| -------------- | ------------------------------------ | ---------------------------------------------------- |
| `NODE_ENV`     | Runtime environment                  | `development`                                        |
| `PORT`         | API server port                      | `3001`                                               |
| `DATABASE_URL` | PostgreSQL connection string         | `postgresql://stayflow:stayflow@localhost:5432/stayflow?schema=public` |
| `CORS_ORIGIN`  | Allowed frontend origin for CORS     | `http://localhost:5173`                              |
| `JWT_ACCESS_SECRET`  | JWT access token signing secret | `change-me-access-secret` |
| `JWT_REFRESH_SECRET` | JWT refresh token signing secret | `change-me-refresh-secret` |
| `JWT_ACCESS_EXPIRES_IN` | Access token TTL | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token TTL | `7d` |

### Frontend (`frontend/.env`)

```bash
cp frontend/.env.example frontend/.env
```

| Variable             | Description          | Default                  |
| -------------------- | -------------------- | ------------------------ |
| `VITE_API_BASE_URL`  | Backend API base URL | `http://localhost:3001`  |

## Local Development

### 1. Start PostgreSQL

Ensure PostgreSQL is running locally with a database named `stayflow`, or use Docker for just the database:

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

The API will be available at `http://localhost:3001`.

**Health check:**

```bash
curl http://localhost:3001/health
```

Expected response:

```json
{
  "status": "ok",
  "service": "stayflow-api"
}
```

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

The web app will be available at `http://localhost:5173`.

### Running Tests

```bash
cd backend
npm test
```

## Docker Development

Run the entire stack with Docker Compose:

```bash
docker compose up --build
```

This starts:

| Service    | URL                        | Description        |
| ---------- | -------------------------- | ------------------ |
| Frontend   | http://localhost:5173      | React web app      |
| Backend    | http://localhost:3001      | Express API        |
| PostgreSQL | localhost:5432             | Database           |

Stop all services:

```bash
docker compose down
```

Remove volumes (reset database):

```bash
docker compose down -v
```

## API Endpoints

| Method | Endpoint  | Description       |
| ------ | --------- | ----------------- |
| GET    | `/health` | Service health check |

### Authentication

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Login and receive tokens |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/logout` | Revoke refresh token |

### Users

| Method | Endpoint | Auth | Permission |
| ------ | -------- | ---- | ---------- |
| GET | `/api/users/me` | Required | — |
| GET | `/api/users` | Required | `users.read` |
| GET | `/api/users/:id` | Required | `users.read` |
| PATCH | `/api/users/:id` | Required | `users.update` or self (name only) |

### Default Roles

`SUPER_ADMIN`, `HOTEL_MANAGER`, `FRONT_DESK`, `HOUSEKEEPING`, `MAINTENANCE`, `FINANCE`

Seed creates a default admin: `admin@stayflow.com` / `Admin123!`

## Tech Stack

### Backend

- Node.js, TypeScript, Express
- PostgreSQL, Prisma ORM
- Jest, Supertest
- ESLint, Prettier

### Frontend

- React, TypeScript, Vite
- React Router, Zustand, TanStack Query
- TailwindCSS

### DevOps

- Docker, Docker Compose
- Multi-stage builds for backend and frontend

## License

MIT
