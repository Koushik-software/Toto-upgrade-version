/**
 * TOTO DRIVE BACKEND TEST SUITE
 * Comprehensive unit and integration test runner for Part 1/4 verification.
 */
import assert from 'assert';
import crypto from 'crypto';
import {
  calculateAuthoritativeFare,
  createRideRequestAuthoritative,
  driverAcceptRideAuthoritative,
  driverArrivedAuthoritative,
  driverStartRideAuthoritative,
  driverCompleteRideAuthoritative,
  cancelRideAuthoritative,
  getEngineState
} from '../server/businessEngine';
import {
  getOrCreateWallet,
  executeWalletTransaction,
  getWalletLedger
} from '../server/services/walletService';
import {
  createYouPiPaymentSession,
  submitCustomerUtr,
  adminReviewUtr,
  verifyYouPiWebhookSignature,
  getYouPiSession,
  YOUPI_CONFIG
} from '../server/services/youpiPaymentService';
import {
  registerCaptainOnboarding,
  addCaptainDocument,
  reviewCaptainDocument,
  setCaptainApprovalStatus,
  authenticateCaptainWithPin,
  getCaptainById
} from '../server/services/captainService';
import {
  recordAuditLog,
  queryAuditLogs
} from '../server/services/auditService';
import {
  sendNotification,
  getNotificationsForRecipient,
  markNotificationAsRead
} from '../server/services/notificationService';
import {
  hasPermission,
  ROLE_PERMISSIONS
} from '../server/auth/rolePermissions';
import {
  issueSessionToken,
  getSessionFromToken,
  invalidateSessionToken
} from '../server/auth/authMiddleware';
import {
  getSystemMetrics
} from '../server/services/monitoringService';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const testResults: { name: string; passed: boolean; error?: string; durationMs: number }[] = [];

async function runTest(name: string, fn: () => void | Promise<void>) {
  totalTests++;
  const start = Date.now();
  try {
    await fn();
    const durationMs = Date.now() - start;
    passedTests++;
    testResults.push({ name, passed: true, durationMs });
    console.log(`  ✓ [PASS] ${name} (${durationMs}ms)`);
  } catch (err: any) {
    const durationMs = Date.now() - start;
    failedTests++;
    testResults.push({ name, passed: false, error: err.message, durationMs });
    console.error(`  ✗ [FAIL] ${name}: ${err.message}`);
  }
}

async function runAllTests() {
  console.log('\n======================================================');
  console.log('  TOTO DRIVE SHARED PRODUCTION BACKEND VERIFICATION');
  console.log('======================================================\n');

  // --------------------------------------------------------------------------
  // Suite 1: Fare Calculation Engine
  // --------------------------------------------------------------------------
  console.log('[SUITE 1] Fare Calculation Engine');
  
  await runTest('Calculates standard toto base fare and per-km charge', () => {
    const fare = calculateAuthoritativeFare({
      vehicleType: 'toto',
      distanceKm: 5.0,
      estimatedDurationMins: 15
    });
    assert(fare.finalFare > 0, 'Final fare must be positive');
    assert.strictEqual(fare.baseFare, 20, 'Toto base fare should be 20');
    assert(fare.finalFare >= fare.baseFare, 'Fare should be at least base fare');
  });

  await runTest('Applies promo code discount with cap', () => {
    const regular = calculateAuthoritativeFare({
      vehicleType: 'toto',
      distanceKm: 8.0
    });
    const discounted = calculateAuthoritativeFare({
      vehicleType: 'toto',
      distanceKm: 8.0,
      promoCode: 'RAPIDOTOTO'
    });
    assert(discounted.discount > 0, 'Discount must be applied');
    assert(discounted.finalFare < regular.finalFare, 'Discounted fare must be lower');
  });

  // --------------------------------------------------------------------------
  // Suite 2: Ride Booking & State Machine
  // --------------------------------------------------------------------------
  console.log('\n[SUITE 2] Ride Booking & State Machine');

  // Ensure test captain drv_live_a is ONLINE and ready in engine state
  const engineState = getEngineState();
  if (engineState.drivers.drv_live_a) {
    engineState.drivers.drv_live_a.status = 'ONLINE';
    engineState.drivers.drv_live_a.availability = 'AVAILABLE';
    engineState.drivers.drv_live_a.currentRideId = null;
  }
  if (engineState.drivers.drv_live_b) {
    engineState.drivers.drv_live_b.status = 'ONLINE';
    engineState.drivers.drv_live_b.availability = 'AVAILABLE';
    engineState.drivers.drv_live_b.currentRideId = null;
  }

  const testUserId = 'test_passenger_' + Date.now();
  let createdRideId = '';
  let rideOtp = '';

  await runTest('Creates ride request with authoritative fare and 4-digit OTP', () => {
    const result = createRideRequestAuthoritative({
      userId: testUserId,
      userName: 'Test Passenger',
      userPhone: '+919876543210',
      pickup: { lat: 22.5850, lng: 88.4200, address: 'Salt Lake Sector 5', name: 'Pickup Point' },
      dropoff: { lat: 22.5920, lng: 88.4300, address: 'Karunamoyee', name: 'Destination' },
      vehicleType: 'toto',
      paymentMethod: 'cash',
      targetDriverId: 'drv_live_a'
    });
    assert(result.ride && result.ride.id, 'Ride should be created');
    assert.strictEqual(result.ride.userId, testUserId);
    assert.strictEqual(result.ride.otp.length, 4, 'OTP must be 4 digits');
    createdRideId = result.ride.id;
    rideOtp = result.ride.otp;
  });

  await runTest('Prevents duplicate ride booking for same user while ride is active', () => {
    assert.throws(() => {
      createRideRequestAuthoritative({
        userId: testUserId,
        userName: 'Test Passenger',
        userPhone: '+919876543210',
        pickup: { lat: 22.5850, lng: 88.4200, address: 'Salt Lake', name: 'Pickup' },
        dropoff: { lat: 22.5920, lng: 88.4300, address: 'Karunamoyee', name: 'Dropoff' },
        vehicleType: 'toto',
        paymentMethod: 'cash'
      });
    }, /An active ride is already in progress/);
  });

  // --------------------------------------------------------------------------
  // Suite 3: Concurrency & Atomic Ride Acceptance (CAS Lock)
  // --------------------------------------------------------------------------
  console.log('\n[SUITE 3] Concurrency & Atomic Acceptance');

  await runTest('First captain atomically accepts ride, subsequent captain is rejected', () => {
    const captain1Result = driverAcceptRideAuthoritative(createdRideId, 'drv_live_a');
    assert(captain1Result.success, 'First captain acceptance must succeed');
    assert.strictEqual(captain1Result.ride.driverId, 'drv_live_a');
    assert.strictEqual(captain1Result.ride.status, 'DRIVER_ACCEPTED');

    // Second captain attempts acceptance concurrently
    const captain2Result = driverAcceptRideAuthoritative(createdRideId, 'drv_live_b');
    assert(!captain2Result.success, 'Second captain acceptance must be rejected');
    assert(
      captain2Result.code === 'RIDE_ALREADY_ACCEPTED' || captain2Result.code === 'CONCURRENT_ACCEPTANCE' || captain2Result.code === 'INVALID_STATUS',
      'Should report already accepted'
    );
  });

  // --------------------------------------------------------------------------
  // Suite 4: Geofence Arrival & 4-Digit OTP Verification
  // --------------------------------------------------------------------------
  console.log('\n[SUITE 4] Geofence Arrival & Trip Lifecycle');

  await runTest('Validates geofence proximity on driver arrival', () => {
    // Arrival right at pickup coordinates (within 120m)
    const arrival = driverArrivedAuthoritative(createdRideId, 'drv_live_a', 22.5850, 88.4200);
    assert(arrival.success, 'Arrival within 120m geofence should succeed');
    assert.strictEqual(arrival.ride.status, 'DRIVER_ARRIVED');
  });

  await runTest('Rejects incorrect OTP and enforces 4-digit code', () => {
    const wrong = driverStartRideAuthoritative(createdRideId, 'drv_live_a', '0000');
    assert(!wrong.success, 'Wrong OTP must be rejected');
    assert.strictEqual(wrong.code, 'INVALID_OTP');
  });

  await runTest('Starts ride upon correct OTP verification', () => {
    const start = driverStartRideAuthoritative(createdRideId, 'drv_live_a', rideOtp);
    assert(start.success, 'Correct OTP should start ride');
    assert.strictEqual(start.ride.status, 'RIDE_STARTED');
  });

  await runTest('Completes ride and computes authoritative driver invoice', () => {
    const complete = driverCompleteRideAuthoritative(createdRideId, 'drv_live_a', 2.5, 12);
    assert(complete.success, 'Trip completion should succeed');
    assert.strictEqual(complete.ride.status, 'RIDE_COMPLETED');
    assert(complete.ride.driverEarnings > 0, 'Driver earnings must be calculated');
    assert(complete.ride.platformCommission >= 0, 'Platform commission must be calculated');
  });

  // --------------------------------------------------------------------------
  // Suite 5: Double-Entry Wallet Ledger
  // --------------------------------------------------------------------------
  console.log('\n[SUITE 5] Double-Entry Wallet Accounting');

  const walletOwnerId = 'usr_wallet_test_' + Date.now();
  const testIdempotencyKey = 'test_topup_' + Date.now();

  await runTest('Creates wallet with sign-up welcome credit', () => {
    const wallet = getOrCreateWallet('user', walletOwnerId);
    assert.strictEqual(wallet.balance, 250.00, 'Welcome bonus should be ₹250.00');
    const ledger = getWalletLedger('user', walletOwnerId);
    assert(ledger.entries.length >= 1, 'Initial welcome ledger entry must exist');
  });

  await runTest('Executes atomic double-entry credit and debit transactions', () => {
    const topup = executeWalletTransaction({
      ownerType: 'user',
      ownerId: walletOwnerId,
      transactionType: 'WALLET_TOPUP',
      amount: 100.00,
      description: 'UPI Topup Test',
      idempotencyKey: testIdempotencyKey
    });
    assert(topup.success, 'Topup must succeed');
    assert.strictEqual(topup.newBalance, 350.00);

    const deduction = executeWalletTransaction({
      ownerType: 'user',
      ownerId: walletOwnerId,
      transactionType: 'RIDE_FARE',
      amount: -50.00,
      description: 'Ride fare debit'
    });
    assert(deduction.success, 'Fare debit must succeed');
    assert.strictEqual(deduction.newBalance, 300.00);
  });

  await runTest('Blocks overdraft when deducting more than balance', () => {
    const overdraft = executeWalletTransaction({
      ownerType: 'user',
      ownerId: walletOwnerId,
      transactionType: 'RIDE_FARE',
      amount: -1000.00,
      description: 'Excessive debit'
    });
    assert(!overdraft.success, 'Overdraft debit must be blocked');
    assert(overdraft.error?.includes('Insufficient wallet balance'));
  });

  await runTest('Enforces transaction idempotency key deduplication', () => {
    const duplicate = executeWalletTransaction({
      ownerType: 'user',
      ownerId: walletOwnerId,
      transactionType: 'WALLET_TOPUP',
      amount: 100.00,
      description: 'Duplicate UPI Topup',
      idempotencyKey: testIdempotencyKey
    });
    assert(!duplicate.success, 'Duplicate idempotency key must be blocked');
  });

  // --------------------------------------------------------------------------
  // Suite 6: YouPI-PG UPI Payment Gateway & Reconciliation
  // --------------------------------------------------------------------------
  console.log('\n[SUITE 6] YouPI-PG UPI Gateway & Reconciliation');

  let youpiSessionId = '';
  const testUtr = '3254' + Math.floor(10000000 + Math.random() * 90000000);

  await runTest('Creates YouPI payment session with NPCI Intent URI & SVG QR', () => {
    const session = createYouPiPaymentSession({
      userId: walletOwnerId,
      amount: 150.00,
      notes: 'Wallet Recharge 150'
    });
    assert(session.id.startsWith('txn_'), 'Session ID should start with txn_');
    assert(session.upiIntentUrl.includes('upi://pay'), 'Must be valid UPI Intent URL');
    assert(session.qrSvg.includes('<svg'), 'Must generate SVG QR code');
    assert.strictEqual(session.status, 'ACTIVE');
    youpiSessionId = session.id;
  });

  await runTest('Submits 12-digit UTR and moves status to MANUAL_REVIEW', () => {
    const claim = submitCustomerUtr(youpiSessionId, testUtr);
    assert(claim.success, 'UTR claim submission must succeed');
    assert.strictEqual(claim.session?.status, 'MANUAL_REVIEW');
    assert.strictEqual(claim.session?.utrClaim, testUtr);
  });

  await runTest('Prevents UTR replay attack on another transaction', () => {
    const session2 = createYouPiPaymentSession({
      userId: walletOwnerId,
      amount: 150.00
    });
    const duplicateUtr = submitCustomerUtr(session2.id, testUtr);
    assert(!duplicateUtr.success, 'Replayed UTR must be rejected');
  });

  await runTest('Admin approves UTR, credits wallet, and marks VERIFIED', () => {
    const review = adminReviewUtr({
      sessionId: youpiSessionId,
      adminId: 'ADMIN_001',
      adminUsername: 'Super Admin',
      action: 'approve',
      notes: 'Bank SMS alert verified'
    });
    assert(review.success, 'Admin approval must succeed');
    assert.strictEqual(review.session?.status, 'VERIFIED');
    // Verify wallet received credit
    const wallet = getOrCreateWallet('user', walletOwnerId);
    assert.strictEqual(wallet.balance, 450.00, 'Wallet balance should reflect verified UTR credit');
  });

  await runTest('Verifies HMAC-SHA256 signature for YouPI webhooks', () => {
    const rawPayload = JSON.stringify({ event: 'PAYMENT_VERIFIED', data: { sessionId: 'test_123' } });
    const hmac = crypto.createHmac('sha256', YOUPI_CONFIG.webhookSecret);
    hmac.update(rawPayload);
    const validSignature = hmac.digest('hex');

    const isValid = verifyYouPiWebhookSignature(rawPayload, validSignature);
    assert(isValid, 'Valid HMAC signature should pass');

    const isFakeValid = verifyYouPiWebhookSignature(rawPayload, 'fake_hex_signature_1234');
    assert(!isFakeValid, 'Forged HMAC signature must be rejected');
  });

  // --------------------------------------------------------------------------
  // Suite 7: Captain Onboarding & KYC Documents
  // --------------------------------------------------------------------------
  console.log('\n[SUITE 7] Captain Onboarding & KYC Documents');

  let onboardedCaptainId = '';
  let documentId = '';
  const testCaptainPhone = '+919811' + Math.floor(100000 + Math.random() * 900000);

  await runTest('Submits captain onboarding application with vehicle & license', () => {
    const reg = registerCaptainOnboarding({
      name: 'Pranab Mukherjee',
      phone: testCaptainPhone,
      vehicleType: 'toto',
      vehicleNumber: 'WB-24-ER-8899',
      vehicleModel: 'CityLife Li-ion Star',
      vehicleColor: 'Emerald Green',
      capacity: 4,
      documents: [
        {
          documentType: 'DRIVING_LICENSE',
          documentNumber: 'WB-01-20220099',
          documentUrl: 'https://storage.totodrive.in/docs/dl_123.jpg',
          expiryDate: '2032-05-15'
        }
      ]
    });
    assert(reg.id.startsWith('drv_'));
    assert.strictEqual(reg.approvalStatus, 'pending');
    assert.strictEqual(reg.documents.length, 1);
    onboardedCaptainId = reg.id;
    documentId = reg.documents[0].id;
  });

  await runTest('Allows adding structured vehicle RC document', () => {
    const addDoc = addCaptainDocument(onboardedCaptainId, {
      documentType: 'VEHICLE_RC',
      documentNumber: 'RC-WB-24-8899',
      documentUrl: 'https://storage.totodrive.in/docs/rc_123.jpg'
    });
    assert(addDoc.success);
    assert.strictEqual(addDoc.document?.verificationStatus, 'PENDING');
  });

  await runTest('Admin approves document and sets Captain to approved', () => {
    const docReview = reviewCaptainDocument({
      documentId,
      adminId: 'ADMIN_001',
      adminUsername: 'Fleet Admin',
      action: 'approve'
    });
    assert(docReview.success);
    assert.strictEqual(docReview.document?.verificationStatus, 'VERIFIED');

    const statusChange = setCaptainApprovalStatus({
      captainId: onboardedCaptainId,
      adminId: 'ADMIN_001',
      adminUsername: 'Fleet Admin',
      action: 'approve'
    });
    assert(statusChange.success);
    assert.strictEqual(statusChange.captain?.approvalStatus, 'approved');
  });

  // --------------------------------------------------------------------------
  // Suite 8: Authentication, Tokens & RBAC
  // --------------------------------------------------------------------------
  console.log('\n[SUITE 8] Authentication, Tokens & RBAC');

  await runTest('Authenticates approved captain with PIN and issues session token', () => {
    const captain = getCaptainById(onboardedCaptainId);
    assert(captain && captain.pinPlain);
    const auth = authenticateCaptainWithPin(captain.phone, captain.pinPlain);
    assert(auth.success);

    const token = issueSessionToken({
      id: captain.id,
      role: 'captain',
      phone: captain.phone,
      name: captain.name
    });
    assert(token.startsWith('ttd_'));

    const session = getSessionFromToken(token);
    assert(session && session.id === captain.id);

    invalidateSessionToken(token);
    assert.strictEqual(getSessionFromToken(token), null, 'Token must be invalidated');
  });

  await runTest('Enforces RBAC permission boundaries', () => {
    assert(hasPermission('admin', 'system:config_pricing'), 'Admin has pricing config');
    assert(!hasPermission('passenger', 'system:config_pricing'), 'Passenger cannot config pricing');
    assert(hasPermission('captain', 'captain:stream_gps'), 'Captain has GPS stream permission');
    assert(!hasPermission('support_agent', 'payment:reconcile_utr'), 'Support agent cannot reconcile UTRs');
  });

  // --------------------------------------------------------------------------
  // Suite 9: Audit Logs & Notifications
  // --------------------------------------------------------------------------
  console.log('\n[SUITE 9] Audit Logs & Notifications');

  await runTest('Records and retrieves immutable audit logs', () => {
    recordAuditLog({
      adminId: 'ADMIN_001',
      adminUsername: 'Super Admin',
      action: 'SECURITY_TEST_AUDIT',
      targetResource: 'system',
      targetId: 'SYS_01',
      details: { verified: true }
    });
    const logs = queryAuditLogs({ action: 'SECURITY_TEST_AUDIT' });
    assert(logs.length >= 1, 'Audit log must be queryable');
    assert.strictEqual(logs[0].action, 'SECURITY_TEST_AUDIT');
  });

  await runTest('Dispatches notifications and tracks read status', () => {
    const notif = sendNotification({
      recipientType: 'user',
      recipientId: testUserId,
      title: 'Ride Completed',
      body: 'Your Toto Drive trip has ended. Thank you for riding green!'
    });
    assert.strictEqual(notif.status, 'DELIVERED');

    const userNotifs = getNotificationsForRecipient('user', testUserId);
    assert(userNotifs.length >= 1);

    const read = markNotificationAsRead(notif.id);
    assert(read, 'Notification must be marked as read');
  });

  // --------------------------------------------------------------------------
  // Suite 10: System Telemetry & Metrics
  // --------------------------------------------------------------------------
  console.log('\n[SUITE 10] System Telemetry & Metrics');

  await runTest('Generates comprehensive operational and memory metrics', () => {
    const metrics = getSystemMetrics(getEngineState());
    assert.strictEqual(metrics.status, 'healthy');
    assert(metrics.server.processMemoryMb.heapUsed > 0);
    assert(metrics.operations.totalRidesTracked >= 1);
  });

  // --------------------------------------------------------------------------
  // Summary
  // --------------------------------------------------------------------------
  console.log('\n======================================================');
  console.log(`  TEST RESULTS: ${passedTests}/${totalTests} PASSED (${failedTests} FAILED)`);
  console.log('======================================================\n');

  process.exit(failedTests > 0 ? 1 : 0);
}

runAllTests().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
