import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiKeysService } from '@/api/services/apiKeys';
import type { ApiKey, CreateApiKeyInput, UpdateApiKeyInput } from '@/api/types/apiKey';
import { ApiError } from '@/api/core/client';

const API_KEYS_QUERY_KEY = ['api-keys'];

export function useApiKeysQuery() {
  const queryClient = useQueryClient();

  const {
    data: apiKeys,
    isLoading: isLoadingApiKeys,
    error: apiKeysError,
    refetch: refetchApiKeys,
  } = useQuery<ApiKey[], ApiError>({
    queryKey: API_KEYS_QUERY_KEY,
    queryFn: apiKeysService.getApiKeys,
  });

  const {
    mutate: createApiKey,
    isPending: isCreatingApiKey,
    error: createApiKeyError,
  } = useMutation<ApiKey, ApiError, CreateApiKeyInput>({
    mutationFn: apiKeysService.createApiKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: API_KEYS_QUERY_KEY });
    },
  });

  const {
    mutate: updateApiKey,
    isPending: isUpdatingApiKey,
    error: updateApiKeyError,
  } = useMutation<ApiKey, ApiError, { apiKeyId: string; data: UpdateApiKeyInput }>({
    mutationFn: ({ apiKeyId, data }) => apiKeysService.updateApiKey(apiKeyId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: API_KEYS_QUERY_KEY });
    },
  });

  const {
    mutate: deleteApiKey,
    isPending: isDeletingApiKey,
    error: deleteApiKeyError,
  } = useMutation<void, ApiError, string>({
    mutationFn: apiKeysService.deleteApiKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: API_KEYS_QUERY_KEY });
    },
  });

  return {
    apiKeys,
    isLoadingApiKeys,
    apiKeysError,
    refetchApiKeys,

    createApiKey,
    isCreatingApiKey,
    createApiKeyError,

    updateApiKey,
    isUpdatingApiKey,
    updateApiKeyError,

    deleteApiKey,
    isDeletingApiKey,
    deleteApiKeyError,
  };
} 