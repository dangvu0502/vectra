import { FC } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tab, Tabs } from '@/components/ui/tabs';

interface StorageHeaderProps {
  activeTab: 'files' | 'vectorStores';
  onTabChange: (tab: 'files' | 'vectorStores') => void;
  onUpload: (file: File) => Promise<void>;
  isUploading: boolean;
}

export const StorageHeader: FC<StorageHeaderProps> = ({
  activeTab,
  onTabChange,
  onUpload,
  isUploading
}) => {
  const handleFileSelect = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) onUpload(file);
    };
    input.click();
  };

  return (
    <>
      <h1 className="text-2xl font-semibold text-primary transition-colors duration-200">
        Storage
      </h1>
      
      <div className="flex justify-between items-center">
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
          <Button 
            variant="default" 
            size="sm"
            className="gap-2 shadow-sm hover:shadow-md transition-shadow duration-200"
            onClick={handleFileSelect}
            disabled={isUploading}
          >
            <Upload size={16} className="transition-transform duration-200 group-hover:scale-110" />
            {isUploading ? 'Uploading...' : 'Upload'}
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            className="shadow-sm hover:shadow-md transition-shadow duration-200"
          >
            Learn more
          </Button>
        </div>
      </div>
    </>
  );
};