import assert from 'assert';
import crypto from 'crypto';
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
} from '../server/services/youpiPaymentService';
import {
  getOrCreateWallet,
  getWalletLedger
} from '../server/services/walletService';
import {
  updateCaptainPaymentConfig,
  getCaptainById
} from '../server/services/captainService';
import {
  createRideRequestAuthoritative,
  driverAcceptRideAuthoritative,
  driverArrivedAuthoritative,
  driverStartRideAuthoritative,
  driverCompleteRideAuthoritative
} from '../server/businessEngine';

let passed = 0;
let failed = 0;

function runTest(name: string, fn: () => void | Promise<void>) {
  try {
    const res = fn();
    if (res instanceof Promise) {
      res.then(() => {
        console.log(`  ✓ [PASS] ${name}`);
        passed++;
      }).catch(err => {
        console.error(`  ✗ [FAIL] ${name}:`, err.message);
        failed++;
      });
    } else {
      console.log(`  ✓ [PASS] ${name}`);
      passed++;
    }
  } catch (err: any) {
    console.error(`  ✗ [FAIL] ${name}:`, err.message);
    failed++;
  }
}

console.log('======================================================');
console.log('  YOUPI PAYMENT GATEWAY & FINANCIAL LEDGER TEST SUITE');
console.log('======================================================');

// --------------------------------------------------------------------------
// SUITE 1: Server-Side Amount Validation & Unique Order IDs
// --------------------------------------------------------------------------
console.log('\n[SUITE 1] Session Creation & Amount Validation');

runTest('Rejects zero, negative, and invalid payment amounts', () => {
  assert.throws(() => {
    createYouPiPaymentSession({ userId: 'usr_test_1', amount: 0 });
  }, /positive number/);

  assert.throws(() => {
    createYouPiPaymentSession({ userId: 'usr_test_1', amount: -50 });
  }, /positive number/);

  assert.throws(() => {
    createYouPiPaymentSession({ userId: 'usr_test_1', amount: 0.5 });
  }, /Minimum payment amount/);

  assert.throws(() => {
    createYouPiPaymentSession({ userId: 'usr_test_1', amount: 999999 });
  }, /Maximum payment amount/);
});

runTest('Generates unique Order IDs and accurate 64-bit integer Paise', () => {
  const s1 = createYouPiPaymentSession({ userId: 'usr_test_1', amount: 250.75, type: 'WALLET_TOPUP' });
  const s2 = createYouPiPaymentSession({ userId: 'usr_test_1', amount: 250.75, type: 'WALLET_TOPUP' });

  assert.notStrictEqual(s1.id, s2.id);
  assert.notStrictEqual(s1.orderId, s2.orderId);
  assert.strictEqual(s1.amount, 250.75);
  assert.strictEqual(s1.amountPaise, 25075);
  assert.ok(s1.upiIntentUrl.includes(encodeURIComponent(YOUPI_CONFIG.merchantUpiId)));
  assert.ok(s1.qrSvg.includes('<svg') && s1.qrSvg.includes('shape-rendering="crispEdges"'));
  assert.strictEqual(s1.merchantDetails?.merchantId, '00000000-0000-0000-0000-000000000001');
  assert.strictEqual(s1.merchantDetails?.publishableKey, 'yp_live_c65004c566aff70da3ca7c9b0d802268');
  assert.strictEqual(s1.merchantDetails?.merchantUpiId, '8479022523@ybl');
});

// --------------------------------------------------------------------------
// SUITE 2: Anti-Replay UTR Validation & Duplicate Prevention
// --------------------------------------------------------------------------
console.log('\n[SUITE 2] UTR Verification & Replay Protection');

runTest('Validates Indian bank UTR formatting and sets status to MANUAL_REVIEW', () => {
  const session = createYouPiPaymentSession({ userId: 'usr_wallet_pay', amount: 500 });
  
  // Invalid UTR (too short)
  const invalidRes = submitCustomerUtr(session.id, '123');
  assert.strictEqual(invalidRes.success, false);
  assert.ok(invalidRes.error?.includes('Invalid UTR format'));

  // Valid 12-digit UTR
  const uniqueUtr = '43' + Date.now().toString().slice(-10);
  const validRes = submitCustomerUtr(session.id, uniqueUtr);
  assert.strictEqual(validRes.success, true);
  assert.strictEqual(validRes.session?.status, 'MANUAL_REVIEW');
  assert.strictEqual(validRes.session?.utrClaim, uniqueUtr);

  // Attempt to replay the same UTR on a different session
  const s2 = createYouPiPaymentSession({ userId: 'usr_attacker', amount: 500 });
  const replayRes = submitCustomerUtr(s2.id, uniqueUtr);
  assert.strictEqual(replayRes.success, false);
  assert.ok(replayRes.error?.includes('Replay detected'));
});

// --------------------------------------------------------------------------
// SUITE 3: HMAC-SHA256 Signature Verification & Webhook Handling
// --------------------------------------------------------------------------
console.log('\n[SUITE 3] Cryptographic Webhook Security & Idempotency');

runTest('Validates raw-body HMAC-SHA256 signatures with constant-time equality', () => {
  const payload = JSON.stringify({ event: 'SUCCESS', paymentId: 'txn_mock', amount: '150.00' });
  const hmac = crypto.createHmac('sha256', YOUPI_CONFIG.webhookSecret);
  hmac.update(payload);
  const validSignature = hmac.digest('hex');

  // Exact match
  assert.strictEqual(verifyYouPiWebhookSignature(payload, validSignature), true);
  assert.strictEqual(verifyYouPiWebhookSignature(payload, `sha256=${validSignature}`), true);

  // Tampered payload fails
  assert.strictEqual(verifyYouPiWebhookSignature(payload + ' ', validSignature), false);

  // Wrong secret signature fails
  const badHmac = crypto.createHmac('sha256', 'wrong_secret').update(payload).digest('hex');
  assert.strictEqual(verifyYouPiWebhookSignature(payload, badHmac), false);
});

runTest('Idempotently processes webhooks and dedupes by delivery ID', () => {
  const session = createYouPiPaymentSession({ userId: 'usr_wh_test', amount: 300, type: 'WALLET_TOPUP' });
  const deliveryId = 'del_' + crypto.randomUUID();
  const utr = '556677889900';

  const firstDelivery = handleYouPiWebhook({
    deliveryId,
    event: 'SUCCESS',
    payload: { paymentId: session.id, utr, amount: 300 }
  });
  assert.strictEqual(firstDelivery.success, true);
  assert.strictEqual(firstDelivery.duplicate, undefined);

  // Check session is now verified
  const updated = getYouPiSession(session.id);
  assert.strictEqual(updated?.status, 'VERIFIED');
  assert.strictEqual(updated?.utrClaim, utr);

  // Duplicate webhook delivery with same deliveryId
  const dupDelivery = handleYouPiWebhook({
    deliveryId,
    event: 'SUCCESS',
    payload: { paymentId: session.id, utr, amount: 300 }
  });
  assert.strictEqual(dupDelivery.success, true);
  assert.strictEqual(dupDelivery.duplicate, true);
});

// --------------------------------------------------------------------------
// SUITE 4: Passenger Wallet Recharge & Double-Entry Ledger
// --------------------------------------------------------------------------
console.log('\n[SUITE 4] Passenger Wallet Recharge Flow');

runTest('Credits passenger wallet upon verified topup and records double-entry ledger', () => {
  const userId = 'usr_topup_recipient_' + Date.now();
  const initialWallet = getOrCreateWallet('user', userId);
  const startingBalance = initialWallet.balance;

  const session = createYouPiPaymentSession({
    userId,
    amount: 1000.00,
    type: 'WALLET_TOPUP'
  });

  const testUtr = '8899001122' + Math.floor(10 + Math.random() * 90);
  submitCustomerUtr(session.id, testUtr);

  // Admin approves bank UTR
  const reviewRes = adminReviewUtr({
    sessionId: session.id,
    adminId: 'ADMIN_CHIEF',
    adminUsername: 'Chief Accountant',
    action: 'approve',
    notes: 'Bank SMS alert matched ICICI statement'
  });

  assert.strictEqual(reviewRes.success, true);
  assert.strictEqual(reviewRes.session?.status, 'VERIFIED');

  // Verify wallet credited exactly ₹1000.00
  const ledger = getWalletLedger('user', userId);
  assert.strictEqual(ledger.wallet.balance, Number((startingBalance + 1000).toFixed(2)));
  
  const topupEntry = ledger.entries.find(e => e.referenceId === session.id);
  assert.ok(topupEntry);
  assert.strictEqual(topupEntry.transactionType, 'WALLET_TOPUP');
  assert.strictEqual(topupEntry.amount, 1000.00);
});

// --------------------------------------------------------------------------
// SUITE 5: Captain UPI Configuration & Ride Payment Settlement
// --------------------------------------------------------------------------
console.log('\n[SUITE 5] Captain Payment Config & Ride Earnings Settlement');

runTest('Configures Captain UPI ID and validates format', () => {
  const captainId = 'drv_1';
  const cfg = updateCaptainPaymentConfig({
    captainId,
    upiId: 'raju.toto@ybl',
    payoutAccountHolder: 'Raju Karmakar',
    bankAccountNumber: '50100492817291',
    bankIfsc: 'HDFC0001024'
  });

  assert.strictEqual(cfg.success, true);
  assert.strictEqual(cfg.captain?.upiId, 'raju.toto@ybl');

  // Test invalid UPI format
  const badCfg = updateCaptainPaymentConfig({
    captainId,
    upiId: 'not_an_email_or_vpa'
  });
  assert.strictEqual(badCfg.success, false);
  assert.ok(badCfg.error?.includes('Invalid UPI ID format'));
});

runTest('Settles Ride payment: credits 90% net earnings to Captain, 10% to Platform', () => {
  // Create complete ride
  const rideReq = createRideRequestAuthoritative({
    userId: 'usr_ride_payer',
    userName: 'Ride Payer',
    userPhone: '+919876543210',
    pickup: { lat: 22.5850, lng: 88.4230, address: 'Salt Lake Sector V', name: 'Salt Lake' },
    dropoff: { lat: 22.5890, lng: 88.4280, address: 'Karunamoyee', name: 'Karunamoyee' },
    paymentMethod: 'upi',
    vehicleType: 'toto'
  });
  const rideId = rideReq.ride.id;
  driverAcceptRideAuthoritative(rideId, 'drv_1');
  driverArrivedAuthoritative(rideId, 'drv_1', 22.5850, 88.4230);
  driverStartRideAuthoritative(rideId, 'drv_1', rideReq.ride.otp);
  driverCompleteRideAuthoritative(rideId, 'drv_1');

  // Measure initial balances
  const initialCaptainBal = getOrCreateWallet('captain', 'drv_1').balance;
  const initialPlatformBal = getOrCreateWallet('platform', 'TOTO_DRIVE_PLATFORM').balance;

  // Passenger initiates Ride Payment session
  const session = createYouPiPaymentSession({
    userId: 'usr_ride_payer',
    amount: 100.00,
    type: 'RIDE_PAYMENT',
    rideId,
    captainId: 'drv_1'
  });

  assert.strictEqual(session.type, 'RIDE_PAYMENT');
  assert.strictEqual(session.captainUpiId, 'raju.toto@ybl');

  // Settle via verified webhook
  const whRes = handleYouPiWebhook({
    deliveryId: 'del_ride_' + Date.now(),
    event: 'SUCCESS',
    payload: {
      paymentId: session.id,
      utr: '998877665544',
      amount: 100.00
    }
  });
  assert.strictEqual(whRes.success, true);

  // Captain wallet receives 90% = ₹90.00
  const captainWallet = getOrCreateWallet('captain', 'drv_1');
  assert.strictEqual(captainWallet.balance, Number((initialCaptainBal + 90.00).toFixed(2)));

  // Platform wallet receives 10% = ₹10.00
  const platformWallet = getOrCreateWallet('platform', 'TOTO_DRIVE_PLATFORM');
  assert.strictEqual(platformWallet.balance, Number((initialPlatformBal + 10.00).toFixed(2)));
});

// --------------------------------------------------------------------------
// SUITE 6: Refund Workflow & Transaction Receipts
// --------------------------------------------------------------------------
console.log('\n[SUITE 6] Refund Workflow & Digital Receipts');

runTest('Generates digital transaction receipt with tax breakdown', () => {
  const session = createYouPiPaymentSession({
    userId: 'usr_rcp_test',
    amount: 150.00,
    type: 'RIDE_PAYMENT',
    rideId: 'ride_sample_1'
  });

  session.status = 'VERIFIED';
  session.utrClaim = '112233445566';
  const receipt = generatePaymentReceipt(session);

  assert.strictEqual(receipt.receiptNumber, `RCP-${session.orderId}`);
  assert.strictEqual(receipt.amount, 150.00);
  assert.strictEqual(receipt.amountPaise, 15000);
  assert.strictEqual(receipt.breakdown.baseFare, 135.00); // 90%
  assert.strictEqual(receipt.breakdown.platformFee, 15.00); // 10%
  assert.strictEqual(receipt.breakdown.gstPaise, 270); // 18% of ₹15 = ₹2.70 = 270 paise
  assert.strictEqual(receipt.merchant.merchantUpiId, YOUPI_CONFIG.merchantUpiId);
});

runTest('Executes refund to Passenger wallet and updates status to REFUNDED', () => {
  const userId = 'usr_refund_target_' + Date.now();
  const session = createYouPiPaymentSession({ userId, amount: 200, type: 'WALLET_TOPUP' });
  submitCustomerUtr(session.id, '445566778899');
  adminReviewUtr({
    sessionId: session.id,
    adminId: 'ADMIN_001',
    adminUsername: 'Admin',
    action: 'approve'
  });

  const balAfterTopup = getOrCreateWallet('user', userId).balance;

  // Process Refund of ₹200 back to Passenger wallet
  const refundRes = processPaymentRefund({
    sessionId: session.id,
    adminId: 'ADMIN_001',
    adminUsername: 'Admin',
    reason: 'Customer requested refund due to cancellation',
    refundType: 'wallet',
    amount: 200
  });

  assert.strictEqual(refundRes.success, true);
  assert.strictEqual(refundRes.session?.status, 'REFUNDED');
  assert.strictEqual(refundRes.session?.refundDetails?.refundType, 'wallet');

  // Verify wallet received refund credit
  const finalWallet = getOrCreateWallet('user', userId);
  assert.strictEqual(finalWallet.balance, Number((balAfterTopup + 200).toFixed(2)));
});

// --------------------------------------------------------------------------
// SUITE 7: Financial Reconciliation Summary
// --------------------------------------------------------------------------
console.log('\n[SUITE 7] Ledger Reconciliation Reporting');

runTest('Produces financial reconciliation breakdown across all payment sessions', () => {
  const summary = getPaymentReconciliationSummary();

  assert.ok(summary.totalSessions > 0);
  assert.ok(summary.totalVolumeRupees > 0);
  assert.ok(summary.verifiedCount > 0);
  assert.ok(summary.verifiedVolumeRupees > 0);
  assert.ok(summary.byType.walletTopups.count > 0);
  assert.ok(summary.byType.ridePayments.count > 0);

  console.log(`    Total Sessions: ${summary.totalSessions}`);
  console.log(`    Total Volume: ₹${summary.totalVolumeRupees}`);
  console.log(`    Verified Volume: ₹${summary.verifiedVolumeRupees}`);
  console.log(`    Refunded Volume: ₹${summary.refundedVolumeRupees}`);
});

console.log('\n======================================================');
console.log(`  PAYMENT GATEWAY TESTS: ${passed} PASSED, ${failed} FAILED`);
console.log('======================================================');

if (failed > 0) {
  process.exit(1);
}
