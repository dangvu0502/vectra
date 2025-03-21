import { apiClient } from '../core/client';

export const chat = async (message: string): Promise<string> => {
  const response = await apiClient<{ response: string }>('/api/v1/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message }),
  });
  return response.response;
};
