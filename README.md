<<<<<<< HEAD
# TOTO DRIVE — PRODUCTION MULTI-APPLICATION ECOSYSTEM
**Eco-Friendly Electric Rickshaw (Toto) Dispatch & Ride-Hailing Platform**  
**Operating Zone:** Greater Kolkata, Salt Lake Sector V, New Town, Bidhannagar, West Bengal  
**Version:** 3.0.0 (Production Release)  

---

## 1. Project Organization & Subsystems

The TOTO Drive repository is organized into three decoupled client applications, a shared authoritative backend, and shared packages:

```
TOTO-DRIVE/
├── apps/
│   ├── passenger/                 # Passenger Android Mobile Application
│   │   ├── src/app/PassengerApp.tsx
│   │   ├── capacitor.config.ts    # App ID: com.koushiksoftware.totodrive.passenger
│   │   ├── android/               # Native Android Capacitor Project
│   │   └── package.json
│   ├── captain/                   # Captain / Driver Partner Android Application
│   │   ├── src/app/CaptainApp.tsx
│   │   ├── capacitor.config.ts    # App ID: com.koushiksoftware.totodrive.captain
│   │   ├── android/               # Native Android Capacitor Project
│   │   └── package.json
│   └── admin/                     # Central Administration Console
│       ├── src/app/AdminApp.tsx
│       └── package.json
├── backend/
│   ├── api/                       # REST endpoint specifications & controllers
│   ├── services/                  # Wallet, Audit, Captain, Monitoring services
│   ├── auth/                      # Unified auth middleware & RBAC
│   ├── database/                  # PostgreSQL schema & migrations
│   ├── payments/                  # YouPI-PG integration & webhooks
│   ├── notifications/             # In-app push notifications
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

## 2. Quick Start Commands

### 2.1 Unified Development Server (Port 3000)
```bash
# Starts authoritative backend on port 3000 with Vite middleware
npm run dev
```

### 2.2 Independent Application Builds
```bash
# Passenger Application
npm run passenger:build

# Captain Application
npm run captain:build

# Admin Console
npm run admin:build
```

### 2.3 Automated Test Suites
```bash
# Run all 56 automated unit, integration, and security tests:
npm run test:all
```

---

## 3. Production Android Builds via Capacitor & Android Studio

### 3.1 Passenger App (`com.koushiksoftware.totodrive.passenger`)
```bash
# 1. Build production web bundle
npm run passenger:build

# 2. Sync to native Android project
npx cap sync android --config apps/passenger/capacitor.config.ts

# 3. Open in Android Studio
npx cap open android --config apps/passenger/capacitor.config.ts
```
In Android Studio:
- Select **Build > Generate Signed Bundle / APK...**
- Choose **Android App Bundle** (AAB) with your release keystore.
- Output: `apps/passenger/android/app/release/app-release.aab`.

### 3.2 Captain App (`com.koushiksoftware.totodrive.captain`)
```bash
# 1. Build production web bundle
npm run captain:build

# 2. Sync to native Android project
npx cap sync android --config apps/captain/capacitor.config.ts

# 3. Open in Android Studio
npx cap open android --config apps/captain/capacitor.config.ts
```
In Android Studio:
- Select **Build > Generate Signed Bundle / APK...**
- Choose **Android App Bundle** (AAB) with your release keystore.
- Output: `apps/captain/android/app/release/app-release.aab`.

---

## 4. Key Integrations Overview

1. **WhatsApp OTP Login (BerryProtocol):** Formatted OTP challenges sent via WhatsApp with 60-second cooldown protection.
2. **YouPI-PG Payment Gateway:** Dynamic UPI QR generation with raw-body HMAC-SHA256 webhook validation and instant double-entry wallet credit.
3. **Double-Entry Financial Ledger:** Strict 90% captain payout / 10% platform commission with atomic CAS locking.
4. **Leaflet OpenStreetMap:** High-accuracy GPS tracking with 120-meter geofenced arrival validation.
5. **Authoritative PostgreSQL (Drizzle ORM):** 15 relational tables ensuring complete data consistency across all clients.

---

## 5. Documentation References

- `PROJECT_AUDIT_REPORT.md`: Comprehensive technical audit of all files and dependencies.
- `CLEANUP_REPORT.md`: Forensic cleanup report of redundant non-code files.
- `ARCHITECTURE.md`: Subsystem topology and atomic ride state machine.
- `ANDROID_BUILD_GUIDE.md`: Keystore generation and AAB/APK build guide.
- `PLAY_STORE_PUBLISHING_GUIDE.md`: Play Console listing and reviewer credentials.
- `INTEGRATIONS_STATUS.md`: Status of WhatsApp, YouPI, Leaflet, and Firebase.
- `ENVIRONMENT_VARIABLES.md`: Complete environment variables specification.
- `TEST_REPORT.md`: Automated test execution results (56/56 passed).
- `DEPLOYMENT_GUIDE.md`: Server deployment guide using NGINX and PM2.
=======
<div align="center">

<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

  <h1>Built with AI Studio</h2>

  <p>The fastest path from prompt to production with Gemini.</p>

  <a href="https://aistudio.google.com/apps">Start building</a>

</div>
>>>>>>> origin/main
