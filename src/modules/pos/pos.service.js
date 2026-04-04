import axios from '../../utils/axios';

// ─── STORES ──────────────────────────────────

export const createStore = async (data) => {
  const res = await axios.post('/pos/stores', data);
  return res.data;
};

export const updateStore = async (id, data) => {
  const res = await axios.put(`/pos/stores/${id}`, data);
  return res.data;
};

export const getAllStores = async () => {
  const res = await axios.get('/pos/stores');
  return res.data;
};

export const getStore = async (id) => {
  const res = await axios.get(`/pos/stores/${id}`);
  return res.data;
};

// ─── STORE ITEMS (CATALOG) ───────────────────

export const createStoreItem = async (data) => {
  const res = await axios.post('/pos/items', data);
  return res.data;
};

export const updateStoreItem = async (id, data) => {
  const res = await axios.put(`/pos/items/${id}`, data);
  return res.data;
};

export const getAllStoreItems = async (category) => {
  const res = await axios.get('/pos/items', { params: { category } });
  return res.data;
};

export const getStoreItem = async (id) => {
  const res = await axios.get(`/pos/items/${id}`);
  return res.data;
};

export const deleteStoreItem = async (id) => {
  const res = await axios.delete(`/pos/items/${id}`);
  return res.data;
};

export const deleteSupplier = async (id) => {
  const res = await axios.delete(`/pos/suppliers/${id}`);
  return res.data;
}

export const uploadItemImage = async (id, file) => {
  const formData = new FormData();
  formData.append('image', file);
  const res = await axios.post(`/pos/items/${id}/image`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

// ─── SUPPLIERS ───────────────────────────────

export const createSupplier = async (data) => {
  const res = await axios.post('/pos/suppliers', data);
  return res.data;
};

export const updateSupplier = async (id, data) => {
  const res = await axios.put(`/pos/suppliers/${id}`, data);
  return res.data;
};

export const getAllSuppliers = async () => {
  const res = await axios.get('/pos/suppliers');
  return res.data;
};

export const getSupplier = async (id) => {
  const res = await axios.get(`/pos/suppliers/${id}`);
  return res.data;
};

// ─── PURCHASES ───────────────────────────────

export const createPurchase = async (data) => {
  const res = await axios.post('/pos/purchases', data);
  return res.data;
};

export const getAllPurchases = async () => {
  const res = await axios.get('/pos/purchases');
  return res.data;
};

export const getPurchase = async (id) => {
  const res = await axios.get(`/pos/purchases/${id}`);
  return res.data;
};

export const uploadPurchaseReceipt = async (id, file) => {
  const formData = new FormData();
  formData.append('receipt', file);
  const res = await axios.post(`/pos/purchases/${id}/receipt`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

// ─── STOCK TRANSFERS ─────────────────────────

export const createStockTransfer = async (data) => {
  const res = await axios.post('/pos/transfers', data);
  return res.data;
};

export const getAllStockTransfers = async () => {
  const res = await axios.get('/pos/transfers');
  return res.data;
};

// ─── SALES ───────────────────────────────────

export const createSale = async (data) => {
  const res = await axios.post('/pos/sales', data);
  return res.data;
};

export const getAllSales = async (storeId, from, to) => {
  const res = await axios.get('/pos/sales', { params: { storeId, from, to } });
  return res.data;
};

export const getSale = async (id) => {
  const res = await axios.get(`/pos/sales/${id}`);
  return res.data;
};

// ─── TEACHER FREE ITEMS ─────────────────────

export const giveTeacherFreeItem = async (data) => {
  const res = await axios.post('/pos/teacher-free-items/give', data);
  return res.data;
};

export const returnTeacherFreeItem = async (data) => {
  const res = await axios.post('/pos/teacher-free-items/return', data);
  return res.data;
};

export const getTeacherFreeItems = async (staffId, academicYear) => {
  const res = await axios.get('/pos/teacher-free-items', { params: { staffId, academicYear } });
  return res.data;
};

export const getTeacherFreeItemSummary = async (staffId, academicYear) => {
  const res = await axios.get(`/pos/teacher-free-items/summary/${staffId}`, { params: { academicYear } });
  return res.data;
};

// ─── POS TRANSACTIONS (INCOME / EXPENSE) ────

export const createPosTransaction = async (data) => {
  const res = await axios.post('/pos/transactions', data);
  return res.data;
};

export const getAllPosTransactions = async ({ type, from, to } = {}) => {
  const res = await axios.get('/pos/transactions', { params: { type, from, to } });
  return res.data;
};

// ─── STOCK OVERVIEW ─────────────────────────

export const getStockOverview = async (storeId) => {
  const res = await axios.get('/pos/stock', { params: { storeId } });
  return res.data;
};

// ─── DASHBOARD ──────────────────────────────

export const getPosDashboard = async (from, to) => {
  const res = await axios.get('/pos/dashboard', { params: { from, to } });
  return res.data;
};
