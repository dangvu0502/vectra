import { FC } from 'react';
import { Trash2 } from 'lucide-react';
import { DetailsPanel, DetailItem, DetailsPanelActionButton } from '@/components/ui/details-panel';

interface VectorStoreDetails {
  id: string;
  metadata: Record<string, any>;
  createdAt: string;
}

interface VectorStoreDetailsPanelProps {
  vectorStore: VectorStoreDetails;
  onDelete: (id: string) => Promise<void>;
  isDeleting: boolean;
}

export const VectorStoreDetailsPanel: FC<VectorStoreDetailsPanelProps> = ({
  vectorStore,
  onDelete,
  isDeleting
}) => {
  const actions = (
    <DetailsPanelActionButton
      variant="destructive"
      onClick={() => onDelete(vectorStore.id)}
      disabled={isDeleting}
      icon={<Trash2 size={16} />}
    >
      {isDeleting ? 'Deleting...' : 'Delete Vector Store'}
    </DetailsPanelActionButton>
  );

  return (
    <DetailsPanel
      title="Vector Store Details"
      subtitle={vectorStore.id}
      actions={actions}
      className="w-[300px] border-l"
    >
      <DetailItem label="Created At">
        <span className="text-sm text-muted-foreground">
          {new Date(vectorStore.createdAt).toLocaleString()}
        </span>
      </DetailItem>

      <DetailItem label="Metadata">
        <pre className="text-sm text-muted-foreground bg-muted p-2 rounded-md overflow-auto w-full mt-2">
          {JSON.stringify(vectorStore.metadata, null, 2)}
        </pre>
      </DetailItem>
    </DetailsPanel>
  );
};