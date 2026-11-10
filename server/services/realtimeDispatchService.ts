import { Response } from 'express';

export interface SseClient {
  id: string;
  role: 'passenger' | 'captain' | 'admin' | 'public';
  userId?: string;
  res: Response;
  connectedAt: number;
}

const activeSseClients = new Map<string, SseClient>();

/**
 * Register a client for Server-Sent Events (SSE)
 */
export function registerSseClient(params: {
  id: string;
  role: 'passenger' | 'captain' | 'admin' | 'public';
  userId?: string;
  res: Response;
}) {
  const { id, role, userId, res } = params;

  // Set SSE HTTP response headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });

  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', clientId: id, role, timestamp: Date.now() })}\n\n`);

  const client: SseClient = {
    id,
    role,
    userId,
    res,
    connectedAt: Date.now()
  };

  activeSseClients.set(id, client);

  res.on('close', () => {
    activeSseClients.delete(id);
  });
}

/**
 * Broadcast an event to matching clients
 */
export function broadcastRealtimeEvent(event: {
  type: string;
  payload: any;
  targetRole?: 'passenger' | 'captain' | 'admin';
  targetUserId?: string;
}) {
  const data = `data: ${JSON.stringify({
    type: event.type,
    payload: event.payload,
    timestamp: Date.now()
  })}\n\n`;

  for (const client of activeSseClients.values()) {
    // Filter by role if specified
    if (event.targetRole && client.role !== event.targetRole && client.role !== 'admin') {
      continue;
    }
    // Filter by specific user if specified
    if (event.targetUserId && client.userId && client.userId !== event.targetUserId) {
      continue;
    }

    try {
      client.res.write(data);
    } catch {
      activeSseClients.delete(client.id);
    }
  }
}

/**
 * Periodic SSE heartbeat to keep proxies and mobile clients alive
 */
setInterval(() => {
  const ping = `: ping - ${Date.now()}\n\n`;
  for (const [id, client] of activeSseClients.entries()) {
    try {
      client.res.write(ping);
    } catch {
      activeSseClients.delete(id);
    }
  }
}, 25000);

export function getActiveSseClientCount(): number {
  return activeSseClients.size;
}
