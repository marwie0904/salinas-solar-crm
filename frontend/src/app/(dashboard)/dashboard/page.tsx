"use client";

import { AppointmentType } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import {
  UserPlus,
  Trophy,
  Calendar,
  MessageSquare,
  Building2,
  User,
  Clock,
  TrendingUp,
  CheckSquare,
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

// Local interface for mock data (will be replaced with real data from backend)
interface MockAppointment {
  _id: string;
  title: string;
  date: string;
  time: string;
  location?: string;
  contactName: string;
  opportunityName: string;
  appointmentType: AppointmentType;
}

// Fixed mock data for the last 30 days (to avoid hydration mismatch)
const leadsChartData = [
  { date: "Nov 20", leads: 2 },
  { date: "Nov 21", leads: 3 },
  { date: "Nov 22", leads: 1 },
  { date: "Nov 23", leads: 4 },
  { date: "Nov 24", leads: 2 },
  { date: "Nov 25", leads: 0 },
  { date: "Nov 26", leads: 3 },
  { date: "Nov 27", leads: 5 },
  { date: "Nov 28", leads: 2 },
  { date: "Nov 29", leads: 1 },
  { date: "Nov 30", leads: 3 },
  { date: "Dec 1", leads: 4 },
  { date: "Dec 2", leads: 2 },
  { date: "Dec 3", leads: 1 },
  { date: "Dec 4", leads: 3 },
  { date: "Dec 5", leads: 2 },
  { date: "Dec 6", leads: 4 },
  { date: "Dec 7", leads: 1 },
  { date: "Dec 8", leads: 0 },
  { date: "Dec 9", leads: 2 },
  { date: "Dec 10", leads: 3 },
  { date: "Dec 11", leads: 5 },
  { date: "Dec 12", leads: 2 },
  { date: "Dec 13", leads: 1 },
  { date: "Dec 14", leads: 4 },
  { date: "Dec 15", leads: 3 },
  { date: "Dec 16", leads: 2 },
  { date: "Dec 17", leads: 1 },
  { date: "Dec 18", leads: 3 },
  { date: "Dec 19", leads: 2 },
];

// Calculate total leads this month from chart data
const totalLeadsThisMonth = leadsChartData.reduce((sum, day) => sum + day.leads, 0);

// Mock data for dashboard
const newLeadsThisWeek = 12;
const closedLeadsThisMonth = 8;

const appointmentsToday: MockAppointment[] = [
  {
    _id: "a1",
    title: "Site Assessment",
    date: "2024-12-19",
    time: "10:00 AM",
    location: "456 Ayala Ave, BGC",
    contactName: "Pedro Rodriguez",
    opportunityName: "Rodriguez Commercial Building",
    appointmentType: "field_inspection",
  },
  {
    _id: "a2",
    title: "Contract Discussion",
    date: "2024-12-19",
    time: "3:00 PM",
    location: "Office",
    contactName: "Teresa Villanueva",
    opportunityName: "Villanueva Residence",
    appointmentType: "discovery_call",
  },
  {
    _id: "a3",
    title: "Initial Consultation",
    date: "2024-12-19",
    time: "11:30 AM",
    location: "123 Mabini St, Makati City",
    contactName: "Juan Santos",
    opportunityName: "Santos Residence - 5kW System",
    appointmentType: "discovery_call",
  },
];

interface PendingMessage {
  _id: string;
  contactId: string;
  contactName: string;
  lastMessage: string;
  timeAgo: string;
}

// Fixed mock data with pre-computed time ago (to avoid hydration mismatch)
const pendingMessages: PendingMessage[] = [
  {
    _id: "pm1",
    contactId: "c1",
    contactName: "Juan Santos",
    lastMessage: "Interested in solar panel installation for my home",
    timeAgo: "30m",
  },
  {
    _id: "pm2",
    contactId: "c4",
    contactName: "Roberto Mendoza",
    lastMessage: "Thanks! We're reviewing with our finance team.",
    timeAgo: "9h",
  },
  {
    _id: "pm3",
    contactId: "c8",
    contactName: "Antonio Reyes",
    lastMessage: "Can you send me more info about the agricultural incentives?",
    timeAgo: "2h",
  },
  {
    _id: "pm4",
    contactId: "c3",
    contactName: "Ana Dela Cruz",
    lastMessage: "What financing options do you have available?",
    timeAgo: "5d",
  },
  {
    _id: "pm5",
    contactId: "c7",
    contactName: "Carmen Villanueva",
    lastMessage: "Is the site visit still happening tomorrow?",
    timeAgo: "45m",
  },
];

interface PendingTask {
  _id: string;
  title: string;
  dueDate: string;
  priority: "high" | "medium" | "low";
  contactName?: string;
  opportunityName?: string;
}

// Fixed mock data for pending tasks
const pendingTasks: PendingTask[] = [
  {
    _id: "t1",
    title: "Follow up on solar proposal",
    dueDate: "Today",
    priority: "high",
    contactName: "Juan Santos",
    opportunityName: "Santos Residence - 5kW System",
  },
  {
    _id: "t2",
    title: "Send revised quote",
    dueDate: "Today",
    priority: "high",
    contactName: "Pedro Rodriguez",
    opportunityName: "Rodriguez Commercial Building",
  },
  {
    _id: "t3",
    title: "Schedule site inspection",
    dueDate: "Tomorrow",
    priority: "medium",
    contactName: "Ana Dela Cruz",
    opportunityName: "Dela Cruz Residence",
  },
  {
    _id: "t4",
    title: "Prepare installation timeline",
    dueDate: "Dec 23",
    priority: "medium",
    contactName: "Teresa Villanueva",
    opportunityName: "Villanueva Residence",
  },
  {
    _id: "t5",
    title: "Review financing options",
    dueDate: "Dec 24",
    priority: "low",
    contactName: "Roberto Mendoza",
    opportunityName: "Mendoza Commercial",
  },
];

const priorityColors: Record<PendingTask["priority"], string> = {
  high: "bg-red-500",
  medium: "bg-yellow-500",
  low: "bg-gray-400",
};

const priorityLabels: Record<PendingTask["priority"], string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

const typeLabels: Record<AppointmentType, string> = {
  discovery_call: "Discovery Call",
  field_inspection: "Field Inspection",
};

const typeColors: Record<AppointmentType, string> = {
  discovery_call: "bg-blue-500",
  field_inspection: "bg-purple-500",
};

export default function DashboardPage() {
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
              {totalLeadsThisMonth}
            </p>
            <p className="text-xs text-muted-foreground">Total leads</p>
          </div>
        </div>
        <div className="h-[200px] md:h-[250px] w-full -ml-2 md:ml-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={leadsChartData}
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
                {newLeadsThisWeek}
              </p>
            </div>
            <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-[#ff5603]/10 flex items-center justify-center flex-shrink-0">
              <UserPlus className="h-5 w-5 md:h-6 md:w-6 text-[#ff5603]" />
            </div>
          </div>
        </div>

        {/* Closed Leads This Month */}
        <div className="bg-white rounded-lg border p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm font-medium text-muted-foreground">
                Closed This Month
              </p>
              <p className="text-2xl md:text-3xl font-bold text-foreground mt-1 md:mt-2">
                {closedLeadsThisMonth}
              </p>
            </div>
            <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
              <Trophy className="h-5 w-5 md:h-6 md:w-6 text-green-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Pending Tasks Section */}
      <div className="bg-white rounded-lg border">
        <div className="p-4 border-b">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-[#ff5603]" />
            <h2 className="font-semibold text-foreground">Pending Tasks</h2>
            <Badge variant="secondary" className="ml-auto">
              {pendingTasks.length}
            </Badge>
          </div>
        </div>
        <div className="divide-y">
          {pendingTasks.length > 0 ? (
            pendingTasks.map((task) => (
              <div
                key={task._id}
                className="p-4 hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground">
                      {task.title}
                    </p>
                    {task.opportunityName && (
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <Building2 className="h-3 w-3" />
                        <span className="truncate">{task.opportunityName}</span>
                      </div>
                    )}
                    {task.contactName && (
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <User className="h-3 w-3" />
                        <span>{task.contactName}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>Due: {task.dueDate}</span>
                    </div>
                  </div>
                  <Badge
                    className={cn(
                      "text-white text-xs shrink-0",
                      priorityColors[task.priority]
                    )}
                  >
                    {priorityLabels[task.priority]}
                  </Badge>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No pending tasks
            </div>
          )}
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
                {appointmentsToday.length}
              </Badge>
            </div>
          </div>
          <div className="divide-y">
            {appointmentsToday.length > 0 ? (
              appointmentsToday.map((appointment) => (
                <div
                  key={appointment._id}
                  className="p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground">
                        {appointment.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <Building2 className="h-3 w-3" />
                        <span className="truncate">
                          {appointment.opportunityName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <User className="h-3 w-3" />
                        <span>{appointment.contactName}</span>
                      </div>
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
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-muted-foreground text-sm">
                No appointments scheduled for today
              </div>
            )}
          </div>
        </div>

        {/* Pending Messages */}
        <div className="bg-white rounded-lg border">
          <div className="p-4 border-b">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-[#ff5603]" />
              <h2 className="font-semibold text-foreground">
                Pending Messages
              </h2>
              <Badge variant="secondary" className="ml-auto">
                {pendingMessages.length}
              </Badge>
            </div>
          </div>
          <div className="divide-y">
            {pendingMessages.length > 0 ? (
              pendingMessages.map((message) => (
                <div
                  key={message._id}
                  className="p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground">
                        {message.contactName}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {message.lastMessage}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0 font-medium">
                      {message.timeAgo}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-muted-foreground text-sm">
                No pending messages
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
