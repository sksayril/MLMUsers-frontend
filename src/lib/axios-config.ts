import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'https://api.utpfund.live/',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Function to setup interceptors - needs to be called after the app has mounted
export const setupAxiosInterceptors = (logout: () => void, navigate: (path: string) => void) => {
  // Request interceptor to add auth token
  api.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor for handling auth errors
  api.interceptors.response.use(
    (response) => response, // Return successful responses as-is
    (error) => {
      // Check if error response matches our authentication failure pattern
      if (
        error.response && 
        error.response.data && 
        error.response.data.success === false && 
        error.response.data.message === "Authentication failed" && 
        error.response.data.error === "invalid signature"
      ) {
        console.error('Authentication error: invalid signature');
        
        // Log the user out
        logout();
        
        // Redirect to login page
        navigate('/login');
      }
      
      // Continue with the error for other handlers
      return Promise.reject(error);
    }
  );
  
  // Also apply the same interceptor to the global axios instance
  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      if (
        error.response && 
        error.response.data && 
        error.response.data.success === false && 
        error.response.data.message === "Authentication failed" && 
        error.response.data.error === "invalid signature"
      ) {
        console.error('Authentication error: invalid signature');
        
        // Log the user out
        logout();
        
        // Redirect to login page
        navigate('/login');
      }
      
      return Promise.reject(error);
    }
  );
};

export default api;
