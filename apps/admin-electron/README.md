# Toto Drive — Electron Admin Desktop Console

**Application:** Toto Drive Fleet Operations & Financial Settlement Console  
**Target Platform:** macOS Big Sur 11.7.11 (Intel x86_64)  
**Package Artifact:** Apple Disk Image (`.dmg`) Installer  
**Security Model:** Hardened Runtime • Context Isolation • Zero Privileged Secret Bundling  

---

## 1. Executive Overview

The **Toto Drive Admin Console** is a native desktop application engineered specifically for fleet controllers, dispatch officers, compliance reviewers, and accountants. It connects securely over authenticated REST and Server-Sent Event (SSE) channels to the Toto Drive Shared Production Backend.

---

## 2. Platform Target & Compatibility

- **Host OS:** macOS Big Sur 11.7.11 (`darwin-x64`)
- **Architecture:** Intel `x86_64` (Rosetta 2 compatible on Apple Silicon)
- **Electron Version:** `^25.9.8` (Verified stable Big Sur macOS 11+ runtime with Chromium 114)
- **Node.js Target:** Node.js `>= 18.0.0`
- **Packaging Format:** macOS Hardened Runtime `.dmg` installer with Drag-to-Applications layout and Apple entitlements (`com.apple.security.cs.allow-jit`, `com.apple.security.network.client`).

---

## 3. Electron Security Architecture (Task 5 Compliance)

Every window and process in the Admin application adheres strictly to the **Electron Hardened Constitution**:

| Security Control | Implementation | Verification |
|---|---|---|
| **Context Isolation** | `webPreferences.contextIsolation = true` | Prevents renderer prototypes from accessing main process primitives |
| **Node Integration Disabled** | `webPreferences.nodeIntegration = false`, `nodeIntegrationInWorker = false` | Renderer cannot execute `require()`, `process`, or native Node modules |
| **Native OS Sandbox** | `webPreferences.sandbox = true` | Chromium sandbox restricts OS system call surfaces |
| **Secure Preload Bridge** | `contextBridge.exposeInMainWorld('adminBridge', ...)` | Exposes exclusively whitelisted IPC methods (`getAppInfo`, `exportReport`, `openExternal`) |
| **Content Security Policy (CSP)** | Enforced via `onHeadersReceived` session filter & `<meta>` tag | Blocks `eval`, inline foreign scripts, external iframe embeds (`frame-src 'none'`), plugins (`object-src 'none'`) |
| **Navigation Guard** | `webContents.on('will-navigate')` | Intercepts and blocks malicious URL redirects and phishing attempts |
| **Window Open Guard** | `webContents.setWindowOpenHandler()` | Denies arbitrary popups; routes external HTTPS links to macOS Safari |
| **Zero Secret Bundling** | Invariant | No database passwords, webhook secrets, or service role keys are packed in client code |
| **Inactivity Session Lock** | Automatic 15-minute countdown | Destroys in-memory Bearer token and locks the console upon inactivity |

---

## 4. Implemented Feature Suite (Task 4 Compliance)

1. **Administrator Authentication & RBAC:**
   - Multi-role support (`SUPER_ADMIN`, `FLEET_MANAGER`, `DISPATCHER`, `SUPPORT_AGENT`).
   - Secure in-memory token management with automatic inactivity session timeout.
2. **Dashboard & Operational KPIs:**
   - Today's revenue, platform fee (10%), active completed rides, online toto captains, pending UTR reviews, and KYC approvals.
3. **Live Radar & Fleet Dispatch Monitor:**
   - Visual radar tracking active toto captains with battery %, heading, and GPS coordinates.
   - Proximity monitoring around the 120m arrival geofence.
4. **Captains Management & KYC Approvals:**
   - Comprehensive registry of drivers, vehicles, and status.
   - Modal to inspect uploaded Driving Licenses, Toto Vehicle RCs, and Commercial Permits.
   - One-click approve/reject with administrative justification notes.
   - Captain UPI payout VPA configuration.
5. **Passenger Management & Wallets:**
   - Searchable customer roster, ride count, registration date, and active wallet balances.
6. **Rides & Trip Lifecycle Audit:**
   - Real-time and historical ride tracking with 4-digit passenger OTP verification, routes, and fare invoices.
7. **YouPI Payments & UTR Settlement:**
   - Real-time feed of all YouPI checkout sessions.
   - UTR Review Modal: Compare claimed 12-digit UTR with bank statements before approving or rejecting.
8. **Double-Entry Financial Ledger:**
   - Detailed ledger audit trail displaying debits, credits, balance before/after, and transaction hashes.
9. **Refund & Dispute Management:**
   - Issue instant in-app wallet refunds or record manual bank transfers with bank UTRs.
10. **Support & Complaints Desk:**
    - Incident ticketing interface for passenger and driver reports with resolution logging.
11. **Reports & Reconciliation:**
    - Financial reconciliation reports, GST compliance calculations, and native CSV report export via macOS save dialog.
12. **Rates & Platform Configuration:**
    - Base fare, per-km rate, commission percentage, night surcharges, and Owner Collection UPI VPA update.
13. **Cryptographic Platform Audit Trail:**
    - Immutable operational logs for all administrative actions with actor identity and timestamps.

---

## 5. Build, Packaging & Execution

### Compile Main & Preload Scripts:
```bash
npm run build:electron
```

### Run Electron Security Tests:
```bash
npm run test:electron
```

### Build macOS DMG Installer:
```bash
cd apps/admin-electron
npm run package:mac
```
Output artifact: `apps/admin-electron/dist-package/Toto Drive Admin Console-1.0.0.dmg`
