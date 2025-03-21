import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Send, Database, FileText, Sparkles } from 'lucide-react';
import { Tooltip } from '@/components/ui/tooltip';

interface Message {
  text: string;
  sender: 'user' | 'ai';
}

interface KnowledgeSource {
  type: 'file' | 'vectorStore' | null;
  id: string | null;
  name: string | null;
}

interface AppChatProps {
  knowledgeSource?: KnowledgeSource;
}

export function AppChat({ knowledgeSource }: AppChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Update welcome message when knowledge source changes
  useEffect(() => {
    let welcomeMessages: Message[] = [
      { text: 'Hi!', sender: 'ai' },
      { text: "I'm an AI assistant trained on documentation, help articles, and other content.", sender: 'ai' },
    ];

    if (knowledgeSource?.name) {
      welcomeMessages.push({
        text: `I'm currently using "${knowledgeSource.name}" as a knowledge source for my answers.`,
        sender: 'ai'
      });
    } else {
      welcomeMessages.push({ 
        text: 'Ask me anything about Claude.', 
        sender: 'ai' 
      });
    }

    setMessages(welcomeMessages);
  }, [knowledgeSource]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
  };

  const handleSubmit = async () => {
    if (inputValue.trim() === '') return;

    const newMessage: Message = {
      text: inputValue,
      sender: 'user',
    };

    setMessages((prevMessages) => [...prevMessages, newMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/v1/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: inputValue }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      
      const aiResponse: Message = {
        text: data.response,
        sender: 'ai',
      };

      setMessages((prevMessages) => [...prevMessages, aiResponse]);
    } catch (error) {
      const errorResponse: Message = {
        text: 'Sorry, there was an error processing your request.',
        sender: 'ai',
      };
      setMessages((prevMessages) => [...prevMessages, errorResponse]);
    }
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-grow overflow-auto p-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'
              } mb-2`}
          >
            <span
              className={`inline-block px-4 py-2 rounded-lg max-w-[70%] ${message.sender === 'user'
                ? 'bg-primary text-primary-foreground rounded-br-none'
                : 'bg-muted dark:bg-zinc-800 text-muted-foreground dark:text-zinc-200 rounded-bl-none'
                }`}
            >
              {message.text}
            </span>
          </div>
        ))}
        {messages.length === 3 && messages.every(m => m.sender === 'ai') && (
          <div className="mt-4">
            <h2 className="text-lg font-semibold">Example Questions</h2>
            <div className="mt-2 space-y-2">
              <button 
                className="px-4 py-2 rounded-lg bg-muted dark:bg-zinc-800 text-muted-foreground dark:text-zinc-200 w-fit hover:bg-accent dark:hover:bg-zinc-700 transition-colors block text-left"
                onClick={() => {
                  setInputValue("How do I create structured JSON output?");
                  setTimeout(() => handleSubmit(), 100);
                }}
              >
                How do I create structured JSON output?
              </button>
              <button 
                className="px-4 py-2 rounded-lg bg-muted dark:bg-zinc-800 text-muted-foreground dark:text-zinc-200 w-fit hover:bg-accent dark:hover:bg-zinc-700 transition-colors block text-left"
                onClick={() => {
                  setInputValue("For few shot prompting, how do I pick examples?");
                  setTimeout(() => handleSubmit(), 100);
                }}
              >
                For few shot prompting, how do I pick examples?
              </button>
              <button 
                className="px-4 py-2 rounded-lg bg-muted dark:bg-zinc-800 text-muted-foreground dark:text-zinc-200 w-fit hover:bg-accent dark:hover:bg-zinc-700 transition-colors block text-left"
                onClick={() => {
                  setInputValue("How can I prompt Claude to reply a user's language?");
                  setTimeout(() => handleSubmit(), 100);
                }}
              >
                How can I prompt Claude to reply a user's language?
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="border-t border-border dark:border-zinc-700/50 p-4">
        <div className="flex items-center space-x-2">
          <Input
            type="text"
            placeholder="Type your message..."
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            className="rounded-full dark:bg-zinc-800 dark:border-zinc-700"
          />
          <Button
            onClick={handleSubmit}
            variant="ghost"
            className="rounded-full p-2 hover:bg-accent dark:hover:bg-zinc-700 dark:text-zinc-300"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
