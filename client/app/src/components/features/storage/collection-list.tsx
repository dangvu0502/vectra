import { FC, useState } from "react";
import { Database, MessageSquare } from "lucide-react";
import { Table } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChatWindow } from "@/components/shared/chat-window";
import { Tooltip } from "@/components/ui/tooltip";
import type { Collection as ApiCollection } from '@/api/types'; // Import the API type

// Remove the local interface definition
/*
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
*/

// Use the imported ApiCollection type in the props interface
interface CollectionListProps {
  collections: ApiCollection[]; // Use imported type
  selectedCollection: string | null;
  onCollectionSelect: (collection: ApiCollection) => void; // Use imported type
  className?: string;
}

// Use the imported ApiCollection type in the component definition
export const CollectionList: FC<CollectionListProps> = ({
  collections,
  selectedCollection,
  onCollectionSelect,
  className,
}) => {
  // Use the imported ApiCollection type for state
  const [chatCollection, setChatCollection] = useState<ApiCollection | null>(null);

  // Use the imported ApiCollection type for the handler parameter
  const handleChatClick = (e: React.MouseEvent, collection: ApiCollection) => {
    e.stopPropagation();
    setChatCollection(collection);
  };

  const handleChatClose = () => {
    setChatCollection(null); // Use renamed state setter
  };

  // Adjust columns to use only valid keys from ApiCollection
  const columns = [
    {
      header: "Name",
      key: "name" as const, // 'name' exists in ApiCollection
      className: "w-[30%]",
      // Use the imported ApiCollection type for the render parameter
      render: (collection: ApiCollection) => (
        <div className="flex items-center gap-2 whitespace-nowrap">
          <Database size={16} className="text-muted-foreground flex-shrink-0" />
          <span className="font-medium truncate">
            {collection.name || "Untitled collection"} {/* Updated text */}
          </span>
        </div>
      ),
    },
    // Add 'Created At' column using a valid key
    {
      header: "Created At",
      key: "created_at" as const, // 'created_at' exists in ApiCollection
      className: "w-[25%]", // Adjust width as needed
      render: (collection: ApiCollection) => (
        <span className="whitespace-nowrap">
          {new Date(collection.created_at).toLocaleString()}
        </span>
      ),
    },
    // Remove columns for keys not in ApiCollection: size, fileCount, lastUpdated, usage
    {
      header: "Actions",
      key: "id" as const,
      className: "w-[5%] text-right",
      // Use the imported ApiCollection type for the render parameter
      render: (collection: ApiCollection) => (
        <div className="flex justify-end">
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
        onRowClick={onCollectionSelect}
        isRowSelected={(collection: ApiCollection) => selectedCollection === collection.id} // Use imported type
        className={className}
        emptyMessage="No collections found"
      />

      {chatCollection && (
        <ChatWindow
          onClose={handleChatClose}
          knowledgeSource={{
            type: "collection",
            id: chatCollection.id,
            name: chatCollection.name || "Untitled collection",
          }}
        />
      )}
    </>
  );
};
