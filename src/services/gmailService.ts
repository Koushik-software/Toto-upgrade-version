import { auth, googleProvider, setCachedAccessToken, getCachedAccessToken } from './firebase';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { ActiveRide, TripRecord } from '../types';

export const WORKSPACE_GMAIL_SCOPES = [
  'https://mail.google.com/',
  'https://www.googleapis.com/auth/gmail.addons.current.action.compose',
  'https://www.googleapis.com/auth/gmail.addons.current.message.action',
  'https://www.googleapis.com/auth/gmail.addons.current.message.metadata',
  'https://www.googleapis.com/auth/gmail.addons.current.message.readonly',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.insert',
  'https://www.googleapis.com/auth/gmail.labels',
  'https://www.googleapis.com/auth/gmail.metadata',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.settings.basic',
  'https://www.googleapis.com/auth/gmail.settings.sharing',
];

export interface GmailProfile {
  emailAddress: string;
  messagesTotal?: number;
  threadsTotal?: number;
  historyId?: string;
}

export interface SendEmailResult {
  id: string;
  threadId: string;
  labelIds?: string[];
}

export interface GmailMessageSummary {
  id: string;
  threadId: string;
  subject: string;
  date: string;
  snippet: string;
}

// In-memory token management
let cachedProfile: GmailProfile | null = null;
let isConnecting = false;

// Listen for sign-out to clear memory token & profile
onAuthStateChanged(auth, (user) => {
  if (!user) {
    setCachedAccessToken(null);
    cachedProfile = null;
  }
});

/**
 * Returns currently cached in-memory access token.
 */
export function getAccessToken(): string | null {
  return getCachedAccessToken();
}

/**
 * Checks if Gmail is currently connected with a valid token in memory
 */
export function isGmailConnected(): boolean {
  return Boolean(getCachedAccessToken());
}

/**
 * Connects Gmail using Firebase GoogleAuthProvider popup or Google Identity Services.
 * Requests full Gmail scopes specified in metadata.
 */
export async function connectGmailAccount(): Promise<{ token: string; profile: GmailProfile }> {
  if (isConnecting) {
    throw new Error('Connection request already in progress.');
  }

  isConnecting = true;
  try {
    // 1. First attempt: Firebase Auth signInWithPopup with full Gmail scopes
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;

      if (token) {
        setCachedAccessToken(token);
        const profile = await fetchGmailProfile(token, result.user.email || undefined);
        cachedProfile = profile;
        return { token, profile };
      }
    } catch (popupErr: any) {
      console.warn('Firebase popup notice, trying Google Identity Services fallback:', popupErr?.message || popupErr);
      
      // If error is not a fatal domain restriction, re-throw if GIS is not available
      const isDomainIssue =
        popupErr?.code === 'auth/unauthorized-domain' ||
        popupErr?.code === 'auth/operation-not-allowed' ||
        popupErr?.code === 'auth/popup-blocked';

      if (!isDomainIssue && !(window as any).google?.accounts?.oauth2) {
        throw popupErr;
      }
    }

    // 2. Second attempt: Google Identity Services token client
    const oAuthClientId = (firebaseConfig as any).oAuthClientId || 
      '335702810675-40kshvi1af4ona2l49qrncvl7lf1esq9.apps.googleusercontent.com';

    if (typeof window !== 'undefined' && (window as any).google?.accounts?.oauth2) {
      const google = (window as any).google;
      const token = await new Promise<string>((resolve, reject) => {
        try {
          const client = google.accounts.oauth2.initTokenClient({
            client_id: oAuthClientId,
            scope: WORKSPACE_GMAIL_SCOPES.join(' '),
            prompt: 'consent',
            callback: (res: any) => {
              if (res?.error) {
                reject(new Error(res.error_description || res.error));
              } else if (res?.access_token) {
                resolve(res.access_token);
              } else {
                reject(new Error('Failed to obtain Google access token'));
              }
            },
            error_callback: (err: any) => reject(err)
          });
          client.requestAccessToken();
        } catch (e) {
          reject(e);
        }
      });

      setCachedAccessToken(token);
      const profile = await fetchGmailProfile(token);
      cachedProfile = profile;
      return { token, profile };
    }

    throw new Error('Please allow popups in your browser to authorize Gmail connection.');
  } finally {
    isConnecting = false;
  }
}

/**
 * Disconnects Gmail session by wiping in-memory token
 */
export function disconnectGmail(): void {
  setCachedAccessToken(null);
  cachedProfile = null;
}

/**
 * Fetches Gmail Profile from Google API using access token
 */
export async function fetchGmailProfile(
  token?: string, 
  fallbackEmail?: string
): Promise<GmailProfile> {
  const activeToken = token || getCachedAccessToken();
  if (!activeToken) {
    if (fallbackEmail) {
      return { emailAddress: fallbackEmail };
    }
    throw new Error('Gmail is not connected. Please connect your Gmail account.');
  }

  try {
    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
      headers: {
        Authorization: `Bearer ${activeToken}`,
        Accept: 'application/json'
      }
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson?.error?.message || `Failed to fetch Gmail profile (${res.status})`);
    }

    const data = await res.json();
    return {
      emailAddress: data.emailAddress,
      messagesTotal: data.messagesTotal,
      threadsTotal: data.threadsTotal,
      historyId: data.historyId
    };
  } catch (err: any) {
    if (fallbackEmail) {
      return { emailAddress: fallbackEmail };
    }
    throw err;
  }
}

/**
 * Creates Base64URL-encoded RFC 2822 MIME message
 */
function createMimeMessage({
  to,
  from,
  subject,
  htmlBody,
  textBody
}: {
  to: string;
  from?: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
}): string {
  const boundary = `__totodrive_gmail_${Date.now()}_${Math.random().toString(36).substring(2, 8)}__`;
  
  // UTF-8 encoded subject
  const utf8Subject = `=?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;

  const headers = [
    `To: ${to}`,
    from ? `From: ${from}` : '',
    `Subject: ${utf8Subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`
  ].filter(Boolean).join('\r\n');

  const plainPart = [
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    btoa(unescape(encodeURIComponent(textBody || 'Trip invoice from Toto Drive'))),
    ''
  ].join('\r\n');

  const htmlPart = [
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    btoa(unescape(encodeURIComponent(htmlBody))),
    '',
    `--${boundary}--`
  ].join('\r\n');

  const rawMessage = `${headers}\r\n\r\n${plainPart}\r\n${htmlPart}`;

  // Safe Base64URL encoding (RFC 4648 § 5)
  return btoa(unescape(encodeURIComponent(rawMessage)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Sends an email using Gmail REST API messages.send endpoint
 */
export async function sendGmailMessage(params: {
  to: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  from?: string;
}): Promise<SendEmailResult> {
  const token = getCachedAccessToken();
  if (!token) {
    throw new Error('Gmail is not connected. Please connect your Gmail account to send receipts.');
  }

  const encodedMime = createMimeMessage(params);

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ raw: encodedMime })
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const message = errorData?.error?.message || `Gmail API responded with status ${res.status}`;
    throw new Error(message);
  }

  return await res.json();
}

/**
 * Generates an official, beautifully formatted HTML tax invoice / receipt
 * for Toto Drive rides.
 */
export function generateRideReceiptHtml(
  ride: ActiveRide | TripRecord, 
  customerName: string,
  userEmail: string
): { subject: string; html: string; text: string } {
  const rideId = ride.id;
  const invoiceNo = `INV-${rideId.toUpperCase().slice(-8)}`;
  const dateStr = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
  const timeStr = new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const pickupName = (ride as any).pickup?.name || (ride as any).pickupName || (ride as any).pickupAddress || 'Pickup Point';
  const pickupAddr = (ride as any).pickup?.address || '';
  const dropoffName = (ride as any).dropoff?.name || (ride as any).dropoffName || (ride as any).dropoffAddress || 'Destination';
  const dropoffAddr = (ride as any).dropoff?.address || '';
  const fare = ride.fare || 50;
  const captainName = (ride as any).driverName || 'Verified Toto Captain';
  const vehicleNo = (ride as any).driverVehicleNumber || 'WB-06-ER-4821';
  const distance = (ride.distanceKm || 3.2).toFixed(1);
  const paymentMethod = ((ride as any).paymentMethod || 'Cash').toUpperCase();

  const baseFare = 20;
  const distanceCharge = Math.max(10, Math.round(((ride.distanceKm || 3.2) * 8)));
  const timeCharge = 10;
  const discount = (ride as any).couponDiscount || 0;

  const subject = `Your Toto Drive Ride Receipt [${invoiceNo}] - ₹${fare}.00`;

  const text = `
========================================
TOTO DRIVE - TRIP TAX INVOICE / RECEIPT
========================================
Invoice #: ${invoiceNo}
Ride ID: ${rideId}
Date: ${dateStr} at ${timeStr}

CUSTOMER:
Passenger: ${customerName} (${userEmail})

CAPTAIN & VEHICLE:
Captain: ${captainName}
Vehicle: ${vehicleNo} (Electric Toto)

ROUTE:
Pickup: ${pickupName} ${pickupAddr ? `(${pickupAddr})` : ''}
Dropoff: ${dropoffName} ${dropoffAddr ? `(${dropoffAddr})` : ''}
Distance: ${distance} km

FARE BREAKDOWN:
Base Fare: ₹${baseFare}.00
Distance Charge: ₹${distanceCharge}.00
Time & Motion: ₹${timeCharge}.00
${discount > 0 ? `Promotional Discount: -₹${discount}.00\n` : ''}GST / Green Cess: ₹0.00 (100% Electric Exemption)
----------------------------------------
TOTAL PAID: ₹${fare}.00
Payment Mode: ${paymentMethod}
Status: SETTLED & COMPLETED
========================================
Thank you for riding with Toto Drive - Zero Emission Kolkata Urban Commute.
  `.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Toto Drive Tax Invoice</title>
</head>
<body style="margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f5f0; color: #1a1a1a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 18px rgba(0,0,0,0.06); border: 1px solid #e8e3d9;">
    <!-- Header -->
    <tr>
      <td style="padding: 24px 28px; background: linear-gradient(135deg, #111111 0%, #262626 100%); color: #ffffff;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <div style="font-size: 22px; font-weight: 900; letter-spacing: -0.5px;">
                Toto<span style="color: #FFB300;">Drive</span>
              </div>
              <div style="font-size: 11px; color: #d4d4d4; margin-top: 2px;">
                Zero-Emission Electric Commute • Official Tax Invoice
              </div>
            </td>
            <td align="right" style="vertical-align: top;">
              <span style="background-color: #34D399; color: #064E3B; font-size: 10px; font-weight: 800; padding: 4px 10px; border-radius: 999px; text-transform: uppercase;">
                Paid ₹${fare}.00
              </span>
              <div style="font-family: monospace; font-size: 11px; color: #a3a3a3; margin-top: 6px;">
                ${invoiceNo}
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Body content -->
    <tr>
      <td style="padding: 24px 28px;">
        <p style="font-size: 14px; line-height: 1.5; margin: 0 0 18px 0; color: #374151;">
          Hi <strong>${customerName}</strong>, thank you for riding with Toto Drive! Here is your official e-receipt for your recent journey.
        </p>

        <!-- Route Box -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #faf9f6; border: 1px solid #eee8df; border-radius: 14px; margin-bottom: 20px;">
          <tr>
            <td style="padding: 16px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="20" style="vertical-align: top; padding-top: 3px;">
                    <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background-color: #10B981;"></span>
                  </td>
                  <td style="padding-bottom: 12px;">
                    <div style="font-size: 10px; text-transform: uppercase; font-weight: 700; color: #9CA3AF;">Pickup Location</div>
                    <div style="font-size: 13px; font-weight: 700; color: #111827;">${pickupName}</div>
                    ${pickupAddr ? `<div style="font-size: 11px; color: #6B7280;">${pickupAddr}</div>` : ''}
                  </td>
                </tr>
                <tr>
                  <td width="20" style="vertical-align: top; padding-top: 3px;">
                    <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background-color: #F59E0B;"></span>
                  </td>
                  <td>
                    <div style="font-size: 10px; text-transform: uppercase; font-weight: 700; color: #9CA3AF;">Dropoff Destination</div>
                    <div style="font-size: 13px; font-weight: 700; color: #111827;">${dropoffName}</div>
                    ${dropoffAddr ? `<div style="font-size: 11px; color: #6B7280;">${dropoffAddr}</div>` : ''}
                  </td>
                </tr>
              </table>
              <div style="margin-top: 12px; padding-top: 10px; border-top: 1px dashed #e5e0d8; font-size: 11px; color: #6B7280;">
                Distance: <strong>${distance} km</strong> • Date: <strong>${dateStr} (${timeStr})</strong>
              </div>
            </td>
          </tr>
        </table>

        <!-- Driver & Vehicle Details -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px; font-size: 12px;">
          <tr>
            <td style="padding: 10px 14px; background-color: #F3F4F6; border-radius: 10px;">
              <span style="color: #6B7280;">Assigned Captain:</span> <strong>${captainName}</strong>
              <span style="color: #9CA3AF; margin: 0 6px;">|</span>
              <span style="color: #6B7280;">Vehicle:</span> <strong style="font-family: monospace;">${vehicleNo}</strong>
            </td>
          </tr>
        </table>

        <!-- Fare Breakdown -->
        <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #4B5563; margin-bottom: 8px;">
          Fare Breakdown
        </div>
        <table width="100%" cellpadding="6" cellspacing="0" style="font-size: 12px; border-collapse: collapse; margin-bottom: 16px;">
          <tr style="border-bottom: 1px solid #F3F4F6;">
            <td style="color: #6B7280;">Base Fare</td>
            <td align="right" style="font-family: monospace; font-weight: 600;">₹${baseFare}.00</td>
          </tr>
          <tr style="border-bottom: 1px solid #F3F4F6;">
            <td style="color: #6B7280;">Distance Charge (${distance} km)</td>
            <td align="right" style="font-family: monospace; font-weight: 600;">₹${distanceCharge}.00</td>
          </tr>
          <tr style="border-bottom: 1px solid #F3F4F6;">
            <td style="color: #6B7280;">Time & Motion</td>
            <td align="right" style="font-family: monospace; font-weight: 600;">₹${timeCharge}.00</td>
          </tr>
          ${discount > 0 ? `
          <tr style="border-bottom: 1px solid #F3F4F6; color: #059669;">
            <td style="font-weight: 600;">Promo / Coupon Discount</td>
            <td align="right" style="font-family: monospace; font-weight: 700;">-₹${discount}.00</td>
          </tr>
          ` : ''}
          <tr style="border-bottom: 1px solid #E5E7EB;">
            <td style="color: #9CA3AF; font-size: 11px;">Green EV Cess & GST</td>
            <td align="right" style="font-family: monospace; color: #9CA3AF; font-size: 11px;">₹0.00 (Exempt)</td>
          </tr>
          <tr style="font-size: 15px;">
            <td style="padding-top: 12px; font-weight: 900; color: #111827;">Total Paid</td>
            <td align="right" style="padding-top: 12px; font-family: monospace; font-weight: 900; color: #D97706;">₹${fare}.00</td>
          </tr>
          <tr>
            <td colspan="2" style="font-size: 11px; color: #9CA3AF; padding-top: 2px;">
              Settled via ${paymentMethod}
            </td>
          </tr>
        </table>

        <!-- Eco Impact Badge -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 12px; margin-bottom: 20px;">
          <tr>
            <td style="padding: 12px 16px; font-size: 12px; color: #065F46;">
              🌱 <strong>Eco-Friendly Commute</strong>: By choosing an electric Toto instead of a petrol auto, you saved approx. <strong>${(parseFloat(distance) * 0.14).toFixed(2)} kg CO₂</strong> on this ride!
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="padding: 20px 28px; background-color: #faf9f6; border-top: 1px solid #eee8df; text-align: center; font-size: 11px; color: #9CA3AF;">
        Toto Drive • Green Mobility Network • Kolkata, West Bengal<br/>
        Need assistance with this ride? Reply to this email or visit Support in the app.
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  return { subject, html, text };
}

/**
 * Searches user's Gmail for previous Toto Drive receipt emails
 */
export async function listRecentReceipts(): Promise<GmailMessageSummary[]> {
  const token = getCachedAccessToken();
  if (!token) return [];

  try {
    const query = encodeURIComponent('subject:"Toto Drive"');
    const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${query}&maxResults=6`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) return [];
    const data = await res.json();
    if (!data.messages || !Array.isArray(data.messages)) return [];

    const summaries: GmailMessageSummary[] = [];
    for (const msg of data.messages.slice(0, 5)) {
      try {
        const detailRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=Date`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (detailRes.ok) {
          const detail = await detailRes.json();
          const subjectHeader = detail.payload?.headers?.find((h: any) => h.name.toLowerCase() === 'subject')?.value || 'Toto Drive Receipt';
          const dateHeader = detail.payload?.headers?.find((h: any) => h.name.toLowerCase() === 'date')?.value || '';
          summaries.push({
            id: msg.id,
            threadId: msg.threadId,
            subject: subjectHeader,
            date: dateHeader,
            snippet: detail.snippet || ''
          });
        }
      } catch {
        // ignore single message fetch error
      }
    }
    return summaries;
  } catch (err) {
    console.warn('Failed to query Gmail messages:', err);
    return [];
  }
}
