import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { validateSessionToken, logSecurityActivity } from '../adminAuth';
import { adminAuth } from '../../src/lib/firebase-admin';
import { hasPermission, Permission, AppRole } from './rolePermissions';

export interface UserSession {
  id: string;
  role: 'passenger' | 'captain';
  phone?: string;
  email?: string;
  name?: string;
  token: string;
  createdAt: number;
  expiresAt: number;
}

// In-memory active tokens for Captains and Passengers
const tokenStore = new Map<string, UserSession>();

/**
 * Issue a secure bearer session token for a Captain or Passenger
 */
export function issueSessionToken(payload: {
  id: string;
  role: 'passenger' | 'captain';
  phone?: string;
  email?: string;
  name?: string;
  durationMs?: number;
}): string {
  const token = 'ttd_' + crypto.randomBytes(24).toString('hex');
  const now = Date.now();
  const expiresAt = now + (payload.durationMs || 30 * 24 * 60 * 60 * 1000); // 30 days default

  tokenStore.set(token, {
    id: payload.id,
    role: payload.role,
    phone: payload.phone,
    email: payload.email,
    name: payload.name,
    token,
    createdAt: now,
    expiresAt
  });

  return token;
}

/**
 * Validates session token from memory or fallback header
 */
export function getSessionFromToken(token?: string): UserSession | null {
  if (!token) return null;
  const session = tokenStore.get(token);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    tokenStore.delete(token);
    return null;
  }
  return session;
}

/**
 * Invalidate a session token (logout)
 */
export function invalidateSessionToken(token: string): boolean {
  return tokenStore.delete(token);
}

export interface AuthenticatedRequest extends Request {
  auth?: {
    type: 'admin' | 'captain' | 'passenger';
    id: string;
    role: string;
    entity?: any;
    token: string;
  };
}

/**
 * Extracts bearer token from Authorization header or query param (for SSE)
 */
export function extractBearerToken(req: Request): string | undefined {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }
  if (req.query && typeof req.query.token === 'string') {
    return req.query.token;
  }
  return undefined;
}

/**
 * Helper to obtain client IP
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || '127.0.0.1';
}

/**
 * Universal Auth Middleware
 */
export async function authenticateUnified(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = extractBearerToken(req);
  if (!token) {
    return next();
  }

  // 1. Check Admin Session
  const adminCheck = validateSessionToken(token);
  if (adminCheck.valid && adminCheck.admin) {
    req.auth = {
      type: 'admin',
      id: adminCheck.admin.id || 'ADMIN_001',
      role: adminCheck.admin.role || 'admin',
      entity: adminCheck.admin,
      token
    };
    return next();
  }

  // 2. Check Local Captain / Passenger Session Store
  const localSession = getSessionFromToken(token);
  if (localSession) {
    req.auth = {
      type: localSession.role,
      id: localSession.id,
      role: localSession.role,
      entity: localSession,
      token
    };
    return next();
  }

  // 3. Check Firebase ID Token (for Passenger / Google login)
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    if (decoded && decoded.uid) {
      req.auth = {
        type: 'passenger',
        id: decoded.uid,
        role: (decoded.role as string) || 'passenger',
        entity: decoded,
        token
      };
      return next();
    }
  } catch {
    // Not a Firebase token, continue
  }

  next();
}

/**
 * Require valid Admin Auth with optional granular permission
 */
export function requireAdmin(requiredPermission?: Permission) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const token = extractBearerToken(req);
    const adminCheck = validateSessionToken(token);

    if (!adminCheck.valid || !adminCheck.admin) {
      logSecurityActivity('Unauthorized Admin API Request Rejected', getClientIp(req), false, req.path);
      res.status(401).json({
        success: false,
        error: 'Unauthorized administrator access.',
        code: 'ADMIN_UNAUTHORIZED'
      });
      return;
    }

    const adminRole = adminCheck.admin.role || 'admin';
    if (requiredPermission && !hasPermission(adminRole, requiredPermission)) {
      logSecurityActivity(`Forbidden: missing ${requiredPermission}`, getClientIp(req), false, req.path);
      res.status(403).json({
        success: false,
        error: `Forbidden: requires permission ${requiredPermission}`,
        code: 'FORBIDDEN_INSUFFICIENT_PERMISSIONS'
      });
      return;
    }

    req.auth = {
      type: 'admin',
      id: adminCheck.admin.id || 'ADMIN_001',
      role: adminRole,
      entity: adminCheck.admin,
      token: token!
    };
    next();
  };
}

/**
 * Require valid Captain Auth (or Super Admin)
 */
export function requireCaptain(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({
      success: false,
      error: 'Missing Authorization header with Bearer token.',
      code: 'UNAUTHORIZED_MISSING_TOKEN'
    });
    return;
  }

  // Allow admin to act as captain
  const adminCheck = validateSessionToken(token);
  if (adminCheck.valid && adminCheck.admin) {
    req.auth = {
      type: 'admin',
      id: adminCheck.admin.id || 'ADMIN_001',
      role: adminCheck.admin.role || 'admin',
      entity: adminCheck.admin,
      token
    };
    return next();
  }

  const session = getSessionFromToken(token);
  if (!session || session.role !== 'captain') {
    res.status(401).json({
      success: false,
      error: 'Unauthorized: valid captain authentication token required.',
      code: 'CAPTAIN_UNAUTHORIZED'
    });
    return;
  }

  req.auth = {
    type: 'captain',
    id: session.id,
    role: 'captain',
    entity: session,
    token
  };
  next();
}

/**
 * Require valid Passenger Auth (or Super Admin)
 */
export async function requirePassenger(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({
      success: false,
      error: 'Missing Authorization header with Bearer token.',
      code: 'UNAUTHORIZED_MISSING_TOKEN'
    });
    return;
  }

  // Allow admin
  const adminCheck = validateSessionToken(token);
  if (adminCheck.valid && adminCheck.admin) {
    req.auth = {
      type: 'admin',
      id: adminCheck.admin.id || 'ADMIN_001',
      role: adminCheck.admin.role || 'admin',
      entity: adminCheck.admin,
      token
    };
    return next();
  }

  // Check custom passenger token
  const session = getSessionFromToken(token);
  if (session && session.role === 'passenger') {
    req.auth = {
      type: 'passenger',
      id: session.id,
      role: 'passenger',
      entity: session,
      token
    };
    return next();
  }

  // Check Firebase ID token
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    if (decoded && decoded.uid) {
      req.auth = {
        type: 'passenger',
        id: decoded.uid,
        role: 'passenger',
        entity: decoded,
        token
      };
      return next();
    }
  } catch {
    // Token invalid
  }

  res.status(401).json({
    success: false,
    error: 'Unauthorized: valid passenger authentication token required.',
    code: 'PASSENGER_UNAUTHORIZED'
  });
}
