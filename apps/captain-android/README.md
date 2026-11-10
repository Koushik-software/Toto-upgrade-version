# TOTO Captain Android Application

**Package Name:** `in.totodrive.captain`  
**Architecture:** Modern Android MVVM with Jetpack Compose, Kotlin Coroutines, StateFlow, Foreground Service GPS Telemetry, and Retrofit2.  
**Backend:** Shared TOTO Drive backend running at `http://localhost:3000` (or production host).

---

## Features Implemented
1. **Captain Onboarding & Authentication:**
   - Registration with Full Name, Phone, Toto Vehicle Number, Vehicle Type, and 4-digit Secure PIN (`/api/captains/register`).
   - Secure Phone + PIN Login (`/api/captains/login`) returning session Bearer token.
   - Profile verification tracking (`/api/captains/:id/profile`).

2. **KYC Document Verification:**
   - Upload and status tracking for Driving License, Toto Registration Certificate (RC), Vehicle Insurance, Route Permit, and Aadhaar (`POST /api/captains/:id/documents`).
   - Admin audit and verification pipeline integration.

3. **Online/Offline Shift & GPS Telemetry:**
   - Instant duty toggle (`/api/drivers/:id/toggle-online`).
   - `CaptainGpsForegroundService` runs as a high-priority Android Foreground Service with notification, streaming continuous GPS coordinates, heading, speed, and accuracy to `/api/drivers/:id/location` every 4 seconds.

4. **Ride Dispatch Lifecycle:**
   - Realtime SSE stream (`/api/realtime/events?role=driver`) delivering instant customer ride offer broadcasts.
   - 15-second countdown accept/reject modal.
   - Atomic Compare-And-Swap (CAS) ride acceptance (`/api/rides/:id/accept`) ensuring zero double-booking across multiple captains.
   - Geofence arrival check (`/api/rides/:id/arrived`, requiring captain within 120m of pickup point).
   - Passenger OTP verification before trip start (`/api/rides/:id/start`).
   - Trip completion (`/api/rides/:id/complete`) with instant wallet credit and 10% platform fee calculation.

5. **Earnings & Ledger:**
   - Realtime daily earnings, weekly totals, acceptance rate, and wallet balance (`/api/wallets/captain/:id`).
   - Trip transaction ledger with automatic credit entries.

---

## Project Structure
```
apps/captain-android/
├── build.gradle.kts
├── settings.gradle.kts
└── app/
    ├── build.gradle.kts
    └── src/
        ├── main/
        │   ├── AndroidManifest.xml
        │   └── java/in/totodrive/captain/
        │       ├── data/
        │       │   ├── api/CaptainApiService.kt
        │       │   ├── model/CaptainModels.kt
        │       │   └── repository/CaptainRepository.kt
        │       ├── ui/
        │       │   ├── screens/CaptainScreens.kt
        │       │   └── viewmodel/CaptainShiftViewModel.kt, CaptainEarningsViewModel.kt
        │       └── service/CaptainGpsForegroundService.kt
        └── test/
            └── java/in/totodrive/captain/CaptainAppTest.kt
```

---

## Building & Running
Open `apps/captain-android` in Android Studio Ladybug or newer.
- Ensure Android SDK 34 is installed.
- Configure `BASE_URL` in `CaptainGpsForegroundService` and `CaptainRepository` to point to your TOTO Drive backend server.
- Run on an Android device or emulator with Location permissions enabled.
