# ADR 0003: Reservation Engine

## Status

Accepted

## Context

Reservations drive room occupancy, billing, and operational workflows (housekeeping, check-in/out). Overlapping bookings and invalid status transitions must be prevented.

## Decision

- **Overlap detection**: `checkOverlappingReservations` blocks new/updated reservations when another reservation in `PENDING`, `CONFIRMED`, or `CHECKED_IN` overlaps the date range on the same room
- **Status machine**: Explicit allowed transitions in `reservation.state.ts`; invalid transitions return 400
- **Room sync**: Check-in sets room `OCCUPIED`; check-out sets `DIRTY` and triggers housekeeping
- **Blocking rules**: Rooms `OUT_OF_SERVICE` or with open maintenance cannot accept new reservations
- **Checkout gate**: Checkout requires invoice in `PAID` status

## Consequences

**Positive**

- Predictable reservation lifecycle
- Room inventory stays consistent with reservation state
- Billing integrated at checkout

**Negative**

- Business rules spread across reservations, rooms, billing modules (mitigated by clear service boundaries)

## Alternatives Considered

- Database exclusion constraints for overlaps — complementary; application-level check provides clearer error messages
- Event sourcing for reservations — rejected for complexity at current scale
