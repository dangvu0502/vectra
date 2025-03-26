import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/utils";
import { Database, Key } from "lucide-react";
import { FC } from "react";
import { Link, useLocation } from "react-router-dom";
import { SidebarItem } from "./sidebar-item";
import { Switch } from "./switch";
import { UserAvatar } from "./user-avatar";
import { AuthModal } from "@/components/features/auth-modal";

interface SidebarProps {
  className?: string;
}

export const Sidebar: FC<SidebarProps> = ({ className }) => {
  const { theme, setTheme } = useTheme();

  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-sidebar border-r border-sidebar-border w-[220px] p-3 transition-all duration-300 ease-in-out",
        className
      )}
    >
      <div className="flex items-center h-12 mb-6 px-2">
        <span className="text-xl font-semibold text-sidebar-primary hover:text-primary transition-colors duration-200 cursor-default">
          QueryCub
        </span>
      </div>
      <div className="flex-1 space-y-1.5">
        <Link to="/" className="block">
          <SidebarItem
            icon={<Database size={18} />}
            label="Storage"
            active={useLocation().pathname === "/"}
          />
        </Link>
        <Link to="/api-keys" className="block">
          <SidebarItem
            icon={<Key size={18} />}
            label="API keys"
            active={useLocation().pathname === "/api-keys"}
          />
        </Link>
      </div>
      <div className="mt-auto pt-4 space-y-4 border-t border-sidebar-border">
        <AuthModal>
          <button className="group flex items-center gap-3 px-3 py-2.5 w-full rounded-md hover:bg-sidebar-accent/50 transition-all duration-200 ease-in-out hover:shadow-sm">
            <UserAvatar size="sm" className="group-hover:scale-105" />
            <span className="text-sidebar-foreground flex-1 text-left">
              Sign In
            </span>
          </button>
        </AuthModal>
        <div className="flex items-center justify-between w-full py-1 px-3">
          <span className="text-sm text-muted-foreground">Theme</span>
          <Switch
            checked={theme === "dark"}
            onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
          />
        </div>
      </div>
    </aside>
  );
};
