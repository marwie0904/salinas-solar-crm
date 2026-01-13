"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth } from "@/components/providers/auth-provider";
import { Id } from "../../../../convex/_generated/dataModel";
import { AppointmentType } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import {
  UserPlus,
  Calendar,
  Bell,
  Building2,
  User,
  Clock,
  TrendingUp,
  FileCheck,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useMemo } from "react";
import Link from "next/link";

const typeLabels: Record<AppointmentType, string> = {
  discovery_call: "Discovery Call",
  field_inspection: "Field Inspection",
};

const typeColors: Record<AppointmentType, string> = {
  discovery_call: "bg-blue-500",
  field_inspection: "bg-purple-500",
};

const notificationIcons: Record<string, React.ElementType> = {
  lead_assigned: UserPlus,
  appointment_scheduled: Calendar,
  agreement_approved: FileCheck,
  task_due_tomorrow: Clock,
  task_due_soon: Clock,
  task_overdue: AlertCircle,
};

function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  return `${days}d`;
}

export default function DashboardPage() {
  const { user } = useAuth();

  // Fetch real data from Convex
  const leadsThisMonth = useQuery(api.contacts.getThisMonth);
  const appointmentsToday = useQuery(api.appointments.getToday, {});
  const notifications = useQuery(
    api.notifications.getForUser,
    user ? { userId: user.id as Id<"users">, limit: 10 } : "skip"
  );

  // Calculate chart data from leads this month
  const { chartData, totalLeads } = useMemo(() => {
    if (!leadsThisMonth) {
      return { chartData: [], totalLeads: 0 };
    }

    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const currentDay = now.getDate();

    // Create a map of day -> count
    const dayCountMap: Record<number, number> = {};

    leadsThisMonth.forEach((lead) => {
      const leadDate = new Date(lead.createdAt);
      const day = leadDate.getDate();
      dayCountMap[day] = (dayCountMap[day] || 0) + 1;
    });

    // Build chart data for days up to current day
    const data = [];
    for (let day = 1; day <= currentDay; day++) {
      const date = new Date(now.getFullYear(), now.getMonth(), day);
      const label = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      data.push({
        date: label,
        leads: dayCountMap[day] || 0,
      });
    }

    return {
      chartData: data,
      totalLeads: leadsThisMonth.length,
    };
  }, [leadsThisMonth]);

  // Calculate leads this week
  const leadsThisWeek = useMemo(() => {
    if (!leadsThisMonth) return 0;

    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    return leadsThisMonth.filter(
      (lead) => lead.createdAt >= startOfWeek.getTime()
    ).length;
  }, [leadsThisMonth]);

  // Loading state
  const isLoading = leadsThisMonth === undefined || appointmentsToday === undefined;

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Welcome to Salinas Solar Services CRM
        </p>
      </div>

      {/* New Leads This Month Chart */}
      <div className="bg-white rounded-lg border p-4 md:p-6">
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-[#ff5603]" />
            <h2 className="font-semibold text-sm md:text-base text-foreground">
              New Leads This Month
            </h2>
          </div>
          <div className="text-right">
            <p className="text-xl md:text-2xl font-bold text-foreground">
              {isLoading ? "-" : totalLeads}
            </p>
            <p className="text-xs text-muted-foreground">Total leads</p>
          </div>
        </div>
        <div className="h-[200px] md:h-[250px] w-full -ml-2 md:ml-0">
          {isLoading ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              Loading...
            </div>
          ) : chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  tickLine={false}
                  axisLine={{ stroke: "#e5e7eb" }}
                  interval="preserveStartEnd"
                  tickFormatter={(value, index) => {
                    // Show every 5th label to avoid crowding
                    if (index % 5 === 0) return value;
                    return "";
                  }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  tickLine={false}
                  axisLine={{ stroke: "#e5e7eb" }}
                  allowDecimals={false}
                  domain={[0, "auto"]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  labelStyle={{ fontWeight: 600, marginBottom: "4px" }}
                  formatter={(value) => [`${value} leads`, "New Leads"]}
                />
                <Line
                  type="monotone"
                  dataKey="leads"
                  stroke="#ff5603"
                  strokeWidth={2}
                  dot={{ fill: "#ff5603", strokeWidth: 0, r: 3 }}
                  activeDot={{ r: 5, fill: "#ff5603" }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              No leads this month
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 md:gap-6">
        {/* New Leads This Week */}
        <div className="bg-white rounded-lg border p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm font-medium text-muted-foreground">
                New Leads This Week
              </p>
              <p className="text-2xl md:text-3xl font-bold text-foreground mt-1 md:mt-2">
                {isLoading ? "-" : leadsThisWeek}
              </p>
            </div>
            <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-[#ff5603]/10 flex items-center justify-center flex-shrink-0">
              <UserPlus className="h-5 w-5 md:h-6 md:w-6 text-[#ff5603]" />
            </div>
          </div>
        </div>

        {/* Appointments Today */}
        <div className="bg-white rounded-lg border p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm font-medium text-muted-foreground">
                Appointments Today
              </p>
              <p className="text-2xl md:text-3xl font-bold text-foreground mt-1 md:mt-2">
                {isLoading ? "-" : appointmentsToday?.length ?? 0}
              </p>
            </div>
            <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
              <Calendar className="h-5 w-5 md:h-6 md:w-6 text-green-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Lists Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Appointments Today */}
        <div className="bg-white rounded-lg border">
          <div className="p-4 border-b">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-[#ff5603]" />
              <h2 className="font-semibold text-foreground">
                Appointments Today
              </h2>
              <Badge variant="secondary" className="ml-auto">
                {appointmentsToday?.length ?? 0}
              </Badge>
            </div>
          </div>
          <div className="divide-y">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                Loading...
              </div>
            ) : appointmentsToday && appointmentsToday.length > 0 ? (
              appointmentsToday.map((appointment) => (
                <Link
                  key={appointment._id}
                  href="/dashboard/appointments"
                  className="block p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground">
                        {appointment.title}
                      </p>
                      {appointment.opportunity && (
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <Building2 className="h-3 w-3" />
                          <span className="truncate">
                            {appointment.opportunity.name}
                          </span>
                        </div>
                      )}
                      {appointment.contact && (
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span>{appointment.contact.fullName}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{appointment.time}</span>
                      </div>
                    </div>
                    <Badge
                      className={cn(
                        "text-white text-xs shrink-0",
                        typeColors[appointment.appointmentType]
                      )}
                    >
                      {typeLabels[appointment.appointmentType]}
                    </Badge>
                  </div>
                </Link>
              ))
            ) : (
              <div className="p-8 text-center text-muted-foreground text-sm">
                No appointments scheduled for today
              </div>
            )}
          </div>
        </div>

        {/* Recent Notifications */}
        <div className="bg-white rounded-lg border">
          <div className="p-4 border-b">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-[#ff5603]" />
              <h2 className="font-semibold text-foreground">
                Recent Notifications
              </h2>
              <Badge variant="secondary" className="ml-auto">
                {notifications?.length ?? 0}
              </Badge>
            </div>
          </div>
          <div className="divide-y">
            {!user ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                Loading...
              </div>
            ) : notifications && notifications.length > 0 ? (
              notifications.map((notification) => {
                const Icon = notificationIcons[notification.type] || Bell;
                return (
                  <div
                    key={notification._id}
                    className={cn(
                      "p-4 hover:bg-muted/50 transition-colors cursor-pointer",
                      !notification.read && "bg-orange-50/50"
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex gap-3">
                        <div className="h-8 w-8 rounded-full bg-[#ff5603]/10 flex items-center justify-center flex-shrink-0">
                          <Icon className="h-4 w-4 text-[#ff5603]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-foreground">
                            {notification.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0 font-medium">
                        {formatTimeAgo(notification.createdAt)}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-muted-foreground text-sm">
                No notifications
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
