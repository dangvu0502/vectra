import { ApiResponse, Document } from '@/api/types';
import { apiClient } from '../core/client';
import { API_CONFIG } from '../core/config';

type QueryResponse = {
  documents: Document[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  }
}

class DocumentsService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.DOCUMENTS}`;
  }

  async upload(file: File): Promise<ApiResponse<Document>> {
    const formData = new FormData();
    formData.append('file', file);
    
    return apiClient<ApiResponse<Document>>(`${this.baseUrl}/upload`, {
      method: 'POST',
      body: formData
    });
  }

  async deleteDocument(id: string): Promise<ApiResponse<void>> {
    return apiClient<ApiResponse<void>>(`${this.baseUrl}/${id}`, {
      method: 'DELETE'
    });
  }

  async query(options: {
    query?: string;
    page?: number;
    limit?: number;
    sortBy?: keyof Document;
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<ApiResponse<QueryResponse>> {
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

export const documentsService = new DocumentsService();