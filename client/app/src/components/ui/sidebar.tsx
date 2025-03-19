import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/utils";
import * as Popover from "@radix-ui/react-popover";
import { ChevronsUpDown, Database, Key } from "lucide-react";
import { FC, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { SidebarItem } from "./sidebar-item";
import { Switch } from "./switch";
import { UserAvatar } from "./user-avatar";

interface SidebarProps {
  className?: string;
}

export const Sidebar: FC<SidebarProps> = ({ className }) => {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);

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
            active={useLocation().pathname === '/'} 
          />
        </Link>
        <Link to="/api-keys" className="block">
          <SidebarItem 
            icon={<Key size={18} />} 
            label="API keys" 
            active={useLocation().pathname === '/api-keys'} 
          />
        </Link>
      </div>
      <div className="mt-auto pt-4 space-y-4 border-t border-sidebar-border">
        <Popover.Root open={open} onOpenChange={setOpen}>
          <Popover.Trigger asChild>
            <button className="group flex items-center gap-3 px-3 py-2.5 w-full rounded-md hover:bg-sidebar-accent/50 transition-all duration-200 ease-in-out hover:shadow-sm">
              <UserAvatar size="sm" className="group-hover:scale-105" />
              <span className="text-sidebar-foreground flex-1 text-left">
                John Doe
              </span>
              <div className="text-sidebar-foreground/50 group-hover:text-sidebar-foreground transition-colors duration-200">
                <ChevronsUpDown
                  size={14}
                  data-state={open ? "open" : "closed"}
                />
              </div>
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              className="w-[220px] rounded-lg border bg-popover p-4 shadow-lg animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
              side="right"
              sideOffset={12}
              align="start"
            >
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <UserAvatar size="md" />
                  <div className="flex flex-col">
                    <span className="font-medium">John Doe</span>
                    <span className="text-xs text-muted-foreground">
                      m@example.com
                    </span>
                  </div>
                </div>
                <div className="h-px bg-border" />
                <div className="flex items-center justify-between w-full py-1">
                  <span className="text-sm text-muted-foreground">
                    Theme
                  </span>
                  <Switch
                    checked={theme === "dark"}
                    onCheckedChange={(checked) =>
                      setTheme(checked ? "dark" : "light")
                    }
                  />
                </div>
                <div className="h-px bg-border" />
                <button className="flex items-center justify-center w-full py-2 text-sm font-medium rounded-md hover:bg-destructive/10 text-destructive transition-all duration-200 ease-in-out hover:shadow-sm">
                  <span>Log out</span>
                </button>
              </div>
              <Popover.Arrow className="fill-popover" />
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      </div>
    </aside>
  );
};
