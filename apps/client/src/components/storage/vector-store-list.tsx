import { FC } from "react";
import { Database } from "lucide-react";
import { Table } from "@/components/ui/table";

interface VectorStore {
  id: string;
  name?: string;
  metadata: Record<string, any>;
  createdAt: string;
  size?: string;
  fileCount?: number;
  lastUpdated?: string;
  usage?: string;
}

interface VectorStoreListProps {
  vectorStores: VectorStore[];
  selectedVectorStore: string | null;
  onVectorStoreSelect: (vectorStore: VectorStore) => void;
  className?: string;
}

export const VectorStoreList: FC<VectorStoreListProps> = ({
  vectorStores,
  selectedVectorStore,
  onVectorStoreSelect,
  className,
}) => {
  const columns = [
    {
      header: "Name",
      key: "name" as const,
      render: (store: VectorStore) => (
        <div className="flex items-center gap-2">
          <Database size={16} className="text-muted-foreground" />
          <span className="font-medium">
            {store.name || "Untitled vector store"}
          </span>
        </div>
      ),
    },
    {
      header: "Size",
      key: "size" as const,
      render: (store: VectorStore) => store.size || "0 KB",
    },
    {
      header: "Files",
      key: "fileCount" as const,
      render: (store: VectorStore) => `${store.fileCount || 0} files`,
    },
    {
      header: "Last Active",
      key: "lastUpdated" as const,
      render: (store: VectorStore) =>
        store.lastUpdated
          ? new Date(store.lastUpdated).toLocaleString()
          : "Never",
    },
    {
      header: "Usage",
      key: "usage" as const,
      render: (store: VectorStore) => `${store.usage || "0 KB"} / month`,
    },
  ];

  return (
    <Table
      columns={columns}
      data={vectorStores}
      onRowClick={onVectorStoreSelect}
      isRowSelected={(store) => selectedVectorStore === store.id}
      className={className}
      emptyMessage="No vector stores found"
    />
  );
};
