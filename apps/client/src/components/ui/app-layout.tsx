import { FC, ReactNode } from 'react';
import { Sidebar } from './sidebar';

interface AppLayoutProps {
  children: ReactNode;
}

export const AppLayout: FC<AppLayoutProps> = ({ children }) => {
  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="p-6 space-y-6">
          {children}
        </div>
      </main>
    </div>
  );
};