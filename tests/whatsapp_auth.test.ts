process.env.NODE_ENV = 'test';

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeMobile,
  isValidMobile,
  checkCustomerExists,
  sendWhatsAppOtp,
  verifyWhatsAppOtp,
  deleteCustomerForTest
} from '../server/services/whatsappOtpAuthService';

test('WhatsApp OTP Passenger Authentication Suite (Cloned from YouPI-PG)', async (t) => {
  const testMobile = '98' + Date.now().toString().slice(-8);
  const testName = 'Priya Sen';
  const testEmail = `priya_${Date.now()}@totodrive.in`;

  // Ensure clean test isolation
  deleteCustomerForTest(testMobile);

  t.after(() => {
    deleteCustomerForTest(testMobile);
  });

  await t.test('1. Mobile Normalization & Format Validation', () => {
    assert.equal(normalizeMobile('+919876543210'), '9876543210');
    assert.equal(normalizeMobile('09876543210'), '9876543210');
    assert.equal(normalizeMobile('98765 43210'), '9876543210');
    assert.equal(isValidMobile('9876543210'), true);
    assert.equal(isValidMobile('5876543210'), false); // Must start with 6-9 in India
    assert.equal(isValidMobile('123'), false);
  });

  await t.test('2. Check User identifies unregistered phone', () => {
    const res = checkCustomerExists(testMobile);
    assert.equal(res.success, true);
    assert.equal(res.exists, false);
    assert.equal(res.mobileNumber, testMobile);
  });

  let dispatchedOtp = '';

  await t.test('3. Send WhatsApp OTP dispatches 6-digit challenge', async () => {
    const res = await sendWhatsAppOtp({
      mobileNumber: testMobile,
      name: testName,
      email: testEmail,
      isNewUser: true
    });

    assert.equal(res.success, true);
    assert.equal(res.mobileNumber, testMobile);
    assert.equal(res.expiresInSeconds, 300);
    assert.ok(res.devOtp);
    assert.equal(res.devOtp.length, 6);
    assert.ok(res.formattedMessage.includes('TotoDrive Verification Code'));
    dispatchedOtp = res.devOtp;
  });

  await t.test('4. Rate Limiter blocks immediate re-dispatch within cooldown window', async () => {
    await assert.rejects(
      async () => {
        await sendWhatsAppOtp({
          mobileNumber: testMobile,
          name: testName,
          email: testEmail
        });
      },
      (err: any) => {
        assert.ok(err.message.includes('Please wait'));
        return true;
      }
    );
  });

  await t.test('5. Verify WhatsApp OTP rejects incorrect code', async () => {
    await assert.rejects(
      async () => {
        await verifyWhatsAppOtp({
          mobileNumber: testMobile,
          otp: '000000'
        });
      },
      (err: any) => {
        assert.ok(err.message.includes('Invalid verification code'));
        return true;
      }
    );
  });

  await t.test('6. Verify WhatsApp OTP completes signup and returns UserProfile', async () => {
    const res = await verifyWhatsAppOtp({
      mobileNumber: testMobile,
      otp: dispatchedOtp,
      name: testName,
      email: testEmail
    });

    assert.equal(res.success, true);
    assert.ok(res.token);
    assert.equal(res.customer.name, testName);
    assert.equal(res.customer.email, testEmail);
    assert.ok(res.customer.phone.includes(testMobile.slice(0, 5)));
    assert.equal(res.isNewUser, true);
    assert.equal(res.customer.walletBalance, 100);
  });

  await t.test('7. Check User detects now-registered customer', () => {
    const res = checkCustomerExists(testMobile);
    assert.equal(res.success, true);
    assert.equal(res.exists, true);
    assert.equal(res.customer?.name, testName);
  });
});
