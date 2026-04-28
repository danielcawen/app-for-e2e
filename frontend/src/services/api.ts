import axios from 'axios';

/**
 * API Service for communicating with the backend.
 * Configures a base axios instance with common settings.
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Interceptor to inject the JWT token into the Authorization header
 * if it exists in localStorage.
 */
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Interceptor to handle common error responses (e.g., 401 Unauthorized)
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const isAuthPage = window.location.pathname.includes('/login') || window.location.pathname.includes('/auth');
      if (!isAuthPage) {
        // If the token is invalid or expired, clear local storage and redirect to login
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
