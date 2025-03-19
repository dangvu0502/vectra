import { FC, useState } from "react";
import { Database, MessageSquare } from "lucide-react";
import { Table } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChatWindow } from "@/components/chat/chat-window";
import { Tooltip } from "@/components/ui/tooltip";

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
  const [chatVectorStore, setChatVectorStore] = useState<VectorStore | null>(null);

  const handleChatClick = (e: React.MouseEvent, vectorStore: VectorStore) => {
    e.stopPropagation();
    setChatVectorStore(vectorStore);
  };

  const handleChatClose = () => {
    setChatVectorStore(null);
  };

  const columns = [
    {
      header: "Name",
      key: "name" as const,
      className: "w-[30%]",
      render: (store: VectorStore) => (
        <div className="flex items-center gap-2 whitespace-nowrap">
          <Database size={16} className="text-muted-foreground flex-shrink-0" />
          <span className="font-medium truncate">
            {store.name || "Untitled vector store"}
          </span>
        </div>
      ),
    },
    {
      header: "Size",
      key: "size" as const,
      className: "w-[15%]",
      render: (store: VectorStore) => (
        <span className="whitespace-nowrap">{store.size || "0 KB"}</span>
      ),
    },
    {
      header: "Files",
      key: "fileCount" as const,
      className: "w-[15%]",
      render: (store: VectorStore) => (
        <span className="whitespace-nowrap">{`${store.fileCount || 0} files`}</span>
      ),
    },
    {
      header: "Last Active",
      key: "lastUpdated" as const,
      className: "w-[20%]",
      render: (store: VectorStore) => (
        <span className="whitespace-nowrap">
          {store.lastUpdated
            ? new Date(store.lastUpdated).toLocaleString()
            : "Never"}
        </span>
      ),
    },
    {
      header: "Usage",
      key: "usage" as const,
      className: "w-[15%]",
      render: (store: VectorStore) => (
        <span className="whitespace-nowrap">{`${store.usage || "0 KB"} / month`}</span>
      ),
    },
    {
      header: "Actions",
      key: "id" as const,
      className: "w-[5%] text-right",
      render: (store: VectorStore) => (
        <div className="flex justify-end">
          <Tooltip content="Chat with this vector store">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-primary flex-shrink-0"
              onClick={(e) => handleChatClick(e, store)}
            >
              <MessageSquare size={16} />
            </Button>
          </Tooltip>
        </div>
      ),
    },
  ];

  return (
    <>
      <Table
        columns={columns}
        data={vectorStores}
        onRowClick={onVectorStoreSelect}
        isRowSelected={(store) => selectedVectorStore === store.id}
        className={className}
        emptyMessage="No vector stores found"
      />

      {chatVectorStore && (
        <ChatWindow
          onClose={handleChatClose}
          knowledgeSource={{
            type: "vectorStore",
            id: chatVectorStore.id,
            name: chatVectorStore.name || "Untitled vector store",
          }}
        />
      )}
    </>
  );
};
