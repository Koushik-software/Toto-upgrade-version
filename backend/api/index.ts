/**
 * TOTO DRIVE — BACKEND API GATEWAY SPECIFICATION
 * Documents and exports unified REST endpoints and route handlers.
 */

export const API_ENDPOINTS = {
  HEALTH: '/api/health',
  METRICS: '/api/metrics',
  AUTH: {
    CHECK_CUSTOMER: '/api/auth/check-customer',
    WHATSAPP_SEND_OTP: '/api/auth/whatsapp/send-otp',
    WHATSAPP_VERIFY_OTP: '/api/auth/whatsapp/verify-otp',
    CAPTAIN_LOGIN: '/api/auth/captain/login',
    ADMIN_LOGIN: '/api/admin/login',
    ADMIN_VERIFY_SESSION: '/api/admin/verify-session',
  },
  RIDES: {
    CALCULATE_FARE: '/api/fare/calculate',
    REQUEST: '/api/rides/request',
    ACTIVE: '/api/rides/active',
    ACCEPT: '/api/rides/:id/accept',
    ARRIVED: '/api/rides/:id/arrived',
    START: '/api/rides/:id/start',
    COMPLETE: '/api/rides/:id/complete',
    CANCEL: '/api/rides/:id/cancel',
    RATE: '/api/ratings',
  },
  PAYMENTS: {
    YOUPI_CREATE_SESSION: '/api/payments/youpi/create-session',
    YOUPI_SUBMIT_UTR: '/api/payments/youpi/submit-utr',
    YOUPI_WEBHOOK: '/api/payments/youpi/webhook',
    RECEIPT: '/api/payments/receipt/:orderId',
  },
  REALTIME: {
    EVENTS: '/api/realtime/events',
  }
} as const;
