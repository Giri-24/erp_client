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

  // HR Module
  HR_DASHBOARD: 'hr:dashboard',
  HR_ATTENDANCE_READ: 'hr:attendance:read',
  HR_ATTENDANCE_MANAGE: 'hr:attendance:manage',
  HR_LEAVE_READ: 'hr:leave:read',
  HR_LEAVE_MANAGE: 'hr:leave:manage',
  HR_LEAVE_APPROVE: 'hr:leave:approve',
  HR_PERMISSION_READ: 'hr:permission:read',
  HR_PERMISSION_MANAGE: 'hr:permission:manage',
  HR_PERMISSION_APPROVE: 'hr:permission:approve',
  HR_STATUTORY_READ: 'hr:statutory:read',
  HR_STATUTORY_MANAGE: 'hr:statutory:manage',
  HR_ESSL_READ: 'hr:essl:read',
  HR_ESSL_MANAGE: 'hr:essl:manage',
  HR_PAYROLL_READ: 'hr:payroll:read',
  HR_PAYROLL_MANAGE: 'hr:payroll:manage',
  HR_PAYROLL_APPROVE: 'hr:payroll:approve',
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
