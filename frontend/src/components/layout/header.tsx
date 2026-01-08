"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DialPad } from "@/components/calling/dial-pad";
import { Search, Phone, Bell, Menu, LogOut, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/auth-provider";

interface HeaderProps {
  sidebarCollapsed: boolean;
  onMenuClick?: () => void;
  isMobile?: boolean;
}

export function Header({ sidebarCollapsed, onMenuClick, isMobile }: HeaderProps) {
  const [mounted, setMounted] = useState(false);
  const { user, logout } = useAuth();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleCall = (phoneNumber: string) => {
    console.log("Calling:", phoneNumber);
    // TODO: Implement actual calling functionality
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = "/login";
  };

  return (
    <header
      className={cn(
        "fixed top-0 right-0 z-30 h-16 bg-white border-b border-border flex items-center justify-between px-4 md:px-6 transition-all duration-300 safe-area-inset-top",
        // Desktop: adjust for sidebar
        "lg:left-64",
        sidebarCollapsed && "lg:left-[72px]",
        // Mobile/Tablet: full width
        "left-0"
      )}
    >
      {/* Left - Menu button (mobile) + Search */}
      <div className="flex items-center gap-3 flex-1 max-w-md">
        {/* Hamburger menu for mobile/tablet */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="lg:hidden h-10 w-10 text-muted-foreground hover:text-foreground touch-target tap-transparent flex-shrink-0"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Search - hidden on small phones, visible on tablet+ */}
        <div className="relative w-full hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search..."
            className="pl-10 bg-muted/50 border-0 focus-visible:ring-[#ff5603] h-10"
          />
        </div>

        {/* Search icon button for small phones */}
        <Button
          variant="ghost"
          size="icon"
          className="sm:hidden h-10 w-10 text-muted-foreground hover:text-[#ff5603] touch-target"
        >
          <Search className="h-5 w-5" />
        </Button>
      </div>

      {/* Right - Icons */}
      <div className="flex items-center gap-1 md:gap-2">
        {mounted ? (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 text-muted-foreground hover:text-[#ff5603] touch-target tap-transparent"
              >
                <Phone className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-auto p-4">
              <DialPad onCall={handleCall} />
            </PopoverContent>
          </Popover>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 text-muted-foreground hover:text-[#ff5603] touch-target"
          >
            <Phone className="h-5 w-5" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="relative h-10 w-10 text-muted-foreground hover:text-[#ff5603] touch-target tap-transparent"
        >
          <Bell className="h-5 w-5" />
          {/* Notification badge */}
          <span className="absolute top-2 right-2 h-2 w-2 bg-[#ff5603] rounded-full" />
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 text-muted-foreground hover:text-[#ff5603] touch-target tap-transparent"
            >
              <User className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {user && (
              <div className="px-2 py-1.5 text-sm text-muted-foreground border-b mb-1">
                {user.email}
              </div>
            )}
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-red-600 focus:text-red-600 cursor-pointer"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
