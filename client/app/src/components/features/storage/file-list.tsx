import { FC, useState } from 'react';
import { FileText, Image, Video, Music, FileQuestion, MessageSquare } from 'lucide-react';
import { Table } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ChatWindow } from '@/components/shared/chat-window';
import { Tooltip } from '@/components/ui/tooltip';

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
  id?: string;
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
  const [chatFile, setChatFile] = useState<FileItem | null>(null);

  const handleChatClick = (e: React.MouseEvent, file: FileItem) => {
    e.stopPropagation();
    setChatFile(file);
  };

  const handleChatClose = () => {
    setChatFile(null);
  };

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
      key: 'size' as const,
    },
    {
      header: 'Date',
      key: 'date' as const,
    },
    {
      header: 'Type',
      key: 'type' as const,
      render: (file: FileItem) => file.type.toUpperCase()
    },
    {
      header: 'Actions',
      key: 'name' as const,
      className: 'w-[5%] text-right',
      render: (file: FileItem) => (
        <div className="flex justify-end">
          <Tooltip content="Chat with this file">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-primary"
              onClick={(e) => handleChatClick(e, file)}
            >
              <MessageSquare size={16} />
            </Button>
          </Tooltip>
        </div>
      )
    }
  ];

  return (
    <>
      <Table
        columns={columns}
        data={files}
        onRowClick={onFileSelect}
        isRowSelected={(file) => file.name === selectedFile}
        className={className}
        emptyMessage="No files found"
      />
      
      {chatFile && (
        <ChatWindow 
          onClose={handleChatClose} 
          knowledgeSource={{
            type: 'file',
            id: chatFile.id || chatFile.name,
            name: chatFile.name
          }}
        />
      )}
    </>
  );
};
