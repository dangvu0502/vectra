import { FC } from 'react';
import { cn } from '@/lib/utils';
import { File } from 'lucide-react';

interface FileItemProps {
  name: string;
  size: string;
  date: string;
  type: string;
  onClick?: () => void;
  isSelected?: boolean;
}

export const FileItem: FC<FileItemProps> = ({ name, size, date, type, onClick, isSelected }) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-center justify-between p-3 cursor-pointer transition-all duration-200 ease-in-out',
        isSelected ? 'bg-accent/20 shadow-sm scale-[1.01]' : 'hover:bg-accent/10 hover:scale-[1.005] hover:shadow-sm'
      )}
    >
      <div className="flex items-center gap-3">
        <File size={18} className={cn('transition-colors duration-200', isSelected ? 'text-primary' : 'text-muted-foreground')} />
        <span className={cn('font-medium transition-colors duration-200', isSelected && 'text-primary')}>{name}</span>
      </div>
      <div className="flex items-center gap-6">
        <span className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200">{size}</span>
        <span className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200">{date}</span>
      </div>
    </div>
  );
};

interface FileListProps {
  className?: string;
  files: FileItemProps[];
  onFileSelect?: (file: FileItemProps) => void;
  selectedFile?: string;
}

export const FileList: FC<FileListProps> = ({ 
  className, 
  files, 
  onFileSelect, 
  selectedFile 
}) => {
  return (
    <div className={cn('border rounded-md overflow-hidden shadow-sm transition-shadow duration-200 hover:shadow-md', className)}>
      {files.map((file) => (
        <FileItem
          key={file.name}
          {...file}
          isSelected={selectedFile === file.name}
          onClick={() => onFileSelect?.(file)}
        />
      ))}
    </div>
  );
};