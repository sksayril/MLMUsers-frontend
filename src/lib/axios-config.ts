import axios from 'axios';

// Create axios instance
const api = axios.create();

// Function to setup interceptors - needs to be called after the app has mounted
export const setupAxiosInterceptors = (logout: () => void, navigate: (path: string) => void) => {
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
