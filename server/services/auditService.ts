import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface AuditLogEntry {
  id: string;
  adminId?: string;
  adminUsername?: string;
  action: string;
  targetResource: string;
  targetId?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, any>;
  timestamp: string;
}

const DATA_DIR = path.join(process.cwd(), '.data');
const AUDIT_FILE = path.join(DATA_DIR, 'platform_audit_logs.json');

let inMemoryAuditLogs: AuditLogEntry[] = [];

// Load logs on startup
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (fs.existsSync(AUDIT_FILE)) {
    const raw = fs.readFileSync(AUDIT_FILE, 'utf-8');
    inMemoryAuditLogs = JSON.parse(raw);
  }
} catch (err) {
  console.warn('Could not initialize audit logs from disk:', err);
}

function persistAuditLogs() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    // Retain up to 2000 recent logs
    if (inMemoryAuditLogs.length > 2000) {
      inMemoryAuditLogs = inMemoryAuditLogs.slice(-2000);
    }
    fs.writeFileSync(AUDIT_FILE, JSON.stringify(inMemoryAuditLogs, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write audit logs to disk:', err);
  }
}

/**
 * Record an immutable audit log entry
 */
export function recordAuditLog(entry: {
  adminId?: string;
  adminUsername?: string;
  action: string;
  targetResource: string;
  targetId?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, any>;
}): AuditLogEntry {
  const log: AuditLogEntry = {
    id: 'aud_' + Date.now().toString(36) + '_' + crypto.randomBytes(4).toString('hex'),
    adminId: entry.adminId || 'SYSTEM',
    adminUsername: entry.adminUsername || 'System Automator',
    action: entry.action,
    targetResource: entry.targetResource,
    targetId: entry.targetId,
    ipAddress: entry.ipAddress || '127.0.0.1',
    userAgent: entry.userAgent,
    details: entry.details,
    timestamp: new Date().toISOString()
  };

  inMemoryAuditLogs.push(log);
  persistAuditLogs();
  return log;
}

/**
 * Query audit logs with pagination and filters
 */
export function queryAuditLogs(filter?: {
  action?: string;
  targetResource?: string;
  adminId?: string;
  limit?: number;
}): AuditLogEntry[] {
  let list = [...inMemoryAuditLogs].reverse();

  if (filter?.action) {
    list = list.filter(l => l.action.toLowerCase().includes(filter.action!.toLowerCase()));
  }
  if (filter?.targetResource) {
    list = list.filter(l => l.targetResource.toLowerCase() === filter.targetResource!.toLowerCase());
  }
  if (filter?.adminId) {
    list = list.filter(l => l.adminId === filter.adminId);
  }

  const limit = Math.min(filter?.limit || 100, 500);
  return list.slice(0, limit);
}
