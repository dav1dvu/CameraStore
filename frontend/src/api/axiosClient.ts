import axios from 'axios';

const API_BASE_URL = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:3002/api';

export const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor to append Authorization Header JWT from localstorage session
axiosClient.interceptors.request.use(
  (config) => {
    const sessionStr = localStorage.getItem('camera_store_session');
    if (sessionStr) {
      try {
        const session = JSON.parse(sessionStr);
        const token = session?.accessToken || session?.access_token || session?.token;
        if (token) {
          if (typeof config.headers.set === 'function') {
            config.headers.set('Authorization', `Bearer ${token}`);
          } else {
            config.headers = config.headers || {};
            config.headers['Authorization'] = `Bearer ${token}`;
          }
        }
      } catch (err) {
        console.error('Error parsing token from session store', err);
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor to centralize error sync
axiosClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Standard response errors: extracts message from Backend standard format { success, error }
    const res = error.response;
    const config = error.config;
    let errorMsg = 'An unexpected network error occurred';
    
    if (res && res.data && res.data.error) {
      errorMsg = res.data.error;
    } else if (error.message) {
      errorMsg = error.message;
    }

    // Handle session expirations (401) by clearing stores if active
    // IMPORTANT: Skip this for auth endpoints (login/register) to avoid redirect loops
    const isAuthEndpoint = config?.url?.includes('/auth/login') || config?.url?.includes('/auth/register') || config?.url?.includes('/auth/signup');
    if (res && res.status === 401 && !isAuthEndpoint) {
      localStorage.removeItem('camera_store_user');
      localStorage.removeItem('camera_store_session');
      localStorage.removeItem('camera_store_session_role');
      // Dispatch a custom event so the app can handle the redirect via React state
      // instead of doing a hard page reload which destroys SPA state
      window.dispatchEvent(new CustomEvent('auth:session-expired'));
    }

    return Promise.reject(new Error(errorMsg));
  }
);

