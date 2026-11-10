# TOTO DRIVE — ELECTRON ADMIN RELEASE GUIDE

**Target Application:** `admin-electron` (`apps/admin-electron/`)  
**Target Platform:** macOS Big Sur 11.7.11 (x86_64 Intel Architecture)  
**Package Output:** Native `.dmg` Installer Package

---

## 1. Prerequisites & Environment

```bash
cd apps/admin-electron
npm install
```

Ensure `build/entitlements.mac.plist` exists with strict hardened runtime permissions:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.security.app-sandbox</key>
    <false/>
    <key>com.apple.security.cs.allow-jit</key>
    <true/>
    <key>com.apple.security.network.client</key>
    <true/>
    <key>com.apple.security.network.server</key>
    <true/>
</dict>
</plist>
```

---

## 2. Build Commands

```bash
# 1. Compile TypeScript Main & Preload bundles
npm run build

# 2. Package Native macOS Big Sur Intel-Compatible DMG
npm run package:mac
```

Generated Output:
- macOS DMG Installer: `apps/admin-electron/dist/TotoDrive-Admin-2.0.0-x64.dmg`
