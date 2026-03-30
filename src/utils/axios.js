import axios from 'axios'

const instance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/erp/api',
})

instance.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

instance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      if (window.location.pathname !== '/') {
        window.location.href = '/'
      }
      return Promise.reject(error)
    }

    // Check for network errors (server is unreachable, connection refused, etc.)
    const isNetworkError = 
      error.code === 'ERR_NETWORK' || 
      error.code === 'ECONNREFUSED' || 
      error.message === 'Network Error' ||
      !error.response;

    if (isNetworkError) {
      if (window.location.pathname !== '/server-down') {
        window.location.href = '/server-down';
      }
    }
    return Promise.reject(error);
  }
);

export default instance