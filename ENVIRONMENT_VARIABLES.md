# TOTO DRIVE — ENVIRONMENT VARIABLES SPECIFICATION

This document outlines all environment variables required by the TOTO Drive ecosystem across development and production environments.

---

## 1. Required Environment Variables

| Variable | Description | Example / Format | Required In |
|---|---|---|---|
| `PORT` | HTTP Server Port | `3000` | All |
| `NODE_ENV` | Runtime environment | `production` \| `development` | All |
| `DATABASE_URL` | PostgreSQL connection string | `postgres://user:pass@host:5432/totodrive` | Production |
| `JWT_SECRET` | Secret key for signing unified session tokens | `64-character hex string` | Production |
| `ADMIN_MASTER_PASSWORD` | Master password for central admin access | `StrongPassphrase#2026` | Production |
| `YOUPI_BASE_URL` | Base URL of YouPI payment gateway | `https://payments.totodrive.in` | All |
| `YOUPI_MERCHANT_ID` | Merchant account identifier | `totodrive_kolkata` | All |
| `YOUPI_MERCHANT_SECRET` | HMAC-SHA256 secret for webhook verification | `whsec_live_38472910...` | Production |
| `WHATSAPP_BERRY_SESSION`| Identifier for saved WhatsApp session | `youpi_berry_production` | All |
| `VITE_API_BASE_URL` | Client API endpoint for Android APK | `https://api.totodrive.in` | Android Production |

---

## 2. Security Rules for Secrets

1. **Never Bundle Secrets in Client Apps:**
   No `DATABASE_URL`, `ADMIN_MASTER_PASSWORD`, or `YOUPI_MERCHANT_SECRET` should ever appear in `src/`, `apps/passenger/`, or `apps/captain/`.
2. **Client Environment Variables:**
   Any environment variable accessed in React frontend code must start with `VITE_` and contain non-sensitive configuration only (such as API URLs or public map tile URLs).
3. **Local Dev Setup:**
   Copy `.env.example` to `.env` for local testing. In Google AI Studio, these are automatically configured.
