import React, { ReactNode } from 'react';
import { AuthContext, AuthContextType } from '@/hooks/use-auth';
import { useAuthQuery, User } from '@/hooks/use-auth-query';

// Define the props for the provider component
interface AuthProviderProps {
  children: ReactNode;
}

// Create the provider component
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { user, logout, isLoading } = useAuthQuery();
  
  // Ensure user is either User or null, not undefined
  const authUser: User | null = user ?? null;

  // Ensure the value matches the AuthContextType
  const value: AuthContextType = { user: authUser, logout, isLoading };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
