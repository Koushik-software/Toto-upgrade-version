process.env.NODE_ENV = 'test';

import test from 'node:test';
import assert from 'node:assert/strict';
import { whatsappBerryService, formatQrDataUrl } from '../server/services/whatsappBerryService';

test('WhatsApp Berry Protocol Real Production Suite (BerryProtocol v0.1.10)', async (t) => {
  const testPhone = '8479022523';

  t.after(async () => {
    await whatsappBerryService.disconnect({ cleanSession: true });
    process.exit(0);
  });

  await t.test('1. Protocol Initial State and Client Info', () => {
    const info = whatsappBerryService.getClientInfo();
    assert.ok(info);
    assert.equal(info.platform, 'BerryProtocol v0.1.10');
    assert.ok(info.sessionId.includes('youpi_berry'));
    assert.ok(typeof info.stats.uptimeSeconds === 'number');
  });

  await t.test('2. Initialize generates authentic Multi-Device QR Code with Berry engine', async () => {
    const qr = await whatsappBerryService.initialize();
    assert.ok(qr);
    assert.ok(qr.raw.startsWith('https://wa.me/settings/linked_devices#2@'));
    assert.ok(qr.dataUrl.startsWith('data:image/'));
    assert.equal(whatsappBerryService.getStatus(), 'QR_READY');
  });

  await t.test('3. Request 8-Digit Pairing Code directly from BerryProtocol engine', async () => {
    const result = await whatsappBerryService.requestPairingCode(testPhone);
    assert.ok(result);
    assert.ok(result.pairingCode);
    assert.match(result.pairingCode, /^\d{4}-\d{4}$/);
    assert.equal(result.phoneNumber, '+918479022523');
    assert.equal(whatsappBerryService.getStatus(), 'PAIRING_CODE_READY');
  });

  await t.test('4. formatQrDataUrl produces valid PNG/SVG Data URLs for WhatsApp Web', async () => {
    const rawQr = '2@abcd1234efgh,ijkl5678,1';
    const dataUrl = await formatQrDataUrl(rawQr);
    assert.ok(dataUrl);
    assert.ok(dataUrl.startsWith('data:image/'));
  });

  await t.test('5. Dispatch WhatsApp message over BerryProtocol pipeline', async () => {
    const result = await whatsappBerryService.sendMessage(testPhone, 'Hello from TotoDrive!');
    assert.equal(result.success, true);
    assert.ok(result.id.startsWith('wam_'));
  });

  await t.test('6. Send test WhatsApp verification template', async () => {
    const result = await whatsappBerryService.sendTestMessage(testPhone);
    assert.equal(result.success, true);
    assert.ok(result.message.includes('+91 8479022523'));
  });

  await t.test('7. Disconnect and wipe session credentials', async () => {
    const result = await whatsappBerryService.disconnect({ cleanSession: true });
    assert.equal(result.success, true);
    assert.equal(result.status, 'DISCONNECTED');
    assert.equal(whatsappBerryService.getStatus(), 'DISCONNECTED');
    assert.equal(whatsappBerryService.getQrCode(), null);
  });
});
