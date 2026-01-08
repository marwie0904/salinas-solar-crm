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
import { ScrollArea } from "@/components/ui/scroll-area";
import { DialPad } from "@/components/calling/dial-pad";
import { Search, Phone, Bell, Menu, LogOut, User, UserPlus, Calendar, AlertCircle, CheckCircle, Clock, FileCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/auth-provider";

type NotificationType =
  | "lead_assigned"
  | "appointment_scheduled"
  | "agreement_approved"
  | "task_due_tomorrow"
  | "task_due_soon"
  | "task_overdue";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  createdAt: Date;
  read: boolean;
}

const mockNotifications: Notification[] = [
  {
    id: "1",
    title: "New Lead Assigned",
    message: "John Smith from 123 Main St has been assigned to you",
    type: "lead_assigned",
    createdAt: new Date(Date.now() - 1000 * 60 * 5), // 5 mins ago
    read: false,
  },
  {
    id: "2",
    title: "Task Due in 1 Hour",
    message: "Follow up call with Maria Garcia",
    type: "task_due_soon",
    createdAt: new Date(Date.now() - 1000 * 60 * 10), // 10 mins ago
    read: false,
  },
  {
    id: "3",
    title: "New Appointment Scheduled",
    message: "Site visit scheduled with Robert Johnson tomorrow at 2:00 PM",
    type: "appointment_scheduled",
    createdAt: new Date(Date.now() - 1000 * 60 * 30), // 30 mins ago
    read: false,
  },
  {
    id: "4",
    title: "Agreement Approved",
    message: "Sarah Williams signed the agreement on 456 Oak Ave Solar Installation",
    type: "agreement_approved",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    read: false,
  },
  {
    id: "5",
    title: "Task Due Tomorrow",
    message: "Send proposal to David Miller",
    type: "task_due_tomorrow",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5), // 5 hours ago
    read: true,
  },
  {
    id: "6",
    title: "Overdue Task",
    message: "Schedule installation for Thompson residence - 2 days overdue",
    type: "task_overdue",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    read: true,
  },
];

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case "lead_assigned":
      return <UserPlus className="h-4 w-4 text-[#ff5603]" />;
    case "appointment_scheduled":
      return <Calendar className="h-4 w-4 text-blue-500" />;
    case "agreement_approved":
      return <FileCheck className="h-4 w-4 text-green-600" />;
    case "task_due_tomorrow":
      return <Clock className="h-4 w-4 text-yellow-500" />;
    case "task_due_soon":
      return <AlertCircle className="h-4 w-4 text-orange-500" />;
    case "task_overdue":
      return <AlertCircle className="h-4 w-4 text-red-600" />;
    default:
      return <Bell className="h-4 w-4 text-muted-foreground" />;
  }
}

interface HeaderProps {
  sidebarCollapsed: boolean;
  onMenuClick?: () => void;
  isMobile?: boolean;
}

export function Header({ sidebarCollapsed, onMenuClick, isMobile }: HeaderProps) {
  const [mounted, setMounted] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { user, logout } = useAuth();

  const unreadCount = notifications.filter((n) => !n.read).length;
  const hasUnread = unreadCount > 0;

  useEffect(() => {
    setMounted(true);
  }, []);

  const markAllAsRead = () => {
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read: true }))
    );
  };

  const handleNotificationsOpen = (open: boolean) => {
    setNotificationsOpen(open);
    if (open && hasUnread) {
      markAllAsRead();
    }
  };

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
        <Popover open={notificationsOpen} onOpenChange={handleNotificationsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative h-10 w-10 text-muted-foreground hover:text-[#ff5603] touch-target tap-transparent"
            >
              <Bell className="h-5 w-5" />
              {hasUnread && (
                <span className="absolute top-2 right-2 h-2 w-2 bg-[#ff5603] rounded-full" />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="font-semibold text-sm">Notifications</h3>
              {notifications.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {unreadCount > 0 ? `${unreadCount} new` : "All read"}
                </span>
              )}
            </div>
            <ScrollArea className="h-[300px]">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Bell className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">No notifications</p>
                </div>
              ) : (
                <div className="divide-y">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={cn(
                        "flex gap-3 px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors",
                        !notification.read && "bg-[#ff5603]/5"
                      )}
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn(
                            "text-sm truncate",
                            !notification.read && "font-medium"
                          )}>
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <span className="flex-shrink-0 h-2 w-2 bg-[#ff5603] rounded-full mt-1.5" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatTimeAgo(notification.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </PopoverContent>
        </Popover>

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
