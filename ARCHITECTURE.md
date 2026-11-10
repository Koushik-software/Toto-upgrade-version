# TOTO DRIVE — SYSTEM ARCHITECTURE SPECIFICATION
**Version:** 3.0.0 (Production Multi-App Separation)  
**Target:** Android Google Play Store & Web Infrastructure  

---

## 1. System Overview

TOTO Drive is an authoritative electric rickshaw (Toto) dispatch and ride-hailing platform servicing the Greater Kolkata municipal zone. The platform is organized into three decoupled client applications, a unified authoritative backend, shared packages, and platform integrations.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        TOTO DRIVE CLIENT APPS                          │
│                                                                        │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────┐  │
│  │   Passenger App      │  │    Captain App       │  │ Admin Console│  │
│  │ (Android Capacitor)  │  │ (Android Capacitor)  │  │(Web/Electron)│  │
│  │ com.koushiksoftware. │  │ com.koushiksoftware. │  │ in.totodrive.│  │
│  │ totodrive.passenger  │  │ totodrive.captain    │  │ admin        │  │
│  └──────────┬───────────┘  └──────────┬───────────┘  └──────┬───────┘  │
└─────────────┼─────────────────────────┼─────────────────────┼──────────┘
              │                         │                     │
              ▼                         ▼                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                         SHARED PACKAGES                                │
│  packages/shared/ (types, utils, constants, validation)                │
│  packages/integrations/ (firebase, maps, youpi-pg, notifications)      │
└───────────────────────────────────────┬────────────────────────────────┘
                                        │
                                        ▼ HTTPS / WSS / SSE
┌────────────────────────────────────────────────────────────────────────┐
│                      SHARED AUTHORITATIVE BACKEND                      │
│                               (Node.js / Express)                      │
│                                                                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │  API Gateway │  │ State Engine │  │ Auth / RBAC  │  │ Rate Limit │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └─────┬──────┘  │
│         │                 │                 │                │         │
│  ┌──────▼───────┐  ┌──────▼───────┐  ┌──────▼───────┐  ┌─────▼──────┐  │
│  │ YouPI PG     │  │ WhatsApp OTP │  │ Wallet Ledger│  │ SSE Stream │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘  │
└───────────────────────────────────────┬────────────────────────────────┘
                                        │
                                        ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        DATA & STORAGE LAYER                            │
│  Authoritative PostgreSQL (Drizzle ORM) + Firebase Firestore & Auth    │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Directory Structure

```
TOTO-DRIVE/
├── apps/
│   ├── passenger/                 # Passenger Android Application
│   │   ├── src/app/PassengerApp.tsx
│   │   ├── capacitor.config.ts    # ID: com.koushiksoftware.totodrive.passenger
│   │   ├── android/               # Native Capacitor Android project
│   │   └── package.json
│   ├── captain/                   # Captain / Driver Android Application
│   │   ├── src/app/CaptainApp.tsx
│   │   ├── capacitor.config.ts    # ID: com.koushiksoftware.totodrive.captain
│   │   ├── android/               # Native Capacitor Android project
│   │   └── package.json
│   └── admin/                     # Central Admin Operations Console
│       ├── src/app/AdminApp.tsx
│       └── package.json
├── backend/
│   ├── api/                       # REST endpoint specifications & controllers
│   ├── services/                  # Wallet, Audit, Captain, Monitoring services
│   ├── auth/                      # Unified auth middleware & RBAC
│   ├── database/                  # PostgreSQL schema & migrations
│   ├── payments/                  # YouPI-PG integration & webhooks
│   ├── notifications/             # Push & in-app alerts
│   ├── dispatch/                  # Atomic CAS state machine & SSE dispatch
│   ├── gps/                       # Geofencing & distance telemetry
│   ├── otp/                       # WhatsApp OTP & BerryProtocol engine
│   └── config/                    # Rate limiters & environment config
├── packages/
│   ├── shared/                    # Types, constants, math, validation
│   └── integrations/              # Firebase, Leaflet, YouPI, Notifications
├── infrastructure/
│   ├── firebase/                  # Security rules & blueprints
│   ├── deployment/                # PM2 ecosystem & NGINX reverse proxy
│   └── environment/               # Environment specifications
├── tests/                         # Full automated test suites
├── server.ts                      # Authoritative Express entrypoint
└── package.json                   # Root orchestrator
```

---

## 3. Core Principles Preserved

1. **Zero UI Disruption:** All existing React screens, modals, styles, animations, and Leaflet interactive maps are preserved intact.
2. **Unified Data Integrity:** All three client applications connect to the single authoritative backend (`http://localhost:3000` in dev or `https://api.totodrive.in` in prod).
3. **Double-Entry Financial Ledger:** Every wallet transaction (passenger debit, captain credit, platform fee) is executed as an immutable atomic entry with idempotency keys.
4. **Hardware-Accelerated Android Native Apps:** Built via Capacitor 6 using target SDK 34 for maximum device performance and Google Play compliance.
