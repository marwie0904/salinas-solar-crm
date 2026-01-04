"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  LayoutDashboard,
  CheckSquare,
  GitBranch,
  Users,
  UsersRound,
  Calendar,
  FileText,
  FileSignature,
  MessageSquare,
  User,
  LogOut,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  isMobile?: boolean;
}

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tasks", label: "Task List", icon: CheckSquare },
  { href: "/pipeline", label: "Pipeline", icon: GitBranch },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/messages", label: "Messages", icon: MessageSquare },
  { href: "/appointments", label: "Appointments", icon: Calendar },
  { href: "/invoices", label: "Invoices", icon: FileText },
  { href: "/agreements", label: "Generate Agreement", icon: FileSignature },
  { href: "/users", label: "Company Users", icon: UsersRound },
];

export function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose, isMobile }: SidebarProps) {
  const pathname = usePathname();

  // On mobile, always show expanded sidebar in drawer
  const isCollapsed = isMobile ? false : collapsed;

  // Handle link clicks on mobile - close the drawer
  const handleLinkClick = () => {
    if (isMobile && onMobileClose) {
      onMobileClose();
    }
  };

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-screen bg-white border-r border-border flex flex-col transition-all duration-300",
          // Desktop behavior
          "lg:translate-x-0",
          isCollapsed ? "lg:w-[72px]" : "lg:w-64",
          // Mobile/Tablet behavior - hidden by default, slides in when open
          "w-[280px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          // Safe area for notched devices
          "safe-area-inset-top safe-area-inset-left"
        )}
      >
        {/* Logo Section */}
        <div className="p-4 flex items-center justify-between">
          <Logo collapsed={isCollapsed} />

          {/* Desktop collapse toggle */}
          {!isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              className={cn(
                "h-8 w-8 text-muted-foreground hover:text-foreground hidden lg:flex",
                isCollapsed && "absolute -right-3 top-6 bg-white border shadow-sm rounded-full"
              )}
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          )}

          {/* Mobile close button */}
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onMobileClose}
              className="h-10 w-10 text-muted-foreground hover:text-foreground lg:hidden touch-target"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>

        <Separator />

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto touch-scroll">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            const linkContent = (
              <Link
                href={item.href}
                onClick={handleLinkClick}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 md:py-2.5 rounded-lg transition-colors touch-target tap-transparent",
                  isActive
                    ? "bg-[#ff5603] text-white"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground active:bg-accent"
                )}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {!isCollapsed && (
                  <span className="text-sm font-medium truncate">{item.label}</span>
                )}
              </Link>
            );

            if (isCollapsed && !isMobile) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                  <TooltipContent side="right" className="font-medium">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return <div key={item.href}>{linkContent}</div>;
          })}
        </nav>

        <Separator />

        {/* Bottom Section - User & Logout */}
        <div className="p-3 space-y-1 safe-area-inset-bottom">
          {isCollapsed && !isMobile ? (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-center px-3 py-2.5 h-auto touch-target"
                  >
                    <User className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">User Profile</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-center px-3 py-2.5 h-auto text-destructive hover:text-destructive hover:bg-destructive/10 touch-target"
                  >
                    <LogOut className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Logout</TooltipContent>
              </Tooltip>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 px-3 py-3 md:py-2.5 h-auto text-muted-foreground hover:text-foreground touch-target"
              >
                <User className="h-5 w-5" />
                <span className="text-sm font-medium">User</span>
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 px-3 py-3 md:py-2.5 h-auto text-destructive hover:text-destructive hover:bg-destructive/10 touch-target"
              >
                <LogOut className="h-5 w-5" />
                <span className="text-sm font-medium">Logout</span>
              </Button>
            </>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
