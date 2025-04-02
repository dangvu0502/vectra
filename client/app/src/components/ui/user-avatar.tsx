import { FC } from "react";
import { cn } from "@/utils";
import { User as UserIcon } from "lucide-react";
import { User } from "@/hooks/use-auth";

export interface UserAvatarProps {
  user?: User | null;
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

export const UserAvatar: FC<UserAvatarProps> = ({
  user,
  size = "sm",
  className,
}) => {
  const hasAvatar = !!user?.profilePictureUrl;

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center overflow-hidden transition-transform duration-200 ease-in-out",
        "bg-sidebar-accent text-sidebar-foreground", // Default background/text
        sizeMap[size],
        className
      )}
      aria-label={user?.displayName || "User Avatar"}
    >
      {hasAvatar ? (
        <img
          src={user.profilePictureUrl}
          alt={user.displayName || "User Avatar"}
          className="w-full h-full object-cover"
        />
      ) : (
        <UserIcon size={iconSizeMap[size]} />
      )}
    </div>
  );
};