// Profile service: handles API calls for user profile
import instance from '../../utils/axios';


// Fetches current user profile and permissions from backend
export const getProfile = async () => {
  const res = await instance.get('/auth/me');
  return res.data;
};

export const updateProfile = async (profileData) => {
  const res = await instance.put('/profile', profileData);
  return res.data;
};
