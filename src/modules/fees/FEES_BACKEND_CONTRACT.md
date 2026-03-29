# Fees Payment Status Backend Contract

This document defines backend behavior required by the frontend for receipt field selection, cancellation, and refunds.

## Data Model Additions

1. Payment table/entity
- `status`: enum `SUCCESS | CANCELLED | REFUNDED` (default: `SUCCESS`)
- `statusReason`: nullable text (or separate `cancelReason` / `refundReason`)
- `refundAmount`: nullable number
- `receiptComponents`: nullable JSON/string[]

2. Optional audit fields
- `cancelledAt`, `refundedAt`
- `cancelledBy`, `refundedBy`

## Existing Endpoint Enhancement

### POST `/fees/collect`
Request body additions:
- `receiptComponents?: string[]`

Expected behavior:
- Save payment with default `status=SUCCESS`
- Persist `receiptComponents` with payment record
- Update fee totals (`totalPaid`, `pending`, term status) in transaction

Response should include at least:
- `id`, `amount`, `paymentDate`, `paymentMode`, `receiptNo`, `status`, `receiptComponents`

## New Endpoints

### PATCH `/fees/payments/:paymentId/cancel`
Request body:
```json
{
  "reason": "Duplicate entry"
}
```

Expected logic:
1. Validate payment exists and current status is `SUCCESS`
2. Mark as `CANCELLED`
3. Save reason
4. Reverse paid contribution from linked student fee and term allocation
5. Recalculate:
- `totalPaid`
- `pending`
- term statuses (`PENDING | PARTIAL | PAID`)
6. Return updated payment

### PATCH `/fees/payments/:paymentId/refund`
Request body:
```json
{
  "refundAmount": 2500,
  "reason": "Admission withdrawn"
}
```

Expected logic:
1. Validate payment exists and current status is `SUCCESS`
2. Validate `refundAmount > 0` and `refundAmount <= payment.amount`
3. Mark as `REFUNDED`
4. Save `refundAmount` and reason
5. Reverse paid contribution by refunded amount from linked fee and term allocation
6. Recalculate aggregate fee/term statuses
7. Return updated payment

## Query Contract

### GET `/fees/payments/:studentFeeId`
Each payment row should return:
- `id`
- `amount`
- `paymentDate`
- `paymentMode`
- `termNumber`
- `receiptNo`
- `remarks`
- `status`
- `statusReason` (or `cancelReason` / `refundReason`)
- `refundAmount`
- `receiptComponents`

## Transaction Safety

All collect/cancel/refund operations should be transactional:
- Payment mutation
- Student-fee aggregate updates
- Term-level updates

This prevents mismatch between payment history and outstanding balances.

## Validation Rules Summary

- Cannot cancel or refund already cancelled/refunded payment
- `refundAmount` mandatory for refund
- `reason` mandatory for cancel/refund
- Return 400 for invalid state transitions

## Suggested Error Messages

- `Payment already cancelled`
- `Payment already refunded`
- `Refund amount cannot exceed paid amount`
- `Only successful payments can be cancelled or refunded`
