import axios from '../../utils/axios';

const extractMonth = (input) => {
  if (!input) return undefined;
  if (typeof input === 'string') return input;
  if (typeof input === 'object' && input.month) return input.month;
  return undefined;
};

const toArray = (value) => (Array.isArray(value) ? value : []);

// ─── ATTENDANCE ─────────────────────────────

export const getAttendance = async (params) => {
  const res = await axios.get('/hr/attendance', { params });
  return res.data;
};

export const getAttendanceByStaff = async (staffId, params) => {
  const res = await axios.get('/hr/attendance', {
    params: { ...(params || {}), staffId },
  });
  return res.data;
};

export const markAttendance = async (data) => {
  const res = await axios.post('/hr/attendance/mark', data);
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
  const month = extractMonth(params);
  if (!month) return null;
  const res = await axios.get(`/hr/attendance/monthly-report/${month}`);
  const rows = toArray(res.data);
  const total = rows.length;
  const present = rows.reduce((sum, row) => sum + Number(row.present || 0), 0);
  const absent = rows.reduce((sum, row) => sum + Number(row.absent || 0), 0);
  const halfDay = rows.reduce((sum, row) => sum + Number(row.halfDay || 0), 0);
  const onLeave = rows.reduce((sum, row) => sum + Number(row.onLeave || 0), 0);
  const totalDays = rows.reduce((sum, row) => sum + Number(row.totalDays || 0), 0);
  return {
    present,
    absent,
    halfDay,
    onLeave,
    total,
    totalWorkingDays: totalDays,
    staffCount: total,
    totalLopDays: absent,
    avgAttendancePercent: totalDays > 0 ? Number(((present / totalDays) * 100).toFixed(2)) : 0,
  };
};

export const getMonthlyAttendanceReport = async (params) => {
  const month = extractMonth(params);
  if (!month) return [];
  const res = await axios.get(`/hr/attendance/monthly-report/${month}`);
  const rows = toArray(res.data).map((row) => ({
    staffId: row.id,
    employeeId: row.employeeId,
    staffName: row.name,
    department: row.department,
    presentDays: Number(row.present || 0),
    absentDays: Number(row.absent || 0),
    halfDays: Number(row.halfDay || 0),
    lateDays: 0,
    leaveDays: Number(row.onLeave || 0),
    lopDays: Number(row.absent || 0),
    workingDays: Number(row.totalDays || 0),
    avgWorkingHours: null,
  }));

  if (params?.staffId) {
    return rows.filter((row) => row.staffId === params.staffId);
  }

  return rows;
};

// ─── ESSL BIOMETRIC SYNC ────────────────────

export const syncESSL = async (data) => {
  if (data?.deviceId) {
    const res = await axios.post(`/hr/essl/sync/${data.deviceId}`);
    return res.data;
  }
  const res = await axios.post('/hr/essl/sync-all');
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
  return toArray(res.data).map((row) => ({
    ...row,
    deviceName: row.device?.name || row.deviceName || '-',
    staffName: row.staffName || row.employeeId || '-',
  }));
};

export const getESSLSyncHistory = async (params) => {
  const res = await axios.get('/hr/essl/sync-history', { params });
  return toArray(res.data).map((row) => ({
    ...row,
    deviceName: row.device?.name || row.deviceName || 'All Devices',
  }));
};

export const mapStaffToESSL = async (data) => {
  const res = await axios.post('/hr/essl/staff-mappings', data);
  return res.data;
};

export const getStaffESSLMappings = async () => {
  const res = await axios.get('/hr/essl/staff-mappings');
  return toArray(res.data).map((row) => ({
    ...row,
    employeeId: row.staff?.employeeId,
    staffName: row.staff?.name,
    deviceName: row.device?.name,
    enrolledMethods: row.enrolledMethods || [],
  }));
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

export const getLeavePermissionPolicy = async (staffId) => {
  const res = await axios.get('/hr/leave/policy', {
    params: staffId ? { staffId } : undefined,
  });
  return res.data;
};

export const getLeaveBalance = async (staffId, params) => {
  const res = await axios.get('/hr/leave/balances', {
    params: { ...(params || {}), staffId },
  });
  return res.data;
};

export const getAllLeaveBalances = async (params) => {
  const [balancesRes, staffRes] = await Promise.all([
    axios.get('/hr/leave/balances', { params }),
    axios.get('/staff'),
  ]);

  const balances = toArray(balancesRes.data);
  const staffList = toArray(staffRes.data);
  const staffMap = new Map(staffList.map((s) => [s.id, s]));

  if (params?.staffId) {
    return balances.map((balance) => ({
      ...balance,
      leaveType: balance.leaveType?.code || balance.leaveType?.name || '-',
    }));
  }

  const grouped = new Map();
  for (const balance of balances) {
    const staffId = balance.staffId;
    const staffInfo = staffMap.get(staffId);
    if (!grouped.has(staffId)) {
      grouped.set(staffId, {
        staffId,
        employeeId: staffInfo?.employeeId || '-',
        staffName: staffInfo?.name || '-',
      });
    }

    const row = grouped.get(staffId);
    const key = balance.leaveType?.code || balance.leaveType?.name || 'OTHER';
    row[key] = {
      used: Number(balance.used || 0),
      total: Number(balance.total || 0),
      remaining: Number(balance.remaining || 0),
    };
  }

  return Array.from(grouped.values());
};

export const applyLeave = async (data) => {
  const res = await axios.post('/hr/leave/apply', data);
  return res.data;
};

export const getLeaveApplications = async (params) => {
  const res = await axios.get('/hr/leave/applications', { params });
  return res.data;
};

export const getStaffList = async () => {
  const res = await axios.get('/hr/staff-list');
  return res.data;
};

export const getMyLeaves = async (params) => {
  const res = await axios.get('/hr/leave/applications', { params });
  return res.data;
};

export const approveLeave = async (id, data) => {
  const res = await axios.put(`/hr/leave/${id}/approve`, data);
  return res.data;
};

export const rejectLeave = async (id, data) => {
  const payload = {
    ...data,
    rejectionNote: data?.rejectionNote ?? data?.reason,
  };
  const res = await axios.put(`/hr/leave/${id}/reject`, payload);
  return res.data;
};

export const cancelLeave = async (id) => {
  const res = await axios.put(`/hr/leave/${id}/cancel`);
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
  const res = await axios.get('/hr/permission', { params });
  return res.data;
};

export const approvePermission = async (id, data) => {
  const res = await axios.put(`/hr/permission/${id}/approve`, data);
  return res.data;
};

export const rejectPermission = async (id, data) => {
  const payload = {
    ...data,
    rejectionNote: data?.rejectionNote ?? data?.reason,
  };
  const res = await axios.put(`/hr/permission/${id}/reject`, payload);
  return res.data;
};

export const getPermissionSummary = async (params) => {
  const month = extractMonth(params);
  if (!month) return [];
  const res = await axios.get(`/hr/permission/summary/${month}`);
  return toArray(res.data).map((row) => ({
    ...row,
    employeeId: row.employeeId || row.staff?.employeeId || '-',
    staffName: row.staffName || row.name || row.staff?.name || '-',
    totalRequests: row.totalRequests ?? 0,
    approvedCount: row.approvedCount ?? 0,
  }));
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
  const res = await axios.get('/hr/statutory/staff');
  return toArray(res.data).find((row) => row.staffId === staffId || row.staff?.id === staffId) || null;
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
  const gross = Number(data?.grossSalary || data?.basicSalary || 0);
  const basicRate = Number(data?.basicRate ?? 50);
  const hraRate = Number(data?.hraRate ?? 30);
  const pfEmployeeRate = Number(data?.pfEmployeeRate ?? 12);
  const pfEmployerRate = Number(data?.pfEmployerRate ?? 12);
  const esiEmployeeRate = Number(data?.esiEmployeeRate ?? 0.75);
  const esiEmployerRate = Number(data?.esiEmployerRate ?? 3.25);
  const esiWageLimit = Number(data?.esiWageLimit ?? 21000);
  const esiDailyWageThreshold = Number(data?.esiDailyWageThreshold ?? 176);
  const pfWageLimit = Number(data?.pfWageLimit ?? 15000);

  // PF is on basic = 50% of gross
  const pfBase = Math.round(gross * basicRate / 100);
  const pfWage = Math.min(pfBase, pfWageLimit);
  const pfEmployee = Math.round((pfWage * pfEmployeeRate) / 100);
  const pfEmployer = Math.round((pfWage * pfEmployerRate) / 100);

  // ESI is on basic + HRA = (basicRate + hraRate)% of gross ≈ 80%
  const esiBase = Math.round(gross * (basicRate + hraRate) / 100);
  const dailyEsiWage = esiBase / 30;
  const esiApplicable = dailyEsiWage >= esiDailyWageThreshold && esiBase <= esiWageLimit;
  const esiEmployee = esiApplicable ? Math.round((esiBase * esiEmployeeRate) / 100) : 0;
  const esiEmployer = esiApplicable ? Math.round((esiBase * esiEmployerRate) / 100) : 0;

  return {
    pfBase,
    esiBase,
    dailyEsiWage: Math.round(dailyEsiWage),
    esiApplicable,
    pfEmployee,
    pfEmployer,
    esiEmployee,
    esiEmployer,
  };
};

export const generatePFReport = async (params) => {
  const month = extractMonth(params);
  if (!month) return [];
  const res = await axios.get(`/hr/statutory/report/${month}`);
  return toArray(res.data).map((row) => ({
    employeeId: row.staff?.employeeId,
    staffName: row.staff?.name,
    uanNumber: row.staff?.staffStatutory?.uanNumber || '-',
    pfNumber: row.staff?.staffStatutory?.pfNumber || '-',
    pfBase: row.pfBase || row.basicSalary || 0,
    grossSalary: row.grossSalary || 0,
    employeePF: row.pfDeduction || 0,
    employerPF: row.employerPfContribution || 0,
    adminCharges: 0,
    edliCharges: 0,
    totalPF: (row.pfDeduction || 0) + (row.employerPfContribution || 0),
  }));
};

export const generateESIReport = async (params) => {
  const month = extractMonth(params);
  if (!month) return [];
  const res = await axios.get(`/hr/statutory/report/${month}`);
  return toArray(res.data).map((row) => ({
    employeeId: row.staff?.employeeId,
    staffName: row.staff?.name,
    esiNumber: row.staff?.staffStatutory?.esiNumber || '-',
    esiBase: row.esiBase || 0,
    grossSalary: row.grossSalary || 0,
    dailyEsiWage: row.esiBase ? Math.round(row.esiBase / 30) : 0,
    employeeESI: row.esiDeduction || 0,
    employerESI: row.employerEsiContribution || 0,
    totalESI: (row.esiDeduction || 0) + (row.employerEsiContribution || 0),
  }));
};

export const getStatutoryReportRaw = async (month) => {
  if (!month) return [];
  const res = await axios.get(`/hr/statutory/report/${month}`);
  return toArray(res.data);
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
  const res = await axios.get(`/hr/payroll/${id}`);
  return res.data;
};

export const approvePayroll = async (id) => {
  const res = await axios.put(`/hr/payroll/${id}/approve`);
  return res.data;
};

export const bulkApprovePayroll = async (data) => {
  const res = await axios.put('/hr/payroll/approve', data);
  return res.data;
};

export const getLOPReport = async (params) => {
  const month = extractMonth(params);
  if (!month) return [];
  const res = await axios.get(`/hr/payroll/lop-report/${month}`);
  return toArray(res.data).map((row) => {
    const totalLopDays = Number(row.totalLopDays || row.lopDays || 0);
    const totalLopDeduction = Number(row.totalLopDeduction || row.lopDeduction || 0);
    return {
      ...row,
      employeeId: row.employeeId || row.staff?.employeeId || '-',
      staffName: row.staffName || row.staff?.name || '-',
      absentLopDays: Number(row.lopDays || 0),
      totalWorkingDays: Number(row.totalWorkingDays || 0),
      presentDays: Number(row.presentDays || 0),
      totalLopDays,
      totalLopDeduction,
      perDaySalary: totalLopDays > 0 ? Math.round(totalLopDeduction / totalLopDays) : 0,
    };
  });
};

export const cancelPayrollLOP = async (id) => {
  const res = await axios.put(`/hr/payroll/${id}/cancel-lop`);
  return res.data;
};

export const updatePayrollManual = async (id, data) => {
  const res = await axios.put(`/hr/payroll/${id}/update`, data);
  return res.data;
};

// ─── HR DASHBOARD ───────────────────────────

export const getHRDashboard = async (params) => {
  const res = await axios.get('/hr/dashboard', { params });
  const data = res.data || {};
  const attendance = data.todayAttendance || {};
  return {
    ...data,
    presentToday: Number(attendance.present || 0),
    absentToday: Number(attendance.absent || 0),
    onLeaveToday: Number(attendance.onLeave || 0),
    attendancePercent:
      Number(attendance.total || 0) > 0
        ? Number((((attendance.present || 0) / attendance.total) * 100).toFixed(2))
        : 0,
  };
};
// ─── ADVANCE / LOAN TICKETS ─────────────────────

export const createAdvanceRequest = async (data) => {
  const res = await axios.post('/hr/advance', data);
  return res.data;
};

export const getAdvanceRequests = async (params) => {
  const res = await axios.get('/hr/advance', { params });
  return res.data;
};

export const getAdvanceRequest = async (id) => {
  const res = await axios.get(`/hr/advance/${id}`);
  return res.data;
};

export const approveAdvance = async (id, email) => {
  const res = await axios.put(`/hr/advance/${id}/approve`, { email });
  return res.data;
};

export const rejectAdvance = async (id, email, reason) => {
  const res = await axios.put(`/hr/advance/${id}/reject`, { email, reason });
  return res.data;
};

export const disburseAdvance = async (id) => {
  const res = await axios.put(`/hr/advance/${id}/disburse`);
  return res.data;
};

// ─── SALARY ABSTRACT ────────────────────────────

export const getSalaryAbstract = async (month) => {
  const res = await axios.get(`/hr/salary-abstract/${month}`);
  return res.data;
};