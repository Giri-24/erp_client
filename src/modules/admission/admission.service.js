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