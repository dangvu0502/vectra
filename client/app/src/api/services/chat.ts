import { apiClient } from '../core/client';

export const chat = async (message: string, docId?: string): Promise<string> => {
  const response = await apiClient<{ response: string }>('/api/v1/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message, docId }),
  });
  return response.response;
};
