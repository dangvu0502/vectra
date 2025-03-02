import { FC, useState } from 'react';
import { Upload } from 'lucide-react';
import { Sidebar } from '@/components/ui/sidebar';
import { Tab, Tabs } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { FileList } from '@/components/ui/file-list';

interface FileDetails {
  name: string;
  id: string;
  purpose: string;
  size: string;
  createdAt: string;
  status: 'ready' | 'processing' | 'error';
}

export const StoragePage: FC = () => {
  const [activeTab, setActiveTab] = useState<'files' | 'vectorStores'>('files');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  
  const files = [
    {
      name: 'contentlist.json',
      size: '65 KB',
      date: '2/23/2025, 2:22 PM',
      type: 'json'
    },
    {
      name: 'productlist.json',
      size: '71 KB',
      date: '2/23/2025, 2:21 PM',
      type: 'json'
    },
    {
      name: 'Section3.png',
      size: '608 KB',
      date: '2/23/2025, 2:21 PM',
      type: 'png'
    }
  ];
  
  const fileDetails: Record<string, FileDetails> = {
    'contentlist.json': {
      name: 'contentlist.json',
      id: 'file-JEtEWTLsF3GcLj1HRRDBe9',
      purpose: 'assistants',
      size: '65 KB',
      createdAt: 'Feb 23, 2025, 2:22 PM',
      status: 'ready'
    },
    'productlist.json': {
      name: 'productlist.json',
      id: 'file-ABcDEFgHiJkLmNoPqRsTuV',
      purpose: 'assistants',
      size: '71 KB',
      createdAt: 'Feb 23, 2025, 2:21 PM',
      status: 'ready'
    },
    'Section3.png': {
      name: 'Section3.png',
      id: 'file-XyZaBcDeFgHiJkLmNoPqRs',
      purpose: 'user_data',
      size: '608 KB',
      createdAt: 'Feb 23, 2025, 2:21 PM',
      status: 'ready'
    }
  };
  
  const selectedFileDetails = selectedFile ? fileDetails[selectedFile] : null;
  
  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="p-6 space-y-6">
          <h1 className="text-2xl font-semibold text-primary transition-colors duration-200">Storage</h1>
          
          <div className="flex justify-between items-center">
            <Tabs className="-mb-px">
              <Tab 
                label="Files" 
                active={activeTab === 'files'} 
                onClick={() => setActiveTab('files')} 
              />
              <Tab 
                label="Vector stores" 
                active={activeTab === 'vectorStores'} 
                onClick={() => setActiveTab('vectorStores')} 
              />
            </Tabs>
            
            <div className="flex gap-3">
              <Button 
                variant="default" 
                size="sm"
                className="gap-2 shadow-sm hover:shadow-md transition-shadow duration-200"
              >
                <Upload size={16} className="transition-transform duration-200 group-hover:scale-110" />
                Upload
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
          
          <div className="flex gap-6 h-[calc(100vh-200px)]">
            <div className="flex-1 transition-all duration-200 ease-in-out">
              <FileList 
                files={files} 
                selectedFile={selectedFile || ''}
                onFileSelect={(file) => setSelectedFile(file.name)}
                className="bg-card"
              />
            </div>
            
            {selectedFileDetails && (
              <div className="w-[400px] border rounded-md p-6 bg-card shadow-sm hover:shadow-md transition-all duration-200 ease-in-out">
                <h2 className="text-sm font-medium uppercase text-muted-foreground mb-2">FILE</h2>
                <h3 className="text-xl font-semibold mb-6 truncate text-primary transition-colors duration-200">{selectedFileDetails.name}</h3>
                
                <div className="space-y-5">
                  <div className="flex items-center justify-between group">
                    <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-200">Status</span>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full transition-colors duration-200 ${selectedFileDetails.status === 'ready' ? 'bg-green-500' : selectedFileDetails.status === 'processing' ? 'bg-amber-500' : 'bg-red-500'}`}></div>
                      <span className="font-medium transition-colors duration-200">
                        {selectedFileDetails.status === 'ready' ? 'Ready' : 
                         selectedFileDetails.status === 'processing' ? 'Processing' : 'Error'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between group">
                    <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-200">File ID</span>
                    <span className="font-mono text-xs bg-muted px-2 py-1 rounded transition-colors duration-200">{selectedFileDetails.id}</span>
                  </div>
                  
                  <div className="flex items-center justify-between group">
                    <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-200">Purpose</span>
                    <span className="font-medium transition-colors duration-200">{selectedFileDetails.purpose}</span>
                  </div>
                  
                  <div className="flex items-center justify-between group">
                    <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-200">Size</span>
                    <span className="font-medium transition-colors duration-200">{selectedFileDetails.size}</span>
                  </div>
                  
                  <div className="flex items-center justify-between group">
                    <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-200">Created at</span>
                    <span className="font-medium transition-colors duration-200">{selectedFileDetails.createdAt}</span>
                  </div>
                </div>
                
                <div className="mt-8 flex justify-end">
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    className="px-4 shadow-sm hover:shadow-md transition-shadow duration-200"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};