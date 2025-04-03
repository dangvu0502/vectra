import { FC, useState } from 'react';
import { AppLayout } from '@/components/ui/app-layout';
import { FileList } from '@/components/storage/file-list';
import { StorageHeader } from '@/components/storage/storage-header';
import { FileDetailsPanel } from '@/components/storage/file-details-panel';
import { VectorStoreList } from '@/components/storage/vector-store-list';
import { VectorStoreDetailsPanel } from '@/components/storage/vector-store-details-panel';
import { useFileMutations, useFilesQuery } from '@/hooks/use-files-query';

export const StoragePage: FC = () => {
  const [activeTab, setActiveTab] = useState<'files' | 'vectorStores'>('files');
  const [selectedFile, setSelectedFile] = useState<string | null | undefined>(null);
  const [selectedVectorStore, setSelectedVectorStore] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [isCreatingVectorStore, setIsCreatingVectorStore] = useState(false);
  const [isCreatingMode, setIsCreatingMode] = useState(false);

  const [vectorStores, setVectorStores] = useState<Array<{
    id: string;
    name: string;
    metadata: Record<string, any>;
    createdAt: string;
    size?: string;
    fileCount?: number;
    lastUpdated?: string;
    usage?: string;
  }>>([{
    id: '1',
    name: 'Default Store',
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
        vectorStores: [] // This will be populated with actual vector store data
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

  const handleCreateVectorStore = async (data: {
    name: string;
    description: string;
    similarityThreshold: number;
  }) => {
    try {
      setIsCreatingVectorStore(true);
      // TODO: Implement vector store creation API call
      console.log('Creating vector store:', data);
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      setIsCreatingMode(false);
    } catch (error) {
      console.error('Failed to create vector store:', error);
    } finally {
      setIsCreatingVectorStore(false);
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
          onCreateVectorStore={async () => {
            setIsCreatingMode(true);
            setSelectedVectorStore(null);
            return Promise.resolve();
          }}
          isCreatingVectorStore={isCreatingVectorStore}
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
              <VectorStoreList
                vectorStores={vectorStores}
                selectedVectorStore={selectedVectorStore}
                onVectorStoreSelect={(vectorStore) => setSelectedVectorStore(vectorStore.id)}
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
            <VectorStoreDetailsPanel
              vectorStore={selectedVectorStore ? {
                id: selectedVectorStore,
                metadata: {},
                createdAt: new Date().toISOString()
              } : undefined}
              onDelete={async () => {}}
              isDeleting={false}
              isCreating={isCreatingMode}
              onCreate={handleCreateVectorStore}
              isCreatingStore={isCreatingVectorStore}
            />
          )}
        </div>
      </div>
    </AppLayout>
  );
};
