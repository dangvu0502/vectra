import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collectionsService } from '@/api/services/collections';
import type { Collection, CreateCollectionInput, UpdateCollectionInput } from '@/api/types';
import { ApiError } from '@/api/core/client'; // Assuming ApiError is exported for use

const COLLECTIONS_QUERY_KEY = ['collections'];

/**
 * Hook to fetch and manage collections data.
 */
export function useCollectionsQuery() {
  const queryClient = useQueryClient();

  // Query to fetch all collections
  const {
    data: collections,
    isLoading: isLoadingCollections,
    error: collectionsError,
    refetch: refetchCollections,
  } = useQuery<Collection[], ApiError>({
    queryKey: COLLECTIONS_QUERY_KEY,
    queryFn: collectionsService.getCollections,
    // Add options like staleTime if needed
    // staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Mutation to create a new collection
  const {
    mutate: createCollection,
    isPending: isCreatingCollection,
    error: createCollectionError,
  } = useMutation<Collection, ApiError, CreateCollectionInput>({
    mutationFn: collectionsService.createCollection,
    onSuccess: () => {
      // Invalidate and refetch the collections list after successful creation
      queryClient.invalidateQueries({ queryKey: COLLECTIONS_QUERY_KEY });
    },
    // onError: (error) => { /* Handle specific error logic if needed */ }
  });

  // Mutation to update an existing collection
  const {
    mutate: updateCollection,
    isPending: isUpdatingCollection,
    error: updateCollectionError,
  } = useMutation<Collection, ApiError, { collectionId: string; data: UpdateCollectionInput }>({
    mutationFn: ({ collectionId, data }) => collectionsService.updateCollection(collectionId, data),
    onSuccess: (_, variables) => {
      // Invalidate and refetch the collections list after successful update
      queryClient.invalidateQueries({ queryKey: COLLECTIONS_QUERY_KEY });
      // Optionally, invalidate specific collection query if you implement one
      // queryClient.invalidateQueries({ queryKey: [...COLLECTIONS_QUERY_KEY, variables.collectionId] });
    },
  });

  // Mutation to delete a collection
  const {
    mutate: deleteCollection,
    isPending: isDeletingCollection,
    error: deleteCollectionError,
  } = useMutation<void, ApiError, string>({ // `string` is the collectionId
    mutationFn: collectionsService.deleteCollection,
    onSuccess: () => {
      // Invalidate and refetch the collections list after successful deletion
      queryClient.invalidateQueries({ queryKey: COLLECTIONS_QUERY_KEY });
    },
  });

  return {
    collections,
    isLoadingCollections,
    collectionsError,
    refetchCollections,

    createCollection,
    isCreatingCollection,
    createCollectionError,

    updateCollection,
    isUpdatingCollection,
    updateCollectionError,

    deleteCollection,
    isDeletingCollection,
    deleteCollectionError,
  };
}
