import { auth, googleProvider, setCachedAccessToken } from './firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { WORKSPACE_GMAIL_SCOPES } from './gmailService';
import firebaseConfig from '../../firebase-applet-config.json';

export const GOOGLE_OAUTH_CLIENT_ID = 
  (firebaseConfig as any).oAuthClientId || 
  '335702810675-40kshvi1af4ona2l49qrncvl7lf1esq9.apps.googleusercontent.com';

export interface GoogleAuthResult {
  id: string;
  email: string;
  name: string;
  picture?: string;
  verifiedEmail?: boolean;
}

/**
 * Attempts authentic Google authentication for end users with Gmail scopes using:
 * 1. Google Identity Services (GSI OAuth2 Token Client via Google Cloud Console)
 * 2. Firebase Google Auth Popup with Gmail scopes
 * Caches access token in memory for Google Workspace Gmail API calls.
 */
export async function authenticateWithGoogleCloud(): Promise<GoogleAuthResult> {
  // 1. Try Google Identity Services (GSI) if available on window
  if (typeof window !== 'undefined' && (window as any).google?.accounts?.oauth2) {
    try {
      const google = (window as any).google;
      const allScopes = ['openid', 'email', 'profile', ...WORKSPACE_GMAIL_SCOPES].join(' ');

      const tokenPromise = new Promise<string>((resolve, reject) => {
        try {
          const client = google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_OAUTH_CLIENT_ID,
            scope: allScopes,
            prompt: 'select_account',
            callback: (response: any) => {
              if (response?.error) {
                reject(new Error(response.error_description || response.error));
              } else if (response?.access_token) {
                resolve(response.access_token);
              } else {
                reject(new Error('No access token received from Google'));
              }
            },
            error_callback: (err: any) => {
              reject(err);
            }
          });

          client.requestAccessToken({ prompt: 'select_account' });
        } catch (e) {
          reject(e);
        }
      });

      // Set timeout for token acquisition
      const accessToken = await Promise.race([
        tokenPromise,
        new Promise<string>((_, reject) =>
          setTimeout(() => reject(new Error('Google OAuth timed out')), 45000)
        )
      ]);

      // Cache token in memory
      setCachedAccessToken(accessToken);

      // Fetch user profile from Google UserInfo API
      const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (!userinfoRes.ok) {
        throw new Error('Failed to fetch user profile from Google');
      }

      const info = await userinfoRes.json();
      return {
        id: info.sub || `g_${Date.now()}`,
        email: info.email,
        name: info.name || info.email.split('@')[0],
        picture: info.picture,
        verifiedEmail: Boolean(info.email_verified)
      };
    } catch (gsiErr: any) {
      console.warn('GSI OAuth notice, trying Firebase Google Provider fallback:', gsiErr?.message || gsiErr);
    }
  }

  // 2. Try Firebase signInWithPopup
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      setCachedAccessToken(credential.accessToken);
    }

    const u = result.user;
    return {
      id: u.uid,
      email: u.email || 'passenger@totodrive.in',
      name: u.displayName || (u.email ? u.email.split('@')[0] : 'Passenger'),
      picture: u.photoURL || undefined,
      verifiedEmail: u.emailVerified
    };
  } catch (fbErr: any) {
    const msg = fbErr?.message || '';
    const isDomainRestricted =
      fbErr?.code === 'auth/unauthorized-domain' ||
      msg.toLowerCase().includes('unauthorized-domain') ||
      fbErr?.code === 'auth/operation-not-allowed';

    if (isDomainRestricted) {
      const err = new Error('GOOGLE_UNAUTHORIZED_DOMAIN');
      (err as any).code = 'auth/unauthorized-domain';
      throw err;
    }
    throw fbErr;
  }
}
