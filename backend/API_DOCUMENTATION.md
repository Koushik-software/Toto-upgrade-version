# TOTO DRIVE SHARED BACKEND — API DOCUMENTATION
**Specification Version:** 2.0 Production
**Protocols:** HTTPS / REST, Server-Sent Events (SSE)

---

## 1. Authentication Headers & Error Envelopes

### Headers
- `Authorization: Bearer <token>`
- `Content-Type: application/json`

### Error Response Envelope (RFC 7807 Inspired)
```json
{
  "success": false,
  "error": "Descriptive human-readable error message",
  "code": "MACHINE_READABLE_ERROR_CODE",
  "details": {}
}
```

---

## 2. Authentication & Admin Endpoints

### 2.1 Admin Setup & Status
- **`GET /api/admin/status`**
  - **Description:** Checks if super administrator account has been initialized.
  - **Response 200:** `{ "admin_exists": true, "initialized": true, "admin_count": 1 }`

- **`POST /api/admin/setup`**
  - **Description:** One-time initial setup for super admin account. Permanently closes registration once executed.
  - **Body:** `{ "username": "admin", "password": "...", "confirmPassword": "..." }`
  - **Response 201:** `{ "success": true, "message": "...", "admin": {...} }`
  - **Response 403:** `{ "error": "Admin account already exists.", "code": "ADMIN_ALREADY_EXISTS" }`

- **`POST /api/admin/login`**
  - **Body:** `{ "username": "admin", "password": "..." }`
  - **Response 200:** `{ "success": true, "token": "...", "admin": {...} }`
  - **Response 429:** `{ "error": "Too many failed attempts. Lockout active for 15 minutes." }`

- **`POST /api/admin/logout`**
  - **Headers:** `Authorization: Bearer <adminToken>`
  - **Response 200:** `{ "success": true, "message": "Logged out successfully." }`

- **`POST /api/admin/logout-all`**
  - **Description:** Terminates all active administrator sessions across all devices.
  - **Headers:** `Authorization: Bearer <adminToken>`

---

## 3. Captain (Driver) Lifecycle Endpoints

### 3.1 Captain Registration & Onboarding
- **`POST /api/captains/register`**
  - **Body:**
    ```json
    {
      "name": "Pranab Mukherjee",
      "phone": "+919811223344",
      "pin": "542109",
      "vehicleType": "toto",
      "vehicleNumber": "WB-24-ER-8899",
      "vehicleModel": "CityLife Li-ion Star",
      "vehicleColor": "Emerald Green",
      "capacity": 4,
      "documents": [
        {
          "documentType": "DRIVING_LICENSE",
          "documentNumber": "WB-01-20220099",
          "documentUrl": "https://...",
          "expiryDate": "2032-05-15"
        }
      ]
    }
    ```
  - **Response 201:** Returns created captain record with `approvalStatus: "pending"`.

### 3.2 Captain Login
- **`POST /api/captains/login`**
  - **Body:** `{ "phone": "+919811223344", "pin": "542109" }`
  - **Response 200:** `{ "success": true, "token": "ttd_...", "captain": {...} }`
  - **Response 401:** Returns error if PIN invalid or account pending verification.

### 3.3 Captain KYC Document Upload
- **`POST /api/captains/:id/documents`**
  - **Headers:** `Authorization: Bearer <captainToken>`
  - **Body:**
    ```json
    {
      "documentType": "VEHICLE_RC",
      "documentNumber": "RC-WB-24-8899",
      "documentUrl": "https://...",
      "expiryDate": "2035-10-01"
    }
    ```

### 3.4 Admin Document Verification
- **`POST /api/admin/captains/documents/:docId/verify`**
  - **Headers:** `Authorization: Bearer <adminToken>`
  - **Body:** `{ "action": "approve" | "reject", "rejectionReason": "..." }`

### 3.5 Captain Shift & Location Streaming
- **`POST /api/drivers/:id/toggle-online`**
  - **Body:** `{ "online": true, "lat": 22.5855, "lng": 88.4230 }`

- **`POST /api/drivers/:id/location`**
  - **Body:** `{ "lat": 22.5855, "lng": 88.4230, "heading": 90, "speed": 18 }`

---

## 4. Authoritative Ride Dispatch & State Machine

### 4.1 Fare Estimation
- **`POST /api/fare/calculate`**
  - **Body:**
    ```json
    {
      "vehicleType": "toto",
      "distanceKm": 4.5,
      "estimatedDurationMins": 14,
      "promoCode": "RAPIDOTOTO"
    }
    ```
  - **Response 200:** Returns `{ "baseFare", "distanceFare", "timeFare", "tax", "discount", "finalFare", "platformCommission", "driverEarnings" }`.

### 4.2 Request Ride
- **`POST /api/rides/request`**
  - **Body:**
    ```json
    {
      "userId": "usr_12345",
      "userName": "Passenger Name",
      "userPhone": "+919876543210",
      "pickup": { "lat": 22.5850, "lng": 88.4200, "address": "...", "name": "..." },
      "dropoff": { "lat": 22.5920, "lng": 88.4300, "address": "...", "name": "..." },
      "vehicleType": "toto",
      "paymentMethod": "cash" | "upi" | "wallet",
      "promoCode": "RAPIDOTOTO"
    }
    ```
  - **Response 201:** Returns `{ "ride": { "id", "otp", "status": "SEARCHING_DRIVER", ... } }`.
  - **Response 400:** Returns error if duplicate ride active (`ACTIVE_RIDE_EXISTS`).

### 4.3 Driver Accept Ride (Atomic CAS)
- **`POST /api/rides/:id/accept`**
  - **Headers:** `Authorization: Bearer <captainToken>`
  - **Body:** `{ "driverId": "drv_1" }`
  - **Response 200:** Returns `{ "success": true, "ride": {...} }`.
  - **Response 409:** `{ "code": "RIDE_ALREADY_ACCEPTED", "message": "Ride already accepted by another Captain." }`

### 4.4 Driver Arrived (Geofence Check)
- **`POST /api/rides/:id/arrived`**
  - **Body:** `{ "driverId": "drv_1", "lat": 22.5850, "lng": 88.4200 }`
  - **Response 422:** If coordinates are > 120m from pickup point.

### 4.5 Driver Start Ride (Strict OTP)
- **`POST /api/rides/:id/start`**
  - **Body:** `{ "driverId": "drv_1", "otp": "4821" }`
  - **Response 400:** If OTP is incorrect. Enforces 5-attempt lockout.

### 4.6 Driver Complete Ride
- **`POST /api/rides/:id/complete`**
  - **Body:** `{ "driverId": "drv_1", "actualDistanceKm": 4.6, "actualDurationMins": 16 }`
  - **Response 200:** Generates invoice, computes driver earnings, updates state to `RIDE_COMPLETED`.

### 4.7 Ride Cancellation
- **`POST /api/rides/:id/cancel`**
  - **Body:** `{ "actor": "customer" | "driver" | "admin", "reason": "..." }`

---

## 5. YouPI-PG Indian UPI Payment Gateway

### 5.1 Create Payment Session
- **`POST /api/payments/youpi/create-session`**
  - **Body:**
    ```json
    {
      "userId": "usr_12345",
      "amount": 150.00,
      "rideId": "ride_987",
      "notes": "Fare Payment"
    }
    ```
  - **Response 201:**
    ```json
    {
      "success": true,
      "session": {
        "id": "txn_...",
        "status": "ACTIVE",
        "upiIntentUrl": "upi://pay?pa=subratanaskar@icici&pn=Toto+Drive+Fleet&am=150.00&tr=txn_...&cu=INR",
        "qrSvg": "<svg>...</svg>",
        "expiresAt": "..."
      }
    }
    ```

### 5.2 Submit Bank UTR
- **`POST /api/payments/youpi/submit-utr`**
  - **Body:** `{ "sessionId": "txn_...", "utr": "325499881122" }`
  - **Response 200:** Updates session status to `MANUAL_REVIEW`. Replay attacks are blocked.

### 5.3 Admin UTR Review & Settlement
- **`POST /api/admin/payments/youpi/review`**
  - **Headers:** `Authorization: Bearer <adminToken>`
  - **Body:** `{ "sessionId": "txn_...", "action": "approve" | "reject", "notes": "..." }`
  - **Response 200:** On approval, sets status `VERIFIED`, credits wallet, and logs audit record.

### 5.4 Webhook Receiver
- **`POST /api/webhooks/youpi`**
  - **Headers:** `x-youpi-signature: <hmac-sha256-signature>`
  - **Body:** Gateway event payload. Verified via `YOUPI_WEBHOOK_SECRET`.

---

## 6. Realtime Telemetry (Server-Sent Events)

### 6.1 Connect Stream
- **`GET /api/realtime/events?role={passenger|captain|admin}&userId={id}`**
  - **Headers:** `Accept: text/event-stream`
  - **Stream Events:**
    - `RIDE_REQUESTED`
    - `RIDE_ACCEPTED`
    - `RIDE_ARRIVED`
    - `RIDE_STARTED`
    - `RIDE_COMPLETED`
    - `RIDE_CANCELLED`
    - `CAPTAIN_LOCATION_UPDATED`

---

## 7. Operational Observability

- **`GET /api/health`**
  - Returns `{ "status": "ok", "service": "toto-drive-shared-backend", "version": "2.0.0" }`.

- **`GET /api/metrics`**
  - Returns heap usage, uptime, active rides, connected SSE clients, and online captain counts.

- **`GET /api/admin/audit-logs`**
  - **Headers:** `Authorization: Bearer <adminToken>`
  - Returns tamper-evident administrative, financial, and security activity records.
