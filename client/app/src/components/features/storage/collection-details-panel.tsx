import { FC, useState } from 'react';
import { Trash2, Plus, Edit } from 'lucide-react';
import { DetailsPanel, DetailItem, DetailsPanelActionButton } from '@/components/ui/details-panel';
import { FileManagementModal } from '@/components/shared/file-management-modal';
import { StatusIndicator } from '@/components/ui/status-indicator';
import { useFileManagement } from '@/hooks/use-file-management';

// Renamed interface
interface CollectionDetails {
  id: string;
  name?: string;
  metadata: Record<string, any>;
  createdAt: string;
  size?: string;
  fileCount?: number;
  lastUpdated?: string;
  usage?: string;
}

// Renamed interface and props
interface CollectionDetailsPanelProps {
  collection?: CollectionDetails; // Renamed prop
  onDelete?: (id: string) => Promise<void>;
  isDeleting?: boolean;
  onAddFiles?: (id: string) => Promise<void>; // TODO: Rename or repurpose if needed for collections
  isAddingFiles?: boolean; // TODO: Rename or repurpose if needed for collections
  isCreating?: boolean;
  onCreate?: (data: { name: string; description: string; similarityThreshold: number }) => Promise<void>;
  isCreatingCollection?: boolean; // Renamed prop
}

interface FileItem {
  name: string;
  size: string;
  type: string;
  date: string;
  id: string;
  isLinked?: boolean;
}

// Renamed component and props
export const CollectionDetailsPanel: FC<CollectionDetailsPanelProps> = ({
  collection, // Renamed prop
  onDelete,
  isDeleting,
  onAddFiles, // TODO: Review if this prop is still relevant for collections
  isAddingFiles, // TODO: Review if this prop is still relevant for collections
  isCreating,
  onCreate,
  isCreatingCollection // Renamed prop
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
  } = useFileManagement(); // TODO: Review if this hook is appropriate for collections or needs adjustment

  // TODO: Review this function for collections
  const handleAddFiles = async () => {
    try {
      if (!collection?.id) { // Use renamed prop
        console.error('Collection ID is required'); // Updated error message
        return;
      }
      if (onAddFiles && selectedFiles.length > 0) {
        await onAddFiles(collection.id); // Use renamed prop
        setIsFileModalOpen(false);
        clearSelectedFiles();
      }
    } catch (error) {
      console.error('Failed to add files:', error);
    }
  };

  // TODO: Review this function for collections
  const handleRemoveFiles = async () => {
    try {
      if (!collection?.id) { // Use renamed prop
        console.error('Collection ID is required'); // Updated error message
        return;
      }
      // TODO: Implement remove files functionality for collections
      clearSelectedFiles();
    } catch (error) {
      console.error('Failed to remove files:', error);
    }
  };

  const [name, setName] = useState('Untitled collection'); // Updated default name
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
          // Reset state or navigate back, potentially call a cancel handler passed via props
          // For now, just logging cancellation intent
          console.log("Creation cancelled");
          // TODO: Implement proper cancel logic, maybe call an onCancel prop if provided
        }}
        disabled={isCreatingCollection} // Use renamed prop
      >
        Cancel
      </DetailsPanelActionButton>
      <DetailsPanelActionButton
        variant="default"
        onClick={handleCreate}
        disabled={isCreatingCollection || !name} // Use renamed prop
      >
        {isCreatingCollection ? 'Creating...' : 'Create Collection'} {/* Updated button text */}
      </DetailsPanelActionButton>
    </div>
  ) : (
    <div className="flex gap-2">
      {/* TODO: Review if 'Manage Files' is the correct action for collections */}
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
        onClick={() => onDelete?.(collection!.id)} // Use renamed prop
        disabled={isDeleting}
        icon={<Trash2 size={16} />}
      >
        {isDeleting ? 'Deleting...' : 'Delete Collection'} {/* Updated button text */}
      </DetailsPanelActionButton>
    </div>
  );

  return (
    <>
      <DetailsPanel
        title={isCreating ? "Create New Collection" : "Collection Details"} // Updated title
        actions={actions}
        className="w-[320px] rounded-lg border border-border shadow-sm overflow-hidden flex-shrink-0"
      >
        {isCreating ? (
            <div className="space-y-4 p-4"> {/* Added padding for create form */}
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={() => setIsEditing(false)}
                    autoFocus
                    className="flex-1 bg-transparent text-xl font-semibold text-foreground focus:outline-none border-b border-primary px-0"
                    placeholder="Collection Name" // Added placeholder
                  />
                ) : (
                  <h2 className="text-xl font-semibold text-foreground flex-1 cursor-pointer" onClick={() => setIsEditing(true)}>{name || "Click to edit name"}</h2> // Made clickable
                )}
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-1 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground"
                    aria-label="Edit collection name"
                  >
                    <Edit size={14} />
                  </button>
                )}
              </div>
               {/* TODO: Add fields for description and similarity threshold */}
               <div>
                 <label htmlFor="collection-description" className="text-sm font-medium text-muted-foreground">Description (Optional)</label>
                 <textarea
                   id="collection-description"
                   value={description}
                   onChange={(e) => setDescription(e.target.value)}
                   rows={3}
                   className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                   placeholder="Describe the purpose of this collection..."
                 />
               </div>
               <div>
                 <label htmlFor="similarity-threshold" className="text-sm font-medium text-muted-foreground">Similarity Threshold</label>
                 <input
                   id="similarity-threshold"
                   type="number"
                   step="0.01"
                   min="0"
                   max="1"
                   value={similarityThreshold}
                   onChange={(e) => setSimilarityThreshold(parseFloat(e.target.value))}
                   className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                 />
                 <p className="text-xs text-muted-foreground mt-1">Controls how similar retrieved documents must be (0.0 to 1.0).</p>
               </div>
            </div>
        ) : (
          <div className="p-4 space-y-2"> {/* Added padding for details view */}
            <DetailItem label="Name" className="mb-1">
              <span className="font-medium text-foreground">
                {collection?.name || 'Untitled collection'} {/* Use renamed prop and updated text */}
              </span>
            </DetailItem>

            <DetailItem label="Status" className="mb-1">
              {/* TODO: Determine actual status for collections */}
              <StatusIndicator status="active" />
            </DetailItem>

            <DetailItem label="Size" className="mb-1">
              <span className="text-sm text-muted-foreground">
                {collection?.size || '0 KB'} {/* Use renamed prop */}
              </span>
            </DetailItem>

            {/* TODO: Confirm if 'Documents' is the right term for collections */}
            <DetailItem label="Documents" className="mb-1">
              <span className="text-sm text-muted-foreground">
                {collection?.fileCount || 0} files {/* Use renamed prop */}
              </span>
            </DetailItem>

            <DetailItem label="Usage" className="mb-1">
              <span className="text-sm text-muted-foreground">
                {collection?.usage || '0 KB'} / month {/* Use renamed prop */}
              </span>
            </DetailItem>

            <DetailItem label="Last Active" className="mb-1">
              <span className="text-sm text-muted-foreground">
                {collection?.lastUpdated ? new Date(collection.lastUpdated).toLocaleString() : 'Never'} {/* Use renamed prop */}
              </span>
            </DetailItem>

            <DetailItem label="Created At" className="mb-1">
              <span className="text-sm text-muted-foreground">
                {collection?.createdAt ? new Date(collection.createdAt).toLocaleString() : 'Never'} {/* Use renamed prop */}
              </span>
            </DetailItem>

            <DetailItem label="Metadata">
              <pre className="text-xs text-muted-foreground bg-muted p-2 rounded-md overflow-auto w-full mt-1 max-h-[100px]">
                {JSON.stringify(collection?.metadata ?? {}, null, 2)} {/* Use renamed prop */}
              </pre>
            </DetailItem>
          </div>
        )}
      </DetailsPanel>

      {/* TODO: Review if FileManagementModal is appropriate for collections */}
      <FileManagementModal
        isOpen={isFileModalOpen}
        onOpenChange={setIsFileModalOpen}
        title="Manage Collection Files" // Updated title
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
