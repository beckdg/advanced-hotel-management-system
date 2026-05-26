# StayFlow Architecture

StayFlow is a hospitality operations platform delivered as a TypeScript monorepo with a React SPA and an Express API backed by PostgreSQL.

## High-Level Overview

```
┌─────────────┐     HTTPS/JSON      ┌─────────────┐     Prisma      ┌────────────┐
│   React     │ ◄─────────────────► │   Express   │ ◄────────────►│ PostgreSQL │
│   Frontend  │   /api, /api/v1     │   Backend   │               │            │
└─────────────┘                     └─────────────┘               └────────────┘
```

## Backend Layers

| Layer | Location | Responsibility |
|-------|----------|----------------|
| Routes | `backend/src/modules/*/routes.ts` | HTTP mapping, RBAC guards |
| Controllers | `backend/src/modules/*/controller.ts` | Request parsing, response shaping |
| Services | `backend/src/modules/*/service.ts` | Business logic, transactions |
| Validators | `backend/src/modules/*.validators.ts` | Input validation |
| Common | `backend/src/common/` | Pagination, errors, middleware, export utilities |

## Frontend Layers

| Layer | Location | Responsibility |
|-------|----------|----------------|
| Pages | `frontend/src/pages/` | Route-level views |
| Features | `frontend/src/features/` | Domain-specific forms and flows |
| Components | `frontend/src/components/` | Reusable UI |
| Services | `frontend/src/services/api.ts` | Typed API client |
| Store | `frontend/src/store/` | Auth and app state (Zustand) |

## Cross-Cutting Concerns

- **Authentication**: JWT access + refresh tokens; Bearer auth on protected routes
- **Authorization**: Role-based permissions checked per endpoint
- **Audit**: Mutations logged to `audit_logs`
- **Notifications**: In-app (and stub email/SMS) event delivery
- **Observability**: Request IDs, structured JSON logs (production), `/health/details`

## Data Model

Core entities: `Hotel` → `Floor` / `RoomType` → `Room` → `Reservation` → `Guest`, `Invoice`, `Payment`. Operations entities: `HousekeepingTask`, `MaintenanceRequest`, `Notification`, `AuditLog`.

## API Versioning

Routes mount at both `/api/v1/*` and `/api/*` for backward compatibility. New clients should prefer `/api/v1`.

## Design Principles

1. Thin controllers, fat services
2. Explicit validators at module boundaries
3. Paginated list responses with consistent metadata
4. Standardized error shape: `{ code, message, details }`
5. Strong typing end-to-end (Prisma → services → API → frontend types)
