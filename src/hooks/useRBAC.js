import { useAuth } from '../contexts/AuthContext'
import { hasPermission, hasAnyPermission, getPermissions } from '../lib/rbac'

export function useRBAC() {
  const { role } = useAuth()

  return {
    role,
    can:         (permission)  => hasPermission(role, permission),
    canAny:      (permissions) => hasAnyPermission(role, permissions),
    permissions: getPermissions(role),
  }
}
