import axios from '../../utils/axios';

export const createStaff = async (data) => {
  const res = await axios.post('/staff', data);
  return res.data;
};

export const getNextEmployeeId = async () => {
  const res = await axios.get('/staff/next-employee-id');
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

export const getStaffDocuments = async (staffId, type) => {
  const res = await axios.get(`/staff/${staffId}/documents`, {
    params: type ? { type } : undefined,
  });
  return res.data;
};

export const uploadStaffDocument = async (staffId, payload) => {
  const formData = new FormData();
  if (payload.file) formData.append('file', payload.file);
  if (payload.type) formData.append('type', payload.type);
  if (payload.title) formData.append('title', payload.title);
  if (payload.description) formData.append('description', payload.description);
  if (payload.documentNumber) formData.append('documentNumber', payload.documentNumber);
  if (payload.issuedDate) formData.append('issuedDate', payload.issuedDate);
  if (payload.expiryDate) formData.append('expiryDate', payload.expiryDate);
  if (payload.isVerified !== undefined) {
    formData.append('isVerified', Boolean(payload.isVerified));//make this boolean value

  }

  const res = await axios.post(`/staff/${staffId}/documents`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

export const deleteStaffDocument = async (staffId, documentId) => {
  const res = await axios.delete(`/staff/${staffId}/documents/${documentId}`);
  return res.data;
};
