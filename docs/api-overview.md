# API Overview

Base URLs: `http://localhost:3001/api` or `http://localhost:3001/api/v1`

## Authentication

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Register user |
| POST | `/auth/login` | Login, returns tokens |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/logout` | Revoke refresh token |

All protected routes require `Authorization: Bearer <accessToken>`.

## Core Resources

| Resource | Base Path | Permissions |
|----------|-----------|-------------|
| Hotels | `/hotels` | `hotels.read`, `hotels.write` |
| Rooms | `/rooms` | `rooms.read`, `rooms.write` |
| Guests | `/guests` | `guests.read`, `guests.write` |
| Reservations | `/reservations` | `reservations.read`, `reservations.write` |
| Housekeeping | `/housekeeping/tasks` | `housekeeping.read`, `housekeeping.write` |
| Maintenance | `/maintenance` | `maintenance.read`, `maintenance.write` |
| Invoices | `/invoices` | `billing.read`, `billing.write` |
| Payments | `/payments` | `billing.read` |
| Notifications | `/notifications` | `notifications.read` |
| Audit Logs | `/audit-logs` | `audit.read` |
| Reports | `/reports/*` | `reports.read` |

## Pagination

List endpoints accept query parameters:

- `page` (default 1)
- `limit` (default 20, max 100)
- `sortBy` (module-specific allowed fields)
- `sortOrder` (`asc` | `desc`)

Response shape:

```json
{
  "status": "success",
  "data": [],
  "pagination": { "page": 1, "limit": 20, "total": 42, "totalPages": 3 }
}
```

## Search & Export

| Method | Path | Description |
|--------|------|-------------|
| GET | `/search?q=` | Global search across guests, reservations, rooms, invoices, maintenance |
| GET | `/exports/reservations?format=csv\|json` | Export reservations |
| GET | `/exports/invoices?format=csv\|json` | Export invoices |
| GET | `/exports/audit-logs?format=csv\|json` | Export audit logs |

## Bulk Operations

| Method | Path | Body |
|--------|------|------|
| POST | `/rooms/bulk-status` | `{ roomIds, status }` |
| POST | `/reservations/bulk-cancel` | `{ reservationIds }` |
| POST | `/maintenance/bulk-assign` | `{ requestIds, assignedToUserId }` |
| POST | `/notifications/bulk-read` | `{ notificationIds }` |

## Health

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Basic liveness |
| GET | `/health/details` | Database, uptime, version, environment |

## Error Format

```json
{
  "status": "error",
  "code": "ERROR_CODE",
  "message": "Human-readable message",
  "details": {}
}
```
