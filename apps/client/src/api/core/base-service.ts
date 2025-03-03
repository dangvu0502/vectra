import { apiClient } from './client';
import { API_CONFIG } from './config';

export abstract class BaseService {
  protected baseUrl: string;

  constructor(endpoint: string) {
    this.baseUrl = `${API_CONFIG.BASE_URL}${endpoint}`;
  }

  protected async get<T>(path: string = '', query?: Record<string, string>): Promise<T> {
    const url = new URL(this.baseUrl + path, window.location.origin);
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }
    return apiClient<T>(url.toString());
  }

  protected async post<T>(path: string = '', body?: unknown): Promise<T> {
    return apiClient<T>(this.baseUrl + path, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  }

  protected async delete<T>(path: string = ''): Promise<T> {
    return apiClient<T>(this.baseUrl + path, {
      method: 'DELETE',
    });
  }
}