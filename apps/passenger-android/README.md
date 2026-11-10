# TOTO Drive Passenger Android Application

**Package Name:** `in.totodrive.passenger`  
**Architecture:** Modern Android MVVM with Jetpack Compose, Kotlin Coroutines, StateFlow, Retrofit2, and FusedLocationProvider.  
**Backend:** Shared TOTO Drive backend running at `http://localhost:3000` (or production host).

---

## Features Implemented
1. **Authentication:**
   - Phone OTP Authentication via SMS Gateway (`/api/auth/sms-gateway/send`, `/api/auth/sms-gateway/verify`).
   - Google Sign-In authentication.
   - Profile retrieval (`/api/users/me`) and account deletion (`DELETE /api/users/:id`).

2. **Ride Booking & Fare Estimation:**
   - Realtime fare estimation engine (`/api/fare/calculate`) with distance, duration, surge pricing, and promotional discount breakdown.
   - Ride dispatch creation (`/api/rides/request`) with unique idempotency keys preventing duplicate bookings.
   - 4-digit security OTP issuance for safe trip start validation with the Toto captain.

3. **Live Tracking & Status Updates:**
   - Realtime Server-Sent Events (SSE) listener (`/api/realtime/events?role=passenger`) for instant captain matching and location updates.
   - Active ride polling (`/api/rides/active`).
   - Ride cancellation with reason submission (`/api/rides/:id/cancel`).
   - Post-trip rating and feedback submission (`/api/ratings`).

4. **Wallet & YouPI-PG Payments:**
   - Digital wallet balance retrieval and ledger history (`/api/wallets/user/:userId`).
   - Realtime UPI QR and dynamic deep-link generation via YouPI-PG (`/api/payments/youpi/create-session`).
   - 12-digit UTR submission and instant automated verification (`/api/payments/youpi/submit-utr`).

5. **Customer Support & Notifications:**
   - In-app support ticketing (`/api/support/tickets`).
   - System notification stream (`/api/notifications`).

---

## Project Structure
```
apps/passenger-android/
├── build.gradle.kts
├── settings.gradle.kts
└── app/
    ├── build.gradle.kts
    └── src/
        ├── main/
        │   ├── AndroidManifest.xml
        │   └── java/in/totodrive/passenger/
        │       ├── data/
        │       │   ├── api/PassengerApiService.kt
        │       │   ├── model/AuthModels.kt, RideModels.kt, WalletModels.kt
        │       │   └── repository/PassengerRepository.kt
        │       ├── ui/
        │       │   ├── screens/PassengerScreens.kt
        │       │   └── viewmodel/BookingViewModel.kt, PassengerViewModel.kt
        │       └── service/PassengerLocationService.kt
        └── test/
            └── java/in/totodrive/passenger/PassengerAppTest.kt
```

---

## Building & Running
Open `apps/passenger-android` in Android Studio Ladybug or newer.
- Gradle Sync will automatically download Kotlin 1.9.22 and AndroidX Compose BOM dependencies.
- Configure `BASE_URL` in `PassengerRepository` pointing to your TOTO Drive backend server.
- Run on an Android emulator or physical device running Android 8.0 (API 26) or higher.
