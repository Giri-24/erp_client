import axios from '../../utils/axios';

const objectToFormData = (obj, formData = new FormData(), parentKey = '') => {
  if (obj === null || obj === undefined) return formData;
  
  if (obj instanceof File || obj instanceof Blob) {
    formData.append(parentKey, obj);
  } else if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      objectToFormData(item, formData, parentKey ? `${parentKey}[${index}]` : `${index}`);
    });
  } else if (typeof obj === 'object' && !(obj instanceof Date)) {
    Object.keys(obj).forEach((key) => {
      const propName = parentKey ? `${parentKey}[${key}]` : key;
      objectToFormData(obj[key], formData, propName);
    });
  } else {
    formData.append(parentKey, obj);
  }
  
  return formData;
};


// Accepts FormData for file upload
export const createAdmission = async (formData) => {
  const res = await axios.post('/admissions', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return res.data;
};


// Accepts FormData for file upload (if backend supports it)
export const updateAdmission = async (id, formData) => {
  const res = await axios.put(`/admissions/${id}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return res.data;
}

export const getPendingAdmissions = async () => {
  const res = await axios.get('/admissions/pending');
  return res.data;
};

export const setAdmissionApproval = async (studentId, approved, reason) => {
  const res = await axios.patch(`/admissions/${studentId}/approval`, {
    approved,
    reason,
  });
  return res.data;
};

export const getAdmissionDashboardSummary = async (academicYear) => {
  const res = await axios.get('/admissions/dashboard/summary', {
    params: { academicYear },
  });
  return res.data;
};

export const exportAdmissionsCsv = async (academicYear) => {
  const res = await axios.get('/admissions/export/csv', {
    params: { academicYear },
  });
  return res.data;
};

export const getStandardSeats = async () => {
  const res = await axios.get('/admissions/seats');
  return res.data;
};

export const updateStandardSeats = async (seats) => {
  const res = await axios.put('/admissions/seats', { seats });
  return res.data;
};

export const promoteStudents = async (payload) => {
  const res = await axios.post('/admissions/promote', payload);
  return res.data;
};

export const demoteStudents = async (payload) => {
  const res = await axios.post('/admissions/demote', payload);
  return res.data;
};

export const linkSiblings = async (payload) => {
  const res = await axios.post('/admissions/siblings/link', payload);
  return res.data;
};

export const getNextAdmissionNo = async () => {
  const res = await axios.get('/admissions/next-admission-no');
  return res.data;
};

export const bulkApproval = async (studentIds, approved, reason) => {
  const res = await axios.post('/admissions/bulk-approval', {
    studentIds,
    approved,
    reason,
  });
  return res.data;
};

export const bulkUploadCsv = async (rows) => {
  const res = await axios.post('/admissions/bulk-upload', { rows });
  return res.data;
};

export const demoteIndividualStudents = async (payload) => {
  const res = await axios.post('/admissions/demote-individual', payload);
  return res.data;
};

export const getAcademicStreams = async () => {
  const res = await axios.get('/admissions/streams');
  return res.data;
};

export const createAcademicStream = async (payload) => {
  const res = await axios.post('/admissions/streams', payload);
  return res.data;
};