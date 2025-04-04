import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collectionsService } from '@/api/services/collections';
import type { VectraFile } from '@/api/types/file'; // Use VectraFile
import { ApiError } from '@/api/core/client';

// Function to generate query key for a specific collection's files
const getCollectionFilesQueryKey = (collectionId: string | null | undefined) => ['collections', collectionId, 'files'];

/**
 * Hook to fetch and manage files associated with a specific collection.
 * @param collectionId - The ID of the collection whose files are being managed. Disabled if null/undefined.
 */
export function useCollectionFiles(collectionId: string | null | undefined) {
  const queryClient = useQueryClient();
  const queryKey = getCollectionFilesQueryKey(collectionId);

  // Query to fetch files linked to the collection
  const {
    data: collectionFilesData,
    isLoading: isLoadingCollectionFiles,
    error: collectionFilesError,
    refetch: refetchCollectionFiles,
  } = useQuery<{ files: VectraFile[]; total: number }, ApiError>({
    queryKey: queryKey,
    queryFn: () => {
      if (!collectionId) {
        // Should not happen if enabled is false, but good practice
        return Promise.resolve({ files: [], total: 0 });
      }
      return collectionsService.getCollectionFiles(collectionId);
    },
    enabled: !!collectionId, // Only run the query if collectionId is provided
    // staleTime: 5 * 60 * 1000, // Optional: 5 minutes stale time
  });

  // Mutation to add a file to the collection
  const {
    mutateAsync: addFileToCollection, // Use mutateAsync for easier promise handling in components
    isPending: isAddingFile,
    error: addFileError,
  } = useMutation<{ message: string }, ApiError, { fileId: string }>({
    mutationFn: ({ fileId }) => {
      if (!collectionId) throw new Error("Collection ID is required to add a file.");
      return collectionsService.addFileToCollection(collectionId, fileId);
    },
    onSuccess: () => {
      // Invalidate the query for this collection's files to refetch
      queryClient.invalidateQueries({ queryKey: queryKey });
      // Optionally, could also invalidate general file queries if needed
      // queryClient.invalidateQueries({ queryKey: ['files'] });
    },
  });

  // Mutation to remove a file from the collection
  const {
    mutateAsync: removeFileFromCollection, // Use mutateAsync
    isPending: isRemovingFile,
    error: removeFileError,
  } = useMutation<{ message: string }, ApiError, { fileId: string }>({
    mutationFn: ({ fileId }) => {
      if (!collectionId) throw new Error("Collection ID is required to remove a file.");
      return collectionsService.removeFileFromCollection(collectionId, fileId);
    },
    onSuccess: () => {
      // Invalidate the query for this collection's files to refetch
      queryClient.invalidateQueries({ queryKey: queryKey });
      // Optionally, could also invalidate general file queries if needed
      // queryClient.invalidateQueries({ queryKey: ['files'] });
    },
  });

  return {
    // Linked files query results
    linkedFiles: collectionFilesData?.files ?? [],
    totalLinkedFiles: collectionFilesData?.total ?? 0,
    isLoadingCollectionFiles,
    collectionFilesError,
    refetchCollectionFiles,

    // Add file mutation
    addFileToCollection,
    isAddingFile,
    addFileError,

    // Remove file mutation
    removeFileFromCollection,
    isRemovingFile,
    removeFileError,
  };
}
