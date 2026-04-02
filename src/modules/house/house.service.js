import axios from '../../utils/axios';
// ─── HOUSE CRUD ──────────────────────────────
export const createHouse = (data) => axios.post('/houses', data);
export const getAllHouses = () => axios.get('/houses');
export const getHouse = (id) => axios.get(`/houses/${id}`);
export const updateHouse = (id, data) => axios.put(`/houses/${id}`, data);
export const deleteHouse = (id) => axios.delete(`/houses/${id}`);

// ─── ALLOCATION ──────────────────────────────
export const autoAllocateHouses = (params) => axios.post('/houses/auto-allocate', null, { params });
export const assignStudentToHouse = (studentId, houseId) => axios.post('/houses/assign-student', { studentId, houseId });
export const removeStudentFromHouse = (studentId) => axios.post(`/houses/remove-student/${studentId}`);
