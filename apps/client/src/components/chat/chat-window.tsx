import { useState } from 'react';
import { X, Database, FileText, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppChat } from '@/components/shared/app-chat';
import { cn } from '@/lib/utils';

interface KnowledgeSource {
  type: 'file' | 'vectorStore';
  id: string;
  name: string;
}

interface ChatWindowProps {
  onClose: () => void;
  knowledgeSource: KnowledgeSource;
}

export function ChatWindow({ onClose, knowledgeSource }: ChatWindowProps) {
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 300); // Match the duration of the animation
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/20 dark:bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className={cn(
          "w-full max-w-md h-full bg-background dark:bg-zinc-900 shadow-xl border-l border-border dark:border-zinc-800",
          "animate-in slide-in-from-right duration-300",
          isClosing && "animate-out slide-out-to-right duration-300"
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-border dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground dark:text-zinc-100">Ask AI</span>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="h-8 w-8 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="bg-muted/50 dark:bg-zinc-800/80 px-4 py-2.5 flex items-center gap-2 text-sm border-b border-border dark:border-zinc-700/50">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="font-medium text-foreground/90 dark:text-zinc-300">Using knowledge from:</span>
          <div className="flex items-center gap-2 bg-background dark:bg-zinc-900/80 rounded-full px-3 py-1 text-sm border border-border dark:border-zinc-700">
            {knowledgeSource.type === 'file' ? (
              <FileText className="h-3.5 w-3.5 text-primary" />
            ) : (
              <Database className="h-3.5 w-3.5 text-primary" />
            )}
            <span className="truncate max-w-[200px] font-medium text-foreground dark:text-zinc-200">{knowledgeSource.name}</span>
          </div>
        </div>
        
        <div className="h-[calc(100%-105px)]">
          <AppChat knowledgeSource={knowledgeSource} />
        </div>
      </div>
    </div>
  );
}
