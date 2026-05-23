# ADR 0004: Billing Architecture

## Status

Accepted

## Context

Guests must be invoiced for stays and ancillary charges. Payments partial and full must update invoice status correctly. Checkout depends on payment completion.

## Decision

- **One invoice per reservation** (`reservationId` unique on `Invoice`)
- **Draft on demand**: Room charges generated as `DRAFT` invoice items from nightly rate × nights
- **State machine**: `DRAFT → ISSUED → PARTIALLY_PAID → PAID`; `VOID` from `ISSUED` only
- **Totals recalculation**: Item changes trigger `recalculateInvoiceTotals` (subtotal, tax, discount, total)
- **Payments**: Recorded against invoice; cumulative payments determine `PARTIALLY_PAID` vs `PAID`
- **Notifications**: `notifyPaymentReceived` on successful payment

## Consequences

**Positive**

- Clear audit trail from reservation to invoice to payment
- Checkout can reliably gate on `PAID` status
- Export/reporting can aggregate invoice and payment tables

**Negative**

- Decimal handling requires care (Prisma `Decimal` vs JS number); calculations centralized in `billing.calculations.ts`

## Alternatives Considered

- External payment gateway integration — stubbed; architecture supports adding gateway webhooks later
- Multi-invoice per reservation — rejected; single folio matches hotel PMS conventions
