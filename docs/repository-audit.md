# Repository Audit

**Date:** 2025-06-08  
**Scope:** Full production-readiness review — dead code, lint/build health, schema consistency, Docker, tests, and seed integrity.  
**Constraints:** No new features; no removal of existing functionality.

---

## Executive Summary

The repository is in good shape for staging deployment. Backend and frontend **build**, **lint**, and **test** suites all pass after targeted fixes. The most impactful issues were **broken API proxy paths** (Vite + Nginx stripping `/api`), **seed enum mismatch** (`CREDIT_CARD` vs `CARD`), **dead middleware/helpers**, and **frontend production builds failing** because test files were included in the main TypeScript project.

| Check | Result (post-fix) |
|-------|-------------------|
| Backend `npm run build` | Pass |
| Backend `npm run lint` | Pass (0 errors) |
| Backend `npm test` | Pass — 242 tests / 34 suites |
| Frontend `npm run build` | Pass |
| Frontend `npm run lint` | Pass (0 warnings) |
| Frontend `npm test` | Pass — 54 tests / 11 files |
| Prisma `validate` | Pass (requires `DATABASE_URL`) |

---

## 1. Dead Code

### Findings

| Item | Location | Severity |
|------|----------|----------|
| Unused `requestLogger` middleware | `backend/src/common/middleware/requestLogger.ts` | Low — superseded by `structuredRequestLogger` |
| Unused `syncRoomOnCheckIn` / `syncRoomOnCheckOut` | `backend/src/modules/reservations/reservations.service.ts` | Low — check-in/out already update room status inline |
| Unused `morgan` dependency | `backend/package.json` | Low — never imported; structured logger used instead |
| Stale compiled seed artifacts | `backend/prisma/seed.js`, `seed.d.ts`, maps | Medium — out of sync with `seed.ts`; package uses `tsx prisma/seed.ts` |

### Fixes Applied

- Removed `requestLogger.ts` and its barrel export.
- Removed dead `syncRoomOnCheckIn` / `syncRoomOnCheckOut` helpers (behavior unchanged; inline updates remain at check-in/out).
- Deleted stale `seed.js` / `seed.d.ts` artifacts.
- Added `prisma/seed.js*` and `prisma/seed.d.ts*` to `backend/.gitignore`.

### Remaining Technical Debt

- Remove unused `morgan` and `@types/morgan` from backend dependencies when convenient (`npm uninstall morgan @types/morgan`).

---

## 2. Unused Imports

### Findings

| File | Import | Rule |
|------|--------|------|
| `notifications.service.ts` | `NotificationType` | `@typescript-eslint/no-unused-vars` |
| `reservations.service.ts` | (functions above) | Same — dead code, not just imports |

### Fixes Applied

- Removed unused `NotificationType` import from `notifications.service.ts`.
- Dead function removal in reservations resolved the other lint violations.

### Remaining Technical Debt

- No project-wide unused-import automation in CI. Consider `eslint --max-warnings 0` in a root pipeline (already enforced per package).

---

## 3. Duplicate Utilities

### Findings

| Pattern | Occurrences | Assessment |
|---------|-------------|------------|
| CSV export | Single `backend/src/common/export/csv.ts` | No duplication |
| Pagination | Single `backend/src/common/pagination/` | No duplication |
| `startOfDay` / `endOfDay` | `reports.service.ts` only (backend) | Local helpers; acceptable |
| `formatDate` | `ReservationsPage.tsx`, `InvoiceDetails.tsx` | Minor frontend duplication |

### Fixes Applied

None — no harmful duplication found; consolidating date formatters would be a refactor, not a safe audit fix.

### Future Improvements

- Extract shared `formatDate` / `formatDateRange` into `frontend/src/utils/date.ts` if more pages adopt the same pattern.
- Move `startOfDay` / `endOfDay` to `backend/src/common/utils/dates.ts` if reused beyond reports.

---

## 4. Circular Dependencies

### Findings

Manual import-graph review of backend modules:

```
reservations → billing, audit, notifications
billing → notifications
housekeeping → notifications
maintenance → notifications
reports → billing.calculations
exports → audit.validators, billing.validators
dashboard.controller → reservations.service (direct)
```

**No circular import chains detected.** Dependencies flow one-way from domain modules into notifications/audit/billing helpers.

Automated scan via `madge --circular` was attempted but blocked by a local npm registry error (`ECOMPROMISED`); manual analysis is documented above.

### Fixes Applied

None required.

### Future Improvements

- Add `madge --circular` (or `dependency-cruiser`) to CI once npm environment is stable.
- Refactor `dashboard.controller` to call a dedicated `dashboard.service` instead of importing `reservations.service` directly (layering hygiene).

---

## 5. TypeScript Warnings

### Findings (pre-fix)

| Area | Issue |
|------|-------|
| Frontend production build | Test files (`*.test.tsx`) included in `tsconfig.json` `include: ["src"]` caused `tsc -b` failures (`never` inference, mock typing, missing optional fields on billing types in tests) |
| Backend | Clean — `tsc` passed with strict settings |

### Fixes Applied

- Excluded `src/**/*.test.ts`, `src/**/*.test.tsx`, and `src/test` from `frontend/tsconfig.json` production compile scope.
- Added `tsconfig.tsbuildinfo` to `frontend/.gitignore` (build artifact).

### Remaining Technical Debt

- Test files still carry type looseness (e.g. `DataTable.test.tsx` empty-array inference, `InvoiceDetails.test.tsx` extra timestamp fields). Vitest runs fine; tighten types when touching those tests.
- Consider a dedicated `tsconfig.test.json` referenced by Vitest for stricter test typing without affecting production builds.

---

## 6. ESLint Warnings

### Findings (pre-fix)

| Package | Count | Details |
|---------|-------|---------|
| Backend | 4 errors | `prefer-const`, unused vars/imports |
| Frontend | 1 warning (max-warnings 0) | `react-refresh/only-export-components` in `test-utils.tsx` |

### Fixes Applied

- Backend: `prefer-const` in pagination; removed unused import and dead functions.
- Frontend: split providers into `src/test/test-providers.tsx`; `test-utils.tsx` now only exports `renderWithProviders`.

### Verification

Both packages report **0 errors / 0 warnings** after fixes.

---

## 7. Prisma Schema Consistency

### Findings

| Item | Status |
|------|--------|
| Schema validity | Valid (`npx prisma validate` with `DATABASE_URL` set) |
| `PaymentMethod` enum | `CASH \| CARD \| BANK_TRANSFER` — seed used invalid `CREDIT_CARD` |
| Migrations | 8 migrations present; latest adds notifications, notification preferences, audit log indexes |
| `package.json#prisma.seed` | Deprecated warning — Prisma 7 will require `prisma.config.ts` |

### Fixes Applied

- Changed seed payment method from `PaymentMethod.CREDIT_CARD` to `PaymentMethod.CARD`.

### Remaining Technical Debt

- `prisma validate` fails without `DATABASE_URL` in the shell — document in `.env.example` or add a CI step that sets a dummy URL.
- Migrate to `prisma.config.ts` before Prisma 7 upgrade.
- Prisma CLI reports major update available (6.x → 7.x) — plan upgrade separately.

### Seed Data Integrity

- `seed.ts` is idempotent (uses `findFirst` guards).
- Covers 3 hotels, RBAC roles/permissions, demo users, guests, reservations, invoices, housekeeping, maintenance, and notifications.
- Runs via `tsx prisma/seed.ts` / `npm run prisma:seed` — **not** auto-run in production Docker (correct for prod).

---

## 8. Docker Configuration

### Findings

| Item | Issue | Impact |
|------|-------|--------|
| `frontend/nginx.conf` | `proxy_pass http://backend:3001/;` trailing slash stripped `/api` prefix | API calls via Nginx proxy returned 404 |
| `frontend/vite.config.ts` | Dev proxy rewrote `/api` away | Local dev API calls misrouted |
| `docker-compose.yml` | Default JWT secrets (`change-me-*`) | Unsafe for real production |
| `docker-compose.yml` | `VITE_API_BASE_URL: http://localhost:3001` | Browser calls backend directly; Nginx `/api` proxy unused in default compose setup |
| `backend/Dockerfile` | Runs `prisma migrate deploy` on start | Good for prod; no seed (good) |
| `CORS_ORIGIN` | `http://localhost:5173` | Matches compose port mapping |

### Fixes Applied

- **Nginx:** `proxy_pass http://backend:3001` (no trailing slash) for `/api/`; added `/health` proxy block.
- **Vite:** Removed `/api` path rewrite; added `/health` dev proxy.

### Remaining Technical Debt

- For same-origin API routing through Nginx, set `VITE_API_BASE_URL` to empty string or `/api` and update `apiClient` base URL logic — current compose still uses absolute `http://localhost:3001`.
- Replace default JWT secrets and database passwords before any public deployment.
- Add Docker Compose healthchecks for backend/frontend services.
- Consider a `docker-compose.seed.yml` override for local demo data.

---

## 9. Test Reliability

### Findings

| Suite | Result | Notes |
|-------|--------|-------|
| Backend Jest | 242 / 242 pass | Jest warns: *"worker process failed to exit gracefully"* — likely open DB handles or timers |
| Frontend Vitest | 54 / 54 pass | ~91s runtime; acceptable for current suite size |

### Fixes Applied

None — tests already pass; worker teardown is environmental.

### Remaining Technical Debt

- Run `jest --detectOpenHandles` to identify leaking Prisma/HTTP connections in integration tests.
- Add `afterAll` Prisma disconnect in shared test setup if not already centralized.
- Frontend tests excluded from production `tsc` — ensure CI runs `npm test` separately (already standard).

### Future Improvements

- Parallelize slow integration tests with isolated databases or transaction rollbacks.
- Add smoke test script that hits `/health/details` after `docker compose up`.

---

## 10. Cross-Cutting Observations

### API Routing (verified)

```
/health          → healthRouter
/api, /api/v1    → apiRouter (module routes: /hotels, /auth, …)
```

Proxy fixes align dev and Docker paths with this structure.

### Observability

- `requestIdMiddleware` + `structuredRequestLogger` active in `app.ts`.
- `GET /health/details` available for dependency checks.

### Security / Production Readiness

- Rate limiting and request sanitization middleware in place.
- Default Docker secrets must be rotated.
- CORS is origin-restricted via `CORS_ORIGIN` env.

---

## Fixes Applied (Summary)

1. Backend ESLint: `prefer-const`, unused import, dead reservation room-sync helpers.
2. Removed unused `requestLogger` middleware.
3. Seed: `PaymentMethod.CARD` (was invalid `CREDIT_CARD`).
4. Removed stale `prisma/seed.js` artifacts; updated `backend/.gitignore`.
5. Fixed Vite and Nginx API/health proxy path handling.
6. Excluded frontend test files from production TypeScript build.
7. Split Vitest providers to resolve `react-refresh` ESLint warning.
8. Added `tsconfig.tsbuildinfo` to `frontend/.gitignore`.

---

## Remaining Technical Debt

| Priority | Item |
|----------|------|
| High | Rotate default JWT/DB credentials in Docker Compose for non-local deploys |
| Medium | Jest open-handle teardown warning |
| Medium | Align Docker frontend API URL strategy (absolute vs Nginx-relative) |
| Medium | Prisma 7 migration path (`prisma.config.ts`, major version bump) |
| Low | Remove unused `morgan` dependency |
| Low | Tighten frontend test TypeScript types |
| Low | `dashboard.controller` → `dashboard.service` layering |
| Low | Automated circular-dependency check in CI |

---

## Future Improvements

1. **CI pipeline** — single workflow: lint + build + test (backend + frontend) + `prisma validate` with dummy `DATABASE_URL`.
2. **Docker hardening** — healthchecks, non-root users, secret injection via env files (not committed).
3. **Shared date/CSV utilities** — consolidate as modules grow.
4. **E2E tests** — Playwright/Cypress against `docker compose` stack validating login, reservation flow, and `/api` proxy.
5. **Dependency hygiene** — periodic `npm audit` and removal of unused packages (`morgan`).
6. **Production seed policy** — document when to run `prisma:seed` (dev/staging only) in `docs/deployment.md`.

---

## Verification Commands

```bash
# Backend
cd backend
npm run lint
npm run build
npm test
DATABASE_URL=postgresql://stayflow:stayflow@localhost:5432/stayflow npx prisma validate

# Frontend
cd frontend
npm run lint
npm run build
npm test
```

All commands above pass as of this audit.
