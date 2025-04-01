import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { documentsService } from '@/api/services/documents';
import { VectraFile } from '@/api/types';

export const DOCUMENTS_QUERY_KEY = ['documents'] as const;

type QueryOptions = {
  query?: string;
  page?: number;
  limit?: number;
  sortBy?: keyof VectraFile;
  sortOrder?: 'asc' | 'desc';
}

export function useDocumentsQuery(options: QueryOptions = {}) {
  const { query, page = 1, limit = 10, sortBy, sortOrder } = options;

  return useQuery({
    queryKey: [...DOCUMENTS_QUERY_KEY, options],
    queryFn: () => documentsService.query({
      query,
      page,
      limit,
      sortBy,
      sortOrder
    }),
    select: (response) => response.data || { files: [], pagination: { page, limit, total: 0 } },
  });
}

export function useDocumentMutations() {
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: (file: File) => documentsService.upload(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DOCUMENTS_QUERY_KEY });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => documentsService.deleteDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DOCUMENTS_QUERY_KEY });
    },
  });

  return {
    uploadMutation,
    deleteMutation,
  };
}