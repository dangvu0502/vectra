import { createContext, useContext } from "react";

export interface User {
  id: string;
  provider_id?: string;
  displayName?: string;
  email: string;
  profilePictureUrl?: string;
}

// Define the shape of the auth context
export interface AuthContextType {
  user: User | null;
  logout: () => void;
  isLoading: boolean;
}

// Create the context with a default value - Export it so the Provider can use it
export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

// Create the custom hook to use the auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
