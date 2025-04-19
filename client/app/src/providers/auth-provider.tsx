import React, { useState, useEffect, ReactNode, useCallback } from 'react';
import { AuthContext, AuthContextType } from '@/hooks/use-auth'; 
import { apiClient, ApiError } from '@/api/core/client'; 

// Re-define User interface here or import if shared
interface User {
  id: string;
  name: string;
  email: string;
  profilePictureUrl?: string;
}

// Define the props for the provider component
interface AuthProviderProps {
  children: ReactNode;
}

// Create the provider component
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false); 

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      // Call the server logout endpoint
      await apiClient('/api/auth/logout', {
        method: 'POST',
      });
      
      // Clear local state
      setUser(null);
      localStorage.removeItem('user');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Check for existing session on initial load (localStorage or API)
  useEffect(() => {
    const checkUserSession = async () => {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch (error) {
          console.error("Failed to parse stored user:", error);
          localStorage.removeItem('user'); // Clear invalid data
        }
      } else {
        // No user in localStorage, try fetching from API
        setIsLoading(true);
        try {
          // Assuming GET /api/v1/auth/me returns the User object
          const fetchedUser = await apiClient<User>('/api/auth/me', {
            method: 'GET', // Use GET to fetch current user
          });
          if (fetchedUser) {
            setUser(fetchedUser);
            // Optionally store fetched user in localStorage
            localStorage.setItem('user', JSON.stringify(fetchedUser));
          }
        } catch (error) {
          if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
            // Expected error if user is not logged in via session cookie
            console.log('No active session found.');
          } else {
            // Unexpected error
            console.error("Failed to fetch user session:", error);
          }
          // Ensure user is null if fetch fails
          setUser(null);
          localStorage.removeItem('user'); // Clean up just in case
        } finally {
          setIsLoading(false);
        }
      }
    };

    checkUserSession();
  }, []); 

  // Ensure the value matches the AuthContextType
  const value: AuthContextType = { user,  logout, isLoading };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
