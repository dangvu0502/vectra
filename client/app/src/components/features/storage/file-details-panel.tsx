import { FC, useState } from 'react';
import { Plus, HelpCircle } from 'lucide-react';
import { Tooltip } from '@/components/ui/tooltip';
import { DetailsPanel, DetailItem, DetailsPanelActionButton } from '@/components/ui/details-panel';

interface FileDetails {
  name: string;
  id: string;
  size: string;
  createdAt: string;
  status: 'ready' | 'processing' | 'error';
  collections?: Array<{ id: string; name: string; }>; // Renamed prop
}

interface FileDetailsPanelProps {
  file: FileDetails | null;
  onDelete: (id: string) => Promise<void>;
  isDeleting: boolean;
  // Removed props related to creating vector stores as they don't seem relevant here
}

export const FileDetailsPanel: FC<FileDetailsPanelProps> = ({
  file,
  onDelete,
  isDeleting
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!file) {
    return null;
  }
  
  const actions = (
    <DetailsPanelActionButton
      variant="destructive"
      onClick={() => onDelete(file.id)}
      disabled={isDeleting}
    >
      {isDeleting ? 'Deleting...' : 'Delete'}
    </DetailsPanelActionButton>
  );

  return (
    <DetailsPanel
      title={file.name}
      subtitle="FILE"
      actions={actions}
      className="w-[320px] rounded-lg border border-border shadow-sm overflow-hidden flex-shrink-0"
    >
      <DetailItem label="Status" className="mb-1">
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
      
      <DetailItem label="File ID" className="mb-1">
        <span className="font-mono text-xs bg-muted px-2 py-1 rounded transition-colors duration-200">
          {file.id}
        </span>
      </DetailItem>
      
      <DetailItem label="Size" className="mb-1">
        <span className="font-medium">{file.size}</span>
      </DetailItem>
      
      <DetailItem label="Created at" className="mb-1">
        <span className="font-medium">{file.createdAt}</span>
      </DetailItem>

      <DetailItem
        label={
          <div className="flex items-center gap-1">
            Collection Usage {/* Updated label */}
            <Tooltip content="Collections that are using this file"> {/* Updated tooltip */}
              <HelpCircle size={14} className="text-muted-foreground hover:text-foreground transition-colors cursor-help" />
            </Tooltip>
          </div>
        }
      >
        <div className="space-y-1">
          {/* Use renamed prop */}
          {file.collections && file.collections.length > 0 ? (
            <div className="space-y-1">
              {/* Use renamed prop */}
              {file.collections.map(collection => (
                <div
                  key={collection.id} // Use collection.id
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-200 flex items-center gap-2"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/50" />
                  {collection.name} {/* Use collection.name */}
                </div>
              ))}
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">
              Not used in any collections {/* Updated text */}
            </span>
          )}
        </div>
      </DetailItem>
    </DetailsPanel>
  );
};
