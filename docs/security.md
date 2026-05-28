# Security

## Authentication

- Passwords hashed with bcrypt (cost factor 12)
- Access tokens: short-lived JWT (default 15m)
- Refresh tokens: stored hashed, revocable on logout
- Inactive users cannot authenticate

## Authorization

- RBAC with role → permission mapping
- `requireAuth` + `requirePermission` on protected routes
- Search results filtered by user permissions per entity type
- Export endpoints require domain-specific read permissions

## API Hardening

| Control | Implementation |
|---------|----------------|
| HTTP headers | Helmet |
| Rate limiting | 100 req/min per IP (in-memory; skipped in test) |
| Input sanitization | Strips `$`/`.'` keys, script tags from body/query |
| Validation | Centralized validators; standardized 400 responses |
| CORS | Restricted to configured origin |
| Payload size | JSON/urlencoded limited to 1MB |

## Error Handling

Errors return `{ code, message, details }` without leaking stack traces in production.

## Audit Trail

Sensitive mutations write to `audit_logs` with user, action, entity, IP address.

## Secrets Management

- Never commit `.env` files
- Rotate `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` on compromise
- Use environment-specific secrets in CI/CD

## Recommendations for Production

1. Terminate TLS at load balancer
2. Enable PostgreSQL SSL
3. Replace in-memory rate limiter with Redis for multi-instance deploys
4. Add WAF / DDoS protection at edge
5. Regular dependency audits: `npm audit`
6. Principle of least privilege for database credentials
7. Propagate `X-Request-Id` for incident correlation

## Demo Credentials

Seed data creates demo users (development only). **Disable or remove seed users in production.**
