import { FC } from 'react';
import { MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip } from '@/components/ui/tooltip';

interface ChatButtonProps {
  onClick: () => void;
}

export const ChatButton: FC<ChatButtonProps> = ({ onClick }) => {
  return (
    <Tooltip content="Ask AI Assistant">
      <Button
        variant="outline"
        size="icon"
        className="rounded-full h-10 w-10 fixed bottom-6 right-6 shadow-md hover:shadow-lg transition-all duration-200 bg-primary text-primary-foreground hover:bg-primary/90 z-40"
        onClick={onClick}
      >
        <MessageSquare className="h-5 w-5" />
      </Button>
    </Tooltip>
  );
}; 