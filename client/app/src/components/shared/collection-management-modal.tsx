import { FC, useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, Image, Video, Music, FileQuestion, Loader2 } from 'lucide-react';
import { useCollectionFiles } from '@/hooks/use-collection-files';
import { useFilesQuery } from '@/hooks/use-files-query';
import type { VectraFile } from '@/api/types/file';

// Helper to get file icon based on type
const getFileIcon = (type: string) => {
  switch (type.toLowerCase()) {
    case 'txt': case 'md': case 'json': case 'csv': return FileText;
    case 'jpg': case 'jpeg': case 'png': return Image;
    case 'mp4': return Video;
    case 'mp3': case 'wav': return Music;
    default: return FileQuestion;
  }
};

// Interface for the items displayed in the list
interface DisplayFileItem {
  id: string;
  name: string;
  size: string;
  type: string;
  date: string;
}

// Props for the modal component
interface CollectionManagementModalProps {
  collectionId: string | null | undefined; // ID of the collection being managed
  collectionName?: string; // Optional: Pass name for the title
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CollectionManagementModal: FC<CollectionManagementModalProps> = ({
  collectionId,
  collectionName,
  isOpen,
  onOpenChange,
}) => {
  const [activeTab, setActiveTab] = useState<'available' | 'linked'>('available');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);

  // --- Data Fetching ---
  const {
    linkedFiles,
    isLoadingCollectionFiles,
    addFileToCollection,
    isAddingFile,
    removeFileFromCollection,
    isRemovingFile,
  } = useCollectionFiles(collectionId);

  // Fetch all user files (consider pagination/search for large numbers)
  const { data: allFilesData, isLoading: isLoadingAllFiles } = useFilesQuery({ limit: 1000 });
  const allFiles = allFilesData?.files ?? [];

  // --- File List Computation ---
  const linkedFileIds = useMemo(() => new Set(linkedFiles.map(f => f.id)), [linkedFiles]);

  const availableFiles = useMemo(() => {
    return allFiles.filter(file => !linkedFileIds.has(file.id));
  }, [allFiles, linkedFileIds]);

  const filesToDisplaySource = useMemo(() => {
    return activeTab === 'linked' ? linkedFiles : availableFiles;
  }, [activeTab, linkedFiles, availableFiles]);

  const filteredFiles = useMemo(() => {
    if (!searchQuery) {
      return filesToDisplaySource;
    }
    return filesToDisplaySource.filter(file =>
      file.filename.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [filesToDisplaySource, searchQuery]);

  // Map VectraFile to DisplayFileItem for UI rendering
  const displayItems: DisplayFileItem[] = useMemo(() => filteredFiles.map(f => ({
    id: f.id,
    name: f.filename,
    // Access metadata safely - it might not exist on VectraFile depending on API response consistency
    size: (f as any).metadata?.originalSize ? `${Math.round((f as any).metadata.originalSize / 1024)} KB` : 'N/A',
    date: new Date(f.createdAt).toLocaleString(), // Use createdAt from VectraFile
    type: f.filename.split('.').pop()?.toLowerCase() || '',
  })), [filteredFiles]);

  // --- Handlers ---
  const handleFileSelect = (file: DisplayFileItem) => {
    setSelectedFileIds(prev =>
      prev.includes(file.id) ? prev.filter(id => id !== file.id) : [...prev, file.id]
    );
  };

  const handleConfirmAdd = async () => {
    if (!collectionId || selectedFileIds.length === 0 || isAddingFile) return;
    try {
      await Promise.all(selectedFileIds.map(fileId => addFileToCollection({ fileId })));
      setSelectedFileIds([]);
      // Optionally close modal or show success message
    } catch (error) {
      console.error("Failed to add files to collection:", error);
      // TODO: Show error message to user (e.g., using a toast library)
    }
  };

  const handleConfirmRemove = async () => {
     if (!collectionId || selectedFileIds.length === 0 || isRemovingFile) return;
    try {
      await Promise.all(selectedFileIds.map(fileId => removeFileFromCollection({ fileId })));
      setSelectedFileIds([]);
      // Optionally close modal or show success message
    } catch (error) {
      console.error("Failed to remove files from collection:", error);
      // TODO: Show error message to user
    }
  };

  // Clear selection when tab changes or modal closes/opens
  useEffect(() => {
    setSelectedFileIds([]);
    if (isOpen) {
        setActiveTab('available'); // Reset to available tab on open
        setSearchQuery(''); // Clear search on open
    }
  }, [activeTab, isOpen]); // Rerun effect if activeTab or isOpen changes

  const isLoading = isLoadingCollectionFiles || isLoadingAllFiles;
  const currentOperationLoading = isAddingFile || isRemovingFile;
  const modalTitle = collectionName
    ? `Manage Files for "${collectionName}"`
    : 'Manage Collection Files';

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>{modalTitle}</DialogTitle>
        </DialogHeader>
        <div className="mt-4 space-y-4">
          {/* Tabs and Search */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex gap-4">
              <Button
                variant={activeTab === 'available' ? 'default' : 'outline'}
                onClick={() => setActiveTab('available')}
                size="sm"
              >
                Available Files ({availableFiles.length})
              </Button>
              <Button
                variant={activeTab === 'linked' ? 'default' : 'outline'}
                onClick={() => setActiveTab('linked')}
                size="sm"
              >
                Linked Files ({linkedFiles.length})
              </Button>
            </div>
            <input
              type="text"
              placeholder="Search files..."
              className="flex h-9 w-[200px] rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* File List Area */}
          <div className="h-[400px] overflow-hidden bg-background rounded-md border relative">
            {isLoading && (
              <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}
            <div className="h-full overflow-y-auto p-1">
              {!isLoading && displayItems.length > 0 ? (
                <div className="space-y-1">
                  {displayItems.map(file => {
                    const Icon = getFileIcon(file.type);
                    const isSelected = selectedFileIds.includes(file.id);
                    return (
                      <div
                        key={file.id}
                        className={`flex items-center justify-between p-2 rounded-md cursor-pointer hover:bg-accent/50 ${isSelected ? 'bg-accent' : ''}`}
                        onClick={() => handleFileSelect(file)}
                      >
                        <div className="flex items-center gap-3 truncate">
                          <Icon size={18} className="text-muted-foreground flex-shrink-0" />
                          <div className="truncate">
                            <p className="font-medium truncate" title={file.name}>{file.name}</p>
                            <p className="text-xs text-muted-foreground">{file.size} • {file.date}</p>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground uppercase flex-shrink-0 ml-2">{file.type}</span>
                      </div>
                    );
                  })}
                </div>
              ) : !isLoading ? (
                <div className="h-full w-full flex items-center justify-center">
                  <div className="text-center space-y-2">
                    <p className="text-muted-foreground text-sm">
                      {searchQuery
                        ? 'No files match your search'
                        : activeTab === 'linked'
                        ? 'No files linked to this collection'
                        : 'No available files to link'}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={currentOperationLoading}
            >
              Cancel
            </Button>
            {activeTab === 'available' ? (
              <Button
                onClick={handleConfirmAdd}
                disabled={selectedFileIds.length === 0 || currentOperationLoading}
              >
                {isAddingFile ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isAddingFile ? 'Adding...' : `Add Selected (${selectedFileIds.length})`}
              </Button>
            ) : ( // Linked tab
              <Button
                variant="destructive"
                onClick={handleConfirmRemove}
                disabled={selectedFileIds.length === 0 || currentOperationLoading}
              >
                 {isRemovingFile ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isRemovingFile ? 'Removing...' : `Remove Selected (${selectedFileIds.length})`}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
