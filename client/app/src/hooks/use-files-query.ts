import { filesService } from '@/api/services/files';
import { VectraFileQueryOptions } from '@/api/types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const FILES_QUERY_KEY = ['files'] as const;

export function useFilesQuery(options: VectraFileQueryOptions = {}) {
  const { query, page = 1, limit = 10, sortBy, sortOrder } = options;
  return useQuery({
    queryKey: [...FILES_QUERY_KEY, options],
    queryFn: () => filesService.query(options),
    select: (response) => response.data || { files: [], pagination: { page, limit, total: 0 } },
  });
}

export function useFileMutations() {
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: (file: File) => filesService.upload(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FILES_QUERY_KEY });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => filesService.deleteFile(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FILES_QUERY_KEY });
    }
  });

  return {
    uploadMutation,
    deleteMutation
  };
}