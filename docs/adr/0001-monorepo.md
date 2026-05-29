# ADR 0001: Monorepo Structure

## Status

Accepted

## Context

StayFlow spans a REST API, SPA, database schema, and operational documentation. Teams need coordinated releases and shared conventions without publishing internal packages.

## Decision

Use a single repository with top-level `backend/` and `frontend/` workspaces, shared `docker-compose.yml`, and `docs/` at the root. Each package has its own `package.json`, TypeScript config, and test runner.

## Consequences

**Positive**

- Atomic changes across API and UI
- Single CI pipeline and version tag
- Shared Docker Compose for local/staging parity

**Negative**

- Larger clone size
- Separate dependency trees to maintain

## Alternatives Considered

- Polyrepo with published SDK — rejected for early-stage velocity
- Nx/Turborepo — deferred; current scale does not require build orchestration tooling
