import { FC, useState, useEffect } from 'react';
import { Trash2, Edit, Settings2, Loader2 } from 'lucide-react'; // Removed Plus, Added Loader2
import { DetailsPanel, DetailItem, DetailsPanelActionButton } from '@/components/ui/details-panel';
import { Button } from '@/components/ui/button';
import { CollectionManagementModal } from '@/components/shared/collection-management-modal';
import { StatusIndicator } from '@/components/ui/status-indicator';
import type { Collection as ApiCollection } from '@/api/types';

// Props definition matching the usage in storage.tsx and API data
interface CollectionDetailsPanelProps {
  collection?: ApiCollection;
  onDelete?: (id: string) => Promise<void>;
  isDeleting?: boolean;
  isCreating?: boolean;
  // Updated onCreate to match the actual data sent by handleCreateCollection in storage.tsx
  onCreate?: (data: { name: string; description?: string | null }) => Promise<void>;
  isCreatingCollection?: boolean;
}

export const CollectionDetailsPanel: FC<CollectionDetailsPanelProps> = ({
  collection,
  onDelete,
  isDeleting,
  isCreating,
  onCreate,
  isCreatingCollection
}) => {
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);

  // Effect to update form state based on props
  useEffect(() => {
    if (isCreating) {
      setName('Untitled Collection');
      setDescription('');
      setIsEditingName(true);
    } else if (collection) {
      setName(collection.name || 'Untitled Collection');
      setDescription(collection.description || '');
      setIsEditingName(false);
    } else {
      // Reset when no collection is selected and not creating
      setName('');
      setDescription('');
      setIsEditingName(false);
    }
  }, [collection, isCreating]);

  // Handler for the create button click
  const handleCreateClick = async () => {
    if (onCreate) {
      // Only pass name and description
      await onCreate({ name, description: description || null });
    }
  };

  // Define actions based on mode
  const actions = isCreating ? (
    <div className="flex gap-2">
      <Button
        variant="outline"
        // TODO: Implement proper cancel logic (e.g., call an onCancel prop)
        onClick={() => console.log("Cancel create")}
        disabled={isCreatingCollection}
      >
        Cancel
      </Button>
      <Button
        variant="default"
        onClick={handleCreateClick}
        disabled={isCreatingCollection || !name.trim()} // Disable if name is empty
      >
        {isCreatingCollection ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
        {isCreatingCollection ? 'Creating...' : 'Create Collection'}
      </Button>
    </div>
  ) : collection ? ( // Only show actions if a collection is selected
    <div className="flex gap-2">
      <Button
        variant="default"
        onClick={() => setIsManageModalOpen(true)}
      >
        <Settings2 size={16} className="mr-2" /> {/* Icon inside button */}
        Manage Files
      </Button>
      <Button
        variant="destructive"
        onClick={() => onDelete?.(collection.id)}
        disabled={isDeleting}
      >
        {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
        <Trash2 size={16} className={isDeleting ? "" : "mr-2"} /> {/* Icon inside button */}
        {isDeleting ? 'Deleting...' : 'Delete'}
      </Button>
    </div>
  ) : null; // No actions if no collection selected and not creating

  // Define panel content based on mode
  const panelContent = isCreating ? (
     <div className="space-y-4 p-4">
        {/* Name Input */}
        <div className="flex items-center gap-2">
          {isEditingName ? (
            <input
              type="text" value={name} onChange={(e) => setName(e.target.value)}
              onBlur={() => setIsEditingName(false)} autoFocus
              className="flex-1 bg-transparent text-xl font-semibold text-foreground focus:outline-none border-b border-primary px-0"
              placeholder="Collection Name"
            />
          ) : (
            <h2 className="text-xl font-semibold text-foreground flex-1 cursor-pointer hover:text-primary/80" onClick={() => setIsEditingName(true)} title="Click to edit">
              {name || "Click to set name"}
            </h2>
          )}
          {!isEditingName && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsEditingName(true)} aria-label="Edit collection name">
              <Edit size={14} className="text-muted-foreground" />
            </Button>
          )}
        </div>
        {/* Description Textarea */}
        <div>
          <label htmlFor="collection-description" className="text-sm font-medium text-muted-foreground">Description (Optional)</label>
          <textarea
            id="collection-description" value={description} onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Describe the purpose of this collection..."
          />
        </div>
        {/* Removed Similarity Threshold */}
     </div>
  ) : collection ? (
     <div className="p-4 space-y-2">
        <DetailItem label="Name"><span className="font-medium text-foreground">{collection.name || 'Untitled collection'}</span></DetailItem>
        <DetailItem label="Status"><StatusIndicator status="active" /></DetailItem> {/* TODO: Actual status */}
        <DetailItem label="Description"><span className="text-sm text-muted-foreground">{collection.description || '-'}</span></DetailItem>
        <DetailItem label="Created At"><span className="text-sm text-muted-foreground">{new Date(collection.created_at).toLocaleString()}</span></DetailItem>
        <DetailItem label="Updated At"><span className="text-sm text-muted-foreground">{new Date(collection.updated_at).toLocaleString()}</span></DetailItem>
     </div>
  ) : (
     <div className="p-4 flex items-center justify-center h-full">
        <span className="text-muted-foreground text-sm">Select a collection to see details or create a new one.</span>
     </div>
  );

  return (
    <>
      <DetailsPanel
        title={isCreating ? "Create New Collection" : collection?.name || "Collection Details"}
        actions={actions}
        className="w-[320px] rounded-lg border border-border shadow-sm overflow-hidden flex-shrink-0"
      >
        {panelContent}
      </DetailsPanel>

      {/* Render the Collection Management Modal only if a collection is selected */}
      {collection && (
        <CollectionManagementModal
          collectionId={collection.id}
          collectionName={collection.name}
          isOpen={isManageModalOpen}
          onOpenChange={setIsManageModalOpen}
        />
      )}
    </>
  );
};
