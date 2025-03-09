import { FC } from 'react';

interface StatusIndicatorProps {
  status: 'active' | 'processing' | 'error' | string;
  className?: string;
}

export const StatusIndicator: FC<StatusIndicatorProps> = ({ status, className = '' }) => {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-500';
      case 'processing':
        return 'bg-amber-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`w-2 h-2 rounded-full ${getStatusColor(status)} animate-pulse`} />
      <span className="font-medium text-foreground">
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    </div>
  );
};