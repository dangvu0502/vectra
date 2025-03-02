import { FC } from "react";
import { cn } from "@/lib/utils";
import { User } from "lucide-react";

export interface UserAvatarProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: "w-8 h-8",
  md: "w-10 h-10",
  lg: "w-12 h-12",
};

const iconSizeMap = {
  sm: 18,
  md: 20,
  lg: 24,
};

export const UserAvatar: FC<UserAvatarProps> = ({ size = "sm", className }) => {
  return (
    <div
      className={cn(
        "rounded-full bg-sidebar-accent flex items-center justify-center transition-transform duration-200 ease-in-out",
        sizeMap[size],
        className
      )}
    >
      <User size={iconSizeMap[size]} className="text-sidebar-foreground" />
    </div>
  );
};