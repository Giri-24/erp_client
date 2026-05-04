import axios from '../../utils/axios';

export const DOC_REQUEST_TYPES = [
  { value: 'TRANSFER_CERTIFICATE', label: 'Transfer Certificate (TC)' },
  { value: 'BONAFIDE_CERTIFICATE', label: 'Bonafide Certificate' },
  { value: 'CONDUCT_CERTIFICATE', label: 'Conduct Certificate' },
  { value: 'STUDY_CERTIFICATE', label: 'Study Certificate' },
  { value: 'FEE_CERTIFICATE', label: 'Fee Certificate' },
  { value: 'OTHER', label: 'Other' },
];

export const BONAFIDE_SCENARIO_TYPES = [
  { value: 'STUDY_PURPOSE', label: 'General Study Purpose' },
  { value: 'PASSPORT_VISA', label: 'Passport / Visa' },
  { value: 'SCHOLARSHIP', label: 'Scholarship Application' },
  { value: 'EDUCATION_LOAN', label: 'Education Loan' },
];

export const DOC_STATUS_OPTIONS = [
  { value: 'REQUESTED', label: 'Requested', color: 'blue' },
  { value: 'IN_REVIEW', label: 'In Review', color: 'orange' },
  { value: 'APPROVED', label: 'Approved', color: 'cyan' },
  { value: 'ISSUED', label: 'Issued', color: 'green' },
  { value: 'REJECTED', label: 'Rejected', color: 'red' },
];

export const getDocRequests = async (params) => {
  const res = await axios.get('/doc-requests', { params });
  return res.data;
};

export const getDocRequest = async (id) => {
  const res = await axios.get(`/doc-requests/${id}`);
  return res.data;
};

export const getDocRequestStats = async () => {
  const res = await axios.get('/doc-requests/stats');
  return res.data;
};

export const getBonafideTemplates = async () => {
  const res = await axios.get('/doc-requests/bonafide/templates');
  return res.data;
};

export const createDocRequest = async (data) => {
  const res = await axios.post('/doc-requests', data);
  return res.data;
};

export const reviewDocRequest = async (id, data) => {
  const res = await axios.patch(`/doc-requests/${id}/review`, data);
  return res.data;
};

export const issueDocRequest = async (id, data = {}) => {
  const res = await axios.patch(`/doc-requests/${id}/issue`, data);
  return res.data;
};

export const getDocIssueData = async (id) => {
  const res = await axios.get(`/doc-requests/${id}/issue-data`);
  return res.data;
};

export const deleteDocRequest = async (id) => {
  const res = await axios.delete(`/doc-requests/${id}`);
  return res.data;
};
