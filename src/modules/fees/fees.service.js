import axios from '../../utils/axios';

const normalizeAcademicYearValue = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'object') {
    return String(
      value.academicYear ?? value.year ?? value.name ?? value.label ?? value.value ?? ''
    ).trim();
  }
  return String(value).trim();
};

const normalizeAcademicYearList = (...sources) => {
  const years = sources
    .flatMap((source) => {
      if (Array.isArray(source)) return source;
      if (Array.isArray(source?.items)) return source.items;
      if (Array.isArray(source?.data)) return source.data;
      if (Array.isArray(source?.rows)) return source.rows;
      return [];
    })
    .map(normalizeAcademicYearValue)
    .filter(Boolean);

  return Array.from(new Set(years)).sort((left, right) => right.localeCompare(left));
};

const getAcademicYearsFromStudentFees = async () => {
  const res = await axios.get('/fees/all');
  return normalizeAcademicYearList(res.data?.map((fee) => fee?.academicYear));
};

// ─── ACADEMIC YEAR CREATION ───────────────
export const createAcademicYear = async (academicYear) => {
  const res = await axios.post('/fees/academic-years', { academicYear });
  return res.data;
};

export const updateAcademicYear = async (academicYearId, academicYear) => {
  const res = await axios.put(`/fees/academic-years/${encodeURIComponent(academicYearId)}`, {
    academicYear,
  });
  return res.data;
};

// ─── FEE STRUCTURES ──────────────────────────

export const createFeeStructure = async (data) => {
  const res = await axios.post('/fees/structures', data);
  return res.data;
};

export const updateFeeStructure = async (id, data) => {
  const res = await axios.put(`/fees/structures/${id}`, data);
  return res.data;
};

export const getAllFeeStructures = async () => {
  const res = await axios.get('/fees/structures');
  return res.data;
};

export const getFeeStructure = async (id) => {
  const res = await axios.get(`/fees/structures/${id}`);
  return res.data;
};

export const getFeeStructureByStandard = async (standard, academicYear) => {
  const res = await axios.get(`/fees/structures/by-standard/${standard}`, {
    params: { academicYear },
  });
  return res.data;
};

export const deleteFeeStructure = async (id) => {
  const res = await axios.delete(`/fees/structures/${id}`);
  return res.data;
};

// ─── STUDENT FEE ASSIGNMENT ─────────────────

export const assignFeeToStudent = async (data) => {
  const res = await axios.post('/fees/assign', data);
  return res.data;
};

export const assignFeeToClass = async (data) => {
  const res = await axios.post('/fees/assign-class', data);
  return res.data;
};

export const getStudentPendingTotal = async (studentId) => {
  const res = await axios.get(`/fees/pending-total/${studentId}`);
  return res.data;
};

export const updateStudentFee = async (id, data) => {
  const res = await axios.put(`/fees/student-fees/${id}`, data);
  return res.data;
};

export const getStudentFee = async (studentId, academicYear) => {
  const res = await axios.get(`/fees/student/${studentId}`, {
    params: { academicYear },
  });
  return res.data;
};

export const getStudentFeeById = async (id) => {
  const res = await axios.get(`/fees/student-fees/${id}`);
  return res.data;
};

export const getAllStudentFees = async (academicYear) => {
  const res = await axios.get('/fees/all', { params: { academicYear } });
  return res.data;
};

// ─── PAYMENTS ───────────────────────────────

export const collectPayment = async (data) => {
  const res = await axios.post('/fees/collect', data);
  return res.data;
};

export const getPaymentsByStudentFee = async (studentFeeId) => {
  const res = await axios.get(`/fees/payments/${studentFeeId}`);
  return res.data;
};

export const getPaymentStatusReport = async (academicYear) => {
  const fees = await getAllStudentFees(academicYear);
  const paymentRows = await Promise.all(
    fees.map(async (fee) => {
      const payments = await getPaymentsByStudentFee(fee.id);
      return (payments || []).map((p) => ({
        ...p,
        studentFeeId: fee.id,
        studentFee: fee,
      }));
    })
  );
  return paymentRows.flat();
};

export const cancelPayment = async (paymentId, data) => {
  const res = await axios.patch(`/fees/payments/${paymentId}/cancel`, data);
  return res.data;
};

export const refundPayment = async (paymentId, data) => {
  const res = await axios.patch(`/fees/payments/${paymentId}/refund`, data);
  return res.data;
};

export const getNextReceiptNo = async () => {
  const res = await axios.get('/fees/next-receipt-no');
  return res.data;
};

// ─── DISCOUNT ELIGIBILITY ───────────────────

export const checkDiscountEligibility = async (studentId) => {
  const res = await axios.get(`/fees/discount-eligibility/${studentId}`);
  return res.data;
};

// ─── SIBLING FEES ───────────────────────────

export const getSiblingFees = async (studentId) => {
  const res = await axios.get(`/fees/sibling-fees/${studentId}`);
  return res.data;
};

// ─── ACADEMIC YEARS ─────────────────────────

export const getAcademicYears = async () => {
  try {
    const res = await axios.get('/fees/academic-years');
    const years = normalizeAcademicYearList(res.data);
    if (years.length > 0) return years;
  } catch (error) {
    const status = error?.response?.status;
    if (status && ![403, 404].includes(status)) throw error;
  }

  try {
    return await getAcademicYearsFromStudentFees();
  } catch {
    return [];
  }
};

export const getAcademicYear = async () => {
  return getAcademicYears();
};

// ─── TRANSPORT RECALC ───────────────────────

export const recalcTransportFee = async (studentId, academicYear) => {
  const res = await axios.post(`/fees/recalc-transport/${studentId}`, null, {
    params: { academicYear },
  });
  return res.data;
};

// ─── REPORTS / DASHBOARD ────────────────────

export const getPendingFees = async (academicYear) => {
  const res = await axios.get('/fees/pending', { params: { academicYear } });
  return res.data;
};

export const getDailyCollection = async (date) => {
  const res = await axios.get('/fees/daily-collection', { params: { date } });
  return res.data;
};

export const getFeesDashboard = async (academicYear) => {
  const res = await axios.get('/fees/dashboard', { params: { academicYear } });
  return res.data;
};

export const getMultiYearLedger = async () => {
  const res = await axios.get('/fees/multi-year-ledger');
  return res.data;
};

export const getClassWiseSummary = async (academicYear) => {
  const res = await axios.get('/fees/class-summary', { params: { academicYear } });
  return res.data;
};

// ─── KIT / BOOK FEE MANAGEMENT ──────────────

export const issueKitItem = async (data) => {
  const res = await axios.post('/fees/kit/issue', data);
  return res.data;
};

export const getStudentKitIssues = async (studentFeeId) => {
  const res = await axios.get(`/fees/kit/${studentFeeId}`);
  return res.data;
};

export const removeKitIssue = async (kitIssueId) => {
  const res = await axios.delete(`/fees/kit/${kitIssueId}`);
  return res.data;
};
// ─── PAYMENT LINKS (PhonePe) ─────────────────

/**
 * Create a PhonePe payment link and send it to the parent via SMS or WhatsApp.
 * @param {object} data - { studentFeeId, amount, phoneNumber, channel }
 * channel: 'SMS' | 'WHATSAPP'
 */
export const sendPaymentLink = async (data) => {
  const res = await axios.post('/fees/payment-link/send', data);
  return res.data;
};

/** Get all payment links sent for a specific student fee. */
export const getPaymentLinks = async (studentFeeId) => {
  const res = await axios.get(`/fees/payment-link/by-fee/${studentFeeId}`);
  return res.data;
};

/** Poll PhonePe for current payment status of a link. */
export const checkPaymentLinkStatus = async (merchantTransactionId) => {
  const res = await axios.get(`/fees/payment-link/status/${merchantTransactionId}`);
  return res.data;
};