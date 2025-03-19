import { FC, useState } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tab, Tabs } from '@/components/ui/tabs';
import { Tooltip } from '@/components/ui/tooltip';

interface StorageHeaderProps {
  activeTab: 'files' | 'vectorStores';
  onTabChange: (tab: 'files' | 'vectorStores') => void;
  onUpload: (file: File) => Promise<void>;
  isUploading: boolean;
  onCreateVectorStore?: () => Promise<void>;
  isCreatingVectorStore?: boolean;
}

export const StorageHeader: FC<StorageHeaderProps> = ({
  activeTab,
  onTabChange,
  onUpload,
  isUploading,
  onCreateVectorStore,
  isCreatingVectorStore
}) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const handleFileSelect = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt,.pdf,.doc,.docx,.md,.json,.csv,.jpg,.jpeg,.png,.mp3,.mp4,.wav';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const fileType = file.name.split('.').pop()?.toLowerCase();
      const allowedTypes = ['text', 'image', 'video', 'audio', 'document'];
      const typeMap: Record<string, string> = {
        txt: 'text', pdf: 'document', doc: 'document', docx: 'document',
        md: 'text', json: 'text', csv: 'text',
        jpg: 'image', jpeg: 'image', png: 'image',
        mp3: 'audio', wav: 'audio',
        mp4: 'video'
      };

      const mappedType = typeMap[fileType || ''];
      if (!mappedType || !allowedTypes.includes(mappedType)) {
        alert('Unsupported file type. Please upload a supported document type.');
        return;
      }

      onUpload(file);
    };
    input.click();
  };

  return (
    <>
      <h1 className="text-2xl font-semibold text-primary transition-colors duration-200">
        Storage
      </h1>
      
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 sm:gap-6">
        <Tabs className="-mb-px">
          <Tab 
            label="Files" 
            active={activeTab === 'files'} 
            onClick={() => onTabChange('files')} 
          />
          <Tab 
            label="Vector stores" 
            active={activeTab === 'vectorStores'} 
            onClick={() => onTabChange('vectorStores')} 
          />
        </Tabs>
        
        <div className="flex gap-3">
          {activeTab === 'files' ? (
            <>
              <Button 
                variant="default" 
                size="sm"
                className="gap-2 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105 group min-w-[100px]"
                onClick={handleFileSelect}
                disabled={isUploading}
              >
                <Upload size={16} className="transition-transform duration-200 group-hover:scale-110 group-hover:rotate-6" />
                {isUploading ? 'Uploading...' : 'Upload'}
              </Button>
              <Tooltip content="Learn about vector stores and how to organize your files efficiently">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105 hover:bg-accent/20 min-w-[100px]"
                >
                  Learn more
                </Button>
              </Tooltip>
            </>
          ) : (
            <Button
              variant="default"
              size="sm"
              className="gap-2 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105 group min-w-[150px]"
              onClick={onCreateVectorStore}
              disabled={isCreatingVectorStore}
            >
              {isCreatingVectorStore ? 'Creating...' : 'Create Vector Store'}
            </Button>
          )}
        </div>
      </div>
    </>
  );
};