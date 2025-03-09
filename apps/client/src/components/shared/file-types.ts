export interface FileDetails {
  name: string;
  id: string;
  size: string;
  createdAt: string;
  status: 'ready' | 'processing' | 'error';
  vectorStores?: Array<{ id: string; name: string; }>;
}

export interface FileItem {
  name: string;
  size: string;
  type: string;
  date: string;
  id: string;
  isLinked?: boolean;
}

export const getFileType = (filename: string): string => {
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  const typeMap: Record<string, string> = {
    txt: 'text',
    pdf: 'document',
    doc: 'document',
    docx: 'document',
    md: 'text',
    json: 'text',
    csv: 'text',
    jpg: 'image',
    jpeg: 'image',
    png: 'image',
    mp3: 'audio',
    wav: 'audio',
    mp4: 'video'
  };
  return typeMap[extension] || 'unknown';
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};