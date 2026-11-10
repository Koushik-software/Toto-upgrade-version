# TOTO DRIVE — GOOGLE PLAY STORE PUBLISHING GUIDE
**Apps Covered:**
- Passenger: `com.koushiksoftware.totodrive.passenger`
- Captain: `com.koushiksoftware.totodrive.captain`

---

## 1. Google Play Console Listing Details

### 1.1 Passenger App (`com.koushiksoftware.totodrive.passenger`)
- **App Name:** TOTO Drive — Instant Rides
- **Short Description (Max 80 chars):**  
  Fast, eco-friendly electric rickshaw & toto rides across Kolkata and Salt Lake.
- **Category:** Maps & Navigation / Travel & Local
- **Target Audience:** Everyone (13+)

### 1.2 Captain App (`com.koushiksoftware.totodrive.captain`)
- **App Name:** TOTO Captain — Driver Partner
- **Short Description (Max 80 chars):**  
  Accept instant ride requests, track earnings, and navigate trips in Kolkata.
- **Category:** Auto & Vehicles / Business
- **Target Audience:** Commercial Electric Rickshaw Drivers (18+)

---

## 2. Reviewer Login Credentials (For Google Play App Review Team)

To ensure smooth app verification during Google Play review, provide these test accounts in the **App Access** section:

### Passenger Test Account:
- **Phone Number:** `+91 9885187265`
- **Verification OTP:** `333328` (Permanent QA challenge code)
- **Role:** Active Passenger with ₹500 pre-loaded test wallet

### Captain Test Account:
- **Phone Number:** `+91 9876543210`
- **Driver PIN / OTP:** `998877`
- **Vehicle:** WB-02-EE-1234 (Verified Electric Toto)

---

## 3. Play Store Declaration & Permissions Justification

### 3.1 Location Permission Declaration
- **Passenger App:** `ACCESS_FINE_LOCATION` is requested solely while the app is in foreground to calculate pickup coordinates, estimate accurate municipal fares, and locate nearby available toto captains.
- **Captain App:** `ACCESS_FINE_LOCATION` & `ACCESS_BACKGROUND_LOCATION` (`FOREGROUND_SERVICE_LOCATION`) is required to continuously broadcast captain GPS coordinates to waiting passengers while navigating trips and scanning for nearby ride requests.

### 3.2 Data Safety Form
- **Location:** Collected and shared in real-time between passenger and captain during active trips. Encrypted in transit using HTTPS/TLS.
- **Financial Info:** Handled securely via YouPI-PG UPI gateway; no raw credit card or banking PINs are ever collected or stored.
- **Personal Info:** Mobile phone number for WhatsApp/SMS OTP authentication.
- **Data Deletion:** Account deletion is supported via Profile Settings (`DELETE /api/users/:id`).
