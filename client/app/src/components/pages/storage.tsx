import { FC, useState } from 'react';
import { AppLayout } from '@/components/ui/app-layout';
import { FileList } from '@/components/storage/file-list';
import { StorageHeader } from '@/components/storage/storage-header';
import { FileDetailsPanel } from '@/components/storage/file-details-panel';
import { CollectionList } from '@/components/storage/collection-list'; // Renamed import
import { CollectionDetailsPanel } from '@/components/storage/collection-details-panel'; // Renamed import
import { useFileMutations, useFilesQuery } from '@/hooks/use-files-query';

export const StoragePage: FC = () => {
  const [activeTab, setActiveTab] = useState<'files' | 'collections'>('files'); // Renamed tab state value
  const [selectedFile, setSelectedFile] = useState<string | null | undefined>(null);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null); // Renamed state variable
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [isCreatingCollection, setIsCreatingCollection] = useState(false); // Renamed state variable
  const [isCreatingMode, setIsCreatingMode] = useState(false);

  // TODO: Replace mock data with actual collection data fetching (e.g., useCollectionsQuery)
  const [collections, setCollections] = useState<Array<{ // Renamed state variable
    id: string;
    name: string;
    metadata: Record<string, any>;
    createdAt: string;
    size?: string;
    fileCount?: number;
    lastUpdated?: string;
    usage?: string;
  }>>([{ // Renamed state variable
    id: '1',
    name: 'Default Collection', // Updated mock data name
    metadata: {},
    createdAt: new Date().toISOString(),
    size: '128 KB',
    fileCount: 3,
    lastUpdated: new Date().toISOString(),
    usage: '256 KB'
  }]);

  const { data, isLoading } = useFilesQuery({
    query: searchQuery || undefined,
    page,
    limit
  });

  const { uploadMutation, deleteMutation } = useFileMutations();

  const _files = data?.files || [];
  const pagination = data?.pagination || { page: 1, limit: 10, total: 0 };

  const files = _files.map(doc => ({
    name: doc.filename,
    size: doc.size ? `${Math.round(doc.size / 1024)} KB` : '65 KB',
    date: new Date(doc.createdAt).toLocaleString(),
    type: doc.filename.split('.').pop() || '',
    id: doc.id,
  }));

 const fileDetails = Object.fromEntries(
    files.map(doc => [
      doc.id, // Use doc.id as the key
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

  // TODO: Implement actual collection creation logic using API
  const handleCreateCollection = async (data: { // Renamed function
    name: string;
    description: string;
    similarityThreshold: number;
  }) => {
    try {
      setIsCreatingCollection(true); // Use renamed state setter
      // TODO: Implement collection creation API call
      console.log('Creating collection:', data); // Updated log message
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      setIsCreatingMode(false);
    } catch (error) {
      console.error('Failed to create collection:', error); // Updated error message
    } finally {
      setIsCreatingCollection(false); // Use renamed state setter
    }
  };

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
          isCreatingCollection={isCreatingCollection} // Renamed prop
        />
        
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          <div className="flex-1 transition-all duration-200 ease-in-out border rounded-lg shadow-sm bg-card overflow-hidden">
            {activeTab === 'files' ? (
              isLoading ? (
                <div className="flex items-center justify-center h-full min-h-[300px]">
                  <span className="text-muted-foreground">Loading...</span>
                </div>
              ) : files.length === 0 ? (
                <div className="flex items-center justify-center h-full min-h-[300px]">
                  <span className="text-muted-foreground">No files found</span>
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
              <CollectionList // Use renamed component
                collections={collections} // Use renamed prop and state variable
                selectedCollection={selectedCollection} // Use renamed prop and state variable
                onCollectionSelect={(collection) => setSelectedCollection(collection.id)} // Use renamed prop and state setter
                className="min-h-[300px]"
              />
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
            <CollectionDetailsPanel // Use renamed component
              collection={selectedCollection ? { // Use renamed prop and state variable
                id: selectedCollection, // Use renamed state variable
                metadata: {},
                createdAt: new Date().toISOString()
              } : undefined}
              onDelete={async () => {}} // TODO: Implement collection deletion
              isDeleting={false} // TODO: Add state for deletion status
              isCreating={isCreatingMode}
              onCreate={handleCreateCollection} // Use renamed handler
              isCreatingCollection={isCreatingCollection} // Use renamed prop and state variable
            />
          )}
        </div>
      </div>
    </AppLayout>
  );
};
