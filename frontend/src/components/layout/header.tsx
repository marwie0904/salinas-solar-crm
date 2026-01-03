"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DialPad } from "@/components/calling/dial-pad";
import { Search, Phone, Bell } from "lucide-react";

interface HeaderProps {
  sidebarCollapsed: boolean;
}

export function Header({ sidebarCollapsed }: HeaderProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleCall = (phoneNumber: string) => {
    console.log("Calling:", phoneNumber);
    // TODO: Implement actual calling functionality
  };

  return (
    <header
      className={`fixed top-0 right-0 z-30 h-16 bg-white border-b border-border flex items-center justify-between px-6 transition-all duration-300 ${
        sidebarCollapsed ? "left-[72px]" : "left-64"
      }`}
    >
      {/* Left - Search */}
      <div className="flex items-center flex-1 max-w-md">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search..."
            className="pl-10 bg-muted/50 border-0 focus-visible:ring-[#ff5603]"
          />
        </div>
      </div>

      {/* Right - Icons */}
      <div className="flex items-center gap-2">
        {mounted ? (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-[#ff5603]"
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
            className="text-muted-foreground hover:text-[#ff5603]"
          >
            <Phone className="h-5 w-5" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="relative text-muted-foreground hover:text-[#ff5603]"
        >
          <Bell className="h-5 w-5" />
          {/* Notification badge */}
          <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-[#ff5603] rounded-full" />
        </Button>
      </div>
    </header>
  );
}
