import { ApiResponse, VectraFile, VectraFileQueryOptions } from '@/api/types';
import { apiClient } from '../core/client';
import { API_CONFIG } from '../core/config';

type QueryResponse = {
  files: VectraFile[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  }
}

class FilesService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.FILES}`;
  }

  async upload(file: File): Promise<ApiResponse<VectraFile>> {
    const formData = new FormData();
    formData.append('file', file);

    return apiClient<ApiResponse<VectraFile>>(`${this.baseUrl}/upload`, {
      method: 'POST',
      body: formData
    });
  }

  async deleteFile(id: string): Promise<ApiResponse<void>> {
    return apiClient<ApiResponse<void>>(`${this.baseUrl}/${id}`, {
      method: 'DELETE'
    });
  }

  async query(options: VectraFileQueryOptions = {}): Promise<ApiResponse<QueryResponse>> {
    const url = new URL(this.baseUrl, window.location.origin);

    // Add query parameters
    if (options.query) url.searchParams.append('q', options.query);
    if (options.page) url.searchParams.append('page', options.page.toString());
    if (options.limit) url.searchParams.append('limit', options.limit.toString());
    if (options.sortBy) url.searchParams.append('sortBy', options.sortBy);
    if (options.sortOrder) url.searchParams.append('sortOrder', options.sortOrder);

    return apiClient<ApiResponse<QueryResponse>>(url.toString());
  }
}

export const filesService = new FilesService();