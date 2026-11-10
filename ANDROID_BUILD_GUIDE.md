# TOTO DRIVE — ANDROID BUILD & RELEASE GUIDE
**Target:** Google Play Store Production Release  
**Framework:** Capacitor 6 / Android Native (Target SDK 34, Min SDK 24)  

---

## 1. Application Identifiers

| Application | Package ID | Display Name | Root Directory |
|---|---|---|---|
| **Passenger App** | `com.koushiksoftware.totodrive.passenger` | TOTO Drive | `apps/passenger/` |
| **Captain App** | `com.koushiksoftware.totodrive.captain` | TOTO Captain | `apps/captain/` |

---

## 2. Prerequisites & Environment Setup

- **Java Development Kit (JDK):** OpenJDK 17 or 21
- **Android Studio:** Android Studio Ladybug (2024.2.1) or newer
- **Android SDK:** Platforms API 34 (Android 14) and Android SDK Build-Tools 34.0.0
- **Node.js:** Node 20 LTS or Node 22

---

## 3. Production Keystore Generation

Generate release signing keystores securely using the JDK `keytool` utility. Run these in a secure directory on your local workstation:

```bash
# 1. Generate Passenger App Signing Keystore
keytool -genkeypair -v \
  -keystore totodrive-passenger-release.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias totodrive_passenger_key \
  -dname "CN=TOTO Drive Passenger, OU=Engineering, O=Koushik Software, L=Kolkata, ST=West Bengal, C=IN"

# 2. Generate Captain App Signing Keystore
keytool -genkeypair -v \
  -keystore totodrive-captain-release.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias totodrive_captain_key \
  -dname "CN=TOTO Captain, OU=Engineering, O=Koushik Software, L=Kolkata, ST=West Bengal, C=IN"
```

> ⚠️ **Security Warning:** Never commit `.jks` files or passwords into Git repositories. Store passwords in local environment variables or CI/CD secret managers.

---

## 4. Build & Capacitor Sync Workflow

### 4.1 Passenger App

```bash
# 1. Build Passenger production web assets
npm run passenger:build

# 2. Sync web assets and plugins to native Android
npx cap sync android --config apps/passenger/capacitor.config.ts

# 3. Open in Android Studio
npx cap open android --config apps/passenger/capacitor.config.ts
```

### 4.2 Captain App

```bash
# 1. Build Captain production web assets
npm run captain:build

# 2. Sync web assets and plugins to native Android
npx cap sync android --config apps/captain/capacitor.config.ts

# 3. Open in Android Studio
npx cap open android --config apps/captain/capacitor.config.ts
```

---

## 5. Generating Signed Android App Bundle (AAB) in Android Studio

1. Open the project in Android Studio (`apps/passenger/android` or `apps/captain/android`).
2. Navigate to **Build > Generate Signed Bundle / APK...**
3. Select **Android App Bundle** and click **Next**.
4. Point to your generated keystore file (`totodrive-passenger-release.jks` or `totodrive-captain-release.jks`).
5. Enter your Key Store Password, Key Alias, and Key Password.
6. Select build variant: **release**.
7. Check **V2 (Full APK Signature)** and click **Create**.
8. Output Location:
   - `apps/passenger/android/app/release/app-release.aab`
   - `apps/captain/android/app/release/app-release.aab`

---

## 6. Generating Local Testing APK (for Physical Device Sideloading)

To generate a fast installable testing APK via Gradle:

```bash
# In apps/passenger/android:
./gradlew assembleDebug

# Output APK:
# apps/passenger/android/app/build/outputs/apk/debug/app-debug.apk

# Install directly on connected USB Android device:
adb install apps/passenger/android/app/build/outputs/apk/debug/app-debug.apk
```
