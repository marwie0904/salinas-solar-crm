"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
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
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Bell,
  Menu,
  LogOut,
  User,
  UserPlus,
  Calendar,
  AlertCircle,
  Clock,
  FileCheck,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  FileText,
  File,
  Loader2,
  X,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/auth-provider";
import {
  PIPELINE_STAGE_LABELS,
  APPOINTMENT_STATUS_LABELS,
  INVOICE_STATUS_LABELS,
} from "@/lib/types";
import type { SearchResult, SearchResultType } from "../../../convex/search";
import { usePageTitle } from "@/components/providers/page-title-context";

type NotificationType =
  | "lead_assigned"
  | "appointment_scheduled"
  | "agreement_approved"
  | "task_due_tomorrow"
  | "task_due_soon"
  | "task_overdue";

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

const TYPE_ICONS: Record<SearchResultType, React.ReactNode> = {
  contact: <User className="h-4 w-4" />,
  opportunity: <Briefcase className="h-4 w-4" />,
  appointment: <Calendar className="h-4 w-4" />,
  invoice: <FileText className="h-4 w-4" />,
  document: <File className="h-4 w-4" />,
};

const TYPE_COLORS: Record<SearchResultType, string> = {
  contact: "bg-blue-100 text-blue-700",
  opportunity: "bg-orange-100 text-orange-700",
  appointment: "bg-purple-100 text-purple-700",
  invoice: "bg-green-100 text-green-700",
  document: "bg-gray-100 text-gray-700",
};

interface HeaderProps {
  sidebarCollapsed: boolean;
  onMenuClick?: () => void;
  onToggleSidebar?: () => void;
  isMobile?: boolean;
}

export function Header({
  sidebarCollapsed,
  onMenuClick,
  onToggleSidebar,
}: HeaderProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuth();
  const { pageTitle, pageAction } = usePageTitle();

  // Fetch notifications from Convex
  const userId = user?.id as Id<"users"> | undefined;
  const notifications = useQuery(
    api.notifications.getForUser,
    userId ? { userId, limit: 50 } : "skip"
  );
  const markAllAsReadMutation = useMutation(api.notifications.markAllAsRead);

  const unreadCount = notifications?.filter((n) => !n.read).length ?? 0;
  const hasUnread = unreadCount > 0;

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Query search results
  const searchResults = useQuery(
    api.search.unified,
    debouncedQuery.length >= 2 ? { query: debouncedQuery, limit: 10 } : "skip"
  );

  const isLoading = debouncedQuery.length >= 2 && searchResults === undefined;
  const showResults = searchFocused && searchQuery.length >= 2;

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchResults]);

  // Global keyboard shortcut for search (Cmd/Ctrl + K)
  const handleGlobalKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      inputRef.current?.focus();
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => document.removeEventListener("keydown", handleGlobalKeyDown);
  }, [handleGlobalKeyDown]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNotificationsOpen = async (open: boolean) => {
    setNotificationsOpen(open);
    if (open && hasUnread && userId) {
      await markAllAsReadMutation({ userId });
    }
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = "/login";
  };

  // Navigate to result
  const navigateToResult = useCallback(
    (result: SearchResult) => {
      setSearchFocused(false);
      setSearchQuery("");
      switch (result.type) {
        case "contact":
          router.push(`/contacts/${result.id}`);
          break;
        case "opportunity":
          router.push(`/pipeline?opportunity=${result.id}`);
          break;
        case "appointment":
          router.push(`/appointments?id=${result.id}`);
          break;
        case "invoice":
          router.push(`/invoices?id=${result.id}`);
          break;
        case "document":
          router.push(`/documents?id=${result.id}`);
          break;
      }
    },
    [router]
  );

  // Keyboard navigation in search
  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!searchResults || searchResults.length === 0) {
        if (e.key === "Escape") {
          setSearchFocused(false);
          inputRef.current?.blur();
        }
        return;
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < searchResults.length - 1 ? prev + 1 : prev
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
          break;
        case "Enter":
          e.preventDefault();
          if (searchResults[selectedIndex]) {
            navigateToResult(searchResults[selectedIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          setSearchFocused(false);
          inputRef.current?.blur();
          break;
      }
    },
    [searchResults, selectedIndex, navigateToResult]
  );

  const getStatusBadge = (result: SearchResult) => {
    if (result.type === "opportunity" && result.metadata?.stage) {
      const stage = result.metadata.stage as keyof typeof PIPELINE_STAGE_LABELS;
      return (
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
          {PIPELINE_STAGE_LABELS[stage] || stage}
        </Badge>
      );
    }
    if (result.type === "appointment" && result.metadata?.status) {
      const status =
        result.metadata.status as keyof typeof APPOINTMENT_STATUS_LABELS;
      return (
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
          {APPOINTMENT_STATUS_LABELS[status] || status}
        </Badge>
      );
    }
    if (result.type === "invoice" && result.metadata?.status) {
      const status =
        result.metadata.status as keyof typeof INVOICE_STATUS_LABELS;
      return (
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
          {INVOICE_STATUS_LABELS[status] || status}
        </Badge>
      );
    }
    return null;
  };

  const clearSearch = () => {
    setSearchQuery("");
    setDebouncedQuery("");
    inputRef.current?.focus();
  };

  return (
    <header
      className={cn(
        "fixed top-0 right-0 z-30 h-16 bg-white border-b border-border flex items-center justify-between px-4 md:px-6 transition-all duration-300 safe-area-inset-top",
        "lg:left-64",
        sidebarCollapsed && "lg:left-[72px]",
        "left-0"
      )}
    >
      {/* Left - Menu button (mobile) + Collapse toggle (desktop) + Search */}
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

        {/* Sidebar collapse toggle for desktop */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          className="hidden lg:flex h-10 w-10 text-muted-foreground hover:text-foreground flex-shrink-0"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </Button>

        {/* Search - hidden on small phones, visible on tablet+ */}
        <div ref={searchContainerRef} className="relative w-full hidden sm:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search..."
              className="pl-10 pr-10 bg-muted/50 border-0 focus-visible:ring-[#ff5603] h-10"
            />
            {searchQuery ? (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            ) : (
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-background rounded border text-[10px] font-mono text-muted-foreground">
                ⌘K
              </kbd>
            )}
          </div>

          {/* Search Results Dropdown */}
          {showResults && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg border shadow-lg overflow-hidden z-50">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : searchResults && searchResults.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Search className="h-6 w-6 mb-2 opacity-50" />
                  <p className="text-sm">No results for &quot;{searchQuery}&quot;</p>
                </div>
              ) : searchResults && searchResults.length > 0 ? (
                <ScrollArea className="max-h-[320px]">
                  <div className="py-1">
                    {searchResults.map((result, index) => (
                      <button
                        key={`${result.type}-${result.id}`}
                        onClick={() => navigateToResult(result)}
                        onMouseEnter={() => setSelectedIndex(index)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2 text-left transition-colors",
                          selectedIndex === index
                            ? "bg-muted"
                            : "hover:bg-muted/50"
                        )}
                      >
                        <div
                          className={cn(
                            "flex items-center justify-center h-7 w-7 rounded-full shrink-0",
                            TYPE_COLORS[result.type]
                          )}
                        >
                          {TYPE_ICONS[result.type]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">
                              {result.title}
                            </span>
                            {getStatusBadge(result)}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {result.subtitle}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              ) : null}
            </div>
          )}
        </div>

        {/* Search icon button for small phones */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => inputRef.current?.focus()}
          className="sm:hidden h-10 w-10 text-muted-foreground hover:text-[#ff5603] touch-target"
        >
          <Search className="h-5 w-5" />
        </Button>
      </div>

      {/* Center - Page Title (mobile only) */}
      {pageTitle && (
        <h1 className="sm:hidden text-base font-semibold text-foreground truncate absolute left-1/2 -translate-x-1/2 max-w-[40%]">
          {pageTitle}
        </h1>
      )}

      {/* Right - Icons */}
      <div className="flex items-center gap-1 md:gap-2">
        <Popover
          open={notificationsOpen}
          onOpenChange={handleNotificationsOpen}
        >
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
              {notifications && notifications.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {unreadCount > 0 ? `${unreadCount} new` : "All read"}
                </span>
              )}
            </div>
            <ScrollArea className="h-[300px]">
              {!notifications || notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Bell className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">No notifications</p>
                </div>
              ) : (
                <div className="divide-y">
                  {notifications.map((notification) => (
                    <div
                      key={notification._id}
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
                          <p
                            className={cn(
                              "text-sm truncate",
                              !notification.read && "font-medium"
                            )}
                          >
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
                          {formatTimeAgo(new Date(notification.createdAt))}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </PopoverContent>
        </Popover>

        {/* Mobile: Page action button (replaces user menu) */}
        {pageAction && (
          <Button
            size="icon"
            className="sm:hidden h-7 w-7 bg-[#ff5603] hover:bg-[#e64d00] p-0 rounded-md"
            onClick={pageAction}
          >
            <Plus className="h-3.5 w-3.5 text-white" />
          </Button>
        )}

        {/* User menu - hidden on mobile when page action exists */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-10 w-10 text-muted-foreground hover:text-[#ff5603] touch-target tap-transparent",
                pageAction && "hidden sm:flex"
              )}
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
