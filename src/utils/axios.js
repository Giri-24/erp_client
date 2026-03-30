import axios from 'axios'

const resolveDefaultApiBaseUrl = () => {
  if (typeof window === 'undefined') {
    return 'http://127.0.0.1:3000'
  }

  const host = window.location.hostname || '127.0.0.1'
  if (host === 'localhost' || host === '127.0.0.1') {
    return 'http://127.0.0.1:3000'  
  }

  // When UI is opened from another device on LAN, target backend on same host.
  return `http://${host}:3000`
}

const instance = axios.create({
  baseURL: (import.meta.env.VITE_API_BASE_URL || resolveDefaultApiBaseUrl()) + '/erp/api',
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