import { FC, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils';

interface DetailsPanelProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export const DetailsPanel: FC<DetailsPanelProps> = ({
  title,
  subtitle,
  children,
  actions,
  className
}) => {
  return (
    <div className={cn(
      'w-[400px] border rounded-md p-6 bg-card shadow-sm hover:shadow-md transition-all duration-200 ease-in-out',
      className
    )}>
      {subtitle && (
        <h2 className="text-sm font-medium uppercase text-muted-foreground mb-2">{subtitle}</h2>
      )}
      <h3 className="text-xl font-semibold mb-6 truncate text-primary transition-colors duration-200">{title}</h3>
      
      <div className="space-y-5">
        {children}
      </div>
      
      {actions && (
        <div className="mt-8 flex justify-end gap-2">
          {actions}
        </div>
      )}
    </div>
  );
};

interface DetailItemProps {
  label: ReactNode;
  children: ReactNode;
  className?: string;
}

export const DetailItem: FC<DetailItemProps> = ({ label, children, className }) => (
  <div className={cn("flex items-center justify-between group", className)}>
    <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-200">
      {label}
    </span>
    {children}
  </div>
);

interface DetailsPanelActionButtonProps {
  variant?: 'default' | 'destructive' | 'outline';
  onClick?: () => void;
  disabled?: boolean;
  icon?: ReactNode;
  children: ReactNode;
}

export const DetailsPanelActionButton: FC<DetailsPanelActionButtonProps> = ({
  variant = 'default',
  onClick,
  disabled,
  icon,
  children
}) => (
  <Button
    variant={variant}
    size="sm"
    className="px-4 shadow-sm hover:shadow-md transition-shadow duration-200 gap-2"
    onClick={onClick}
    disabled={disabled}
  >
    {icon}
    {children}
  </Button>
);