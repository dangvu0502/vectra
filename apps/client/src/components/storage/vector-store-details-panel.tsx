import { FC, useState } from 'react';
import { Trash2, Plus, Edit } from 'lucide-react';
import { DetailsPanel, DetailItem, DetailsPanelActionButton } from '@/components/ui/details-panel';
import { FileManagementModal } from '@/components/shared/file-management-modal';
import { StatusIndicator } from '@/components/ui/status-indicator';
import { useFileManagement } from '@/hooks/use-file-management';

interface VectorStoreDetails {
  id: string;
  name?: string;
  metadata: Record<string, any>;
  createdAt: string;
  size?: string;
  fileCount?: number;
  lastUpdated?: string;
  usage?: string;
}

interface VectorStoreDetailsPanelProps {
  vectorStore?: VectorStoreDetails;
  onDelete?: (id: string) => Promise<void>;
  isDeleting?: boolean;
  onAddFiles?: (id: string) => Promise<void>;
  isAddingFiles?: boolean;
  isCreating?: boolean;
  onCreate?: (data: { name: string; description: string; similarityThreshold: number }) => Promise<void>;
  isCreatingStore?: boolean;
}

interface FileItem {
  name: string;
  size: string;
  type: string;
  date: string;
  id: string;
  isLinked?: boolean;
}

export const VectorStoreDetailsPanel: FC<VectorStoreDetailsPanelProps> = ({
  vectorStore,
  onDelete,
  isDeleting,
  onAddFiles,
  isAddingFiles,
  isCreating,
  onCreate,
  isCreatingStore
}) => {
  const [isFileModalOpen, setIsFileModalOpen] = useState(false);
  const {
    selectedFiles,
    activeTab,
    searchQuery,
    filteredFiles,
    setActiveTab,
    setSearchQuery,
    handleFileSelect,
    clearSelectedFiles
  } = useFileManagement();

  const handleAddFiles = async () => {
    try {
      if (!vectorStore?.id) {
        console.error('Vector store ID is required');
        return;
      }
      if (onAddFiles && selectedFiles.length > 0) {
        await onAddFiles(vectorStore.id);
        setIsFileModalOpen(false);
        clearSelectedFiles();
      }
    } catch (error) {
      console.error('Failed to add files:', error);
    }
  };

  const handleRemoveFiles = async () => {
    try {
      if (!vectorStore?.id) {
        console.error('Vector store ID is required');
        return;
      }
      // TODO: Implement remove files functionality
      clearSelectedFiles();
    } catch (error) {
      console.error('Failed to remove files:', error);
    }
  };

  const [name, setName] = useState('Untitled vector store');
  const [description, setDescription] = useState('');
  const [similarityThreshold, setSimilarityThreshold] = useState(0.8);
  const [isEditing, setIsEditing] = useState(false);

  const handleCreate = async () => {
    if (onCreate) {
      await onCreate({ name, description, similarityThreshold });
    }
  };

  const actions = isCreating ? (
    <div className="flex gap-2">
      <DetailsPanelActionButton
        variant="outline"
        onClick={() => {
          setName('');
          setDescription('');
          setSimilarityThreshold(0.8);
          onCreate?.({ name: '', description: '', similarityThreshold: 0.8 });
        }}
        disabled={isCreatingStore}
      >
        Cancel
      </DetailsPanelActionButton>
      <DetailsPanelActionButton
        variant="default"
        onClick={handleCreate}
        disabled={isCreatingStore || !name}
      >
        {isCreatingStore ? 'Creating...' : 'Create Vector Store'}
      </DetailsPanelActionButton>
    </div>
  ) : (
    <div className="flex gap-2">
      <DetailsPanelActionButton
        variant="default"
        onClick={() => setIsFileModalOpen(true)}
        disabled={isAddingFiles}
        icon={<Plus size={16} />}
      >
        {isAddingFiles ? 'Managing...' : 'Manage Files'}
      </DetailsPanelActionButton>
      <DetailsPanelActionButton
        variant="destructive"
        onClick={() => onDelete?.(vectorStore!.id)}
        disabled={isDeleting}
        icon={<Trash2 size={16} />}
      >
        {isDeleting ? 'Deleting...' : 'Delete Vector Store'}
      </DetailsPanelActionButton>
    </div>
  );

  return (
    <>
      <DetailsPanel
        title={"Vector Store"}
        actions={actions}
        className="w-[320px] rounded-lg border border-border shadow-sm overflow-hidden flex-shrink-0"
      >
        {isCreating ? (
            <div className="flex items-center gap-2">
              {isEditing ? (
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => setIsEditing(false)}
                  autoFocus
                  className="flex-1 bg-transparent text-xl font-semibold text-foreground focus:outline-none border-b border-primary px-0"
                />
              ) : (
                <h2 className="text-xl font-semibold text-foreground flex-1">{name}</h2>
              )}
              <button
                onClick={() => setIsEditing(true)}
                className="p-2 hover:bg-muted rounded-full transition-colors"
              >
                <Edit size={16} className="text-muted-foreground" />
              </button>
            </div>
          
        ) : (
          <>
            <DetailItem label="Name" className="mb-1">
              <span className="font-medium text-foreground">
                {vectorStore?.name || 'Untitled vector store'}
              </span>
            </DetailItem>

            <DetailItem label="Status" className="mb-1">
              <StatusIndicator status="active" />
            </DetailItem>
          </>
        )}

        <DetailItem label="Size" className="mb-1">
          <span className="text-sm text-muted-foreground">
            {vectorStore?.size || '0 KB'}
          </span>
        </DetailItem>

        <DetailItem label="Documents" className="mb-1">
          <span className="text-sm text-muted-foreground">
            {vectorStore?.fileCount || 0} files
          </span>
        </DetailItem>

        <DetailItem label="Usage" className="mb-1">
          <span className="text-sm text-muted-foreground">
            {vectorStore?.usage || '0 KB'} / month
          </span>
        </DetailItem>

        <DetailItem label="Last Active" className="mb-1">
          <span className="text-sm text-muted-foreground">
            {vectorStore?.lastUpdated ? new Date(vectorStore.lastUpdated).toLocaleString() : 'Never'}
          </span>
        </DetailItem>

        <DetailItem label="Created At" className="mb-1">
          <span className="text-sm text-muted-foreground">
            {vectorStore?.createdAt ? new Date(vectorStore.createdAt).toLocaleString() : 'Never'}
          </span>
        </DetailItem>

        <DetailItem label="Metadata">
          <pre className="text-xs text-muted-foreground bg-muted p-2 rounded-md overflow-auto w-full mt-1 max-h-[100px]">
            {JSON.stringify(vectorStore?.metadata ?? {}, null, 2)}
          </pre>
        </DetailItem>
      </DetailsPanel>

      <FileManagementModal
        isOpen={isFileModalOpen}
        onOpenChange={setIsFileModalOpen}
        title="Manage Vector Store Files"
        activeTab={activeTab}
        onTabChange={setActiveTab}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        files={filteredFiles}
        selectedFiles={selectedFiles}
        onFileSelect={handleFileSelect}
        onConfirm={handleAddFiles}
        isConfirming={Boolean(isAddingFiles)}
        confirmButtonText="Add Selected Files"
        showRemoveButton
        onRemove={handleRemoveFiles}
      />
    </>
  );
};
