import axios from '../../utils/axios';
import * as XLSX from 'xlsx';

const triggerBrowserDownload = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
};

// ─── ROUTES ─────────────────────────────────

export const createTransportRoute = async (data) => {
  const res = await axios.post('/transport/routes', data);
  return res.data;
};

export const updateTransportRoute = async (id, data) => {
  const res = await axios.put(`/transport/routes/${id}`, data);
  return res.data;
};

export const getAllTransportRoutes = async () => {
  const res = await axios.get('/transport/routes');
  return res.data;
};

export const getTransportAcademicYears = async () => {
  const res = await axios.get('/transport/academic-years');
  return res.data;
};

export const getTransportDashboard = async (academicYear) => {
  const res = await axios.get('/transport/dashboard', { params: { academicYear } });
  return res.data;
};

export const getTransportRoute = async (id) => {
  const res = await axios.get(`/transport/routes/${id}`);
  return res.data;
};

export const deleteTransportRoute = async (id) => {
  const res = await axios.delete(`/transport/routes/${id}`);
  return res.data;
};

// ─── STUDENT TRANSPORT ASSIGNMENT ───────────

export const assignStudentTransport = async (data) => {
  const res = await axios.post('/transport/assign', data);
  return res.data;
};

export const bulkAssignTransport = async (data) => {
  const res = await axios.post('/transport/bulk-assign', data);
  return res.data;
};

export const getStudentTransport = async (studentId) => {
  const res = await axios.get(`/transport/student/${studentId}`);
  return res.data;
};

export const removeStudentTransport = async (studentId) => {
  const res = await axios.delete(`/transport/student/${studentId}`);
  return res.data;
};

export const getAllTransportAssignments = async (academicYear) => {
  const res = await axios.get('/transport/assignments', { params: { academicYear } });
  return res.data;
};

export const getPendingTransportStudents = async (academicYear) => {
  const res = await axios.get('/transport/students/pending', { params: { academicYear } });
  return res.data;
};

export const getTransportFee = async (studentId) => {
  const res = await axios.get(`/transport/fee/${studentId}`);
  return res.data;
};

// ─── SPECIAL CLASS PRO-RATA ─────────────────

export const updateSplClassDates = async (data) => {
  const res = await axios.put('/transport/spl-class/dates', data);
  return res.data;
};

export const stopSplClass = async (studentId, data) => {
  const res = await axios.post(`/transport/spl-class/stop/${studentId}`, data);
  return res.data;
};

export const getLiveDriverLocations = async () => {
  const res = await axios.get('/location/live/drivers');
  return res.data;
};

// Enhanced: Get live driver+bus status (in-bus/outside, distance)
export const getLiveDriverBusStatus = async () => {
  const res = await axios.get('/location/live/drivers');
  return res.data;
};

// ─── DRIVERS ────────────────────────────────

export const getAllDrivers = async () => {
  const res = await axios.get('/transport/drivers');
  return res.data;
};

export const createDriver = async (data) => {
  const res = await axios.post('/transport/drivers', data);
  return res.data;
};

export const updateDriver = async (id, data) => {
  const res = await axios.put(`/transport/drivers/${id}`, data);
  return res.data;
};

export const deleteDriver = async (id) => {
  const res = await axios.delete(`/transport/drivers/${id}`);
  return res.data;
};

// ─── VEHICLE MILEAGE ────────────────────────

export const pushOdometerSnapshots = async (snapshots) => {
  const res = await axios.post('/transport/mileage/snapshot', { snapshots });
  return res.data;
};

export const getDailyMileage = async (date) => {
  const res = await axios.get('/transport/mileage/daily', { params: { date } });
  return res.data;
};

// ─── VEHICLE-DRIVER MAPPING (backend-first, localStorage fallback) ──────

const VDM_STORAGE_KEY = "psf_vehicle_driver_map";

const _readLocalMap = () => {
  try { return JSON.parse(localStorage.getItem(VDM_STORAGE_KEY) || "{}"); }
  catch { return {}; }
};

const _writeLocalMap = (map) => {
  localStorage.setItem(VDM_STORAGE_KEY, JSON.stringify(map));
};

/** Get all vehicle→driver mappings. Returns { [plateNo]: { name, phone, licenseNo } } */
export const getVehicleDriverMap = async () => {
  try {
    const res = await axios.get('/transport/vehicle-drivers');
    if (Array.isArray(res.data)) {
      const map = {};
      res.data.forEach((d) => {
        map[d.plateNo] = { name: d.driverName, phone: d.driverPhone || "", licenseNo: d.licenseNo || "" };
      });
      // Sync backend → localStorage
      _writeLocalMap(map);
      return map;
    }
  } catch { /* backend not ready, fall through */ }
  return _readLocalMap();
};

/** Assign or update a driver for a vehicle */
export const upsertVehicleDriver = async (plateNo, { name, phone, licenseNo }) => {
  try {
    await axios.post('/transport/vehicle-drivers', {
      plateNo,
      driverName: name,
      driverPhone: phone || "",
      licenseNo: licenseNo || "",
    });
  } catch { /* backend not ready */ }
  // Always update localStorage as fallback / cache
  const map = _readLocalMap();
  map[plateNo] = { name, phone: phone || "", licenseNo: licenseNo || "" };
  _writeLocalMap(map);
  return map;
};

/** Remove driver from a vehicle */
export const removeVehicleDriver = async (plateNo) => {
  try { await axios.delete(`/transport/vehicle-drivers/${encodeURIComponent(plateNo)}`); }
  catch { /* backend not ready */ }
  const map = _readLocalMap();
  delete map[plateNo];
  _writeLocalMap(map);
  return map;
};

// ─── TRIP / IGNITION EVENT LOG ──────────────

/** Push trip events (ignition ON/OFF, etc.) — fire-and-forget to backend */
export const pushTripEvents = async (events) => {
  try {
    const res = await axios.post('/transport/trip-events', { events });
    return res.data;
  } catch { /* backend not ready — events will be lost until backend is implemented */ }
};

/** Get trip/ignition history for a vehicle */
export const getTripHistory = async ({ plateNo, deviceId, event, from, to, limit } = {}) => {
  try {
    const res = await axios.get('/transport/trip-events', {
      params: { plateNo, deviceId, event, from, to, limit },
    });
    return res.data;
  } catch { return []; }
};

/** Get daily trip summary per vehicle */
export const getDailyTripSummary = async (date) => {
  try {
    const res = await axios.get('/transport/trip-summary', { params: { date } });
    return res.data;
  } catch { return []; }
};

/** Get consolidated bus report (mileage + ignition + events) */
export const getBusReport = async (plateNo, date) => {
  try {
    const res = await axios.get('/transport/bus-report', { params: { plateNo, date } });
    return res.data;
  } catch { return null; }
};

export const getBusFuelReport = async (busId, { from, to } = {}) => {
  const res = await axios.get(`/transport/buses/${busId}/fuel-report`, { params: { from, to } });
  return res.data;
};

export const getBusMileageReport = async (busId, { from, to } = {}) => {
  const res = await axios.get(`/transport/buses/${busId}/mileage-report`, { params: { from, to } });
  return res.data;
};

export const exportBusFuelReport = async (busId, format, { from, to } = {}) => {
  const res = await axios.get(`/transport/buses/${busId}/fuel-report/export/${format}`, {
    params: { from, to },
    responseType: 'blob',
  });
  const extension = format === 'pdf' ? 'pdf' : 'xlsx';
  triggerBrowserDownload(res.data, `bus-fuel-report.${extension}`);
};

export const exportBusMileageReport = async (busId, format, { from, to } = {}) => {
  const res = await axios.get(`/transport/buses/${busId}/mileage-report/export/${format}`, {
    params: { from, to },
    responseType: 'blob',
  });
  const extension = format === 'pdf' ? 'pdf' : 'xlsx';
  triggerBrowserDownload(res.data, `bus-mileage-report.${extension}`);
};

/** Get fuel logs with optional filters */
export const getFuelLogs = async ({ plateNo, busId, driverId, from, to } = {}) => {
  try {
    const res = await axios.get('/transport/fuel-logs', { params: { plateNo, busId, driverId, from, to } });
    return res.data;
  } catch { return []; }
};

// ─── BUSES ────────────────────────────────

export const getAllBuses = async () => {
  const res = await axios.get('/transport/buses');
  return res.data;
};

export const createBus = async (data) => {
  const res = await axios.post('/transport/buses', data);
  return res.data;
};

export const updateBus = async (id, data) => {
  const res = await axios.put(`/transport/buses/${id}`, data);
  return res.data;
};

export const deleteBus = async (id) => {
  const res = await axios.delete(`/transport/buses/${id}`);
  return res.data;
};


// ─── TRANSPORT EXPENSE ─────────────────

export const createTransportExpense = async (data) => {
  const res = await axios.post('/transport-expense', data);
  return res.data;
};

export const getTransportExpenses = async (filters = {}) => {
  const params = Object.fromEntries(
    Object.entries(filters || {}).filter(([, value]) => value !== undefined && value !== null && value !== '')
  );
  const res = await axios.get('/transport-expense', { params });
  return res.data;
};

export const getActingDriverDailyRates = async () => {
  const res = await axios.get('/transport-expense/acting-drivers/daily-rate');
  return res.data;
};

export const updateActingDriverDailyRate = async (staffId, dailyRate) => {
  const res = await axios.put(`/transport-expense/acting-drivers/${staffId}/daily-rate`, { dailyRate });
  return res.data;
};

export const getActingDriverManualDays = async (month) => {
  const res = await axios.get('/transport-expense/acting-drivers/manual-days', {
    params: month ? { month } : undefined,
  });
  return res.data;
};

export const updateActingDriverManualDays = async (staffId, month, days) => {
  const res = await axios.put(`/transport-expense/acting-drivers/${staffId}/manual-days`, {
    month,
    days,
  });
  return res.data;
};

export const exportTransportExpenses = async (type = 'all', filters = {}) => {
  const normalizedType = String(type || 'all').toUpperCase();
  const expenses = await getTransportExpenses({
    ...(normalizedType !== 'ALL' ? { category: normalizedType } : {}),
    ...filters,
  });
  const toDateKey = (value) => {
    if (!value) return '';
    try {
      return new Date(value).toISOString().slice(0, 10);
    } catch {
      return String(value).slice(0, 10);
    }
  };
  const toMonthKey = (value) => toDateKey(value).slice(0, 7);

  const normalizedDate = filters?.date || '';
  const normalizedMonth = filters?.month || '';
  const filteredExpenses = (Array.isArray(expenses) ? expenses : []).filter((expense) => (
    (normalizedType === 'ALL' ? true : expense?.category === normalizedType) &&
    (normalizedDate ? toDateKey(expense?.date) === normalizedDate : true) &&
    (normalizedMonth ? toMonthKey(expense?.date) === normalizedMonth : true)
  ));

  const formatDate = (value) => {
    if (!value) return '';
    try {
      return new Date(value).toISOString().split('T')[0];
    } catch {
      return String(value);
    }
  };

  const getBusLabel = (expense) => {
    const bus = expense?.bus;
    return (
      bus?.number ||
      bus?.busNo ||
      bus?.busNumber ||
      bus?.plateNo ||
      bus?.vehicleNo ||
      expense?.busNo ||
      expense?.plateNo ||
      expense?.vehicleNo ||
      expense?.busId ||
      'Unassigned'
    );
  };

  const rows = filteredExpenses
    .slice()
    .sort((left, right) => new Date(left?.date || 0) - new Date(right?.date || 0))
    .map((expense) => {
      const partDescription = String(expense?.description || '');
      const partMatch = partDescription.match(/^(.*?)\s+x\s+([\d.]+)\s+@\s+([\d.]+)/i);
      const referenceNo = String(expense?.description || '').replace(/^Ref No:\s*/i, '');

      if (normalizedType === 'FUEL') {
        const desc = String(expense?.description || '');
        const cardFromDescription = desc.startsWith('Card:') ? desc.replace(/^Card:\s*/i, '') : '';
        return {
          Bus: getBusLabel(expense),
          Date: formatDate(expense?.date),
          Category: expense?.category || 'FUEL',
          'Fuel Station': expense?.fuelStation || '',
          Litres: Number(expense?.litres || 0),
          'Price / Litre': Number(expense?.pricePerLitre || 0),
          'Payment Mode': expense?.paymentMode || '',
          'Card Number': expense?.paymentMode === 'CARD' ? (expense?.cardName || cardFromDescription) : '',
          'Total Price': Number(expense?.amount || 0),
        };
      }

      if (normalizedType === 'MAINTENANCE') {
        return {
          Bus: getBusLabel(expense),
          Date: formatDate(expense?.date),
          Category: expense?.category || 'MAINTENANCE',
          Workshop: expense?.workshop || '',
          Description: expense?.description || '',
          'Total Price': Number(expense?.amount || 0),
        };
      }

      if (normalizedType === 'PARTS') {
        return {
          Bus: getBusLabel(expense),
          Date: formatDate(expense?.date),
          Category: expense?.category || 'PARTS',
          'Part Name': expense?.partName || partMatch?.[1] || '',
          Quantity: expense?.quantity ? Number(expense.quantity) : (partMatch?.[2] || ''),
          'Unit Cost': expense?.unitCost ? Number(expense.unitCost) : (partMatch?.[3] || ''),
          Shared: expense?.isShared ? 'Yes' : 'No',
          'Total Price': Number(expense?.amount || 0),
        };
      }

      if (normalizedType === 'TAX') {
        return {
          Bus: getBusLabel(expense),
          Date: formatDate(expense?.date),
          Category: expense?.category || 'TAX',
          'Tax Type': expense?.taxType || '',
          'Reference No': expense?.referenceNo || (referenceNo === partDescription ? '' : referenceNo),
          'Total Price': Number(expense?.amount || 0),
        };
      }

      return {
        Bus: getBusLabel(expense),
        Date: formatDate(expense?.date),
        Category: expense?.category || '',
        Details: expense?.fuelStation || expense?.workshop || expense?.partName || expense?.taxType || expense?.description || '',
        'Total Price': Number(expense?.amount || 0),
      };
    });

  const total = rows.reduce((sum, row) => sum + Number(row['Total Price'] || 0), 0);
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const columnWidths = {
    FUEL: [18, 14, 14, 20, 10, 14, 14, 18, 14],
    MAINTENANCE: [18, 14, 14, 24, 28, 14],
    PARTS: [18, 14, 14, 22, 10, 12, 10, 14],
    TAX: [18, 14, 14, 18, 18, 14],
    ALL: [18, 14, 14, 28, 14],
  };
  worksheet['!cols'] = (columnWidths[normalizedType] || columnWidths.ALL).map((wch) => ({ wch }));
  const footerLength = Object.keys(rows[0] || { 'Total Price': 0 }).length;
  const footerRow = Array.from({ length: footerLength }, () => '');
  footerRow[0] = 'Grand Total';
  footerRow[footerLength - 1] = total;
  XLSX.utils.sheet_add_aoa(
    worksheet,
    [footerRow],
    { origin: -1 }
  );

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Expenses');
  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob(
    [buffer],
    { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
  );
  const suffix = [
    normalizedType !== 'ALL' ? String(type).toLowerCase() : '',
    normalizedMonth || '',
    normalizedDate || '',
  ].filter(Boolean).join('-');
  triggerBrowserDownload(blob, `transport-expenses${suffix ? `-${suffix}` : ''}.xlsx`);
};