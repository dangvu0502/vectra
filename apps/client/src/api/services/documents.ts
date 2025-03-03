import { ApiResponse, Document } from '@/api/types';
import { BaseService } from '../core/base-service';
import { API_CONFIG } from '../core/config';

class DocumentsService extends BaseService {
  constructor() {
    super(API_CONFIG.ENDPOINTS.DOCUMENTS);
  }

  async upload(file: File): Promise<ApiResponse<Document>> {
    const formData = new FormData();
    formData.append('file', file);
    return this.post('/upload', formData);
  }

  async search(query: string): Promise<ApiResponse<Document[]>> {
    return this.get('/search', { q: query });
  }

  async deleteDocument(id: string): Promise<ApiResponse<void>> {
    return this.delete(`/${id}`);
  }
}

export const documentsService = new DocumentsService();