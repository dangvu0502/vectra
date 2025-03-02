import { FC, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface TabProps {
  label: string;
  active?: boolean;
  onClick?: () => void;
}

export const Tab: FC<TabProps> = ({ label, active, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-4 py-2.5 text-sm font-medium transition-all duration-200 ease-in-out relative',
        active
          ? 'text-primary'
          : 'text-muted-foreground hover:text-foreground'
      )}
    >
      {label}
      {active && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full transform origin-left animate-in slide-in-from-left duration-200" />
      )}
    </button>
  );
};

interface TabsProps {
  className?: string;
  children: ReactNode;
}

export const Tabs: FC<TabsProps> = ({ className, children }) => {
  return (
    <div className={cn('flex border-b border-border transition-all duration-200 ease-in-out', className)}>
      {children}
    </div>
  );
};