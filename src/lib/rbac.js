export const ROLES = {
  ADMIN:             'admin',
  FACILITY_MANAGER:  'facility_manager',
  TECHNICIAN:        'technician',
  VIEWER:            'viewer',
}

export const PERMISSIONS = {
  DASHBOARD_VIEW:    'dashboard.view',
  WATER_VIEW:        'water.view',
  ALERTS_VIEW:       'alerts.view',
  ALERTS_MANAGE:     'alerts.manage',
  WORKORDERS_VIEW:   'workorders.view',
  WORKORDERS_MANAGE: 'workorders.manage',
  WORKORDERS_CREATE: 'workorders.create',
  REPORTS_VIEW:      'reports.view',
  REPORTS_GENERATE:  'reports.generate',
  SUPPLIES_VIEW:     'supplies.view',
  SUPPLIES_MANAGE:   'supplies.manage',
  SETTINGS_VIEW:     'settings.view',
  USERS_MANAGE:      'users.manage',
}

const ROLE_PERMISSIONS = {
  [ROLES.VIEWER]: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.WATER_VIEW,
    PERMISSIONS.ALERTS_VIEW,
    PERMISSIONS.WORKORDERS_VIEW,
    PERMISSIONS.SUPPLIES_VIEW,
  ],
  [ROLES.TECHNICIAN]: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.WATER_VIEW,
    PERMISSIONS.ALERTS_VIEW,
    PERMISSIONS.ALERTS_MANAGE,
    PERMISSIONS.WORKORDERS_VIEW,
    PERMISSIONS.WORKORDERS_MANAGE,
    PERMISSIONS.SUPPLIES_VIEW,
    PERMISSIONS.REPORTS_VIEW,
  ],
  [ROLES.FACILITY_MANAGER]: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.WATER_VIEW,
    PERMISSIONS.ALERTS_VIEW,
    PERMISSIONS.ALERTS_MANAGE,
    PERMISSIONS.WORKORDERS_VIEW,
    PERMISSIONS.WORKORDERS_MANAGE,
    PERMISSIONS.WORKORDERS_CREATE,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.REPORTS_GENERATE,
    PERMISSIONS.SUPPLIES_VIEW,
    PERMISSIONS.SUPPLIES_MANAGE,
    PERMISSIONS.SETTINGS_VIEW,
  ],
  [ROLES.ADMIN]: Object.values(PERMISSIONS),
}

export const ROLE_LABELS = {
  [ROLES.ADMIN]:            'Administrator',
  [ROLES.FACILITY_MANAGER]: 'Facility Manager',
  [ROLES.TECHNICIAN]:       'Technician',
  [ROLES.VIEWER]:           'Viewer',
}

export const ROLE_COLORS = {
  [ROLES.ADMIN]:            'text-rose-400 bg-rose-500/15 border border-rose-500/25',
  [ROLES.FACILITY_MANAGER]: 'text-blue-400 bg-blue-500/15 border border-blue-500/25',
  [ROLES.TECHNICIAN]:       'text-amber-400 bg-amber-500/15 border border-amber-500/25',
  [ROLES.VIEWER]:           'text-slate-400 bg-slate-600/30 border border-slate-600/50',
}

export function hasPermission(role, permission) {
  if (!role || !ROLE_PERMISSIONS[role]) return false
  return ROLE_PERMISSIONS[role].includes(permission)
}

export function hasAnyPermission(role, permissions) {
  return permissions.some(p => hasPermission(role, p))
}

export function getPermissions(role) {
  return ROLE_PERMISSIONS[role] ?? []
}
