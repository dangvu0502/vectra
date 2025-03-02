import { FC } from "react";
import { cn } from "@/lib/utils";

export interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}

export const SidebarItem: FC<SidebarItemProps> = ({
  icon,
  label,
  active,
  onClick,
  className,
}) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-md w-full text-left transition-all duration-200 ease-in-out",
        active
          ? "bg-sidebar-accent text-sidebar-primary font-medium shadow-sm scale-[1.02]"
          : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:scale-[1.01] hover:shadow-sm",
        className
      )}
    >
      <div className="flex-shrink-0 transition-transform duration-200 ease-in-out group-hover:scale-110">
        {icon}
      </div>
      <span>{label}</span>
    </button>
  );
};