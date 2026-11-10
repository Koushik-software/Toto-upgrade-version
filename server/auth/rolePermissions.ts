/**
 * TOTO DRIVE ROLE-BASED ACCESS CONTROL (RBAC) DEFINITIONS
 */

export type AppRole = 'passenger' | 'captain' | 'admin' | 'fleet_manager' | 'support_agent';

export type Permission =
  // Passenger Permissions
  | 'ride:request'
  | 'ride:cancel'
  | 'ride:rate'
  | 'wallet:read'
  | 'wallet:topup_request'
  | 'ticket:create'
  
  // Captain Permissions
  | 'captain:toggle_online'
  | 'captain:stream_gps'
  | 'captain:accept_ride'
  | 'captain:arrived_ride'
  | 'captain:start_ride'
  | 'captain:complete_ride'
  | 'captain:ledger_read'
  | 'captain:withdraw_request'
  
  // Fleet Manager / Admin Permissions
  | 'fleet:read'
  | 'fleet:manage_vehicles'
  | 'captain:verify_documents'
  | 'captain:suspend'
  
  // Support Agent Permissions
  | 'ticket:manage'
  | 'ride:inspect'
  | 'ride:cancel_override'
  
  // Super Admin Permissions
  | 'system:config_pricing'
  | 'payment:reconcile_utr'
  | 'wallet:adjust'
  | 'refund:process'
  | 'audit:read'
  | 'admin:manage_accounts';

export const ROLE_PERMISSIONS: Record<AppRole, Permission[]> = {
  passenger: [
    'ride:request',
    'ride:cancel',
    'ride:rate',
    'wallet:read',
    'wallet:topup_request',
    'ticket:create'
  ],
  captain: [
    'captain:toggle_online',
    'captain:stream_gps',
    'captain:accept_ride',
    'captain:arrived_ride',
    'captain:start_ride',
    'captain:complete_ride',
    'captain:ledger_read',
    'captain:withdraw_request',
    'ticket:create'
  ],
  support_agent: [
    'fleet:read',
    'ride:inspect',
    'ticket:manage',
    'ride:cancel_override'
  ],
  fleet_manager: [
    'fleet:read',
    'fleet:manage_vehicles',
    'captain:verify_documents',
    'captain:suspend',
    'ride:inspect',
    'ticket:manage'
  ],
  admin: [
    // Super Admin has all permissions
    'ride:request',
    'ride:cancel',
    'ride:rate',
    'wallet:read',
    'wallet:topup_request',
    'ticket:create',
    'captain:toggle_online',
    'captain:stream_gps',
    'captain:accept_ride',
    'captain:arrived_ride',
    'captain:start_ride',
    'captain:complete_ride',
    'captain:ledger_read',
    'captain:withdraw_request',
    'fleet:read',
    'fleet:manage_vehicles',
    'captain:verify_documents',
    'captain:suspend',
    'ticket:manage',
    'ride:inspect',
    'ride:cancel_override',
    'system:config_pricing',
    'payment:reconcile_utr',
    'wallet:adjust',
    'refund:process',
    'audit:read',
    'admin:manage_accounts'
  ]
};

export function hasPermission(role: string, permission: Permission): boolean {
  const normRole = (role === 'super_admin' ? 'admin' : role) as AppRole;
  const permissions = ROLE_PERMISSIONS[normRole];
  if (!permissions) return false;
  return permissions.includes(permission);
}
