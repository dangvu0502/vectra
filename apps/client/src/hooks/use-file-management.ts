import { useState } from 'react';

export interface FileItem {
  name: string;
  size: string;
  type: string;
  date: string;
  id: string;
  isLinked?: boolean;
}

export function useFileManagement() {
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'available' | 'linked'>('available');
  const [searchQuery, setSearchQuery] = useState('');
  const [availableFiles, setAvailableFiles] = useState<FileItem[]>([]);
  const [linkedFiles, setLinkedFiles] = useState<FileItem[]>([]);

  const filteredFiles = (activeTab === 'available' ? availableFiles : linkedFiles)
    .filter(file => file.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleFileSelect = (file: FileItem) => {
    setSelectedFiles(prev => {
      const isSelected = prev.includes(file.id);
      return isSelected
        ? prev.filter(id => id !== file.id)
        : [...prev, file.id];
    });
  };

  const clearSelectedFiles = () => {
    setSelectedFiles([]);
  };

  return {
    selectedFiles,
    activeTab,
    searchQuery,
    availableFiles,
    linkedFiles,
    filteredFiles,
    setActiveTab,
    setSearchQuery,
    setAvailableFiles,
    setLinkedFiles,
    handleFileSelect,
    clearSelectedFiles
  };
}