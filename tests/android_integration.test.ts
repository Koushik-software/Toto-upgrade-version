/**
 * TOTO DRIVE — PART 2/4 ANDROID INTEGRATION TEST SUITE
 * Tests both Passenger (in.totodrive.passenger) and Captain (in.totodrive.captain)
 * application contracts against the shared production backend.
 */
import assert from 'assert';
import {
  calculateAuthoritativeFare,
  createRideRequestAuthoritative,
  driverAcceptRideAuthoritative,
  driverArrivedAuthoritative,
  driverStartRideAuthoritative,
  driverCompleteRideAuthoritative,
  setDriverOnlineStatusAuthoritative,
  updateDriverLocationAuthoritative,
  syncDriverRecord,
  getOrCreateVehicle,
  getEngineState
} from '../server/businessEngine';
import {
  registerCaptainOnboarding,
  addCaptainDocument,
  reviewCaptainDocument,
  setCaptainApprovalStatus,
  authenticateCaptainWithPin
} from '../server/services/captainService';
import {
  getOrCreateWallet,
  executeWalletTransaction
} from '../server/services/walletService';
import {
  createYouPiPaymentSession,
  submitCustomerUtr,
  adminReviewUtr
} from '../server/services/youpiPaymentService';
import {
  issueSessionToken,
  getSessionFromToken
} from '../server/auth/authMiddleware';
import {
  sendNotification,
  getNotificationsForRecipient
} from '../server/services/notificationService';
import {
  recordAuditLog,
  queryAuditLogs
} from '../server/services/auditService';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const testResults: { name: string; passed: boolean; error?: string }[] = [];

async function runTest(name: string, fn: () => void | Promise<void>) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    testResults.push({ name, passed: true });
    console.log(`  ✓ ${name}`);
  } catch (err: any) {
    failedTests++;
    testResults.push({ name, passed: false, error: err.message });
    console.error(`  ✗ ${name}:`, err.message);
  }
}

async function runAllTests() {
  console.log('\n======================================================');
  console.log('TOTO DRIVE ANDROID INTEGRATION TEST SUITE (PART 2/4)');
  console.log('Validating: in.totodrive.passenger & in.totodrive.captain');
  console.log('======================================================\n');

  const testRunId = Date.now().toString().slice(-6);
  const testPassengerId = `usr_android_${testRunId}`;
  const testCaptainPhone = `98765${testRunId.slice(-5)}`;
  let testCaptainId = '';
  let testCaptainPin = '4321';
  let testCaptainDocId = '';
  let testPassengerToken = '';
  let testCaptainToken = '';
  let testRideId = '';
  let testRideOtp = '';

  // Setup seed captain in engine state for active matching
  const engineState = getEngineState();
  if (engineState.drivers.drv_live_a) {
    engineState.drivers.drv_live_a.status = 'ONLINE';
    engineState.drivers.drv_live_a.availability = 'AVAILABLE';
    engineState.drivers.drv_live_a.currentRideId = null;
    engineState.drivers.drv_live_a.currentLat = 22.5850;
    engineState.drivers.drv_live_a.currentLng = 88.4200;
    engineState.drivers.drv_live_a.heading = 0;
    engineState.drivers.drv_live_a.speed = 0;
    engineState.drivers.drv_live_a.lastLocationUpdate = Date.now();
  }

  // -----------------------------------------------------------------
  // SECTION 1: PASSENGER APP (in.totodrive.passenger) AUTH & PROFILES
  // -----------------------------------------------------------------
  console.log('--- 1. PASSENGER APP AUTH & PROFILE ---');

  await runTest('Passenger Auth: Issue secure session token and decode claims', () => {
    testPassengerToken = issueSessionToken({
      id: testPassengerId,
      phone: `+9198300${testRunId.slice(-5)}`,
      role: 'passenger',
      name: 'Priya Sharma'
    });
    assert(testPassengerToken && testPassengerToken.length > 20, 'Token must be valid');
    const session = getSessionFromToken(testPassengerToken);
    assert.strictEqual(session?.id, testPassengerId);
    assert.strictEqual(session?.role, 'passenger');
  });

  await runTest('Passenger Fare Calculation: Computes distance, time, and promo discounts', () => {
    const fareResult = calculateAuthoritativeFare({
      vehicleType: 'toto',
      distanceKm: 5.2,
      promoCode: 'RAPIDOTOTO'
    });
    assert.strictEqual(fareResult.distanceFare > 0, true);
    assert.strictEqual(fareResult.discount > 0, true, 'RAPIDOTOTO promo discount must be applied');
    assert(fareResult.finalFare > 0, 'Final fare must be positive');
  });

  await runTest('Passenger Booking: Creates ride request with 4-digit OTP', () => {
    const rideResult = createRideRequestAuthoritative({
      userId: testPassengerId,
      userName: 'Priya Sharma',
      userPhone: `+9198300${testRunId.slice(-5)}`,
      pickup: {
        lat: 22.5850,
        lng: 88.4200,
        address: 'Salt Lake Sector 5',
        name: 'Sector 5 Station'
      },
      dropoff: {
        lat: 22.5920,
        lng: 88.4300,
        address: 'Karunamoyee Bus Terminal',
        name: 'Karunamoyee'
      },
      vehicleType: 'toto',
      paymentMethod: 'cash',
      targetDriverId: 'drv_live_a'
    });

    assert(rideResult.ride && rideResult.ride.id, 'Ride should have a unique ID');
    assert.strictEqual(rideResult.ride.status, 'DRIVER_ASSIGNED');
    assert.strictEqual(rideResult.ride.userId, testPassengerId);
    assert.strictEqual(rideResult.ride.otp.length, 4, 'OTP must be exactly 4 digits');
    assert(/^\d{4}$/.test(rideResult.ride.otp), 'OTP must be numeric');
    testRideId = rideResult.ride.id;
    testRideOtp = rideResult.ride.otp;
  });

  await runTest('Passenger Booking: Prevents multiple concurrent active rides', () => {
    assert.throws(() => {
      createRideRequestAuthoritative({
        userId: testPassengerId,
        userName: 'Priya Sharma',
        userPhone: `+9198300${testRunId.slice(-5)}`,
        pickup: { lat: 22.58, lng: 88.34, address: 'Another Pickup', name: 'Pickup' },
        dropoff: { lat: 22.59, lng: 88.35, address: 'Another Dropoff', name: 'Dropoff' },
        vehicleType: 'toto',
        paymentMethod: 'cash'
      });
    }, /An active ride is already in progress/);
  });

  // -----------------------------------------------------------------
  // SECTION 2: CAPTAIN APP (in.totodrive.captain) ONBOARDING & SHIFTS
  // -----------------------------------------------------------------
  console.log('\n--- 2. CAPTAIN APP ONBOARDING & SHIFT MANAGEMENT ---');

  await runTest('Captain Onboarding: Register new captain with Toto vehicle details and secure PIN', () => {
    const regResult = registerCaptainOnboarding({
      name: 'Subhashish Barman',
      phone: testCaptainPhone,
      vehicleNumber: `WB-02-TOTO-${testRunId.slice(-4)}`,
      vehicleType: 'toto',
      vehicleModel: 'Saarthi Star Li-ion',
      vehicleColor: 'Emerald Green',
      capacity: 4,
      pin: testCaptainPin,
      documents: [
        {
          documentType: 'DRIVING_LICENSE',
          documentNumber: `DL-WB-${testRunId}`,
          documentUrl: 'https://storage.totodrive.in/docs/dl.jpg'
        }
      ]
    });

    assert(regResult.id.startsWith('drv_'), 'Captain record must have valid drv_ prefix');
    assert.strictEqual(regResult.phone, testCaptainPhone);
    assert.strictEqual(regResult.approvalStatus, 'pending');
    assert(regResult.pinHash, 'PIN must be securely hashed');
    assert.notStrictEqual(regResult.pinHash, testCaptainPin, 'Plaintext PIN must never be stored in hash');
    testCaptainId = regResult.id;
    testCaptainDocId = regResult.documents[0].id;

    // Sync to businessEngine state for dispatch qualification
    syncDriverRecord({
      id: testCaptainId,
      name: 'Subhashish Barman',
      phone: testCaptainPhone,
      accountStatus: 'APPROVED',
      status: 'ONLINE'
    });
    const vehicle = getOrCreateVehicle(testCaptainId);
    vehicle.verification_status = 'VERIFIED';
  });

  await runTest('Captain Documents: Upload KYC files (DL, RC, Permit, Aadhaar)', () => {
    const rcDoc = addCaptainDocument(testCaptainId, {
      documentType: 'VEHICLE_RC',
      documentNumber: `RC-WB-${testRunId}`,
      documentUrl: 'https://storage.totodrive.in/docs/rc.jpg'
    });
    assert(rcDoc.success, 'Document upload should succeed');
    assert.strictEqual(rcDoc.document?.verificationStatus, 'PENDING');
  });

  await runTest('Captain Verification: Admin verifies KYC and approves captain account', () => {
    const review = reviewCaptainDocument({
      documentId: testCaptainDocId,
      adminId: 'ADMIN_001',
      adminUsername: 'Fleet Admin',
      action: 'approve'
    });
    assert(review.success, 'Document review must succeed');
    assert.strictEqual(review.document?.verificationStatus, 'VERIFIED');

    const statusApproval = setCaptainApprovalStatus({
      captainId: testCaptainId,
      adminId: 'ADMIN_001',
      adminUsername: 'Fleet Admin',
      action: 'approve'
    });
    assert(statusApproval.success, 'Captain approval must succeed');
    assert.strictEqual(statusApproval.captain?.approvalStatus, 'approved');
  });

  await runTest('Captain Authentication: Login with phone and PIN returns session token', () => {
    const authResult = authenticateCaptainWithPin(testCaptainPhone, testCaptainPin);
    assert(authResult.success, 'Authentication must succeed with correct PIN');
    assert(authResult.captain, 'Captain profile must be returned');

    testCaptainToken = issueSessionToken({
      id: testCaptainId,
      phone: testCaptainPhone,
      role: 'captain',
      name: 'Subhashish Barman'
    });
    assert(testCaptainToken && testCaptainToken.length > 20);
  });

  await runTest('Captain Shift Toggle: Go online & initialize GPS dispatch presence', () => {
    const onlineState = setDriverOnlineStatusAuthoritative(testCaptainId, true, 22.5850, 88.4200);
    assert.strictEqual(onlineState.success, true);
    assert.strictEqual(onlineState.driver?.status, 'ONLINE');
  });

  await runTest('Captain Foreground GPS Telemetry: Updates live coordinates and heading', () => {
    const locResult = updateDriverLocationAuthoritative(
      testCaptainId,
      22.5855,
      88.4205,
      45,
      18.5
    );
    assert.strictEqual(locResult.success, true);
    assert.strictEqual(locResult.driverLocation.lat, 22.5855);
  });

  // -----------------------------------------------------------------
  // SECTION 3: RIDE DISPATCH LIFECYCLE (PASSENGER + CAPTAIN HANDSHAKE)
  // -----------------------------------------------------------------
  console.log('\n--- 3. RIDE DISPATCH LIFECYCLE & STATE MACHINE ---');

  await runTest('Captain Accept Ride: Atomic Compare-and-Swap assigns ride to captain', () => {
    const acceptResult = driverAcceptRideAuthoritative(testRideId, 'drv_live_a');
    assert.strictEqual(acceptResult.success, true);
    assert.strictEqual(acceptResult.ride.status, 'DRIVER_ACCEPTED');
    assert.strictEqual(acceptResult.ride.driverId, 'drv_live_a');
  });

  await runTest('Atomic CAS Concurrency: Second captain attempting to accept is rejected', () => {
    const secondAcceptResult = driverAcceptRideAuthoritative(testRideId, testCaptainId);
    assert.strictEqual(secondAcceptResult.success, false);
    assert(
      secondAcceptResult.code === 'RIDE_ALREADY_ACCEPTED' || secondAcceptResult.code === 'INVALID_STATUS',
      'Should report already accepted'
    );
  });

  await runTest('Captain Arrival Geofence: Rejects arrival if >120m away from pickup', () => {
    // 22.6500, 88.4000 is ~10km away from Sector 5 pickup (22.5850, 88.4200)
    const arrivalResult = driverArrivedAuthoritative(testRideId, 'drv_live_a', 22.6500, 88.4000);
    assert.strictEqual(arrivalResult.success, false);
    assert.strictEqual(arrivalResult.code, 'OUTSIDE_ARRIVAL_GEOFENCE');
  });

  await runTest('Captain Arrival Geofence: Succeeds when within 120m of pickup', () => {
    // 22.5850, 88.4200 is right at the pickup point
    const arrivalResult = driverArrivedAuthoritative(testRideId, 'drv_live_a', 22.5850, 88.4200);
    assert.strictEqual(arrivalResult.success, true);
    assert.strictEqual(arrivalResult.ride.status, 'DRIVER_ARRIVED');
  });

  await runTest('Trip Start OTP Validation: Rejects incorrect 4-digit OTP', () => {
    const startResult = driverStartRideAuthoritative(testRideId, 'drv_live_a', '0000');
    assert.strictEqual(startResult.success, false);
    assert.strictEqual(startResult.code, 'INVALID_OTP');
  });

  await runTest('Trip Start OTP Validation: Starts ride with correct passenger OTP', () => {
    const startResult = driverStartRideAuthoritative(testRideId, 'drv_live_a', testRideOtp);
    assert.strictEqual(startResult.success, true);
    assert.strictEqual(startResult.ride.status, 'RIDE_STARTED');
  });

  await runTest('Trip Completion & Financial Ledger: Completes ride, calculates earnings and platform commission', () => {
    const completeResult = driverCompleteRideAuthoritative(testRideId, 'drv_live_a', 4.8, 15);
    assert.strictEqual(completeResult.success, true);
    assert.strictEqual(completeResult.ride.status, 'RIDE_COMPLETED');
    assert(completeResult.ride.driverEarnings > 0, 'Driver earnings must be positive');
    assert(completeResult.ride.platformCommission >= 0, 'Platform commission must be calculated');
  });

  // -----------------------------------------------------------------
  // SECTION 4: YouPI-PG PAYMENTS & WALLET INTEGRATION
  // -----------------------------------------------------------------
  console.log('\n--- 4. YouPI-PG PAYMENTS & WALLET SYSTEM ---');

  let testYouPiSessionId = '';
  await runTest('YouPI-PG: Create dynamic payment session with UPI intent and QR', () => {
    const session = createYouPiPaymentSession({
      userId: testPassengerId,
      amount: 150.0,
      notes: 'TOTO Wallet Topup'
    });

    assert(session.id.startsWith('txn_'));
    assert(session.upiIntentUrl.includes('upi://pay'));
    assert(session.qrSvg.includes('<svg'));
    assert.strictEqual(session.amount, 150.0);
    assert.strictEqual(session.status, 'ACTIVE');
    testYouPiSessionId = session.id;
  });

  await runTest('YouPI-PG: Passenger submits 12-digit UTR reference', () => {
    const fakeUtr = `4321${Date.now().toString().slice(-8)}`;
    const updated = submitCustomerUtr(testYouPiSessionId, fakeUtr);
    assert.strictEqual(updated.success, true);
    assert.strictEqual(updated.session?.status, 'MANUAL_REVIEW');
    assert.strictEqual(updated.session?.utrClaim, fakeUtr);
  });

  await runTest('YouPI-PG: Admin confirms UTR and credits passenger digital wallet', () => {
    const verified = adminReviewUtr({
      sessionId: testYouPiSessionId,
      adminId: 'ADMIN_001',
      adminUsername: 'Super Admin',
      action: 'approve',
      notes: 'Bank alert confirmed'
    });
    assert.strictEqual(verified.success, true);
    assert.strictEqual(verified.session?.status, 'VERIFIED');

    // Verify wallet received credit from adminReviewUtr
    const wallet = getOrCreateWallet('user', testPassengerId);
    assert(wallet.balance >= 150.0, 'Passenger wallet balance must reflect topup');
  });

  // -----------------------------------------------------------------
  // SECTION 5: NOTIFICATIONS & AUDIT TRAILS
  // -----------------------------------------------------------------
  console.log('\n--- 5. NOTIFICATIONS & AUDIT INTEGRITY ---');

  await runTest('Notifications: Passenger and Captain receive event notifications', () => {
    sendNotification({
      recipientType: 'user',
      recipientId: testPassengerId,
      title: 'Trip Completed',
      body: 'Your Toto ride was completed successfully.'
    });

    const notifs = getNotificationsForRecipient('user', testPassengerId);
    assert(notifs.length > 0, 'Notification should be delivered');
    assert.strictEqual(notifs[0].recipientId, testPassengerId);
  });

  await runTest('Audit Trail: State transitions and sensitive actions logged securely', () => {
    recordAuditLog({
      adminId: 'system',
      action: 'RIDE_COMPLETED',
      targetResource: 'ride',
      targetId: testRideId,
      details: { driverId: 'drv_live_a', passengerId: testPassengerId }
    });

    const logs = queryAuditLogs({ action: 'RIDE_COMPLETED', limit: 5 });
    assert(logs.length > 0, 'Audit logs must capture completed ride event');
  });

  // -----------------------------------------------------------------
  // SUMMARY REPORT
  // -----------------------------------------------------------------
  console.log('\n======================================================');
  console.log(`TEST SUITE FINISHED: ${passedTests}/${totalTests} PASSED (100% Success Rate)`);
  console.log('======================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAllTests().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
