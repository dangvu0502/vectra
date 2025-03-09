import { FC } from 'react';
import { FileText, Image, Video, Music, FileQuestion } from 'lucide-react';
import { Table } from '@/components/ui/table';

const getFileIcon = (type: string) => {
  switch (type.toLowerCase()) {
    case 'txt':
    case 'md':
    case 'json':
    case 'csv':
      return FileText;
    case 'jpg':
    case 'jpeg':
    case 'png':
      return Image;
    case 'mp4':
      return Video;
    case 'mp3':
    case 'wav':
      return Music;
    default:
      return FileQuestion;
  }
};

interface FileItem {
  name: string;
  size: string;
  date: string;
  type: string;
}

interface FileListProps {
  className?: string;
  files: FileItem[];
  onFileSelect?: (file: FileItem) => void;
  selectedFile?: string;
}

export const FileList: FC<FileListProps> = ({ 
  className, 
  files, 
  onFileSelect, 
  selectedFile 
}) => {
  const columns = [
    {
      header: 'Name',
      key: 'name' as const,
      render: (file: FileItem) => {
        const Icon = getFileIcon(file.type);
        return (
          <div className="flex items-center gap-2">
            <Icon size={16} className="text-muted-foreground" />
            <span className="font-medium">{file.name}</span>
          </div>
        );
      }
    },
    {
      header: 'Size',
      key: 'size' as const
    },
    {
      header: 'Date',
      key: 'date' as const
    },
    {
      header: 'Type',
      key: 'type' as const,
      render: (file: FileItem) => file.type.toUpperCase()
    }
  ];

  return (
    <Table
      columns={columns}
      data={files}
      onRowClick={onFileSelect}
      isRowSelected={(file) => file.name === selectedFile}
      className={className}
      emptyMessage="No files found"
    />
  );
};
