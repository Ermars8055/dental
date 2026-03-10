import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient } from '../services/api';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'doctor' | 'receptionist';
  phone?: string;
  is_active: boolean;
  created_at: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, role: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize auth from localStorage on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedToken = localStorage.getItem('authToken');
        const storedUser = localStorage.getItem('user');

        if (storedToken && storedUser) {
          // Validate token by calling /auth/me endpoint
          try {
            apiClient.setToken(storedToken);
            const response = await apiClient.get('/auth/me');

            if (response.success && response.data?.user) {
              // Token is valid, restore auth with fresh user data from server
              setToken(storedToken);
              setUser(response.data.user);
              // Fetch CSRF token for POST/PUT/DELETE requests
              apiClient.fetchCsrfToken().catch(err => {
                console.warn('Failed to fetch CSRF token on auth restore:', err);
              });
            } else {
              // Token validation failed, clear storage
              localStorage.removeItem('authToken');
              localStorage.removeItem('user');
              apiClient.clearToken();
            }
          } catch (validationError) {
            // Token validation failed (network error or invalid token), clear storage
            console.warn('Token validation failed:', validationError);
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            apiClient.clearToken();
          }
        }
      } catch (err) {
        console.error('Failed to restore auth:', err);
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.post('/auth/login', {
        email,
        password,
      });

      if (!response.success) {
        throw new Error(response.message || 'Login failed');
      }

      const { token: newToken, user: newUser } = response.data;

      // Store token and user
      localStorage.setItem('authToken', newToken);
      localStorage.setItem('user', JSON.stringify(newUser));

      // Update context
      setToken(newToken);
      setUser(newUser);
      apiClient.setToken(newToken);

      // Fetch CSRF token for POST/PUT/DELETE requests
      await apiClient.fetchCsrfToken().catch(err => {
        console.warn('Failed to fetch CSRF token after login:', err);
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, name: string, role: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.post('/auth/register', {
        email,
        password,
        name,
        role,
      });

      if (!response.success) {
        throw new Error(response.message || 'Registration failed');
      }

      // Registration requires email verification — do NOT auto-login.
      // The backend sends a verification email; user must click it first.
      // Caller receives the success response message via the resolved promise.
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    // Clear stored auth
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');

    // Clear context
    setToken(null);
    setUser(null);
    apiClient.clearToken();

    // Redirect to login
    window.location.href = '/login';
  };

  const clearError = () => {
    setError(null);
  };

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!token && !!user,
    isLoading,
    error,
    login,
    register,
    logout,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Hook to use auth context
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};
