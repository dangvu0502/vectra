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
      try {
        const fetchedUser = await apiClient<User>('/api/auth/me', {
          method: 'GET',
        });
        return fetchedUser || null;
      } catch (error) {
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          console.log('Session expired or invalid.');
        } else {
          console.error("Failed to fetch user session:", error);
        }
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
