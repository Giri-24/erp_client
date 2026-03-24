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

export const createAdmission = async (data) => {
  // const formData = objectToFormData(data);

  const res = await axios.post('/admissions', data
  
  );

  return res.data;
};


export const updateAdmission = async (id, data) => {
  const res = await axios.put(`/admissions/${id}`, data);
  return res.data;
}