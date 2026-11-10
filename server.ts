import express from "express";
import http from "http";
import path from "path";
import crypto from "node:crypto";
import {
  adminExists,
  createInitialAdmin,
  authenticateAdmin,
  validateSessionToken,
  invalidateSession,
  invalidateAllSessions,
  changeAdminUsername,
  changeAdminPassword,
  changeAdminEmail,
  getAdminSecurityInfo,
  getAdminSafe,
  logSecurityActivity,
  verifyOwnerEmailAndIssueToken,
  requestAdminPasswordReset,
  verifyAdminRecoveryCode,
  resetAdminPasswordWithToken
} from "./server/adminAuth";
import {
  calculateAuthoritativeFare,
  setDriverOnlineStatusAuthoritative,
  syncDriverRecord,
  getOrCreateVehicle,
  createRideRequestAuthoritative,
  driverAcceptRideAuthoritative,
  expireRideAuthoritative,
  driverArrivedAuthoritative,
  driverStartRideAuthoritative,
  driverCompleteRideAuthoritative,
  settleRidePaymentAuthoritative,
  cancelRideAuthoritative,
  submitAuthoritativeRating,
  requestDriverWithdrawalAuthoritative,
  processWithdrawalAuthoritative,
  createSupportTicketAuthoritative,
  updateSupportTicketAuthoritative,
  getAdminOperationsSummary,
  getEngineState,
  updateSystemConfigAuthoritative,
  updateOwnerUpiAuthoritative,
  getDriverApprovalsAuthoritative,
  createDriverApprovalAuthoritative,
  approveDriverRegistrationAuthoritative,
  rejectDriverRegistrationAuthoritative,
  deleteDriverApprovalAuthoritative,
  getAllDriversAuthoritative,
  updateDriverLocationAuthoritative,
  deleteDriverAuthoritative,
  deleteUserAuthoritative,
  deleteRideAuthoritative,
  upsertUserAuthoritative,
  getAllUsersAuthoritative,
  sanitizeRideForRole,
  topupUserWalletAuthoritative
} from "./server/businessEngine";
import fs from "fs";
import { requireAuth, AuthRequest } from "./src/middleware/auth.ts";
import { getOrCreateUser, getUserProfile } from "./src/db/users.ts";
import { saveRide, getUserRides } from "./src/db/rides.ts";
import {
  requireAdmin,
  requireCaptain,
  requirePassenger,
  authenticateUnified,
  issueSessionToken,
  invalidateSessionToken,
  AuthenticatedRequest
} from "./server/auth/authMiddleware";
import {
  standardLimiter,
  authLimiter,
  otpLimiter,
  bookingLimiter
} from "./server/services/rateLimiter";
import {
  createYouPiPaymentSession,
  submitCustomerUtr,
  adminReviewUtr,
  verifyYouPiWebhookSignature,
  handleYouPiWebhook,
  getYouPiSession,
  getAllPaymentSessions,
  processPaymentRefund,
  generatePaymentReceipt,
  getPaymentReconciliationSummary,
  YOUPI_CONFIG
} from "./server/services/youpiPaymentService";
import {
  checkCustomerExists,
  sendWhatsAppOtp,
  verifyWhatsAppOtp,
  registerCustomerRecord
} from "./server/services/whatsappOtpAuthService";
import { whatsappBerryService } from "./server/services/whatsappBerryService";
import {
  getOrCreateWallet,
  executeWalletTransaction,
  getWalletLedger
} from "./server/services/walletService";
import {
  registerCaptainOnboarding,
  addCaptainDocument,
  reviewCaptainDocument,
  setCaptainApprovalStatus,
  authenticateCaptainWithPin,
  getAllCaptains,
  getCaptainById,
  updateCaptainPaymentConfig
} from "./server/services/captainService";
import {
  recordAuditLog,
  queryAuditLogs
} from "./server/services/auditService";
import {
  sendNotification,
  getNotificationsForRecipient,
  markNotificationAsRead
} from "./server/services/notificationService";
import {
  registerSseClient,
  broadcastRealtimeEvent,
  getActiveSseClientCount
} from "./server/services/realtimeDispatchService";
import {
  getSystemMetrics
} from "./server/services/monitoringService";

// Intercept process.stderr and process.stdout to prevent third-party pino error stream logs from berry-client from polluting process logs
const isBerryNoise = (str: string) =>
  str.includes('berry-client') ||
  str.includes('stream errored out') ||
  str.includes('Stream Errored') ||
  str.includes('connection errored') ||
  str.includes('noise-handler');

const origStderrWrite = process.stderr.write.bind(process.stderr);
process.stderr.write = function (chunk: any, encoding?: any, cb?: any): boolean {
  const str = typeof chunk === 'string' ? chunk : chunk?.toString() || '';
  if (isBerryNoise(str)) {
    return true;
  }
  return origStderrWrite(chunk, encoding, cb);
};

const origStdoutWrite = process.stdout.write.bind(process.stdout);
process.stdout.write = function (chunk: any, encoding?: any, cb?: any): boolean {
  const str = typeof chunk === 'string' ? chunk : chunk?.toString() || '';
  if (isBerryNoise(str)) {
    return true;
  }
  return origStdoutWrite(chunk, encoding, cb);
};

process.on('unhandledRejection', (reason: any) => {
  const msg = reason?.message || String(reason || '');
  if (
    msg.includes('Stream Errored') ||
    msg.includes('stream errored out') ||
    msg.includes('restart required') ||
    msg.includes('conflict') ||
    msg.includes('replaced') ||
    msg.includes('berry-client')
  ) {
    console.warn('[Server] Handled asynchronous WhatsApp transport stream notice gracefully.');
    return;
  }
  console.warn('[Server] Unhandled rejection notice:', msg);
});

async function startServer() {
  const app = express();
  const PORT = 3000;
  const httpServer = http.createServer(app);

  app.use(express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    }
  }));

  // Mount unified role-based authentication middleware
  app.use(authenticateUnified);

  // Helper to extract client IP
  const getClientIp = (req: express.Request): string => {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return req.socket.remoteAddress || '127.0.0.1';
  };

  // Helper middleware to authenticate admin session
  const requireAdminAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : undefined;
    const sessionCheck = validateSessionToken(token);

    if (!sessionCheck.valid) {
      logSecurityActivity('Unauthorized Admin API Request Rejected', getClientIp(req), false, req.path);
      res.status(401).json({ error: "Unauthorized access.", authenticated: false });
      return;
    }

    (req as any).admin = sessionCheck.admin;
    (req as any).adminToken = token;
    next();
  };

  // API Health check route
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      service: "toto-drive-shared-backend",
      version: "2.0.0",
      timestamp: new Date().toISOString()
    });
  });

  // System Telemetry & Operational Metrics
  app.get("/api/metrics", (req, res) => {
    try {
      const metrics = getSystemMetrics(getEngineState());
      res.json({ success: true, metrics });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to generate metrics" });
    }
  });

  // ==========================================
  // ADMIN AUTHENTICATION & SINGLE ACCOUNT APIS
  // ==========================================

  // 1. Check if admin account exists
  app.get("/api/admin/status", (req, res) => {
    const exists = adminExists();
    res.json({
      admin_exists: exists,
      initialized: exists,
      admin_count: exists ? 1 : 0
    });
  });

  // 2. Initial Admin Setup (Allowed ONLY when admin_count == 0)
  app.post("/api/admin/setup", (req, res) => {
    const ip = getClientIp(req);
    
    // STRICT ENFORCEMENT: Reject if admin already exists
    if (adminExists()) {
      res.status(403).json({
        error: "Admin account already exists. Registration is disabled.",
        code: "ADMIN_ALREADY_EXISTS"
      });
      return;
    }

    const { username, password, confirmPassword } = req.body || {};

    if (!username || !password) {
      res.status(400).json({ error: "Username and password are required." });
      return;
    }

    if (password !== confirmPassword) {
      res.status(400).json({ error: "Password and Confirm Password do not match." });
      return;
    }

    try {
      const result = createInitialAdmin(username, password, ip);
      if (!result.success) {
        res.status(400).json({ error: result.message });
        return;
      }
      res.status(201).json({
        success: true,
        message: "Administrator account created successfully. Admin setup is now permanently closed.",
        admin_id: "ADMIN_001",
        admin: result.admin
      });
    } catch (err: any) {
      res.status(403).json({
        error: err.message || "Admin registration is not permitted.",
        code: "ADMIN_CREATION_FAILED"
      });
    }
  });

  // 3. Reject any standard registration or duplicate creation attempts
  app.all(["/api/admin/register", "/admin/register"], (req, res) => {
    const ip = getClientIp(req);
    logSecurityActivity('Direct Registration Endpoint Accessed & Blocked', ip, false, req.originalUrl);
    
    if (adminExists()) {
      if (req.method === 'GET') {
        res.status(403).send(`<!DOCTYPE html>
<html>
  <head><title>Admin Registration Disabled</title><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #FAF8F5; color: #111; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
    <div style="background: white; border: 1px solid #EDE8E0; border-radius: 20px; padding: 32px; max-width: 420px; text-align: center; box-shadow: 0 4px 16px rgba(0,0,0,0.06);">
      <div style="width: 48px; height: 48px; border-radius: 50%; background: #FDE8DC; color: #C8622A; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; font-weight: bold; font-size: 20px;">!</div>
      <h2 style="margin: 0 0 8px; font-size: 18px;">Admin Registration Disabled</h2>
      <p style="color: #666; font-size: 13px; line-height: 1.5; margin: 0 0 20px;">Admin account already exists. Registration is disabled.</p>
      <a href="/" style="display: inline-block; padding: 10px 20px; background: #181818; color: white; border-radius: 12px; text-decoration: none; font-size: 13px; font-weight: 600;">Return to Application</a>
    </div>
  </body>
</html>`);
        return;
      }
      res.status(403).json({
        error: "Admin account already exists. Registration is disabled.",
        code: "REGISTRATION_DISABLED"
      });
      return;
    }
    res.redirect("/");
  });

  // 4. Admin Login with rate limiting and constant-time password verification
  app.post("/api/admin/login", (req, res) => {
    const ip = getClientIp(req);
    const { username, password } = req.body || {};

    if (!username || !password) {
      res.status(400).json({ error: "Username and password are required." });
      return;
    }

    const authResult = authenticateAdmin(username, password, ip);
    if (!authResult.success) {
      // Return 429 if rate-limited, otherwise 401 generic
      const isRateLimit = authResult.error?.includes('Too many failed');
      res.status(isRateLimit ? 429 : 401).json({
        error: authResult.error || "Invalid username or password."
      });
      return;
    }

    res.json({
      success: true,
      message: "Admin authenticated successfully",
      token: authResult.token,
      admin: getAdminSafe()
    });
  });

  // 5. Verify Active Admin Session
  app.get("/api/admin/verify-session", requireAdminAuth, (req, res) => {
    res.json({
      authenticated: true,
      admin: (req as any).admin
    });
  });

  // 6. Change Admin Username (Maintains SAME single admin_id ADMIN_001)
  app.post("/api/admin/change-username", requireAdminAuth, (req, res) => {
    const ip = getClientIp(req);
    const { currentPassword, newUsername } = req.body || {};

    if (!currentPassword || !newUsername) {
      res.status(400).json({ error: "Current password and new username are required." });
      return;
    }

    const result = changeAdminUsername(currentPassword, newUsername, ip);
    if (!result.success) {
      res.status(400).json({ error: result.message });
      return;
    }

    res.json({
      success: true,
      message: result.message,
      admin: result.admin
    });
  });

  // 7. Change Admin Password (Maintains SAME single admin_id ADMIN_001, invalidates other sessions)
  app.post("/api/admin/change-password", requireAdminAuth, (req, res) => {
    const ip = getClientIp(req);
    const { currentPassword, newPassword, confirmPassword } = req.body || {};

    if (!currentPassword || !newPassword || !confirmPassword) {
      res.status(400).json({ error: "All password fields are required." });
      return;
    }

    const result = changeAdminPassword(currentPassword, newPassword, confirmPassword, ip);
    if (!result.success) {
      res.status(400).json({ error: result.message });
      return;
    }

    // After password change, issue fresh session token for this current requestor
    const currentToken = (req as any).adminToken;
    invalidateSession(currentToken);
    const newAuth = authenticateAdmin((req as any).admin.username, newPassword, ip);

    res.json({
      success: true,
      message: result.message,
      token: newAuth.token
    });
  });

  // 8. Single Session Logout
  app.post("/api/admin/logout", (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : undefined;
    invalidateSession(token);
    res.json({ success: true, message: "Logged out successfully." });
  });

  // 9. Logout ALL Sessions across all browsers/devices
  app.post("/api/admin/logout-all", requireAdminAuth, (req, res) => {
    const ip = getClientIp(req);
    invalidateAllSessions(ip);
    res.json({
      success: true,
      message: "All admin sessions have been terminated. Please re-authenticate."
    });
  });

  // 10. Admin Security Dashboard Info (Activity logs, active sessions count, dates)
  app.get("/api/admin/security-info", requireAdminAuth, (req, res) => {
    const info = getAdminSecurityInfo();
    res.json({
      success: true,
      securityInfo: info
    });
  });

  // 11. Owner Account Recovery: Verify owner email directly and issue resetToken
  app.post("/api/admin/forgot-password/verify-email", (req, res) => {
    const ip = getClientIp(req);
    const { email } = req.body || {};
    if (!email) {
      res.status(400).json({ error: "Owner email is required." });
      return;
    }
    const result = verifyOwnerEmailAndIssueToken(email, ip);
    if (!result.success) {
      res.status(400).json({ error: result.error || "Unknown email address." });
      return;
    }
    res.json(result);
  });

  // 12. Owner Account Recovery / Forgot Password: Step 1 (Request OTP via Owner Email)
  app.post("/api/admin/forgot-password/request", (req, res) => {
    const ip = getClientIp(req);
    const { email } = req.body || {};
    if (!email) {
      res.status(400).json({ error: "Registered owner email address is required." });
      return;
    }
    const result = requestAdminPasswordReset(email, ip);
    if (!result.success) {
      res.status(400).json({ error: result.error || result.message });
      return;
    }
    res.json(result);
  });

  // 12. Owner Account Recovery / Forgot Password: Step 2 (Verify 6-digit OTP Code)
  app.post("/api/admin/forgot-password/verify-code", (req, res) => {
    const ip = getClientIp(req);
    const { email, code } = req.body || {};
    if (!email || !code) {
      res.status(400).json({ error: "Both registered email and 6-digit verification code are required." });
      return;
    }
    const result = verifyAdminRecoveryCode(email, code, ip);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json(result);
  });

  // 13. Owner Account Recovery / Forgot Password: Step 3 (Reset Password with verified token)
  app.post("/api/admin/forgot-password/reset", (req, res) => {
    const ip = getClientIp(req);
    const { resetToken, newPassword, confirmPassword } = req.body || {};
    if (!resetToken || !newPassword || !confirmPassword) {
      res.status(400).json({ error: "Reset authorization token and new password fields are required." });
      return;
    }
    const result = resetAdminPasswordWithToken(resetToken, newPassword, confirmPassword, ip);
    if (!result.success) {
      res.status(400).json({ error: result.error || result.message });
      return;
    }
    res.json(result);
  });

  // 14. Change Admin Owner Email Address (Authenticated)
  app.post("/api/admin/change-email", requireAdminAuth, (req, res) => {
    const ip = getClientIp(req);
    const { currentPassword, newEmail } = req.body || {};
    if (!currentPassword || !newEmail) {
      res.status(400).json({ error: "Current password and new email are required." });
      return;
    }
    const result = changeAdminEmail(currentPassword, newEmail, ip);
    if (!result.success) {
      res.status(400).json({ error: result.message });
      return;
    }
    res.json(result);
  });

  // ==============================================================================
  // AUTHORITATIVE TOTO DRIVE BUSINESS ENGINE APIS
  // ==============================================================================

  // 1. Authoritative Fare Estimation API
  app.post("/api/fare/calculate", (req, res) => {
    try {
      const { vehicleType, distanceKm, estimatedDurationMins, waitingMinutes, promoCode } = req.body || {};
      if (typeof distanceKm !== 'number') {
        res.status(400).json({ error: "distanceKm is required." });
        return;
      }
      const fare = calculateAuthoritativeFare({
        vehicleType: vehicleType || 'toto',
        distanceKm,
        estimatedDurationMins,
        waitingMinutes,
        promoCode
      });
      res.json({ success: true, fare });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to calculate fare." });
    }
  });

  // 2. Authoritative Ride Booking & Matching Dispatch API
  app.post("/api/rides/request", (req, res) => {
    try {
      const { userId, userName, userPhone, pickup, dropoff, vehicleType, paymentMethod, promoCode, targetDriverId } = req.body || {};
      if (!userId || !pickup || !dropoff) {
        res.status(400).json({ error: "Missing required ride booking parameters." });
        return;
      }
      const result = createRideRequestAuthoritative({
        userId,
        userName: userName || 'Passenger',
        userPhone: userPhone || '',
        pickup,
        dropoff,
        vehicleType: vehicleType || 'toto',
        paymentMethod: paymentMethod || 'cash',
        promoCode,
        targetDriverId
      });

      // Asynchronously mirror ride record to Cloud SQL
      if (result.ride) {
        saveRide({
          id: result.ride.id,
          userId: result.ride.userId,
          pickupName: result.ride.pickup?.name || 'Pickup',
          pickupAddress: result.ride.pickup?.address || '',
          dropoffName: result.ride.dropoff?.name || 'Destination',
          dropoffAddress: result.ride.dropoff?.address || '',
          distanceKm: String(result.ride.distanceKm || 0),
          fare: Math.round(result.ride.finalFare || result.ride.estimatedFare || 0),
          status: result.ride.status,
          paymentMethod: result.ride.paymentMethod || 'cash',
          couponDiscount: Math.round(result.ride.discount || 0)
        }).catch((err) => console.warn("Cloud SQL ride save notice:", err?.message));
      }

      res.status(201).json({ success: true, ...result });
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Ride request rejected by business engine." });
    }
  });

  // 3. Active Ride Recovery (App restart recovery)
  app.get("/api/rides/active", (req, res) => {
    try {
      const { userId, driverId, role } = req.query;
      const state = getEngineState();
      const allRides = Object.values(state.rides);

      let active: any = null;
      if (userId) {
        active = allRides.find(r => r.userId === userId && !['CLOSED', 'CUSTOMER_CANCELLED', 'DRIVER_CANCELLED'].includes(r.status));
      } else if (driverId) {
        active = allRides.find(r => r.driverId === driverId && !['CLOSED', 'CUSTOMER_CANCELLED', 'DRIVER_CANCELLED'].includes(r.status));
      }

      const requesterRole = (role as string) || (driverId ? 'driver' : 'customer');
      const requesterId = (userId as string) || (driverId as string);
      const sanitized = sanitizeRideForRole(active, requesterRole, requesterId);

      res.json({ success: true, activeRide: sanitized });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch active ride." });
    }
  });

  // 3b. Authoritative All Rides Listing (for real-time multi-device sync)
  app.get("/api/rides", (req, res) => {
    try {
      const { role, requesterId } = req.query;
      const state = getEngineState();
      const allRides = Object.values(state.rides)
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        .map(r => sanitizeRideForRole(r, role as string, requesterId as string));
      res.json({ success: true, rides: allRides });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch rides." });
    }
  });

  // 4. Atomic Ride Acceptance by Driver
  app.post("/api/rides/:id/accept", (req, res) => {
    try {
      const rideId = req.params.id;
      const { driverId, driver: fallbackDriver, ride: fallbackRide } = req.body || {};
      if (!driverId) {
        res.status(400).json({ error: "driverId is required to accept ride." });
        return;
      }
      const result = driverAcceptRideAuthoritative(rideId, driverId, fallbackRide, fallbackDriver);
      if (!result.success) {
        res.status(result.code === 'RIDE_ALREADY_ACCEPTED' || result.code === 'CONCURRENT_ACCEPTANCE' ? 409 : 400).json(result);
        return;
      }
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to accept ride." });
    }
  });

  // 4b. Expire Ride When No Captain Accepts Within Expiration Window
  app.post("/api/rides/:id/expire", (req, res) => {
    try {
      const rideId = req.params.id;
      const result = expireRideAuthoritative(rideId);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to expire ride." });
    }
  });

  // 5. Driver Arrived at Pickup (Geofence validated)
  app.post("/api/rides/:id/arrived", (req, res) => {
    try {
      const rideId = req.params.id;
      const { driverId, lat, lng } = req.body || {};
      if (!driverId) {
        res.status(400).json({ error: "driverId is required." });
        return;
      }
      const result = driverArrivedAuthoritative(rideId, driverId, lat, lng);
      if (!result.success) {
        res.status(result.code === 'OUTSIDE_ARRIVAL_GEOFENCE' ? 422 : 400).json(result);
        return;
      }
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to mark arrived." });
    }
  });

  // 6. Driver Start Ride with Strict 4-Digit OTP Verification (No 1234 Bypass)
  app.post("/api/rides/:id/start", (req, res) => {
    try {
      const rideId = req.params.id;
      const { driverId, otp } = req.body || {};
      if (!driverId || !otp) {
        res.status(400).json({ error: "driverId and 4-digit otp are required to start trip." });
        return;
      }
      const result = driverStartRideAuthoritative(rideId, driverId, otp);
      if (!result.success) {
        res.status(result.code === 'INVALID_OTP' ? 400 : result.code === 'MAX_OTP_ATTEMPTS_EXCEEDED' ? 403 : 400).json(result);
        return;
      }
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to start ride." });
    }
  });

  // 7. Driver Complete Ride & Generate Authoritative Invoice
  app.post("/api/rides/:id/complete", (req, res) => {
    try {
      const rideId = req.params.id;
      const { driverId, actualDistanceKm, actualDurationMins } = req.body || {};
      if (!driverId) {
        res.status(400).json({ error: "driverId is required." });
        return;
      }
      const result = driverCompleteRideAuthoritative(rideId, driverId, actualDistanceKm, actualDurationMins);
      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      // Asynchronously mirror completed ride to Cloud SQL
      if (result.ride) {
        saveRide({
          id: result.ride.id,
          userId: result.ride.userId,
          driverId: result.ride.driverId,
          driverName: result.ride.driverName,
          pickupName: result.ride.pickup?.name || 'Pickup',
          pickupAddress: result.ride.pickup?.address || '',
          dropoffName: result.ride.dropoff?.name || 'Destination',
          dropoffAddress: result.ride.dropoff?.address || '',
          distanceKm: String(result.ride.distanceKm || 0),
          fare: Math.round(result.ride.finalFare || result.ride.estimatedFare || 0),
          status: 'completed',
          paymentMethod: result.ride.paymentMethod || 'cash',
          couponDiscount: Math.round(result.ride.discount || 0)
        }).catch((err) => console.warn("Cloud SQL complete ride notice:", err?.message));
      }

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to complete ride." });
    }
  });

  // 8. Payment Settlement
  app.post("/api/rides/:id/pay", (req, res) => {
    try {
      const rideId = req.params.id;
      const { paymentMethod } = req.body || {};
      const result = settleRidePaymentAuthoritative(rideId, paymentMethod || 'cash');
      if (!result.success) {
        res.status(400).json(result);
        return;
      }
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to confirm payment." });
    }
  });

  // User Profile Sync Endpoint (Authoritative Business Engine & WhatsApp Auth Sync)
  app.post("/api/users/sync", (req, res) => {
    try {
      const payload = req.body || {};
      const userObj = payload.user || payload;

      let syncedUser: any = null;
      if (userObj && (userObj.id || userObj.phone || userObj.mobileNumber)) {
        const resObj = upsertUserAuthoritative(userObj);
        syncedUser = resObj.user || userObj;
        registerCustomerRecord(syncedUser);
      }

      // Also attempt Cloud SQL sync if Firebase Auth user is attached
      const uid = (req as any).user?.uid;
      if (uid) {
        getOrCreateUser(uid, (req as any).user?.email, userObj?.name, userObj?.phone).catch(() => {});
      }

      res.json({ success: true, user: syncedUser || userObj });
    } catch (error: any) {
      console.error("User sync error:", error);
      res.status(500).json({ error: error.message || "Failed to synchronize user profile" });
    }
  });

  // Get All Users API
  app.get("/api/users", (_req, res) => {
    try {
      const users = getAllUsersAuthoritative();
      res.json({ success: true, users });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to retrieve users" });
    }
  });

  // Cloud SQL Relational User Profile Retrieval
  app.get("/api/users/me", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      if (!uid) {
        res.status(401).json({ error: "Unauthorized: Missing Firebase UID" });
        return;
      }
      const user = await getUserProfile(uid);
      res.json({ success: true, user });
    } catch (error: any) {
      console.error("Cloud SQL user query error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch user profile" });
    }
  });

  // Cloud SQL Relational User Rides History
  app.get("/api/sql/rides", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      if (!uid) {
        res.status(401).json({ error: "Unauthorized: Missing Firebase UID" });
        return;
      }
      const userRides = await getUserRides(uid);
      res.json({ success: true, rides: userRides });
    } catch (error: any) {
      console.error("Cloud SQL rides query error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch rides" });
    }
  });

  // Direct Authoritative Wallet Recharge for Passengers
  app.post("/api/wallet/topup", (req, res) => {
    try {
      const { userId, amount, paymentMethod, referenceId } = req.body || {};
      if (!userId || !amount) {
        res.status(400).json({ error: "userId and amount are required" });
        return;
      }
      const result = topupUserWalletAuthoritative(userId, Number(amount), paymentMethod || 'direct_upi', referenceId);
      if (!result.success) {
        res.status(400).json(result);
        return;
      }
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to top up wallet." });
    }
  });

  // GET Platform Owner UPI Configuration
  app.get("/api/admin/owner-upi", (_req, res) => {
    try {
      const state = getEngineState();
      const cfg = state.systemConfig;
      res.json({
        success: true,
        config: {
          ownerUpiId: cfg.ownerUpiId || 'subratanaskar@icici',
          ownerPayeeName: cfg.ownerPayeeName || 'Subrata Naskar (Toto Drive Fleet)',
          ownerSettlementBank: cfg.ownerSettlementBank || 'ICICI Bank'
        }
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 12. Security & Banned Users API
  app.get("/api/v1/admin/security/banned-users", (_req, res) => {
    res.json({ bannedUsers: [], count: 0 });
  });

  app.get("/api/v1/admin/security/events", (_req, res) => {
    res.json({
      events: [
        {
          id: "sec_001",
          type: "RATE_LIMIT_CHECK",
          severity: "INFO",
          message: "System security and rate limiter active",
          timestamp: new Date().toISOString()
        }
      ]
    });
  });

  // 9. Cancel Ride Authoritative
  app.post("/api/rides/:id/cancel", (req, res) => {
    try {
      const rideId = req.params.id;
      const { actor, reason } = req.body || {};
      const result = cancelRideAuthoritative(rideId, actor || 'customer', reason);
      if (!result.success) {
        res.status(400).json(result);
        return;
      }
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to cancel ride." });
    }
  });

  // 10. Driver Toggle Online / Offline with Full Validation
  app.post("/api/drivers/:id/toggle-online", (req, res) => {
    try {
      const driverId = req.params.id;
      const { online, lat, lng } = req.body || {};
      const result = setDriverOnlineStatusAuthoritative(driverId, Boolean(online), lat, lng);
      if (!result.success) {
        res.status(400).json(result);
        return;
      }
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to toggle driver status." });
    }
  });

  // 11. Sync Driver Profile Record
  app.post("/api/drivers/sync", (req, res) => {
    try {
      const driverData = req.body;
      if (!driverData || !driverData.id || !driverData.name) {
        res.status(400).json({ error: "Valid driver record with id and name required." });
        return;
      }
      const synced = syncDriverRecord(driverData);
      const vehicle = getOrCreateVehicle(driverData.id, driverData.vehicle);
      res.json({ success: true, driver: synced, vehicle });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to sync driver." });
    }
  });

  // 12. Driver Transaction Ledger API
  app.get("/api/drivers/:id/ledger", (req, res) => {
    try {
      const driverId = req.params.id;
      const state = getEngineState();
      const entries = state.ledger.filter(l => l.driverId === driverId);
      const driver = state.drivers[driverId];
      res.json({
        success: true,
        balance: driver ? driver.walletBalance : 0,
        entries
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch ledger." });
    }
  });

  // 13. Driver Withdrawal Request API
  app.post("/api/drivers/:id/withdraw", (req, res) => {
    try {
      const driverId = req.params.id;
      const { amount, method, payoutDetails } = req.body || {};
      if (!amount || !method || !payoutDetails) {
        res.status(400).json({ error: "amount, method, and payoutDetails are required." });
        return;
      }
      const result = requestDriverWithdrawalAuthoritative(driverId, Number(amount), method, payoutDetails);
      if (!result.success) {
        res.status(400).json(result);
        return;
      }
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to process withdrawal request." });
    }
  });

  // 14. Ratings Submission & Inspection API
  app.post("/api/ratings", (req, res) => {
    try {
      const { rideId, fromUserId, toUserId, fromRole, rating, comment } = req.body || {};
      if (!rideId || !fromUserId || !toUserId || !rating) {
        res.status(400).json({ error: "Missing required rating parameters." });
        return;
      }
      const result = submitAuthoritativeRating({
        rideId,
        fromUserId,
        toUserId,
        fromRole: fromRole || 'customer',
        rating: Number(rating),
        comment
      });
      if (!result.success) {
        res.status(400).json(result);
        return;
      }
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to submit rating." });
    }
  });

  app.get("/api/ratings", (req, res) => {
    try {
      const state = getEngineState();
      res.json({ success: true, ratings: state.ratings });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 15. Coupon Validation API
  app.post("/api/coupons/validate", (req, res) => {
    try {
      const { code, fareAmount } = req.body || {};
      if (!code) {
        res.status(400).json({ error: "Coupon code is required." });
        return;
      }
      const state = getEngineState();
      const coupon = state.coupons[code.trim().toUpperCase()];
      if (!coupon || !coupon.isActive) {
        res.status(404).json({ valid: false, message: "Invalid or inactive promo code." });
        return;
      }
      if (new Date(coupon.expiryDate) < new Date()) {
        res.status(400).json({ valid: false, message: "Coupon has expired." });
        return;
      }
      if (fareAmount && fareAmount < coupon.minFare) {
        res.status(400).json({ valid: false, message: `Minimum ride fare for this coupon is ₹${coupon.minFare}.` });
        return;
      }

      let discount = coupon.discountType === 'percentage'
        ? Math.min(coupon.maxDiscount, Math.round(((fareAmount || 50) * coupon.discountValue) / 100))
        : Math.min(coupon.maxDiscount, coupon.discountValue);

      res.json({
        valid: true,
        code: coupon.code,
        discount,
        coupon
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 16. Support Tickets API
  app.get("/api/support/tickets", (req, res) => {
    try {
      const { userId } = req.query;
      const state = getEngineState();
      let list = state.supportTickets;
      if (userId) {
        list = list.filter(t => t.userId === userId);
      }
      res.json({ success: true, tickets: list });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/support/tickets", (req, res) => {
    try {
      const { userId, userName, userRole, rideId, category, subject, description, priority } = req.body || {};
      if (!userId || !subject || !description) {
        res.status(400).json({ error: "userId, subject, and description are required." });
        return;
      }
      const ticket = createSupportTicketAuthoritative({
        userId,
        userName: userName || 'User',
        userRole: userRole || 'user',
        rideId,
        category: category || 'other',
        subject,
        description,
        priority
      });
      res.status(201).json({ success: true, ticket });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/support/tickets/:id", requireAdminAuth, (req, res) => {
    try {
      const ticketId = req.params.id;
      const updates = req.body;
      const result = updateSupportTicketAuthoritative(ticketId, updates);
      if (!result.success) {
        res.status(404).json({ error: "Ticket not found." });
        return;
      }
      res.json({ success: true, ticket: result.ticket });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 17. Admin Operations Summary & KPIs
  app.get("/api/admin/operations-summary", requireAdminAuth, (req, res) => {
    try {
      const summary = getAdminOperationsSummary();
      res.json({ success: true, summary });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 18. Admin Pricing Controls API
  app.get("/api/admin/pricing", (req, res) => {
    try {
      const state = getEngineState();
      res.json({ success: true, pricing: state.systemConfig });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/admin/pricing", requireAdminAuth, (req, res) => {
    try {
      const updated = updateSystemConfigAuthoritative(req.body);
      res.json({ success: true, pricing: updated, message: "System pricing and parameters updated." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Dedicated Admin API: Update Platform Owner Account UPI & Settlement Details
  app.post("/api/admin/owner-upi", requireAdminAuth, (req, res) => {
    try {
      const { ownerUpiId, ownerPayeeName, ownerSettlementBank } = req.body || {};
      const result = updateOwnerUpiAuthoritative({
        ownerUpiId,
        ownerPayeeName,
        ownerSettlementBank
      });
      if (!result.success) {
        res.status(400).json({ error: result.message });
        return;
      }
      res.json({
        success: true,
        message: result.message,
        config: result.config
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 19. Admin Service Areas API
  app.get("/api/admin/service-areas", (req, res) => {
    try {
      const state = getEngineState();
      res.json({ success: true, serviceAreas: state.serviceAreas });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/admin/service-areas", requireAdminAuth, (req, res) => {
    try {
      const state = getEngineState();
      const { name, city, centerLat, centerLng, radiusKm, isActive, description } = req.body || {};
      const newArea = {
        id: 'area_' + Date.now().toString(36),
        name: name || 'Operating Zone',
        city: city || 'Kolkata',
        centerLat: Number(centerLat),
        centerLng: Number(centerLng),
        radiusKm: Number(radiusKm) || 15,
        isActive: isActive !== false,
        description: description || ''
      };
      state.serviceAreas.push(newArea);
      res.status(201).json({ success: true, serviceArea: newArea });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 20. Admin Withdrawals & Payouts Processing
  app.get("/api/admin/withdrawals", requireAdminAuth, (req, res) => {
    try {
      const state = getEngineState();
      res.json({ success: true, withdrawals: state.withdrawals });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/admin/withdrawals/:id/process", requireAdminAuth, (req, res) => {
    try {
      const id = req.params.id;
      const { action, notes } = req.body || {};
      const result = processWithdrawalAuthoritative(id, action === 'reject' ? 'reject' : 'approve', notes);
      if (!result.success) {
        res.status(400).json(result);
        return;
      }
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 21. Admin Vehicles Management API
  app.get("/api/admin/vehicles", requireAdminAuth, (req, res) => {
    try {
      const state = getEngineState();
      res.json({ success: true, vehicles: Object.values(state.vehicles) });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/admin/vehicles/:id/status", requireAdminAuth, (req, res) => {
    try {
      const vehicleId = req.params.id;
      const { status } = req.body || {};
      const state = getEngineState();
      const vehicle = state.vehicles[vehicleId];
      if (!vehicle) {
        res.status(404).json({ error: "Vehicle not found." });
        return;
      }
      vehicle.verification_status = status;
      vehicle.updated_at = new Date().toISOString();
      res.json({ success: true, vehicle, message: `Vehicle status updated to ${status}.` });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });


  // 22. Driver Approvals & Registration Management APIs
  app.get("/api/driver-approvals", (req, res) => {
    try {
      const approvals = getDriverApprovalsAuthoritative();
      res.json({ success: true, approvals });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to retrieve driver approvals." });
    }
  });

  app.post("/api/driver-approvals", (req, res) => {
    try {
      const payload = req.body || {};
      if (!payload.driverName || !payload.phone || !payload.vehicleNumber) {
        res.status(400).json({ error: "driverName, phone, and vehicleNumber are required." });
        return;
      }
      const result = createDriverApprovalAuthoritative(payload);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to submit driver registration." });
    }
  });

  app.post("/api/driver-approvals/:id/approve", (req, res) => {
    try {
      const approvalId = req.params.id;
      const { pin } = req.body || {};
      const result = approveDriverRegistrationAuthoritative(approvalId, pin);
      if (!result.success) {
        res.status(400).json(result);
        return;
      }
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to approve driver." });
    }
  });

  app.post("/api/driver-approvals/:id/reject", (req, res) => {
    try {
      const approvalId = req.params.id;
      const { reason } = req.body || {};
      const result = rejectDriverRegistrationAuthoritative(approvalId, reason);
      if (!result.success) {
        res.status(400).json(result);
        return;
      }
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to reject driver." });
    }
  });

  app.delete("/api/driver-approvals/:id", (req, res) => {
    try {
      const approvalId = req.params.id;
      const result = deleteDriverApprovalAuthoritative(approvalId);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to delete driver approval." });
    }
  });

  // 23. Drivers List API
  app.get("/api/drivers", (req, res) => {
    try {
      const drivers = getAllDriversAuthoritative();
      res.json({ success: true, drivers });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to retrieve drivers." });
    }
  });

  // 23b. Captain Real-Time Location Update API
  app.post("/api/drivers/:id/location", (req, res) => {
    try {
      const driverId = req.params.id;
      const { lat, lng, heading, speed } = req.body || {};
      if (typeof lat !== 'number' || typeof lng !== 'number') {
        res.status(400).json({ error: "Valid lat and lng are required." });
        return;
      }
      const result = updateDriverLocationAuthoritative(driverId, lat, lng, heading, speed);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to update driver location." });
    }
  });

  // 23c. Authoritative Delete Driver Profile API (Permanent Removal)
  app.delete("/api/drivers/:id", (req, res) => {
    try {
      const driverId = req.params.id;
      const result = deleteDriverAuthoritative(driverId);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to delete driver." });
    }
  });

  // 23d. Authoritative Delete Passenger / User API (Permanent Removal)
  app.delete("/api/users/:id", (req, res) => {
    try {
      const userId = req.params.id;
      const result = deleteUserAuthoritative(userId);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to delete user." });
    }
  });

  // 23e. Authoritative Delete Ride API (Permanent Removal)
  app.delete("/api/rides/:id", (req, res) => {
    try {
      const rideId = req.params.id;
      const result = deleteRideAuthoritative(rideId);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to delete ride." });
    }
  });

  // 23f. Authoritative Users List & Sync API
  app.get("/api/users", (req, res) => {
    try {
      const users = getAllUsersAuthoritative();
      res.json({ success: true, users });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to retrieve users." });
    }
  });

  app.post("/api/users/sync", (req, res) => {
    try {
      const user = req.body;
      const result = upsertUserAuthoritative(user);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to sync user." });
    }
  });

  // 24. PWA Webmanifest explicit routes for standard and role-specific manifests
  app.get(
    [
      "/manifest.webmanifest",
      "/manifest.json",
      "/manifest-customer.webmanifest",
      "/manifest-driver.webmanifest",
      "/manifest-admin.webmanifest"
    ],
    (req, res) => {
      const filename = req.path.replace(/^\//, "");
      const targetPath = path.join(process.cwd(), "public", filename);
      if (fs.existsSync(targetPath)) {
        res.setHeader("Content-Type", "application/manifest+json");
        res.sendFile(targetPath);
      } else {
        res.setHeader("Content-Type", "application/manifest+json");
        res.sendFile(path.join(process.cwd(), "public", "manifest-customer.webmanifest"));
      }
    }
  );

  // OAuth Callback Handler for Supabase / Google OAuth (Popup communication)
  app.get(["/auth/callback", "/auth/callback/"], (req, res) => {
    res.send(`<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Authenticating with Toto Drive...</title>
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: #FAF8F5;
        color: #111111;
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100vh;
        margin: 0;
      }
      .card {
        background: #ffffff;
        border: 1px solid #EDE8E0;
        border-radius: 16px;
        padding: 24px 32px;
        text-align: center;
        max-width: 340px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.06);
      }
      .spinner {
        width: 30px;
        height: 30px;
        border: 3px solid #EDE8E0;
        border-top-color: #E07A00;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
        margin: 0 auto 12px;
      }
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="spinner"></div>
      <h3 style="margin: 0 0 6px; font-size: 15px; font-weight: 700;">Authenticating...</h3>
      <p style="margin: 0; font-size: 12px; color: #666;">Completing sign-in. This window will close automatically.</p>
    </div>
    <script>
      (function() {
        try {
          if (window.opener) {
            window.opener.postMessage({
              type: 'SUPABASE_AUTH_CALLBACK',
              hash: window.location.hash,
              search: window.location.search,
              href: window.location.href
            }, '*');
            setTimeout(function() {
              window.close();
            }, 300);
          } else {
            window.location.href = '/';
          }
        } catch (e) {
          window.location.href = '/';
        }
      })();
    </script>
  </body>
</html>`);
  });

  // Real-time Road Routing API proxy
  const routeCache = new Map<string, { data: any; timestamp: number }>();
  app.get("/api/route", async (req, res) => {
    try {
      const startLat = parseFloat(req.query.startLat as string);
      const startLng = parseFloat(req.query.startLng as string);
      const endLat = parseFloat(req.query.endLat as string);
      const endLng = parseFloat(req.query.endLng as string);

      if (isNaN(startLat) || isNaN(startLng) || isNaN(endLat) || isNaN(endLng)) {
        res.status(400).json({ error: "Invalid coordinates provided" });
        return;
      }

      const cacheKey = `${startLat.toFixed(4)},${startLng.toFixed(4)}->${endLat.toFixed(4)},${endLng.toFixed(4)}`;
      const cached = routeCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < 1000 * 60 * 30) {
        res.json(cached.data);
        return;
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);

      try {
        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
        const response = await fetch(osrmUrl, { signal: controller.signal });
        clearTimeout(timeout);

        if (response.ok) {
          const json = await response.json();
          if (json.code === "Ok" && json.routes && json.routes.length > 0) {
            const route = json.routes[0];
            const coordinates = route.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);
            const distanceKm = Number((route.distance / 1000).toFixed(2));
            const durationMins = Math.max(1, Math.round(route.duration / 60));

            const result = {
              success: true,
              coordinates,
              distanceKm,
              durationMins,
              source: "osrm"
            };

            routeCache.set(cacheKey, { data: result, timestamp: Date.now() });
            res.json(result);
            return;
          }
        }
      } catch (fetchErr) {
        // Fallback to geometric road routing
      }

      // High-fidelity fallback curve route if OSRM unavailable
      const points: [number, number][] = [];
      const steps = 14;
      const dLat = endLat - startLat;
      const dLng = endLng - startLng;
      const perpLat = -dLng * 0.08;
      const perpLng = dLat * 0.08;

      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const curve = Math.sin(t * Math.PI) * (i % 2 === 0 ? 1 : 0.85);
        const lat = startLat + dLat * t + perpLat * curve;
        const lng = startLng + dLng * t + perpLng * curve;
        points.push([Number(lat.toFixed(5)), Number(lng.toFixed(5))]);
      }

      const directDist = Math.hypot(dLat, dLng) * 111;
      const roadDistanceKm = Number(Math.max(0.5, directDist * 1.25).toFixed(1));
      const estMinutes = Math.max(2, Math.round(roadDistanceKm * 3.2));

      const fallbackResult = {
        success: true,
        coordinates: points,
        distanceKm: roadDistanceKm,
        durationMins: estMinutes,
        source: "fallback"
      };

      res.json(fallbackResult);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to calculate route" });
    }
  });

  // ==============================================================================
  // SHARED PRODUCTION BACKEND MODULES (PART 1/4)
  // ==============================================================================

  // 1. Realtime Server-Sent Events (SSE) Dispatch & Telemetry Hub
  app.get("/api/realtime/events", (req: any, res) => {
    const clientId = 'sse_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
    const role = (req.query.role as any) || req.auth?.role || 'public';
    const userId = (req.query.userId as string) || req.auth?.id;
    registerSseClient({ id: clientId, role, userId, res });
  });

  // 2. Captain Onboarding & KYC Document Verification APIs
  app.post("/api/captains/register", (req, res) => {
    try {
      const { name, phone, pin, vehicleType, vehicleNumber, vehicleModel, vehicleColor, capacity, documents } = req.body || {};
      if (!name || !phone || !vehicleNumber || !vehicleModel) {
        res.status(400).json({
          success: false,
          error: "name, phone, vehicleNumber, and vehicleModel are required."
        });
        return;
      }
      const record = registerCaptainOnboarding({
        name,
        phone,
        pin,
        vehicleType,
        vehicleNumber,
        vehicleModel,
        vehicleColor,
        capacity,
        documents
      });
      res.status(201).json({
        success: true,
        message: "Captain onboarding registration submitted successfully. Fleet verification pending.",
        captain: record
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || "Failed to register captain." });
    }
  });

  app.post("/api/captains/login", (req, res) => {
    try {
      const { phone, pin } = req.body || {};
      if (!phone || !pin) {
        res.status(400).json({ success: false, error: "Phone number and security PIN are required." });
        return;
      }
      const authResult = authenticateCaptainWithPin(phone, pin);
      if (!authResult.success || !authResult.captain) {
        res.status(401).json(authResult);
        return;
      }
      const token = issueSessionToken({
        id: authResult.captain.id,
        role: 'captain',
        phone: authResult.captain.phone,
        name: authResult.captain.name
      });
      res.json({
        success: true,
        message: "Captain authenticated successfully.",
        token,
        captain: authResult.captain
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || "Failed to login captain." });
    }
  });

  app.get("/api/captains", (_req, res) => {
    try {
      const list = getAllCaptains();
      res.json({ success: true, captains: list });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get("/api/captains/:id", (req, res) => {
    try {
      const captain = getCaptainById(req.params.id);
      if (!captain) {
        res.status(404).json({ success: false, error: "Captain not found." });
        return;
      }
      res.json({ success: true, captain });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/captains/:id/documents", (req, res) => {
    try {
      const captainId = req.params.id;
      const { documentType, documentNumber, documentUrl, expiryDate } = req.body || {};
      if (!documentType || !documentUrl) {
        res.status(400).json({ success: false, error: "documentType and documentUrl are required." });
        return;
      }
      const result = addCaptainDocument(captainId, {
        documentType,
        documentNumber,
        documentUrl,
        expiryDate
      });
      if (!result.success) {
        res.status(400).json(result);
        return;
      }
      res.status(201).json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/admin/captains/documents/:docId/verify", requireAdminAuth, (req: any, res) => {
    try {
      const docId = req.params.docId;
      const { action, rejectionReason } = req.body || {};
      if (action !== 'approve' && action !== 'reject') {
        res.status(400).json({ success: false, error: "action must be 'approve' or 'reject'." });
        return;
      }
      const result = reviewCaptainDocument({
        documentId: docId,
        adminId: req.admin?.id || 'ADMIN_001',
        adminUsername: req.admin?.username || 'Administrator',
        action,
        rejectionReason
      });
      if (!result.success) {
        res.status(400).json(result);
        return;
      }
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/admin/captains/:id/status", requireAdminAuth, (req: any, res) => {
    try {
      const captainId = req.params.id;
      const { action, notes } = req.body || {};
      if (!['approve', 'reject', 'suspend'].includes(action)) {
        res.status(400).json({ success: false, error: "action must be 'approve', 'reject', or 'suspend'." });
        return;
      }
      const result = setCaptainApprovalStatus({
        captainId,
        adminId: req.admin?.id || 'ADMIN_001',
        adminUsername: req.admin?.username || 'Administrator',
        action,
        notes
      });
      if (!result.success) {
        res.status(400).json(result);
        return;
      }
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 3. Double-Entry Wallets & Financial Ledger APIs
  app.get("/api/wallets/:ownerType/:ownerId", (req, res) => {
    try {
      const { ownerType, ownerId } = req.params;
      if (!['user', 'captain', 'platform'].includes(ownerType)) {
        res.status(400).json({ success: false, error: "Invalid ownerType" });
        return;
      }
      const ledger = getWalletLedger(ownerType as any, ownerId);
      res.json({ success: true, ...ledger });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/wallets/transfer", requireAdminAuth, (req: any, res) => {
    try {
      const { ownerType, ownerId, transactionType, amount, description, referenceId, idempotencyKey } = req.body || {};
      if (!ownerType || !ownerId || typeof amount !== 'number') {
        res.status(400).json({ success: false, error: "ownerType, ownerId, and numeric amount are required." });
        return;
      }
      const result = executeWalletTransaction({
        ownerType,
        ownerId,
        transactionType: transactionType || 'INCENTIVE',
        amount,
        description: description || 'Administrative Wallet Adjustment',
        referenceType: 'admin',
        referenceId,
        idempotencyKey
      });
      if (!result.success) {
        res.status(400).json(result);
        return;
      }
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 4. YouPI-PG UPI Payment Gateway Integration APIs
  app.post("/api/youpi/create-payment", (req, res) => {
    try {
      const { amount, paymentType, passengerId, rideId, customerPhone, customerEmail } = req.body || {};
      const numAmount = Number(amount);
      if (!numAmount || isNaN(numAmount) || numAmount <= 0) {
        return res.status(400).json({ error: "Valid payment amount is required" });
      }

      const pType = paymentType === 'RIDE_PAYMENT' ? 'RIDE_PAYMENT' : 'WALLET_TOPUP';
      const userId = passengerId || 'usr_passenger';

      const session = createYouPiPaymentSession({
        userId,
        amount: numAmount,
        type: pType,
        rideId,
        notes: pType === 'RIDE_PAYMENT' ? `Ride Payment #${rideId}` : `Wallet Top-Up for ${userId}`,
        metadata: {
          paymentType: pType,
          passengerId: userId,
          rideId: rideId || null,
          customerPhone: customerPhone || '+918479022523',
          customerEmail: customerEmail || 'halderkoushik120@gmail.com'
        }
      });

      res.json({
        success: true,
        paymentId: session.id,
        id: session.id,
        checkoutUrl: `/checkout/${session.id}`,
        amount: session.amount,
        orderId: session.orderId,
        session
      });
    } catch (err: any) {
      console.error("[TotoDrive Backend] Create Payment Error:", err);
      res.status(500).json({ error: err.message || "Internal Server Error" });
    }
  });

  app.post("/api/youpi/webhook", (req: any, res) => {
    try {
      const signature = (
        req.headers['x-youpi-signature'] ||
        req.headers['x-gateway-signature'] ||
        req.headers['x-gateway-signature-v2'] ||
        ''
      ) as string;
      const rawBody = req.rawBody ? req.rawBody.toString() : JSON.stringify(req.body);

      const expectedSig = crypto
        .createHmac('sha256', YOUPI_CONFIG.webhookSecret)
        .update(rawBody)
        .digest('hex');

      const isValid = signature === expectedSig || verifyYouPiWebhookSignature(rawBody, signature);

      if (!isValid && process.env.NODE_ENV === 'production') {
        console.warn("[TotoDrive Webhook] Invalid HMAC signature rejected");
        return res.status(401).json({ error: "Invalid HMAC signature" });
      }

      const payload = typeof req.body === 'object' ? req.body : JSON.parse(rawBody);
      const { event, payment, data } = payload;
      const paymentInfo = payment || data || payload;

      console.log(`[TotoDrive Webhook] Received Event: ${event} for Order: ${paymentInfo?.orderId || paymentInfo?.id}`);

      if (event === 'PAYMENT_SUCCESS' || event === 'SUCCESS' || event === 'PAYMENT_VERIFIED') {
        const notes = paymentInfo.notes || {};
        const amount = Number(paymentInfo.amount || 0);
        const utr = paymentInfo.utr || paymentInfo.utrClaim || `WH_${Date.now()}`;
        const passengerId = notes.passengerId || paymentInfo.userId || 'usr_passenger';

        // FLOW A: WALLET TOP-UP FULFILLMENT
        if (notes.paymentType === 'WALLET_TOPUP' || paymentInfo.type === 'WALLET_TOPUP') {
          console.log(`[Wallet Credit] Crediting ₹${amount} to Passenger Wallet: ${passengerId} (UTR: ${utr})`);
          executeWalletTransaction({
            ownerType: 'user',
            ownerId: passengerId,
            amount,
            transactionType: 'WALLET_TOPUP',
            description: `YouPI UPI Topup (UTR: ${utr})`,
            referenceId: paymentInfo.orderId || paymentInfo.id
          });
        }
        // FLOW B: RIDE PAYMENT FULFILLMENT
        else if (notes.paymentType === 'RIDE_PAYMENT' || paymentInfo.type === 'RIDE_PAYMENT' || notes.rideId) {
          const rideId = notes.rideId || paymentInfo.rideId;
          console.log(`[Ride Settled] Marked Ride #${rideId} as PAID via UPI Ref: ${utr}`);
          settleRidePaymentAuthoritative(rideId, 'upi');
        }
      }

      res.json({ received: true, success: true });
    } catch (err: any) {
      console.error("[TotoDrive Webhook Error]:", err);
      res.status(500).json({ error: err.message || "Webhook handling error" });
    }
  });

  // ====================================================================
  // YouPI WhatsApp OTP Customer & Passenger Authentication API
  // ====================================================================
  const handleCheckUser = (req: express.Request, res: express.Response) => {
    try {
      const mobileNumber = req.body?.mobileNumber || req.body?.phone || req.body?.phoneNumber;
      const result = checkCustomerExists(mobileNumber);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message || 'Validation error' });
    }
  };

  const handleSendOtp = async (req: express.Request, res: express.Response) => {
    try {
      const { mobileNumber, phone, phoneNumber, name, fullName, email, isNewUser } = req.body || {};
      const result = await sendWhatsAppOtp({
        mobileNumber: mobileNumber || phone || phoneNumber,
        name: name || fullName,
        email,
        isNewUser: Boolean(isNewUser)
      });
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message || 'Failed to dispatch WhatsApp OTP' });
    }
  };

  const handleVerifyOtp = async (req: express.Request, res: express.Response) => {
    try {
      const { mobileNumber, phone, phoneNumber, otp, code, name, fullName, email } = req.body || {};
      const result = await verifyWhatsAppOtp({
        mobileNumber: mobileNumber || phone || phoneNumber,
        otp: otp || code,
        name: name || fullName,
        email
      });

      // Synchronize into engine state so user is immediately active in ride ecosystem
      upsertUserAuthoritative({
        id: result.customer.id,
        name: result.customer.name,
        phone: result.customer.phone,
        email: result.customer.email,
        walletBalance: result.customer.walletBalance
      });

      res.json(result);
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message || 'OTP verification failed' });
    }
  };

  // Cloned YouPI-PG customer auth endpoints
  app.post("/api/v1/customer/check-user", handleCheckUser);
  app.post("/api/v1/customer/send-otp", handleSendOtp);
  app.post("/api/v1/customer/verify-otp", handleVerifyOtp);

  // App-level Aliases for TotoDrive Passenger App
  app.post("/api/auth/whatsapp/check-user", handleCheckUser);
  app.post("/api/auth/whatsapp/send-otp", handleSendOtp);
  app.post("/api/auth/whatsapp/verify-otp", handleVerifyOtp);

  // ====================================================================
  // YouPI WhatsApp Berry Protocol Multi-Device Pairing & Admin API
  // ====================================================================
  const handleWhatsAppStatus = async (_req: express.Request, res: express.Response) => {
    try {
      const info = whatsappBerryService.getClientInfo();
      const qr = whatsappBerryService.getQrCode();
      res.json({
        success: true,
        status: info.status,
        phoneNumber: info.phoneNumber,
        platform: info.platform,
        sessionId: info.sessionId,
        isConnected: info.isConnected,
        qrCode: qr?.dataUrl || null,
        pairingCode: info.pairingCode || null,
        pairingPhone: info.pairingPhone || null,
        stats: info.stats
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  };

  const handleWhatsAppQr = async (_req: express.Request, res: express.Response) => {
    try {
      const qr = whatsappBerryService.getQrCode();
      res.json({
        success: true,
        status: whatsappBerryService.getStatus(),
        qrCode: qr?.dataUrl || null,
        available: Boolean(qr)
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  };

  const handleWhatsAppReconnect = async (_req: express.Request, res: express.Response) => {
    try {
      if (whatsappBerryService.getStatus() === 'DISCONNECTED') {
        await whatsappBerryService.initialize();
      } else {
        await whatsappBerryService.reconnect();
      }
      const qr = whatsappBerryService.getQrCode();
      res.json({
        success: true,
        status: whatsappBerryService.getStatus(),
        qrCode: qr?.dataUrl || null
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  };

  const handleWhatsAppPairingCode = async (req: express.Request, res: express.Response) => {
    try {
      const phoneNumber = req.body?.phoneNumber || req.body?.phone || req.body?.mobile;
      if (!phoneNumber) {
        res.status(400).json({ success: false, error: 'Phone number is required to generate pairing code.' });
        return;
      }
      const result = await whatsappBerryService.requestPairingCode(phoneNumber);
      res.json({
        success: true,
        status: whatsappBerryService.getStatus(),
        pairingCode: result.pairingCode,
        phoneNumber: result.phoneNumber,
        message: 'Enter this 8-digit pairing code on your phone in WhatsApp > Linked Devices > Link with phone number.'
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  };

  const handleWhatsAppDisconnect = async (_req: express.Request, res: express.Response) => {
    try {
      await whatsappBerryService.disconnect({ cleanSession: true });
      res.json({
        success: true,
        status: 'DISCONNECTED',
        message: 'WhatsApp session disconnected and credentials wiped.'
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  };

  const handleWhatsAppTestMessage = async (req: express.Request, res: express.Response) => {
    try {
      const { to, message } = req.body || {};
      if (!to) {
        res.status(400).json({ success: false, error: 'Recipient phone number "to" is required.' });
        return;
      }
      if (message) {
        const result = await whatsappBerryService.sendMessage(to, message);
        res.json(result);
      } else {
        const result = await whatsappBerryService.sendTestMessage(to);
        res.json(result);
      }
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  };

  // Cloned YouPI-PG Admin WhatsApp Berry Protocol Routes
  app.get("/api/v1/admin/whatsapp/status", handleWhatsAppStatus);
  app.get("/api/v1/admin/whatsapp/qr", handleWhatsAppQr);
  app.post("/api/v1/admin/whatsapp/reconnect", handleWhatsAppReconnect);
  app.post("/api/v1/admin/whatsapp/pairing-code", handleWhatsAppPairingCode);
  app.post("/api/v1/admin/whatsapp/disconnect", handleWhatsAppDisconnect);
  app.post("/api/v1/admin/whatsapp/test-message", handleWhatsAppTestMessage);

  // App Admin Aliases
  app.get("/api/admin/whatsapp/status", handleWhatsAppStatus);
  app.get("/api/admin/whatsapp/qr", handleWhatsAppQr);
  app.post("/api/admin/whatsapp/reconnect", handleWhatsAppReconnect);
  app.post("/api/admin/whatsapp/pairing-code", handleWhatsAppPairingCode);
  app.post("/api/admin/whatsapp/disconnect", handleWhatsAppDisconnect);
  app.post("/api/admin/whatsapp/test-message", handleWhatsAppTestMessage);

  app.post("/api/payments/youpi/create-session", (req, res) => {
    try {
      const { userId, amount, rideId, captainId, type, notes, metadata } = req.body || {};
      if (!userId || typeof amount !== 'number' || amount <= 0) {
        res.status(400).json({ success: false, error: "userId and positive amount are required." });
        return;
      }
      const session = createYouPiPaymentSession({
        userId,
        amount,
        type,
        rideId,
        captainId,
        notes,
        metadata
      });
      res.status(201).json({ success: true, session });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  app.post("/api/payments/youpi/submit-utr", (req, res) => {
    try {
      const { sessionId, utr } = req.body || {};
      if (!sessionId || !utr) {
        res.status(400).json({ success: false, error: "sessionId and utr are required." });
        return;
      }
      const result = submitCustomerUtr(sessionId, utr);
      if (!result.success) {
        res.status(400).json(result);
        return;
      }
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get("/api/payments/youpi/session/:sessionId", (req, res) => {
    try {
      const session = getYouPiSession(req.params.sessionId);
      if (!session) {
        res.status(404).json({ success: false, error: "Payment session not found." });
        return;
      }
      res.json({ success: true, session });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get("/api/payments/youpi/receipt/:sessionId", (req, res) => {
    try {
      const session = getYouPiSession(req.params.sessionId);
      if (!session) {
        res.status(404).json({ success: false, error: "Payment session not found." });
        return;
      }
      const receipt = session.receiptDetails || generatePaymentReceipt(session);
      res.json({ success: true, receipt });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get("/api/admin/payments/youpi", requireAdminAuth, (req, res) => {
    try {
      const status = req.query.status as string;
      const type = req.query.type as any;
      const userId = req.query.userId as string;
      const limit = req.query.limit ? Number(req.query.limit) : 100;
      const list = getAllPaymentSessions({ status, type, userId, limit });
      res.json({ success: true, payments: list });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/admin/payments/youpi/review", requireAdminAuth, (req: any, res) => {
    try {
      const { sessionId, action, notes } = req.body || {};
      if (!sessionId || (action !== 'approve' && action !== 'reject')) {
        res.status(400).json({ success: false, error: "sessionId and valid action ('approve'|'reject') are required." });
        return;
      }
      const result = adminReviewUtr({
        sessionId,
        adminId: req.admin?.id || 'ADMIN_001',
        adminUsername: req.admin?.username || 'Administrator',
        action,
        notes
      });
      if (!result.success) {
        res.status(400).json(result);
        return;
      }
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/admin/payments/youpi/refund", requireAdminAuth, (req: any, res) => {
    try {
      const { sessionId, reason, refundType, refundUtr, amount } = req.body || {};
      if (!sessionId || !reason || (refundType !== 'wallet' && refundType !== 'bank_manual')) {
        res.status(400).json({
          success: false,
          error: "sessionId, reason, and valid refundType ('wallet' | 'bank_manual') are required."
        });
        return;
      }
      const result = processPaymentRefund({
        sessionId,
        adminId: req.admin?.id || 'ADMIN_001',
        adminUsername: req.admin?.username || 'Administrator',
        reason,
        refundType,
        refundUtr,
        amount
      });
      if (!result.success) {
        res.status(400).json(result);
        return;
      }
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get("/api/admin/payments/youpi/reconciliation", requireAdminAuth, (_req, res) => {
    try {
      const summary = getPaymentReconciliationSummary();
      res.json({ success: true, summary });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Captain UPI & Banking payout configuration
  app.post("/api/captains/:captainId/payment-config", (req: any, res) => {
    try {
      const { upiId, payoutAccountHolder, bankAccountNumber, bankIfsc } = req.body || {};
      const result = updateCaptainPaymentConfig({
        captainId: req.params.captainId,
        upiId,
        payoutAccountHolder,
        bankAccountNumber,
        bankIfsc,
        adminId: req.admin?.id,
        adminUsername: req.admin?.username
      });
      if (!result.success) {
        res.status(400).json(result);
        return;
      }
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Signed YouPI Gateway Webhook Receiver with HMAC verification
  app.post("/api/webhooks/youpi", (req: any, res) => {
    try {
      const signature = (
        req.headers['x-gateway-signature'] ||
        req.headers['x-gateway-signature-v2'] ||
        req.headers['x-youpi-signature'] ||
        ''
      ) as string;
      const timestamp = req.headers['x-gateway-timestamp'] as string;
      const deliveryId = req.headers['x-gateway-delivery-id'] as string;
      const rawBody = req.rawBody || JSON.stringify(req.body);

      const isValid = verifyYouPiWebhookSignature(rawBody, signature, timestamp);

      if (!isValid && process.env.NODE_ENV === 'production') {
        res.status(401).json({ error: "Invalid HMAC webhook signature." });
        return;
      }

      const event = (req.headers['x-gateway-event'] || req.body?.event || 'SUCCESS') as string;
      const payload = req.body?.data || req.body || {};

      const result = handleYouPiWebhook({
        deliveryId,
        event,
        payload
      });

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 5. Immutable Admin & Platform Audit Logs API
  app.get("/api/admin/audit-logs", requireAdminAuth, (req, res) => {
    try {
      const action = req.query.action as string;
      const targetResource = req.query.targetResource as string;
      const limit = req.query.limit ? Number(req.query.limit) : 100;
      const logs = queryAuditLogs({ action, targetResource, limit });
      res.json({ success: true, count: logs.length, logs });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 6. In-App Notifications API
  app.get("/api/notifications", (req: any, res) => {
    try {
      const recipientType = (req.query.recipientType as string) || req.auth?.role || 'user';
      const recipientId = (req.query.recipientId as string) || req.auth?.id || 'ALL';
      const list = getNotificationsForRecipient(recipientType, recipientId);
      res.json({ success: true, notifications: list });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/notifications/:id/read", (req, res) => {
    try {
      const success = markNotificationAsRead(req.params.id);
      res.json({ success });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Vite middleware for development / Static file serving for production
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : { server: httpServer },
      },
      appType: "spa",
    });
    // Intercept @vite/client in development to safely suppress container HMR websocket errors
    app.get("/@vite/client", async (req, res, next) => {
      try {
        const result = await vite.transformRequest("/@vite/client");
        if (result && result.code) {
          let code = result.code;
          code = code
            .replaceAll(/console\.error\(\s*`\[vite\][^`]*`\s*\);/g, "/* [vite] suppressed error */")
            .replace('error: (err) => console.error("[vite]", err)', "error: (err) => {}")
            .replace("throw e;", "return;");
          res.setHeader("Content-Type", "application/javascript");
          return res.send(code);
        }
      } catch (err) {
        // Fall back to vite middleware
      }
      next();
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.webmanifest')) {
          res.setHeader('Content-Type', 'application/manifest+json');
        }
      }
    }));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
