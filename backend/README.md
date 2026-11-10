# TOTO DRIVE SHARED PRODUCTION BACKEND
**Part 1/4 Reference Architecture**
**Target Clients:** Passenger Android, Captain Android, Electron Admin, Web PWA

---

## 1. Introduction

The **Toto Drive Shared Backend** is a unified, high-performance, production-hardened Node.js/Express service providing authoritative state management, concurrency-safe dispatch, Indian UPI payments via YouPI-PG, and real-time streaming for the Toto Drive ecosystem.

---

## 2. Directory Structure

```
├── server.ts                       # Main Express application & routing gateway
├── server/
│   ├── adminAuth.ts                # PBKDF2 administrative authentication & rate limiting
│   ├── businessEngine.ts           # Authoritative ride state machine & pricing engine
│   ├── smsGatewayService.ts        # Twilio & Firebase Phone Authentication adapter
│   ├── auth/
│   │   ├── authMiddleware.ts       # Unified Passenger, Captain & Admin JWT/Session guard
│   │   └── rolePermissions.ts      # Role-Based Access Control (RBAC) permission matrix
│   ├── db/
│   │   ├── schema.ts               # Drizzle ORM model definitions (15 relational tables)
│   │   └── migrations/
│   │       └── 001_production_schema.sql # PostgreSQL DDL migration script
│   └── services/
│       ├── captainService.ts       # Captain onboarding, vehicle & KYC document verification
│       ├── walletService.ts        # Double-entry ledger accounting & non-negative wallets
│       ├── youpiPaymentService.ts  # YouPI-PG UPI session, QR, UTR manual review & HMAC webhooks
│       ├── auditService.ts         # Tamper-evident admin & financial audit logging
│       ├── notificationService.ts  # In-app and push notification distribution
│       ├── realtimeDispatchService.ts # Server-Sent Events (SSE) telemetry & event streaming
│       ├── rateLimiter.ts          # In-memory sliding window token bucket rate limiter
│       └── monitoringService.ts    # Telemetry, process memory, and operational KPIs
├── tests/
│   └── backend.test.ts             # 26 automated unit and integration tests
├── backend/
│   ├── README.md                   # This overview document
│   ├── API_DOCUMENTATION.md        # Comprehensive REST & SSE endpoint specification
│   └── TEST_REPORT.md              # Automated test verification results
```

---

## 3. Key Subsystems

### 3.1 Multi-Role Authentication & RBAC
- **Passenger Auth:** Firebase ID Tokens or Passenger Bearer Tokens (`ttd_...`).
- **Captain Auth:** Phone + 6-digit PIN verification issuing signed Captain Bearer Tokens.
- **Admin Auth:** PBKDF2-SHA512 password hash with active session invalidation across roles (`super_admin`, `fleet_manager`, `support_agent`).

### 3.2 Concurrency-Safe Ride State Machine
Prevents race conditions through in-memory compare-and-swap (CAS) locks during ride acceptance. A ride can only be assigned to a single captain; concurrent acceptance requests receive `HTTP 409 Conflict`.
Valid state flow:
`IDLE` → `SEARCHING_DRIVER` → `DRIVER_ACCEPTED` → `DRIVER_ARRIVING` → `DRIVER_ARRIVED` → `RIDE_STARTED` → `RIDE_COMPLETED` → `PAYMENT_COMPLETED` → `CLOSED`.

### 3.3 YouPI-PG Indian UPI Integration
- Generates dynamic NPCI-compliant UPI Intent links (`upi://pay?...`) and vector SVG QR codes.
- Supports 12-digit Bank UTR claim submission with duplicate replay attack prevention.
- Admin review flow with manual settlement and double-entry ledger credit.
- HMAC-SHA256 signature verification for webhook events.

### 3.4 Double-Entry Financial Ledger
Every rupee moved across users, captains, and the platform master wallet is recorded with:
`wallet_id`, `transaction_type`, `amount`, `balance_before`, `balance_after`, `reference_id`, and `idempotency_key`.

### 3.5 Real-Time Telemetry & Dispatch
- Persistent Server-Sent Events (SSE) stream at `GET /api/realtime/events`.
- Instant push notifications for ride offers, arrival geofence alerts, trip start, invoice generation, and live GPS tracks.

---

## 4. Running Tests
```bash
npm test
```
Executes all 26 automated test specifications across 10 functional suites.
