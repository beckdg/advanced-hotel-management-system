# ADR 0002: RBAC Design

## Status

Accepted

## Context

Hotel staff have different operational scopes: front desk, housekeeping, maintenance, finance, and management. Fine-grained access must be enforceable at the API layer.

## Decision

Implement role-based access control with:

- **Roles** stored in `roles` (e.g. `FRONT_DESK`, `HOUSEKEEPING`)
- **Permissions** as string constants (e.g. `reservations.write`)
- **RolePermission** join table mapping roles to permissions
- JWT claims carry `roleId` and `roleName`; permissions loaded on each request via `getAuthUserById`
- `requirePermission(permission)` middleware on routes

Frontend navigation filters items by `user.permissions`.

## Consequences

**Positive**

- Explicit, auditable permission checks
- Easy to extend with new permissions per module
- Search/export respect permission boundaries

**Negative**

- Permission load on every authenticated request (acceptable at current scale)

## Alternatives Considered

- Permissions embedded only in JWT — rejected due to stale permission risk after role changes
- Attribute-based access (ABAC) — deferred until multi-tenant hotel isolation is required
