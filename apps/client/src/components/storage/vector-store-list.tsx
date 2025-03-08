import { FC } from 'react';
import { cn } from '@/utils';

interface VectorStore {
  id: string;
  metadata: Record<string, any>;
  createdAt: string;
}

interface VectorStoreListProps {
  vectorStores: VectorStore[];
  selectedVectorStore: string | null;
  onVectorStoreSelect: (vectorStore: VectorStore) => void;
  className?: string;
}

export const VectorStoreList: FC<VectorStoreListProps> = ({
  vectorStores,
  selectedVectorStore,
  onVectorStoreSelect,
  className
}) => {
  return (
    <div className={cn('rounded-lg border bg-card shadow-sm hover:shadow-md transition-shadow duration-200', className)}>
      <div className="p-4 border-b bg-muted/30">
        <div className="grid grid-cols-4 text-sm font-medium text-muted-foreground">
          <div className="hover:text-foreground transition-colors duration-200">Created At</div>
          <div className="hover:text-foreground transition-colors duration-200">Metadata</div>
          <div className="hover:text-foreground transition-colors duration-200">Actions</div>
        </div>
      </div>
      <div className="divide-y divide-muted/20">
        {vectorStores.map((vectorStore) => (
          <div
            key={vectorStore.id}
            className={cn(
              'grid grid-cols-4 items-center p-4 text-sm cursor-pointer transition-all duration-200 ease-in-out',
              selectedVectorStore === vectorStore.id ? 'bg-accent/20 shadow-sm scale-[1.01]' : 'hover:bg-accent/10 hover:scale-[1.005] hover:shadow-sm'
            )}
            onClick={() => onVectorStoreSelect(vectorStore)}
          >
            <div>{new Date(vectorStore.createdAt).toLocaleString()}</div>
            <div className="truncate">
              {Object.keys(vectorStore.metadata).length
                ? JSON.stringify(vectorStore.metadata)
                : 'No metadata'}
            </div>
            <div className="flex items-center gap-2">
              <button
                className="text-xs px-2 py-1 rounded bg-primary/10 hover:bg-primary/20 transition-all duration-200 hover:scale-105 hover:shadow-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  // TODO: Implement search similar
                }}
              >
                Search Similar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};