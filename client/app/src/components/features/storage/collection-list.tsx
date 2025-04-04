import { FC, useState } from "react";
import { Database, MessageSquare } from "lucide-react";
import { Table } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChatWindow } from "@/components/shared/chat-window";
import { Tooltip } from "@/components/ui/tooltip";

// Renamed interface
interface Collection {
  id: string;
  name?: string;
  metadata: Record<string, any>;
  createdAt: string;
  size?: string;
  fileCount?: number;
  lastUpdated?: string;
  usage?: string;
}

// Renamed interface and props
interface CollectionListProps {
  collections: Collection[];
  selectedCollection: string | null;
  onCollectionSelect: (collection: Collection) => void;
  className?: string;
}

// Renamed component and props
export const CollectionList: FC<CollectionListProps> = ({
  collections,
  selectedCollection,
  onCollectionSelect,
  className,
}) => {
  // Renamed state variable and type
  const [chatCollection, setChatCollection] = useState<Collection | null>(null);

  // Renamed parameter type
  const handleChatClick = (e: React.MouseEvent, collection: Collection) => {
    e.stopPropagation();
    setChatCollection(collection); // Use renamed state setter
  };

  const handleChatClose = () => {
    setChatCollection(null); // Use renamed state setter
  };

  const columns = [
    {
      header: "Name",
      key: "name" as const,
      className: "w-[30%]",
      // Renamed parameter type
      render: (collection: Collection) => (
        <div className="flex items-center gap-2 whitespace-nowrap">
          <Database size={16} className="text-muted-foreground flex-shrink-0" />
          <span className="font-medium truncate">
            {collection.name || "Untitled collection"} {/* Updated text */}
          </span>
        </div>
      ),
    },
    {
      header: "Size",
      key: "size" as const,
      className: "w-[15%]",
      // Renamed parameter type
      render: (collection: Collection) => (
        <span className="whitespace-nowrap">{collection.size || "0 KB"}</span>
      ),
    },
    {
      header: "Files",
      key: "fileCount" as const,
      className: "w-[15%]",
      // Renamed parameter type
      render: (collection: Collection) => (
        <span className="whitespace-nowrap">{`${collection.fileCount || 0} files`}</span>
      ),
    },
    {
      header: "Last Active",
      key: "lastUpdated" as const,
      className: "w-[20%]",
      // Renamed parameter type
      render: (collection: Collection) => (
        <span className="whitespace-nowrap">
          {collection.lastUpdated
            ? new Date(collection.lastUpdated).toLocaleString()
            : "Never"}
        </span>
      ),
    },
    {
      header: "Usage",
      key: "usage" as const,
      className: "w-[15%]",
      // Renamed parameter type
      render: (collection: Collection) => (
        <span className="whitespace-nowrap">{`${collection.usage || "0 KB"} / month`}</span>
      ),
    },
    {
      header: "Actions",
      key: "id" as const,
      className: "w-[5%] text-right",
      // Renamed parameter type
      render: (collection: Collection) => (
        <div className="flex justify-end">
          {/* Updated tooltip content */}
          <Tooltip content="Chat with this collection">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-primary flex-shrink-0"
              onClick={(e) => handleChatClick(e, collection)} // Pass renamed variable
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
        data={collections} // Use renamed prop
        onRowClick={onCollectionSelect} // Use renamed prop
        isRowSelected={(collection) => selectedCollection === collection.id} // Use renamed prop and state variable
        className={className}
        emptyMessage="No collections found" // Updated empty message
      />

      {/* Use renamed state variable */}
      {chatCollection && (
        <ChatWindow
          onClose={handleChatClose}
          knowledgeSource={{
            type: "collection", // Updated type
            id: chatCollection.id, // Use renamed state variable
            name: chatCollection.name || "Untitled collection", // Use renamed state variable and updated text
          }}
        />
      )}
    </>
  );
};
