import { FC, useState } from 'react';
import { AppLayout } from '@/components/ui/app-layout';
import { FileList } from '@/components/ui/file-list';
import { useDocumentsQuery, useDocumentMutations } from '@/hooks/use-documents-query';
import { StorageHeader } from '@/components/storage/storage-header';
import { FileDetailsPanel } from '@/components/storage/file-details-panel';
import { VectorStoreList } from '@/components/storage/vector-store-list';
import { VectorStoreDetailsPanel } from '@/components/storage/vector-store-details-panel';

export const StoragePage: FC = () => {
  const [activeTab, setActiveTab] = useState<'files' | 'vectorStores'>('files');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedVectorStore, setSelectedVectorStore] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  
  const { data, isLoading } = useDocumentsQuery({
    query: searchQuery || undefined,
    page,
    limit
  });

  const { uploadMutation, deleteMutation } = useDocumentMutations();

  const documents = data?.documents || [];
  const pagination = data?.pagination || { page: 1, limit: 10, total: 0 };

  const files = documents.map(doc => ({
    name: doc.filename,
    size: doc.size ? `${Math.round(doc.size / 1024)} KB` : '65 KB',
    date: new Date(doc.createdAt).toLocaleString(),
    type: doc.filename.split('.').pop() || ''
  }));

  const fileDetails = Object.fromEntries(
    documents.map(doc => [
      doc.filename,
      {
        name: doc.filename,
        id: doc.id,
        size: '65 KB',
        createdAt: new Date(doc.createdAt).toLocaleString(),
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

  return (
    <AppLayout>
      <div className="space-y-6">
        <StorageHeader
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onUpload={handleUpload}
          isUploading={uploadMutation.isPending}
        />
        
        <div className="flex gap-6 h-[calc(100vh-200px)]">
          <div className="flex-1 transition-all duration-200 ease-in-out">
            {activeTab === 'files' ? (
              isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <span>Loading...</span>
                </div>
              ) : files.length === 0 ? (
                <div className="text-center text-muted-foreground p-6">
                  No files found
                </div>
              ) : (
                <FileList 
                  files={files} 
                  selectedFile={selectedFile || ''}
                  onFileSelect={(file) => setSelectedFile(file.name)}
                  className="bg-card"
                />
              )
            ) : (
              <VectorStoreList
                vectorStores={[
                  {
                    id: 'vs-1',
                    metadata: {
                      type: 'text',
                      language: 'en',
                      tokens: 1250,
                      similarity_threshold: 0.85
                    },
                    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
                  },
                  {
                    id: 'vs-2',
                    metadata: {
                      type: 'code',
                      language: 'python',
                      tokens: 850,
                      similarity_threshold: 0.9
                    },
                    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
                  },
                  {
                    id: 'vs-3',
                    metadata: {
                      type: 'pdf',
                      pages: 15,
                      tokens: 3200,
                      similarity_threshold: 0.8
                    },
                    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
                  }
                ]}
                selectedVectorStore={selectedVectorStore}
                onVectorStoreSelect={(vectorStore) => setSelectedVectorStore(vectorStore.id)}
                className="bg-card"
              />
            )}
          </div>
          
          {activeTab === 'files' ? (
            selectedFileDetails && (
              <FileDetailsPanel
                file={selectedFileDetails}
                onDelete={handleDelete}
                isDeleting={deleteMutation.isPending}
              />
            )
          ) : (
            selectedVectorStore && (
              <VectorStoreDetailsPanel
                vectorStore={{
                  id: selectedVectorStore,
                  metadata: {},
                  createdAt: new Date().toISOString()
                }}
                onDelete={async () => {}}
                isDeleting={false}
              />
            )
          )}
        </div>
      </div>
    </AppLayout>
  );
};