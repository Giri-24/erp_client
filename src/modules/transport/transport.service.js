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
