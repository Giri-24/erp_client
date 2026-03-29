import axios from '../../utils/axios';

export const getAdminSettings = async () => {
  const res = await axios.get('/settings/admin');
  return res.data;
};

export const updateAdminSettings = async (payload) => {
  const res = await axios.put('/settings/admin', payload);
  return res.data;
};

export const getRolePermissions = async () => {
  const res = await axios.get('/settings/permissions');
  return res.data;
};

export const updateRolePermissions = async (payload) => {
  const res = await axios.put('/settings/permissions', payload);
  return res.data;
};

export const getUserPermissions = async () => {
  const res = await axios.get('/settings/user-permissions');
  return res.data;
};

export const updateUserPermissions = async (userId, payload) => {
  const res = await axios.put(`/settings/user-permissions/${userId}`, payload);
  return res.data;
};

export const getFeeReceiptFields = async () => {
  const res = await axios.get('/settings/fee-receipt-fields');
  return res.data;
};

export const updateFeeReceiptFields = async (payload) => {
  const res = await axios.put('/settings/fee-receipt-fields', payload);
  return res.data;
};
