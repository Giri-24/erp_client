import axios from '../../utils/axios';

export const createStaff = async (data) => {
  const res = await axios.post('/staff', data);
  return res.data;
};

export const getAllStaff = async () => {
  const res = await axios.get('/staff');
  return res.data;
};

export const getStaff = async (id) => {
  const res = await axios.get(`/staff/${id}`);
  return res.data;
};

export const updateStaff = async (id, data) => {
  const res = await axios.put(`/staff/${id}`, data);
  return res.data;
};

export const deleteStaff = async (id) => {
  const res = await axios.delete(`/staff/${id}`);
  return res.data;
};

export const linkChildToStaff = async (staffId, studentId) => {
  const res = await axios.post(`/staff/${staffId}/link-child/${studentId}`);
  return res.data;
};

export const unlinkChildFromStaff = async (studentId) => {
  const res = await axios.delete(`/staff/unlink-child/${studentId}`);
  return res.data;
};
