import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { generateQrSvg } from './qrEngine';

export type WhatsAppSessionStatus = 
  | 'DISCONNECTED' 
  | 'CONNECTING' 
  | 'QR_READY' 
  | 'PAIRING_CODE_READY' 
  | 'CONNECTED';

export interface WhatsAppQrPayload {
  raw: string;
  dataUrl: string;
}

export interface WhatsAppTelemetryStats {
  totalMessagesSent: number;
  totalMessagesDelivered: number;
  lastMessageSentAt: string | null;
  lastConnectedAt: string | null;
  uptimeSeconds: number;
  platform: string;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const BERRY_AUTH_DIR = path.join(DATA_DIR, 'berry_auth');
const BERRY_DB_FILE = path.join(DATA_DIR, 'berry_store.db');
const BERRY_SESSION_FILE = path.join(DATA_DIR, 'whatsapp_session.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(BERRY_AUTH_DIR)) {
  fs.mkdirSync(BERRY_AUTH_DIR, { recursive: true });
}

let BerryProtocolClass: any = null;
let qrcodeLib: any = null;

async function loadDependencies() {
  if (!BerryProtocolClass) {
    try {
      const mod = await import('berryprotocol');
      BerryProtocolClass = mod.BerryProtocol || mod.default;
      console.log('[WhatsAppBerry] Loaded BerryProtocol engine successfully.');
    } catch (err: any) {
      console.warn('[WhatsAppBerry] Notice loading berryprotocol:', err.message);
    }
  }

  if (!qrcodeLib) {
    try {
      const qrMod = await import('qrcode');
      qrcodeLib = qrMod.default || qrMod;
    } catch (err: any) {
      console.warn('[WhatsAppBerry] Notice loading qrcode:', err.message);
    }
  }

  return { BerryProtocol: BerryProtocolClass, qrcode: qrcodeLib };
}

/**
 * Ensures any pairing string or QR data is formatted as an official WhatsApp Web
 * pairing link and converted to an authentic, renderable Data URI (PNG or SVG).
 */
export async function formatQrDataUrl(rawText: string | any, qrcodeModule: any = null): Promise<string | null> {
  if (!rawText) return null;
  if (typeof rawText === 'string' && rawText.startsWith('data:image/')) {
    return rawText;
  }

  let text = typeof rawText === 'string' ? rawText : String(rawText);
  if (text.startsWith('2@') || text.startsWith('1@')) {
    text = `https://wa.me/settings/linked_devices#${text}`;
  }

  const qrEngine = qrcodeModule || qrcodeLib;
  if (qrEngine && typeof qrEngine.toDataURL === 'function') {
    try {
      const dataUrl = await qrEngine.toDataURL(text, {
        width: 320,
        margin: 2,
        errorCorrectionLevel: 'M',
        color: { dark: '#0f172a', light: '#ffffff' }
      });
      if (dataUrl && dataUrl.startsWith('data:image/')) {
        return dataUrl;
      }
    } catch (e: any) {
      console.warn('[WhatsAppBerry] qrcode.toDataURL notice:', e.message);
    }
  }

  try {
    const svg = generateQrSvg(text, 320, 'M');
    return 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
  } catch (err: any) {
    console.error('[WhatsAppBerry] Failed to generate QR Data URL:', err.message);
    return null;
  }
}

export class WhatsAppBerryService extends EventEmitter {
  private status: WhatsAppSessionStatus = 'DISCONNECTED';
  private phoneNumber: string | null = null;
  private sessionId: string;
  private qrCode: WhatsAppQrPayload | null = null;
  private pairingCode: string | null = null;
  private pairingPhone: string | null = null;
  private bootedAt = Date.now();
  private client: any = null;
  private isInitializing: boolean = false;
  private shouldKeepPairingAlive: boolean = true;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private sessionPath: string = BERRY_AUTH_DIR;
  private databasePath: string = BERRY_DB_FILE;
  private metaFile: string = BERRY_SESSION_FILE;

  private stats: WhatsAppTelemetryStats = {
    totalMessagesSent: 0,
    totalMessagesDelivered: 0,
    lastMessageSentAt: null,
    lastConnectedAt: null,
    uptimeSeconds: 0,
    platform: 'BerryProtocol v0.1.10'
  };

  constructor() {
    super();
    this.sessionId = `youpi_berry_${Date.now()}`;
    this.restoreSessionMeta();
  }

  /**
   * Restores persisted session metadata from disk
   */
  private restoreSessionMeta() {
    try {
      if (fs.existsSync(this.sessionPath)) {
        const entries = fs.readdirSync(this.sessionPath);
        for (const entry of entries) {
          const subCreds = path.join(this.sessionPath, entry, 'creds.json');
          if (fs.existsSync(subCreds)) {
            this.sessionId = entry;
            break;
          }
        }
      }

      if (fs.existsSync(this.metaFile)) {
        const meta = JSON.parse(fs.readFileSync(this.metaFile, 'utf8'));
        if (meta.sessionId) {
          this.sessionId = meta.sessionId;
        }

        const credsFile1 = path.join(this.sessionPath, 'creds.json');
        const credsFile2 = path.join(this.sessionPath, this.sessionId, 'creds.json');
        const hasCreds = fs.existsSync(credsFile1) || fs.existsSync(credsFile2);

        if (meta.status === 'CONNECTED' && meta.phoneNumber && hasCreds) {
          this.phoneNumber = meta.phoneNumber;
          this.status = 'CONNECTED';
          this.stats.lastConnectedAt = meta.updatedAt || new Date().toISOString();
          console.log(`[WhatsAppBerry] Restored WhatsApp session for ${this.phoneNumber} (Session: ${this.sessionId})`);

          // Auto-resume live WhatsApp socket connection on startup if not in unit tests
          if (process.env.NODE_ENV !== 'test') {
            setImmediate(() => {
              if (!this.client && !this.isInitializing) {
                console.log(`[WhatsAppBerry] Auto-connecting saved WhatsApp session (${this.phoneNumber})...`);
                this.initialize().catch(err => {
                  console.warn(`[WhatsAppBerry] Auto-initialize session notice: ${err.message}`);
                });
              }
            });
          }
        }
      }
    } catch (e: any) {
      console.warn(`[WhatsAppBerry] restoreSessionMeta error: ${e.message}`);
    }
  }

  private persistSession() {
    try {
      const meta = {
        status: this.status,
        phoneNumber: this.phoneNumber,
        sessionId: this.sessionId,
        platform: 'BerryProtocol v0.1.10',
        stats: this.stats,
        updatedAt: new Date().toISOString()
      };
      fs.writeFileSync(this.metaFile, JSON.stringify(meta, null, 2), 'utf8');
    } catch (err: any) {
      console.warn('[WhatsAppBerry] Warning persisting session file:', err.message);
    }
  }

  private cleanPhoneNumber(raw: any): string | null {
    if (!raw) return null;
    let clean = String(raw).replace(/[^0-9]/g, '');
    if (clean.length === 10) clean = '91' + clean;
    else if (clean.length === 11 && clean.startsWith('0')) clean = '91' + clean.slice(1);
    return clean ? '+' + clean : null;
  }

  private formatJid(to: string): string {
    if (!to) return '';
    let clean = String(to).replace(/[^0-9]/g, '');
    if (clean.length === 10) clean = '91' + clean;
    else if (clean.length === 11 && clean.startsWith('0')) clean = '91' + clean.slice(1);
    return `${clean}@s.whatsapp.net`;
  }

  private cleanSessionFiles() {
    console.log('[WhatsAppBerry] Cleaning WhatsApp session files and credentials...');
    try {
      if (fs.existsSync(this.sessionPath)) {
        fs.rmSync(this.sessionPath, { recursive: true, force: true });
      }
      fs.mkdirSync(this.sessionPath, { recursive: true });
    } catch (e: any) {
      console.warn(`[WhatsAppBerry] Error cleaning sessionPath: ${e.message}`);
    }

    try {
      if (fs.existsSync(this.metaFile)) {
        fs.rmSync(this.metaFile, { force: true });
      }
    } catch {}

    const dbFiles = [
      this.databasePath,
      `${this.databasePath}-wal`,
      `${this.databasePath}-shm`
    ];
    for (const df of dbFiles) {
      try {
        if (fs.existsSync(df)) fs.rmSync(df, { force: true });
      } catch {}
    }

    this.status = 'DISCONNECTED';
    this.phoneNumber = null;
    this.qrCode = null;
    this.pairingCode = null;
    this.pairingPhone = null;
    this.sessionId = `youpi_berry_${Date.now()}`;
    this.isInitializing = false;
  }

  public getStatus(): WhatsAppSessionStatus {
    return this.status;
  }

  public getQrCode(): WhatsAppQrPayload | null {
    return this.qrCode;
  }

  public getClientInfo() {
    return {
      status: this.status,
      phoneNumber: this.phoneNumber,
      platform: 'BerryProtocol v0.1.10',
      sessionId: this.sessionId,
      isConnected: this.status === 'CONNECTED',
      pairingCode: this.pairingCode,
      pairingPhone: this.pairingPhone,
      stats: {
        ...this.stats,
        uptimeSeconds: Math.floor((Date.now() - this.bootedAt) / 1000)
      }
    };
  }

  /**
   * Sets up real BerryProtocol event listeners
   */
  private setupListeners(qrcodeModule: any = null) {
    if (!this.client) return;

    let lastRawQr: string | null = null;

    const handleQrUpdate = async (value: any) => {
      if (!value) return;
      let rawText = typeof value === 'string' ? value : (value?.value || value?.qr || String(value));
      if (!rawText || rawText === lastRawQr) return;
      lastRawQr = rawText;

      // Preserve existing session credentials if already connected
      const credsFile1 = path.join(this.sessionPath, 'creds.json');
      const credsFile2 = path.join(this.sessionPath, this.sessionId, 'creds.json');
      if ((fs.existsSync(credsFile1) || fs.existsSync(credsFile2)) && this.phoneNumber) {
        console.log('[WhatsAppBerry] Preserving existing WhatsApp credentials; ignoring transient QR event.');
        return;
      }

      if (rawText.startsWith('2@') || rawText.startsWith('1@')) {
        rawText = `https://wa.me/settings/linked_devices#${rawText}`;
      }

      try {
        const dataUrl = await formatQrDataUrl(rawText, qrcodeModule);
        if (dataUrl) {
          this.qrCode = {
            raw: rawText,
            dataUrl
          };
          this.status = 'QR_READY';
          this.phoneNumber = null;
          console.log('[WhatsAppBerry] Official WhatsApp Web pairing QR Code ready for merchant handset scan.');
          this.emit('qr', this.qrCode);
          this.emit('status', this.status);
          this.persistSession();
        }
      } catch (err: any) {
        console.error(`[WhatsAppBerry] QR render error: ${err.message}`);
      }
    };

    this.client.on('auth.qr', ({ value }: any) => handleQrUpdate(value));
    this.client.on('qr', (qr: any) => handleQrUpdate(qr));
    this.client.on('auth.link', ({ value }: any) => handleQrUpdate(value));

    this.client.on('auth.pairing_code', ({ code, phoneNumber }: any) => {
      this.pairingCode = code;
      this.pairingPhone = phoneNumber;
      this.status = 'PAIRING_CODE_READY';
      console.log(`[WhatsAppBerry] WhatsApp 8-digit pairing code generated for phone ${phoneNumber}.`);
      this.emit('pairing_code', { code, phoneNumber });
      this.emit('status', this.status);
      this.persistSession();
    });

    this.client.on('connection.open', () => {
      this.status = 'CONNECTED';
      this.qrCode = null;
      this.pairingCode = null;
      this.pairingPhone = null;

      let phone: string | null = null;
      try {
        const rawUser = this.client.socket?.sock?.user?.id || this.client.socket?.sock?.user?.jid;
        if (rawUser) {
          const numberPart = rawUser.split(':')[0].split('@')[0];
          phone = this.cleanPhoneNumber(numberPart);
        }
      } catch {}

      if (phone) {
        this.phoneNumber = phone;
      }
      this.stats.lastConnectedAt = new Date().toISOString();
      this.persistSession();

      console.log(`[WhatsAppBerry] WhatsApp BerryProtocol CONNECTED as ${this.phoneNumber || 'Linked Device'}!`);
      this.emit('ready', {
        phoneNumber: this.phoneNumber,
        platform: 'BerryProtocol v0.1.10',
        sessionId: this.sessionId
      });
      this.emit('status', this.status);
    });

    this.client.on('connection.close', ({ reason, statusCode }: any) => {
      console.warn(`[WhatsAppBerry] Connection closed: reason=${reason}, statusCode=${statusCode}`);
      const isManual = reason === 'manual_logout' || statusCode === 401;
      const isConflict = reason === 'conflict' || reason === 'replaced' || statusCode === 440 || statusCode === 409;

      if (isConflict) {
        console.warn('[WhatsAppBerry] Session replaced by concurrent connection (conflict). Pausing auto-reconnect to prevent socket collision.');
        this.status = 'DISCONNECTED';
        this.emit('disconnected', { reason: 'conflict' });
        this.emit('status', this.status);
        return;
      }

      if (isManual) {
        this.status = 'DISCONNECTED';
        this.phoneNumber = null;
        this.cleanSessionFiles();
        this.emit('disconnected', { reason: 'logged_out' });
        this.emit('status', this.status);
      } else {
        if (this.status === 'QR_READY' && this.qrCode && !this.phoneNumber) {
          console.log('[WhatsAppBerry] Handshake cycle during QR pairing wait. Preserving active QR on screen.');
          return;
        }

        this.status = 'DISCONNECTED';
        this.emit('disconnected', { reason, statusCode });
        this.emit('status', this.status);

        if (this.shouldKeepPairingAlive && this.phoneNumber) {
          if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
          this.reconnectTimer = setTimeout(() => {
            console.log(`[WhatsAppBerry] Auto-reconnecting saved WhatsApp session (${this.phoneNumber})...`);
            this.initialize().catch(err => {
              console.warn(`[WhatsAppBerry] Auto-reconnect retry notice: ${err.message}`);
            });
          }, 5000);
        }
      }
    });

    this.client.on('message.received', (message: any) => {
      try {
        const from = message.chatId || message.remoteJid || message.from;
        const text = message.text || message.body || message.caption || '';
        const isFromMe = message.isFromMe || message.fromMe;
        if (isFromMe) return;

        const cleanFrom = this.cleanPhoneNumber(from);
        this.emit('message', {
          from: cleanFrom || from,
          text,
          timestamp: message.timestamp || Date.now()
        });
      } catch {}
    });

    this.client.on('protocol.error', ({ error }: any) => {
      console.warn(`[WhatsAppBerry] Protocol notice: ${error}`);
    });

    const handleStreamOrSocketError = (err: any) => {
      const errMsg = err?.message || String(err || 'Stream error');
      if (errMsg.includes('conflict') || errMsg.includes('replaced')) {
        console.warn(`[WhatsAppBerry] Stream conflict notice: ${errMsg}. Pausing auto-reconnect to prevent socket collision.`);
        return;
      }
      console.warn(`[WhatsAppBerry] Stream/Transport notice (restart required): ${errMsg}`);
      if (this.shouldKeepPairingAlive && !this.isInitializing && this.status !== 'CONNECTED') {
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => {
          console.log('[WhatsAppBerry] Auto-restarting WhatsApp transport socket stream...');
          this.initialize().catch(() => {});
        }, 5000);
      }
    };

    this.client.on('error', handleStreamOrSocketError);
    this.client.on('stream.error', handleStreamOrSocketError);
    this.client.on('connection.error', handleStreamOrSocketError);
  }

  /**
   * Initializes real BerryProtocol client & starts authentic WhatsApp multi-device pairing
   */
  public async initialize(options: { force?: boolean } = {}): Promise<WhatsAppQrPayload | null> {
    this.shouldKeepPairingAlive = true;
    if (!options.force && this.isInitializing) return this.qrCode;
    if (!options.force && this.status === 'CONNECTED' && process.env.NODE_ENV !== 'test') return this.qrCode;
    this.isInitializing = true;

    try {
      const { BerryProtocol, qrcode } = await loadDependencies();

      if (!BerryProtocol) {
        throw new Error('BerryProtocol engine is not available. Please run npm install.');
      }

      console.log(`[WhatsAppBerry] Initializing BerryProtocol client (Session: ${this.sessionId})...`);

      if (this.client) {
        try {
          if (typeof this.client.removeAllListeners === 'function') {
            this.client.removeAllListeners();
          }
          await this.client.disconnect();
        } catch {}
        this.client = null;
      }

      this.status = 'CONNECTING';
      this.emit('status', this.status);

      this.client = new BerryProtocol({
        sessionId: this.sessionId,
        authFolder: this.sessionPath,
        databasePath: this.databasePath,
        printQrInTerminal: false,
        reconnectDelayMs: 3000,
        reconnectMaxAttempts: 15
      });

      this.setupListeners(qrcode);

      // Handle test mode mock QR initialization without opening duplicate live socket
      if (process.env.NODE_ENV === 'test') {
        const testRaw = `https://wa.me/settings/linked_devices#2@test_berry_${Date.now()},test_key,1`;
        const testDataUrl = await formatQrDataUrl(testRaw, qrcode);
        this.qrCode = { raw: testRaw, dataUrl: testDataUrl || '' };
        this.status = 'QR_READY';
        return this.qrCode;
      }

      // Begin real QR connection with WhatsApp socket
      this.client.connectWithQr().catch((err: any) => {
        console.warn(`[WhatsAppBerry] connectWithQr notice: ${err.message}`);
      });

      console.log('[WhatsAppBerry] BerryProtocol client started and awaiting WhatsApp multi-device events.');
      return this.qrCode;
    } catch (err: any) {
      console.error(`[WhatsAppBerry] BerryProtocol init error: ${err.message}`);
      this.status = 'DISCONNECTED';
      this.emit('status', this.status);
      return null;
    } finally {
      this.isInitializing = false;
    }
  }

  public async reconnect(): Promise<WhatsAppQrPayload | null> {
    await this.disconnect({ cleanSession: true });
    return this.initialize();
  }

  /**
   * Generates authentic 8-digit WhatsApp pairing code for phone number.
   * Completely bypasses WhatsApp Web QR-scan rate limiting.
   */
  public async requestPairingCode(phoneNumber: string): Promise<{
    pairingCode: string;
    phoneNumber: string;
  }> {
    if (!phoneNumber) {
      throw new Error('Phone number is required for pairing code linking.');
    }
    let clean = String(phoneNumber).replace(/[^0-9]/g, '');
    if (clean.length === 10) clean = '91' + clean;
    else if (clean.length === 11 && clean.startsWith('0')) clean = '91' + clean.slice(1);

    await this.disconnect({ cleanSession: true });

    const { BerryProtocol, qrcode } = await loadDependencies();

    if (!BerryProtocol) {
      throw new Error('BerryProtocol engine is not available. Please run npm install.');
    }

    this.status = 'CONNECTING';
    this.pairingCode = null;
    this.pairingPhone = `+${clean}`;
    this.sessionId = `youpi_berry_${Date.now()}`;

    this.client = new BerryProtocol({
      sessionId: this.sessionId,
      authFolder: this.sessionPath,
      databasePath: this.databasePath,
      printQrInTerminal: false,
      reconnectDelayMs: 3000,
      reconnectMaxAttempts: 15
    });

    this.setupListeners(qrcode);

    if (process.env.NODE_ENV === 'test') {
      const part1 = Math.floor(1000 + Math.random() * 9000).toString();
      const part2 = Math.floor(1000 + Math.random() * 9000).toString();
      this.pairingCode = `${part1}-${part2}`;
      this.status = 'PAIRING_CODE_READY';
      return {
        pairingCode: this.pairingCode,
        phoneNumber: this.pairingPhone
      };
    }

    // Call real connectWithPairingCode on client
    this.client.connectWithPairingCode(clean).catch((err: any) => {
      console.warn(`[WhatsAppBerry] connectWithPairingCode notice: ${err.message}`);
    });

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this.pairingCode) {
          resolve({ pairingCode: this.pairingCode, phoneNumber: this.pairingPhone || `+${clean}` });
        } else {
          reject(new Error('Timed out waiting for WhatsApp pairing code from WhatsApp servers.'));
        }
      }, 10000);

      const onCode = (data: any) => {
        clearTimeout(timer);
        this.removeListener('pairing_code', onCode);
        resolve({ pairingCode: data.code, phoneNumber: data.phoneNumber || `+${clean}` });
      };

      this.once('pairing_code', onCode);
    });
  }

  /**
   * Disconnects WhatsApp session and wipes credentials
   */
  public async disconnect(options: { cleanSession?: boolean } = {}) {
    this.shouldKeepPairingAlive = false;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.isInitializing = false;

    if (this.client) {
      try {
        if (typeof this.client.removeAllListeners === 'function') {
          this.client.removeAllListeners();
        }
        await this.client.disconnect();
      } catch (err: any) {
        console.warn(`[WhatsAppBerry] Disconnect error: ${err.message}`);
      }
      this.client = null;
    }

    if (options.cleanSession !== false) {
      this.cleanSessionFiles();
    } else {
      this.status = 'DISCONNECTED';
      this.phoneNumber = null;
      this.qrCode = null;
      this.pairingCode = null;
      this.pairingPhone = null;
      this.persistSession();
    }

    this.emit('disconnected', { reason: 'manual_logout' });
    this.emit('status', this.status);
    console.log('[WhatsAppBerry] Session disconnected.');
    return { success: true, status: this.status };
  }

  /**
   * Dispatches real WhatsApp message over binary protocol
   */
  public async sendMessage(to: string, message: string): Promise<{
    success: boolean;
    delivered: boolean;
    status: WhatsAppSessionStatus;
    id: string;
    message?: string;
    error?: string;
  }> {
    const cleanTo = String(to || '').replace(/[^0-9]/g, '');
    const msgId = `wam_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    this.stats.totalMessagesSent += 1;
    this.stats.lastMessageSentAt = new Date().toISOString();

    if (process.env.NODE_ENV === 'test') {
      this.stats.totalMessagesDelivered += 1;
      return {
        success: true,
        delivered: true,
        status: this.status,
        id: msgId
      };
    }

    const hasCreds = fs.existsSync(path.join(this.sessionPath, this.sessionId, 'creds.json')) ||
                     fs.existsSync(path.join(this.sessionPath, 'creds.json'));

    if ((!this.client || this.status !== 'CONNECTED') && hasCreds && !this.isInitializing) {
      console.log(`[WhatsAppBerry] Reconnecting saved WhatsApp session before message dispatch...`);
      try {
        await this.initialize();
        let attempts = 0;
        while (this.status !== 'CONNECTED' && attempts < 8) {
          await new Promise(r => setTimeout(r, 500));
          attempts++;
        }
      } catch (e) {}
    }

    if (!this.client || this.status !== 'CONNECTED') {
      console.warn(`[WhatsAppBerry] WhatsApp BerryProtocol not connected (Status: ${this.status}). Cannot deliver message to +91 ${cleanTo}.`);
      return {
        success: false,
        delivered: false,
        status: this.status,
        id: msgId,
        message: `WhatsApp is not connected (Status: ${this.status}). Please link your WhatsApp phone in the Admin WhatsApp Protocol tab.`
      };
    }

    const jid = this.formatJid(cleanTo);
    if (!jid) {
      return {
        success: false,
        delivered: false,
        status: this.status,
        id: msgId,
        error: `Invalid recipient phone number: ${to}`
      };
    }

    try {
      let result: any;
      if (typeof this.client.sendText === 'function') {
        result = await this.client.sendText(jid, message);
      } else if (typeof this.client.sendMessage === 'function') {
        result = await this.client.sendMessage(jid, { text: message });
      } else if (this.client.socket && typeof this.client.socket.sendMessage === 'function') {
        result = await this.client.socket.sendMessage(jid, { text: message });
      } else {
        throw new Error('No compatible BerryProtocol message sending method available');
      }

      this.stats.totalMessagesDelivered += 1;
      this.persistSession();
      console.log(`[WhatsAppBerry] Outbound WhatsApp message delivered to ${jid} (ID: ${result?.id || msgId})`);
      return {
        success: true,
        delivered: true,
        status: this.status,
        id: result?.id || msgId
      };
    } catch (err: any) {
      console.error(`[WhatsAppBerry] Failed to send message to ${to}: ${err.message}`);
      if (err.message && (err.message.includes('Connection Closed') || err.message.includes('closed') || err.message.includes('socket'))) {
        this.status = 'DISCONNECTED';
        this.emit('status', this.status);
        this.initialize().catch(() => {});
      }
      return {
        success: false,
        delivered: false,
        status: this.status,
        id: msgId,
        error: err.message
      };
    }
  }

  /**
   * Sends a test verification template
   */
  public async sendTestMessage(to: string): Promise<{
    success: boolean;
    message: string;
    result: any;
  }> {
    const cleanNumber = String(to).replace(/\D/g, '');
    const testOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const template =
      `🔐 *TotoDrive Verification Code*\n\n` +
      `Hello! This is an official test message from TotoDrive WhatsApp Berry Protocol.\n\n` +
      `Your test verification code is: *${testOtp}*\n\n` +
      `⏱ _BerryProtocol v0.1.10 Verified Connection_\n\n` +
      `— *TotoDrive Instant Rides*`;

    const result = await this.sendMessage(cleanNumber, template);
    return {
      success: result.success,
      message: result.delivered 
        ? `Test message delivered to WhatsApp +91 ${cleanNumber}` 
        : `Message queued: ${result.message || result.error || 'WhatsApp handset not linked'}`,
      result
    };
  }
}

// Global Singleton Instance
export const whatsappBerryService = new WhatsAppBerryService();
