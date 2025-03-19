import { FC } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, Image, Video, Music, FileQuestion } from 'lucide-react';

const getFileIcon = (type: string) => {
  switch (type.toLowerCase()) {
    case 'txt':
    case 'md':
    case 'json':
    case 'csv':
      return FileText;
    case 'jpg':
    case 'jpeg':
    case 'png':
      return Image;
    case 'mp4':
      return Video;
    case 'mp3':
    case 'wav':
      return Music;
    default:
      return FileQuestion;
  }
};

interface FileItem {
  name: string;
  size: string;
  type: string;
  date: string;
  id: string;
  isLinked?: boolean;
}

interface FileManagementModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  activeTab: 'available' | 'linked';
  onTabChange: (tab: 'available' | 'linked') => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  files: FileItem[];
  selectedFiles: string[];
  onFileSelect: (file: FileItem) => void;
  onConfirm: () => Promise<void>;
  isConfirming: boolean;
  confirmButtonText: string;
  showRemoveButton?: boolean;
  onRemove?: () => Promise<void>;
}

export const FileManagementModal: FC<FileManagementModalProps> = ({
  isOpen,
  onOpenChange,
  title,
  activeTab,
  onTabChange,
  searchQuery,
  onSearchChange,
  files,
  selectedFiles,
  onFileSelect,
  onConfirm,
  isConfirming,
  confirmButtonText,
  showRemoveButton,
  onRemove
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex gap-4">
              <Button
                variant={activeTab === 'available' ? 'default' : 'outline'}
                onClick={() => onTabChange('available')}
              >
                Available Files
              </Button>
              <Button
                variant={activeTab === 'linked' ? 'default' : 'outline'}
                onClick={() => onTabChange('linked')}
              >
                Linked Files
              </Button>
            </div>
            <input
              type="text"
              placeholder="Search files..."
              className="flex h-9 w-[200px] rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
          <div className="h-[400px] overflow-hidden bg-background rounded-md border">
            <div className="h-full overflow-y-auto p-1">
              {files.length > 0 ? (
                <div className="space-y-1">
                  {files.map(file => {
                    const Icon = getFileIcon(file.type);
                    const isSelected = selectedFiles.includes(file.id);
                    
                    return (
                      <div
                        key={file.id}
                        className={`flex items-center justify-between p-2 rounded-md cursor-pointer hover:bg-accent/50 ${isSelected ? 'bg-accent' : ''}`}
                        onClick={() => onFileSelect(file)}
                      >
                        <div className="flex items-center gap-3">
                          <Icon size={18} className="text-muted-foreground" />
                          <div>
                            <p className="font-medium">{file.name}</p>
                            <p className="text-xs text-muted-foreground">{file.size} • {file.date}</p>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground uppercase">{file.type}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  <div className="text-center space-y-2">
                    <p className="text-muted-foreground text-sm">
                      {searchQuery ? 'No files match your search' : 'No files available'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            {activeTab === 'available' ? (
              <Button
                onClick={onConfirm}
                disabled={selectedFiles.length === 0 || isConfirming}
              >
                {isConfirming ? 'Managing...' : `${confirmButtonText} (${selectedFiles.length})`}
              </Button>
            ) : showRemoveButton && onRemove && (
              <Button
                variant="destructive"
                onClick={onRemove}
                disabled={selectedFiles.length === 0}
              >
                Remove Selected Files ({selectedFiles.length})
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};