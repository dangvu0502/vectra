import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, ApiError } from '@/api/core/client';

export interface User {
  id: string;
  name: string;
  email: string;
  profilePictureUrl?: string;
}

const USER_QUERY_KEY = ['user'];

export const useAuthQuery = () => {
  const queryClient = useQueryClient();

  const { data: user, isLoading: isUserLoading } = useQuery<User | null>({
    queryKey: USER_QUERY_KEY,
    queryFn: async () => {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          return JSON.parse(storedUser) as User;
        } catch (error) {
          console.error("Failed to parse stored user:", error);
          localStorage.removeItem('user');
          return null;
        }
      }

      try {
        const fetchedUser = await apiClient<User>('/api/auth/me', {
          method: 'GET',
        });
        if (fetchedUser) {
          localStorage.setItem('user', JSON.stringify(fetchedUser));
          return fetchedUser;
        }
        return null;
      } catch (error) {
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          console.log('No active session found.');
        } else {
          console.error("Failed to fetch user session:", error);
        }
        localStorage.removeItem('user');
        return null;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiClient('/api/auth/logout', {
        method: 'POST',
      });
    },
    onSuccess: () => {
      localStorage.removeItem('user');
      queryClient.setQueryData(USER_QUERY_KEY, null);
    },
    onError: (error) => {
      console.error('Logout error:', error);
    },
  });

  const logout = useCallback(async () => {
    await logoutMutation.mutateAsync();
  }, [logoutMutation]);

  return {
    user,
    isLoading: isUserLoading || logoutMutation.isPending,
    logout,
  };
};
