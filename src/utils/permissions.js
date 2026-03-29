export const PERMISSIONS = {
  ADMISSION_CREATE: 'admission:create',
  ADMISSION_READ: 'admission:read',
  ADMISSION_UPDATE: 'admission:update',
  ADMISSION_APPROVE: 'admission:approve',
  ADMISSION_DELETE: 'admission:delete',

  STUDENT_READ: 'student:read',

  FEES_STRUCTURE_CREATE: 'fees:structure:create',
  FEES_STRUCTURE_READ: 'fees:structure:read',
  FEES_STRUCTURE_UPDATE: 'fees:structure:update',
  FEES_STRUCTURE_DELETE: 'fees:structure:delete',
  FEES_ASSIGN: 'fees:assign',
  FEES_COLLECT: 'fees:collect',
  FEES_READ: 'fees:read',
  FEES_DASHBOARD: 'fees:dashboard',

  TRANSPORT_ROUTE_CREATE: 'transport:route:create',
  TRANSPORT_ROUTE_READ: 'transport:route:read',
  TRANSPORT_ROUTE_UPDATE: 'transport:route:update',
  TRANSPORT_ROUTE_DELETE: 'transport:route:delete',
  TRANSPORT_ASSIGN: 'transport:assign',
  TRANSPORT_READ: 'transport:read',
  LOCATION_READ: 'location:read',

  STAFF_CREATE: 'staff:create',
  STAFF_READ: 'staff:read',
  STAFF_UPDATE: 'staff:update',
  STAFF_DELETE: 'staff:delete',

  REPORTS_READ: 'reports:read',

  SETTINGS_READ: 'settings:read',
  SETTINGS_UPDATE: 'settings:update',
};

export const getCurrentUser = () => {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const getCurrentUserPermissions = () => {
  const user = getCurrentUser();
  const perms = user?.permissions;
  return Array.isArray(perms) ? perms : [];
};

export const hasPermission = (permission) => {
  return getCurrentUserPermissions().includes(permission);
};

export const hasAnyPermission = (permissions) => {
  const granted = getCurrentUserPermissions();
  return permissions.some((p) => granted.includes(p));
};
