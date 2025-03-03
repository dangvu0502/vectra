import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { documentsService } from '@/api/services/documents';

export const DOCUMENTS_QUERY_KEY = ['documents'] as const;

export function useDocumentsQuery(query?: string) {
  return useQuery({
    queryKey: [...DOCUMENTS_QUERY_KEY, query],
    queryFn: () => documentsService.search(query || ''),
    select: (response) => response.data || [],
  });
}

export function useDocumentMutations() {
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: documentsService.upload.bind(documentsService),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DOCUMENTS_QUERY_KEY });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: documentsService.deleteDocument.bind(documentsService),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DOCUMENTS_QUERY_KEY });
    },
  });

  return {
    uploadMutation,
    deleteMutation,
  };
}