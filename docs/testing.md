# Testing

## Backend (Jest + Supertest)

```bash
cd backend
npm test
```

**Target: 200+ tests**

### Coverage areas

| Suite | Location | Focus |
|-------|----------|-------|
| Unit / state | `modules/*/__tests__/*.state.test.ts` | State machines |
| Integration | `modules/*/__tests__/*.test.ts` | HTTP endpoints with mocked Prisma |
| Edge cases | `modules/__tests__/edge-cases/` | Auth, permissions, pagination, search, export |
| Advanced | `modules/__tests__/advanced-features.test.ts` | Bulk ops, rate limits |

### Patterns

- Mock `config/database` Prisma client
- Mock `rbac.service` `getAuthUserById` for auth tests
- Use `signAccessToken` from test helpers for Bearer tokens
- Paginated list tests must mock both `findMany` and `count`

### Watch mode

```bash
npm run test:watch
```

## Frontend (Vitest + React Testing Library)

```bash
cd frontend
npm test
```

**Target: 40+ tests**

### Suites

- `LoginForm` — validation, submit, error states
- `ProtectedRoute` — redirect when unauthenticated
- `ReservationForm` — field rendering, submit guard
- `NotificationCenter` — empty state, mark read
- `SearchPage` — search form, results sections
- `PaginationControls` — prev/next disabled states
- `authStore` — login/logout state

### Configuration

- `vitest.config.ts` — jsdom environment, path aliases
- `src/test/setup.ts` — `@testing-library/jest-dom` matchers

## CI Recommendation

```yaml
- run: cd backend && npm ci && npm test
- run: cd frontend && npm ci && npm test && npm run build
```

## Health & Observability Tests

`observability.test.ts` verifies:

- `GET /health` and `GET /health/details`
- `X-Request-Id` header propagation
- Database status reporting
