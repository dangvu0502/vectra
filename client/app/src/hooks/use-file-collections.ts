import { useQuery, QueryClient } from '@tanstack/react-query'; // Import QueryClient if needed for options
import { filesService } from '@/api/services/files';
import type { Collection, ApiResponse } from '@/api/types'; // Import Collection and ApiResponse
import { ApiError } from '@/api/core/client';

// Function to generate the query key
const getFileCollectionsQueryKey = (fileId: string | null | undefined) => ['files', fileId, 'collections'];

/**
 * Hook to fetch collections associated with a specific file.
 * @param fileId - The ID of the file. The query is disabled if fileId is null or undefined.
 */
export function useFileCollections(fileId: string | null | undefined) {
  const queryKey = getFileCollectionsQueryKey(fileId);

  const {
    data: fileCollectionsResponse, // Rename data to avoid conflict
    isLoading: isLoadingFileCollections,
    error: fileCollectionsError,
    refetch: refetchFileCollections,
  } = useQuery<ApiResponse<{ collections: Collection[] }>, ApiError>({ // Expect ApiResponse structure
    queryKey: queryKey,
    queryFn: async () => {
      if (!fileId) {
        // This path shouldn't be hit if enabled is false, but throw to be safe
        throw new Error("fileId is required but not provided.");
      }
      // filesService.getCollectionsForFile returns the full ApiResponse
      return filesService.getCollectionsForFile(fileId);
    },
    enabled: !!fileId, // Only run query if fileId is provided
    // staleTime: 5 * 60 * 1000, // Optional: 5 minutes stale time
  });

  // Extract the collections array safely from the query data, checking status and data existence
  const collections = (fileCollectionsResponse && fileCollectionsResponse.status === 'success' && fileCollectionsResponse.data)
    ? fileCollectionsResponse.data.collections
    : [];

  return {
    collections: collections ?? [], // Ensure it's always an array
    isLoading: isLoadingFileCollections,
    error: fileCollectionsError,
    refetch: refetchFileCollections,
  };
}
