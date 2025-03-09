import { FC, ReactNode } from 'react';
import { cn } from '@/utils';

interface TableColumn<T> {
  header: string;
  key: keyof T;
  render?: (item: T) => ReactNode;
}

interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  onRowClick?: (item: T) => void;
  isRowSelected?: (item: T) => boolean;
  className?: string;
  emptyMessage?: string;
}

export const Table = <T extends Record<string, any>>({ 
  columns, 
  data, 
  onRowClick, 
  isRowSelected, 
  className,
  emptyMessage = 'No data found'
}: TableProps<T>) => {
  return (
    <div className={cn('rounded-lg bg-card shadow-sm hover:shadow-md transition-shadow duration-200 h-[600px] overflow-hidden flex flex-col', className)}>
      <div className="flex-1 overflow-auto">
        <table className="w-full" role="grid">
          <thead className="border-b bg-muted/30">
            <tr>
              {columns.map((column) => (
                <th 
                  key={String(column.key)} 
                  className="px-4 py-3 text-left text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200"
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr
                key={index}
                onClick={() => onRowClick?.(item)}
                className={cn(
                  'cursor-pointer hover:bg-accent/10 transition-all duration-200 ease-in-out hover:shadow-sm',
                  isRowSelected?.(item) && 'bg-accent/20 shadow-sm'
                )}
              >
                {columns.map((column) => (
                  <td 
                    key={String(column.key)} 
                    className="px-4 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
                  >
                    {column.render ? column.render(item) : String(item[column.key])}
                  </td>
                ))}
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td 
                  colSpan={columns.length} 
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};