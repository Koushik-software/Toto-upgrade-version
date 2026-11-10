# Toto Drive — YouPI Payment Gateway Integration Guide

This directory documents the integration, audit findings, cryptographic signature protocols, and financial ledger architecture for Toto Drive's UPI payment gateway integration using YouPI-PG.

---

## 1. Gateway Overview & Audit Summary

- **Audit Document:** `payment-gateway/YOUPI_AUDIT.md`
- **Gateway Source:** `payment-gateway/youpi-source/` (audited from `YouPI-PG-main.zip`)
- **Operational Mode:** **Verified Sovereign Escrow Mode**
- **Status:** Experimental P2P observation gateway. Live automated banking settlement is disabled; authoritative settlement requires double-entry ledger verification and recorded bank UTR claims.

### Key Architectural Characteristics
1. **P2P UPI Observer Rails:** Standard peer-to-peer UPI transfers land directly in the Platform Receiving VPA (`subratanaskar@icici`). The gateway parses incoming SMS/Gmail/Push notifications to attribute payment credits.
2. **Paise Integer Minor Units:** All monetary values are calculated in 64-bit integer paise (`1 INR = 100 paise`), eliminating floating-point rounding discrepancies.
3. **Single-Active-Slot FIFO Queue:** Standard P2P transfers do not carry dynamic merchant IDs in banking SMS. The gateway serializes concurrent sessions on the same receiving VPA.
4. **No Automated Captain Auto-Split:** Standard UPI cannot split funds at source. Passenger payments are collected centrally; Captain earnings are credited to the in-app wallet and disbursed upon manual withdrawal.

---

## 2. Implemented Payment Flows

### A. Passenger Wallet Recharge
```
Passenger App ➔ Request Top-Up ➔ POST /api/payments/youpi/create-session
     ➔ Dynamic NPCI Vector SVG QR & UPI Intent URL generated
     ➔ Passenger pays in UPI App (GPay/PhonePe/Paytm/BHIM)
     ➔ Passenger submits 12-digit Bank UTR ➔ POST /api/payments/youpi/submit-utr
     ➔ Status moved to MANUAL_REVIEW (Anti-replay checked)
     ➔ Admin reviews bank statement OR Signed Webhook received
     ➔ Double-Entry Ledger credits Passenger Wallet (WALLET_TOPUP)
     ➔ Status updated to VERIFIED (Idempotency locked)
```

### B. Direct Ride Payment & Captain Settlement
```
Passenger ➔ Complete Ride ➔ POST /api/payments/youpi/create-session (type: RIDE_PAYMENT)
     ➔ Linked to rideId & captainId
     ➔ Payment verified via Webhook or Admin UTR Review
     ➔ Atomic Ride Settlement: ride.paymentStatus = 'paid', status = 'CLOSED'
     ➔ Captain Wallet credited Net 90% Fare (RIDE_FARE)
     ➔ Platform Wallet credited 10% Fee (COMMISSION)
     ➔ Digital Tax Receipt generated (Base fare + 18% GST on platform fee)
```

### C. Refund Workflow
```
Admin Portal ➔ POST /api/admin/payments/youpi/refund
     ➔ Option 1: Instant In-App Wallet Credit (transactionType: REFUND)
     ➔ Option 2: Manual Bank Transfer with recorded Bank UTR
     ➔ Session status updated to REFUNDED
     ➔ Immutable audit trail logged
```

---

## 3. Webhook Specifications & Cryptographic Security

Incoming webhooks from YouPI are received at `POST /api/webhooks/youpi`.

### Required Headers:
| Header | Description |
|---|---|
| `X-Gateway-Event` | Event outcome (`SUCCESS`, `FAILED`, `EXPIRED`, `CANCELLED`, `MANUAL_REVIEW`) |
| `X-Gateway-Signature` | `sha256=<HMAC_SHA256_HEX>` computed over raw request body buffer |
| `X-Gateway-Signature-V2` | `sha256=<HMAC_SHA256_HEX>` computed over `<timestamp>.<raw_body>` |
| `X-Gateway-Delivery-Id` | Unique UUIDv4 per delivery for deduplication |
| `X-Gateway-Timestamp` | Millisecond epoch timestamp for clock drift and replay protection |

### Security Invariants Enforced:
1. **Raw Body Integrity:** The HMAC is computed directly against the unparsed byte buffer (`req.rawBody`).
2. **Timing-Safe Comparison:** Signatures are compared using `crypto.timingSafeEqual` to eliminate side-channel timing leaks.
3. **Replay & Duplicate Protection:** Deliveries with duplicate `deliveryId` are acknowledged idempotently without double-crediting balances.

---

## 4. Verification & Testing

Run the automated payment gateway test suite:
```bash
npm run test:payment
```

Executed test suites:
- Suite 1: Amount Validation (Zero, negative, min/max limits, integer paise)
- Suite 2: 12-digit UTR formatting and anti-replay detection
- Suite 3: HMAC-SHA256 signature verification & delivery deduplication
- Suite 4: Passenger wallet recharge & double-entry ledger credit
- Suite 5: Captain UPI configuration & 90/10 ride earnings settlement
- Suite 6: Refund workflow & digital receipt generation
- Suite 7: Financial ledger reconciliation reporting
