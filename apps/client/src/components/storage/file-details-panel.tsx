import { FC } from 'react';
import { Button } from '@/components/ui/button';

interface FileDetails {
  name: string;
  id: string;
  purpose: string;
  size: string;
  createdAt: string;
  status: 'ready' | 'processing' | 'error';
}

interface FileDetailsPanelProps {
  file: FileDetails | null;
  onDelete: (id: string) => Promise<void>;
  isDeleting: boolean;
}

export const FileDetailsPanel: FC<FileDetailsPanelProps> = ({ 
  file, 
  onDelete, 
  isDeleting 
}) => {
  return (
    <div className="w-[400px] border rounded-md p-6 bg-card shadow-sm hover:shadow-md transition-all duration-200 ease-in-out">
      <h2 className="text-sm font-medium uppercase text-muted-foreground mb-2">FILE</h2>
      <h3 className="text-xl font-semibold mb-6 truncate text-primary transition-colors duration-200">{file.name}</h3>
      
      <div className="space-y-5">
        <DetailItem label="Status">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full transition-colors duration-200 ${
              file.status === 'ready' ? 'bg-green-500' : 
              file.status === 'processing' ? 'bg-amber-500' : 'bg-red-500'
            }`} />
            <span className="font-medium transition-colors duration-200">
              {file.status === 'ready' ? 'Ready' : 
               file.status === 'processing' ? 'Processing' : 'Error'}
            </span>
          </div>
        </DetailItem>
        
        <DetailItem label="File ID">
          <span className="font-mono text-xs bg-muted px-2 py-1 rounded transition-colors duration-200">
            {file.id}
          </span>
        </DetailItem>
        
        <DetailItem label="Purpose">
          <span className="font-medium">{file.purpose}</span>
        </DetailItem>
        
        <DetailItem label="Size">
          <span className="font-medium">{file.size}</span>
        </DetailItem>
        
        <DetailItem label="Created at">
          <span className="font-medium">{file.createdAt}</span>
        </DetailItem>
      </div>
      
      <div className="mt-8 flex justify-end">
        <Button 
          variant="destructive" 
          size="sm" 
          className="px-4 shadow-sm hover:shadow-md transition-shadow duration-200"
          onClick={() => onDelete(file.id)}
          disabled={isDeleting}
        >
          {isDeleting ? 'Deleting...' : 'Delete'}
        </Button>
      </div>
    </div>
  );
};

const DetailItem: FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex items-center justify-between group">
    <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-200">
      {label}
    </span>
    {children}
  </div>
);