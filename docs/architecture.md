# StayFlow Architecture

## Overview

StayFlow is a monorepo SaaS platform for hospitality operations management. It follows a modular, service-oriented architecture designed for scalability and maintainability.

## Monorepo Layout

```
stayflow/
├── backend/                 # REST API service
│   └── src/
│       ├── modules/         # Feature modules (health, auth, bookings, etc.)
│       ├── common/          # Shared middleware, utils, errors
│       ├── config/          # Environment and database configuration
│       └── prisma/          # Database schema and migrations
├── frontend/                # Single-page application
│   └── src/
│       ├── app/             # App bootstrap, routing
│       ├── pages/           # Route-level page components
│       ├── components/      # Reusable UI components
│       ├── features/        # Feature-specific logic and UI
│       ├── services/        # API client layer
│       ├── hooks/           # Custom React hooks
│       ├── store/           # Zustand state management
│       ├── layouts/         # Page layout wrappers
│       └── types/           # Shared TypeScript types
└── docs/                    # Documentation
```

## Backend Architecture

### Request Lifecycle

1. Request enters Express via `createApp()`
2. Security middleware (Helmet, CORS) applied
3. Body parsing and request logging
4. Route matching in feature modules
5. 404 handler for unmatched routes
6. Centralized error handler

### Module Pattern

Each feature module contains:

- `*.controller.ts` — Request handlers
- `*.routes.ts` — Route definitions
- `index.ts` — Public exports

### Error Handling

Operational errors use `AppError` with HTTP status codes. The error middleware sanitizes responses in production while exposing stack traces in development.

## Frontend Architecture

### Data Flow

- **TanStack Query** — Server state, caching, and background refetching
- **Zustand** — Client-side UI state (sidebar, preferences)
- **API Client** — Centralized HTTP layer in `services/api.ts`

### Routing

React Router v7 with layout-based routing. `AppLayout` wraps all pages with shared header and footer.

## Infrastructure

Docker Compose orchestrates three services:

- **postgres** — Persistent PostgreSQL 16 database
- **backend** — Node.js API with Prisma migrations on startup
- **frontend** — Nginx serving the Vite production build
