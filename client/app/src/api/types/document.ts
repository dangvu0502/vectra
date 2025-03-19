export interface Document {
  id: string;
  filename: string;
  content: string;
  createdAt: Date;
  size?: number;
  type?: string;
  status?: 'ready' | 'processing' | 'error';
  purpose?: 'assistants' | 'user_data';
}