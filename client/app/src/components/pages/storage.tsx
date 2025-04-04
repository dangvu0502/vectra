import { FC, useState } from 'react';
import { AppLayout } from '@/components/ui/app-layout';
import { FileList } from '@/components/features/storage/file-list';
import { StorageHeader } from '@/components/features/storage/storage-header';
import { FileDetailsPanel } from '@/components/features/storage/file-details-panel';
import { CollectionList } from '@/components/features/storage/collection-list';
import { CollectionDetailsPanel } from '@/components/features/storage/collection-details-panel';
import { useFileMutations, useFilesQuery } from '@/hooks/use-files-query';
import { useCollectionsQuery } from '@/hooks/use-collections-query'; // Import the collections hook
import type { Collection } from '@/api/types'; // Import Collection type if not already imported elsewhere

export const StoragePage: FC = () => {
  const [activeTab, setActiveTab] = useState<'files' | 'collections'>('files'); // Renamed tab state value
  const [selectedFile, setSelectedFile] = useState<string | null | undefined>(null);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null); // Renamed state variable
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  // Remove local state for isCreatingCollection, will use hook's state
  const [isCreatingMode, setIsCreatingMode] = useState(false);

  // Use the collections query hook
  const {
    collections: fetchedCollectionsData,
    isLoadingCollections,
    createCollection,
    isCreatingCollection, // Use loading state from hook
    deleteCollection,
    isDeletingCollection, // Use loading state from hook
  } = useCollectionsQuery();

  // Map fetched data to the format expected by components (if necessary)
  // Map fetched data to ensure it matches the Collection type structure
  const collections: Collection[] = fetchedCollectionsData?.map((c: Collection) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    user_id: c.user_id, // Include user_id
    created_at: c.created_at, // Use the string date directly as expected by Collection type
    updated_at: c.updated_at, // Include updated_at
    // Remove fields not present in the Collection type:
    // size, fileCount, lastUpdated, usage, metadata
  })) || [];


  // Call useFilesQuery only once
  const { data: filesData, isLoading: isLoadingFiles } = useFilesQuery({
    query: searchQuery || undefined,
    page,
    limit
  });

  const { uploadMutation, deleteMutation } = useFileMutations();

  // Use filesData instead of data
  const _files = filesData?.files || [];
  const pagination = filesData?.pagination || { page: 1, limit: 10, total: 0 };

  // TODO: Add type annotation for 'doc' based on the structure within filesData.files
  const files = _files.map((doc: any) => ({ // Temporary 'any', replace with actual type
    name: doc.filename,
    size: doc.size ? `${Math.round(doc.size / 1024)} KB` : '65 KB',
    date: new Date(doc.createdAt).toLocaleString(),
    type: doc.filename.split('.').pop() || '',
    id: doc.id,
  }));

 // TODO: Add type annotation for 'doc' based on the structure within filesData.files
 const fileDetails = Object.fromEntries(
    files.map((doc: any) => [ // Temporary 'any', replace with actual type
      doc.id,
      {
        name: doc.name,
        id: doc.id,
        size: doc.size ? `${Math.round(parseFloat(doc.size) / 1024)} KB` : '65 KB', // Use dynamic size
        createdAt: new Date(doc.date).toLocaleString(),
        status: 'ready' as 'ready' | 'processing' | 'error',
        collections: [] // Renamed property, This will be populated with actual collection data
      }
    ]) || []
  );

  const handleUpload = async (file: File) => {
    try {
      await uploadMutation.mutateAsync(file);
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      setSelectedFile(null);
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const selectedFileDetails = selectedFile ? fileDetails[selectedFile] : null;

  // Use the createCollection mutation from the hook
  const handleCreateCollection = async (data: {
    name: string;
    description?: string; // Make description optional to match API type
    // similarityThreshold is not part of CreateCollectionInput, remove if not needed by API
  }) => {
    try {
      // Call the mutation function from the hook
      await createCollection({
        name: data.name,
        description: data.description || undefined, // Pass description or undefined
      });
      // No need to manually set loading state, hook handles it
      setIsCreatingMode(false); // Close the creation form on success
    } catch (error) {
      console.error('Failed to create collection:', error);
      // Error handling can be enhanced here or in the hook's onError callback
    }
    // No finally block needed to set loading state
  };

  // Use the deleteCollection mutation from the hook
  const handleDeleteCollection = async (collectionId: string) => {
    try {
      await deleteCollection(collectionId);
      setSelectedCollection(null); // Deselect after deletion
    } catch (error) {
      console.error('Failed to delete collection:', error);
      // Handle error appropriately
    }
  };

  // Find the details of the selected collection from the correctly typed collections array
  const selectedCollectionDetails = selectedCollection
    ? collections.find(c => c.id === selectedCollection)
    : undefined;

  return (
    <AppLayout>
      <div className="space-y-6 p-4 md:p-6 max-w-[1600px] mx-auto">
        <StorageHeader
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab);
            if (tab === 'files') {
              setIsCreatingMode(false);
            }
          }}
          onUpload={handleUpload}
          isUploading={uploadMutation.isPending}
          onCreateCollection={async () => { // Renamed prop
            setIsCreatingMode(true);
            setSelectedCollection(null); // Use renamed state setter
            return Promise.resolve();
          }}
          isCreatingCollection={isCreatingCollection} // Pass loading state from hook
        />

        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          <div className="flex-1 transition-all duration-200 ease-in-out border rounded-lg shadow-sm bg-card overflow-hidden">
            {activeTab === 'files' ? (
              isLoadingFiles ? ( // Use file loading state
                <div className="flex items-center justify-center h-full min-h-[300px]">
                  <span className="text-muted-foreground">Loading Files...</span>
                </div>
              ) : files.length === 0 ? (
                <div className="flex items-center justify-center h-full min-h-[300px]">
                  <span className="text-muted-foreground">No files found. Upload some!</span>
                </div>
              ) : (
                <FileList 
                  files={files}
                  selectedFile={selectedFile || ''}
                  onFileSelect={(file) => setSelectedFile(file.id)}
                  className="min-h-[300px]"
                />
              )
            ) : (
              // Use CollectionList with data from the hook
              isLoadingCollections ? (
                 <div className="flex items-center justify-center h-full min-h-[300px]">
                  <span className="text-muted-foreground">Loading Collections...</span>
                </div>
              ) : collections.length === 0 ? (
                 <div className="flex items-center justify-center h-full min-h-[300px]">
                  <span className="text-muted-foreground">No collections found. Create one!</span>
                </div>
              ) : (
                <CollectionList
                  collections={collections} // Pass fetched collections
                  selectedCollection={selectedCollection}
                  onCollectionSelect={(collection) => setSelectedCollection(collection.id)}
                  className="min-h-[300px]"
                />
              )
            )}
          </div>

          {activeTab === 'files' ? (
            selectedFile ? (
              <FileDetailsPanel
                file={fileDetails[selectedFile] || null}
                onDelete={handleDelete}
                isDeleting={deleteMutation.isPending}
              />
            ) : null
          ) : (
            // Use CollectionDetailsPanel with data based on selection
            <CollectionDetailsPanel
              collection={selectedCollectionDetails} // Pass the found details or undefined
              onDelete={handleDeleteCollection} // Pass the delete handler
              isDeleting={isDeletingCollection} // Pass deletion loading state
              isCreating={isCreatingMode}
              onCreate={handleCreateCollection}
              isCreatingCollection={isCreatingCollection} // Pass creation loading state
            />
          )}
        </div>
      </div>
    </AppLayout>
  );
};
