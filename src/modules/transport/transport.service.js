import axios from '../../utils/axios';

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
