import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';

interface ChatTriggerButtonProps {
  onClick: () => void;
  onMouseDown: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

export function ChatTriggerButton({ onClick, onMouseDown }: ChatTriggerButtonProps) {
  return (
    <Button
      variant="outline"
      size="icon"
      onClick={onClick}
      onMouseDown={onMouseDown}
      className="fixed bottom-4 right-4 z-50"
    >
      <MessageCircle className="h-4 w-4" />
    </Button>
  );
}
