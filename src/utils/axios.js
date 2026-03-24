import axios from 'axios'

const instance = axios.create({
  baseURL: 'http://localhost:3000',
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