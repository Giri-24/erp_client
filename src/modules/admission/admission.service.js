import axios from 'axios';

export const createAdmission = async (data) => {
  const formData = new FormData();

  // Append text fields
  Object.keys(data).forEach((key) => {
    if (data[key] && typeof data[key] !== 'object') {
      formData.append(key, data[key]);
    }
  });

  // Append files
  if (data.photo) formData.append('photo', data.photo[0]);
  if (data.birthCert) formData.append('birthCert', data.birthCert[0]);
  if (data.aadhar) formData.append('aadhar', data.aadhar[0]);
  if (data.staffSignature)
    formData.append('staffSignature', data.staffSignature[0]);

  const res = await axios.post('/api/admission', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  });

  return res.data;
};