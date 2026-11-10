import crypto from 'crypto';

export interface NotificationItem {
  id: string;
  recipientType: 'user' | 'captain' | 'admin';
  recipientId: string;
  title: string;
  body: string;
  channel: 'IN_APP' | 'PUSH' | 'SMS';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  status: 'PENDING' | 'DELIVERED' | 'READ';
  data?: Record<string, any>;
  readAt?: string;
  createdAt: string;
}

const notifications: NotificationItem[] = [
  {
    id: 'notif_welcome',
    recipientType: 'admin',
    recipientId: 'ADMIN_001',
    title: 'Toto Drive Platform Operational',
    body: 'Production shared backend services initialized successfully.',
    channel: 'IN_APP',
    priority: 'NORMAL',
    status: 'DELIVERED',
    createdAt: new Date().toISOString()
  }
];

export function sendNotification(params: {
  recipientType: 'user' | 'captain' | 'admin';
  recipientId: string;
  title: string;
  body: string;
  channel?: 'IN_APP' | 'PUSH' | 'SMS';
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  data?: Record<string, any>;
}): NotificationItem {
  const notif: NotificationItem = {
    id: 'notif_' + Date.now().toString(36) + '_' + crypto.randomBytes(3).toString('hex'),
    recipientType: params.recipientType,
    recipientId: params.recipientId,
    title: params.title,
    body: params.body,
    channel: params.channel || 'IN_APP',
    priority: params.priority || 'NORMAL',
    status: 'DELIVERED',
    data: params.data,
    createdAt: new Date().toISOString()
  };

  notifications.push(notif);
  if (notifications.length > 1000) {
    notifications.shift();
  }
  return notif;
}

export function getNotificationsForRecipient(recipientType: string, recipientId: string): NotificationItem[] {
  return notifications
    .filter(n => n.recipientType === recipientType && (n.recipientId === recipientId || n.recipientId === 'ALL'))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function markNotificationAsRead(id: string): boolean {
  const notif = notifications.find(n => n.id === id);
  if (notif) {
    notif.status = 'READ';
    notif.readAt = new Date().toISOString();
    return true;
  }
  return false;
}
