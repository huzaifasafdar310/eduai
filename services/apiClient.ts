import axios from 'axios';
import { supabase } from '../utils/supabase';

/**
 * 🔐 Secure API Client for EduAI
 * Automatically injects the Supabase JWT Access Token from the current session.
 * This ensures only authenticated users can access the backend.
 */
export const apiClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_BACKEND_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach Supabase JWT
apiClient.interceptors.request.use(
  async (config) => {
    try {
      // 1. Fetch current session (from memory or AsyncStorage)
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('[Auth Error]: Failed to retrieve Supabase session', error.message);
        return config;
      }

      const token = data.session?.access_token;

      // 2. Inject Bearer token if session exists
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      } else {
        console.warn('[Auth Warning]: No active Supabase session found for API request.');
      }

      return config;
    } catch (e) {
      console.error('[Auth Error]: Unexpected error during session retrieval', e);
      return config;
    }
  },
  (error) => Promise.reject(error)
);

// Response interceptor for consistent error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const baseMessage = error.response?.data?.error || error.message;
    const attemptedUrl = error.config?.url ? `${error.config.baseURL || ''}${error.config.url}` : 'Unknown URL';
    
    if (error.message === 'Network Error') {
      console.error(`[Network Error]: Backend is unreachable at ${attemptedUrl}. Please verify your EXPO_PUBLIC_BACKEND_URL in .env matches your computer's local IP.`);
    } else {
      console.error('[API Error]:', baseMessage);
    }
    
    // Auto-redirect or logout on 401 Unauthorized could be handled here
    if (error.response?.status === 401) {
      console.warn('[Session Expired]: The user session is no longer valid.');
    }

    return Promise.reject(new Error(baseMessage));
  }
);
