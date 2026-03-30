import axios from '../../utils/axios';

// ─── ATTENDANCE ─────────────────────────────

export const getAttendance = async (params) => {
  const res = await axios.get('/hr/attendance', { params });
  return res.data;
};

export const getAttendanceByStaff = async (staffId, params) => {
  const res = await axios.get(`/hr/attendance/staff/${staffId}`, { params });
  return res.data;
};

export const markAttendance = async (data) => {
  const res = await axios.post('/hr/attendance', data);
  return res.data;
};

export const bulkMarkAttendance = async (data) => {
  const res = await axios.post('/hr/attendance/bulk-mark', data);
  return res.data;
};

export const updateAttendance = async (id, data) => {
  const res = await axios.put(`/hr/attendance/${id}`, data);
  return res.data;
};

export const getAttendanceSummary = async (params) => {
  const res = await axios.get('/hr/attendance/summary', { params });
  return res.data;
};

export const getMonthlyAttendanceReport = async (params) => {
  const res = await axios.get('/hr/attendance/monthly-report', { params });
  return res.data;
};

// ─── ESSL BIOMETRIC SYNC ────────────────────

export const syncESSL = async (data) => {
  const res = await axios.post('/hr/essl/sync', data);
  return res.data;
};

export const getESSLDevices = async () => {
  const res = await axios.get('/hr/essl/devices');
  return res.data;
};

export const addESSLDevice = async (data) => {
  const res = await axios.post('/hr/essl/devices', data);
  return res.data;
};

export const updateESSLDevice = async (id, data) => {
  const res = await axios.put(`/hr/essl/devices/${id}`, data);
  return res.data;
};

export const deleteESSLDevice = async (id) => {
  const res = await axios.delete(`/hr/essl/devices/${id}`);
  return res.data;
};

export const getESSLPunchLogs = async (params) => {
  const res = await axios.get('/hr/essl/punch-logs', { params });
  return res.data;
};

export const getESSLSyncHistory = async (params) => {
  const res = await axios.get('/hr/essl/sync-history', { params });
  return res.data;
};

export const mapStaffToESSL = async (data) => {
  const res = await axios.post('/hr/essl/map-staff', data);
  return res.data;
};

export const getStaffESSLMappings = async () => {
  const res = await axios.get('/hr/essl/staff-mappings');
  return res.data;
};

// ─── LEAVE MANAGEMENT ───────────────────────

export const getLeaveTypes = async () => {
  const res = await axios.get('/hr/leave/types');
  return res.data;
};

export const createLeaveType = async (data) => {
  const res = await axios.post('/hr/leave/types', data);
  return res.data;
};

export const getLeaveBalance = async (staffId, params) => {
  const res = await axios.get(`/hr/leave/balance/${staffId}`, { params });
  return res.data;
};

export const getAllLeaveBalances = async (params) => {
  const res = await axios.get('/hr/leave/balances', { params });
  return res.data;
};

export const applyLeave = async (data) => {
  const res = await axios.post('/hr/leave/apply', data);
  return res.data;
};

export const getLeaveApplications = async (params) => {
  const res = await axios.get('/hr/leave/applications', { params });
  return res.data;
};

export const getMyLeaves = async (params) => {
  const res = await axios.get('/hr/leave/my-leaves', { params });
  return res.data;
};

export const approveLeave = async (id, data) => {
  const res = await axios.patch(`/hr/leave/applications/${id}/approve`, data);
  return res.data;
};

export const rejectLeave = async (id, data) => {
  const res = await axios.patch(`/hr/leave/applications/${id}/reject`, data);
  return res.data;
};

export const cancelLeave = async (id) => {
  const res = await axios.patch(`/hr/leave/applications/${id}/cancel`);
  return res.data;
};

// ─── PERMISSION (SHORT LEAVE) ───────────────

export const applyPermission = async (data) => {
  const res = await axios.post('/hr/permission/apply', data);
  return res.data;
};

export const getPermissions = async (params) => {
  const res = await axios.get('/hr/permission', { params });
  return res.data;
};

export const getMyPermissions = async (params) => {
  const res = await axios.get('/hr/permission/my-permissions', { params });
  return res.data;
};

export const approvePermission = async (id, data) => {
  const res = await axios.patch(`/hr/permission/${id}/approve`, data);
  return res.data;
};

export const rejectPermission = async (id, data) => {
  const res = await axios.patch(`/hr/permission/${id}/reject`, data);
  return res.data;
};

export const getPermissionSummary = async (params) => {
  const res = await axios.get('/hr/permission/summary', { params });
  return res.data;
};

// ─── PF & ESI ───────────────────────────────

export const getPFESISettings = async () => {
  const res = await axios.get('/hr/statutory/settings');
  return res.data;
};

export const updatePFESISettings = async (data) => {
  const res = await axios.put('/hr/statutory/settings', data);
  return res.data;
};

export const getStaffPFESI = async (staffId) => {
  const res = await axios.get(`/hr/statutory/staff/${staffId}`);
  return res.data;
};

export const updateStaffPFESI = async (staffId, data) => {
  const res = await axios.put(`/hr/statutory/staff/${staffId}`, data);
  return res.data;
};

export const getAllStaffPFESI = async (params) => {
  const res = await axios.get('/hr/statutory/staff', { params });
  return res.data;
};

export const calculatePFESI = async (data) => {
  const res = await axios.post('/hr/statutory/calculate', data);
  return res.data;
};

export const generatePFReport = async (params) => {
  const res = await axios.get('/hr/statutory/pf-report', { params });
  return res.data;
};

export const generateESIReport = async (params) => {
  const res = await axios.get('/hr/statutory/esi-report', { params });
  return res.data;
};

// ─── PAYROLL / LOP CALCULATION ──────────────

export const generatePayroll = async (data) => {
  const res = await axios.post('/hr/payroll/generate', data);
  return res.data;
};

export const getPayroll = async (params) => {
  const res = await axios.get('/hr/payroll', { params });
  return res.data;
};

export const getPayslip = async (id) => {
  const res = await axios.get(`/hr/payroll/payslip/${id}`);
  return res.data;
};

export const approvePayroll = async (id) => {
  const res = await axios.put(`/hr/payroll/${id}/approve`);
  return res.data;
};

export const bulkApprovePayroll = async (data) => {
  const res = await axios.patch('/hr/payroll/bulk-approve', data);
  return res.data;
};

export const getLOPReport = async (params) => {
  const res = await axios.get('/hr/payroll/lop-report', { params });
  return res.data;
};

// ─── HR DASHBOARD ───────────────────────────

export const getHRDashboard = async (params) => {
  const res = await axios.get('/hr/dashboard', { params });
  return res.data;
};
