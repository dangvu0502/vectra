export interface VectraFile {
  id: string;
  filename: string;
  content: string;
  createdAt: Date;
  size?: number;
  type?: string;
  status?: 'ready' | 'processing' | 'error';
  purpose?: 'assistants' | 'user_data';
}

export type VectraFileQueryOptions = {
  query?: string;
  page?: number;
  limit?: number;
  sortBy?: keyof VectraFile;
  sortOrder?: 'asc' | 'desc';
}