"use client";

import { useState } from "react";
import {
  AppointmentStatus,
  AppointmentType,
} from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar as CalendarIcon,
  List,
  ChevronLeft,
  ChevronRight,
  Plus,
  User,
  Building2,
  Phone,
  MapPin,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Local interface for mock data (will be replaced with real data from backend)
interface MockAppointment {
  _id: string;
  title: string;
  date: string;
  time: string;
  location?: string;
  contactId: string;
  contactName: string;
  opportunityId: string;
  opportunityName: string;
  assignedUserId: string;
  assignedUserName: string;
  status: AppointmentStatus;
  appointmentType: AppointmentType;
}

// Mock data for appointments
const mockAppointments: MockAppointment[] = [
  {
    _id: "apt1",
    title: "Site Assessment - Santos Residence",
    date: "2024-01-25",
    time: "09:00",
    location: "123 Solar Street, Salinas, Cavite",
    contactId: "c1",
    contactName: "Maria Santos",
    opportunityId: "opp1",
    opportunityName: "Santos Residence Solar Installation",
    assignedUserId: "u1",
    assignedUserName: "Juan Rivera",
    status: "pending",
    appointmentType: "field_inspection",
  },
  {
    _id: "apt2",
    title: "Discovery Call - Dela Cruz Commercial",
    date: "2024-01-25",
    time: "14:00",
    contactId: "c2",
    contactName: "Juan Dela Cruz",
    opportunityId: "opp2",
    opportunityName: "Dela Cruz Commercial Project",
    assignedUserId: "u2",
    assignedUserName: "Ana Garcia",
    status: "pending",
    appointmentType: "discovery_call",
  },
  {
    _id: "apt3",
    title: "Follow-up Inspection - Reyes Home",
    date: "2024-01-26",
    time: "10:30",
    location: "789 Green Ave, Bacoor, Cavite",
    contactId: "c3",
    contactName: "Ana Reyes",
    opportunityId: "opp3",
    opportunityName: "Reyes Home Solar System",
    assignedUserId: "u1",
    assignedUserName: "Juan Rivera",
    status: "completed",
    appointmentType: "field_inspection",
  },
  {
    _id: "apt4",
    title: "Initial Call - Garcia Building",
    date: "2024-01-27",
    time: "11:00",
    contactId: "c4",
    contactName: "Pedro Garcia",
    opportunityId: "opp4",
    opportunityName: "Garcia Building Rooftop Solar",
    assignedUserId: "u2",
    assignedUserName: "Ana Garcia",
    status: "pending",
    appointmentType: "discovery_call",
  },
  {
    _id: "apt5",
    title: "Site Survey - Cruz Factory",
    date: "2024-01-22",
    time: "08:00",
    location: "789 Energy Road, Imus, Cavite",
    contactId: "c5",
    contactName: "Elena Cruz",
    opportunityId: "opp5",
    opportunityName: "Cruz Factory Solar Installation",
    assignedUserId: "u1",
    assignedUserName: "Juan Rivera",
    status: "completed",
    appointmentType: "field_inspection",
  },
  {
    _id: "apt6",
    title: "Discovery Call - Villanueva",
    date: "2024-01-23",
    time: "15:00",
    contactId: "c7",
    contactName: "Carmen Villanueva",
    opportunityId: "opp6",
    opportunityName: "Villanueva Warehouse Project",
    assignedUserId: "u2",
    assignedUserName: "Ana Garcia",
    status: "cancelled",
    appointmentType: "discovery_call",
  },
  {
    _id: "apt7",
    title: "Second Site Visit - Santos",
    date: "2024-01-29",
    time: "09:30",
    location: "123 Solar Street, Salinas, Cavite",
    contactId: "c1",
    contactName: "Maria Santos",
    opportunityId: "opp1",
    opportunityName: "Santos Residence Solar Installation",
    assignedUserId: "u1",
    assignedUserName: "Juan Rivera",
    status: "pending",
    appointmentType: "field_inspection",
  },
  {
    _id: "apt8",
    title: "Rescheduled Call - Lim",
    date: "2024-01-24",
    time: "16:00",
    contactId: "c6",
    contactName: "Roberto Lim",
    opportunityId: "opp7",
    opportunityName: "Lim Residence Solar",
    assignedUserId: "u2",
    assignedUserName: "Ana Garcia",
    status: "no_show",
    appointmentType: "discovery_call",
  },
];

const statusLabels: Record<AppointmentStatus, string> = {
  pending: "Pending",
  cancelled: "Cancelled",
  no_show: "No-Show",
  completed: "Completed",
};

const statusColors: Record<AppointmentStatus, string> = {
  pending: "bg-amber-500",
  cancelled: "bg-red-500",
  no_show: "bg-slate-500",
  completed: "bg-green-500",
};

const typeLabels: Record<AppointmentType, string> = {
  discovery_call: "Discovery Call",
  field_inspection: "Field Inspection",
};

const typeColors: Record<AppointmentType, string> = {
  discovery_call: "bg-blue-500",
  field_inspection: "bg-purple-500",
};

type ViewMode = "calendar" | "list";
type CalendarView = "month" | "week";

export default function AppointmentsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("calendar");
  const [calendarView, setCalendarView] = useState<CalendarView>("month");
  const [currentDate, setCurrentDate] = useState(new Date(2024, 0, 25)); // January 25, 2024

  // Calendar helper functions
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const getWeekDays = (date: Date) => {
    const start = new Date(date);
    start.setDate(start.getDate() - start.getDay()); // Start from Sunday
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const formatDateKey = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };

  const getAppointmentsForDate = (dateKey: string) => {
    return mockAppointments.filter((apt) => apt.date === dateKey);
  };

  const navigateMonth = (direction: number) => {
    const newDate = new Date(currentDate);
    if (calendarView === "month") {
      newDate.setMonth(newDate.getMonth() + direction);
    } else {
      newDate.setDate(newDate.getDate() + direction * 7);
    }
    setCurrentDate(newDate);
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentDate);
  const weekDays = getWeekDays(currentDate);

  const renderCalendarCard = (appointment: MockAppointment) => (
    <div
      key={appointment._id}
      className={cn(
        "text-xs p-1.5 rounded mb-1 bg-white border",
        appointment.status === "cancelled" || appointment.status === "no_show"
          ? "opacity-50"
          : ""
      )}
      title={`${appointment.opportunityName} - ${appointment.contactName}`}
    >
      <div className={cn(
        "font-medium truncate text-foreground",
        (appointment.status === "cancelled" || appointment.status === "no_show") && "line-through"
      )}>
        {appointment.opportunityName}
      </div>
      <div className="truncate text-muted-foreground">{appointment.contactName}</div>
      <Badge className={cn("mt-1 text-[10px] px-1.5 py-0 text-white", typeColors[appointment.appointmentType])}>
        {typeLabels[appointment.appointmentType]}
      </Badge>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Appointments</h1>
          <p className="text-muted-foreground">
            Schedule and manage your appointments.
          </p>
        </div>
        <Button className="bg-[#ff5603] hover:bg-[#ff5603]/90">
          <Plus className="h-4 w-4 mr-2" />
          Add Appointment
        </Button>
      </div>

      {/* View Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "calendar" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("calendar")}
            className={viewMode === "calendar" ? "bg-[#ff5603] hover:bg-[#ff5603]/90" : ""}
          >
            <CalendarIcon className="h-4 w-4 mr-2" />
            Calendar
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
            className={viewMode === "list" ? "bg-[#ff5603] hover:bg-[#ff5603]/90" : ""}
          >
            <List className="h-4 w-4 mr-2" />
            List
          </Button>
        </div>

        {viewMode === "calendar" && (
          <div className="flex items-center gap-2">
            <Button
              variant={calendarView === "month" ? "default" : "outline"}
              size="sm"
              onClick={() => setCalendarView("month")}
              className={calendarView === "month" ? "bg-[#ff5603] hover:bg-[#ff5603]/90" : ""}
            >
              Month
            </Button>
            <Button
              variant={calendarView === "week" ? "default" : "outline"}
              size="sm"
              onClick={() => setCalendarView("week")}
              className={calendarView === "week" ? "bg-[#ff5603] hover:bg-[#ff5603]/90" : ""}
            >
              Week
            </Button>
          </div>
        )}
      </div>

      {/* Calendar View */}
      {viewMode === "calendar" && (
        <div className="rounded-lg border bg-white">
          {/* Calendar Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <Button variant="ghost" size="sm" onClick={() => navigateMonth(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-lg font-semibold">
              {calendarView === "month"
                ? `${monthNames[month]} ${year}`
                : `Week of ${monthNames[weekDays[0].getMonth()]} ${weekDays[0].getDate()}, ${weekDays[0].getFullYear()}`}
            </h2>
            <Button variant="ghost" size="sm" onClick={() => navigateMonth(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Calendar Grid */}
          {calendarView === "month" ? (
            <div className="p-4">
              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {dayNames.map((day) => (
                  <div
                    key={day}
                    className="text-center text-sm font-medium text-muted-foreground py-2"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7 gap-1">
                {/* Empty cells for days before the first of the month */}
                {Array.from({ length: startingDayOfWeek }).map((_, index) => (
                  <div
                    key={`empty-${index}`}
                    className="min-h-[100px] p-2 bg-muted/30 rounded"
                  />
                ))}

                {/* Days of the month */}
                {Array.from({ length: daysInMonth }).map((_, index) => {
                  const day = index + 1;
                  const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const appointments = getAppointmentsForDate(dateKey);
                  const isToday = dateKey === formatDateKey(new Date(2024, 0, 25)); // Mock "today"

                  return (
                    <div
                      key={day}
                      className={cn(
                        "min-h-[100px] p-2 rounded border",
                        isToday ? "border-[#ff5603] bg-[#ff5603]/5" : "border-transparent"
                      )}
                    >
                      <div
                        className={cn(
                          "text-sm font-medium mb-1",
                          isToday ? "text-[#ff5603]" : ""
                        )}
                      >
                        {day}
                      </div>
                      <div className="space-y-1">
                        {appointments.slice(0, 2).map(renderCalendarCard)}
                        {appointments.length > 2 && (
                          <div className="text-xs text-muted-foreground">
                            +{appointments.length - 2} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Week View */
            <div className="p-4">
              <div className="grid grid-cols-7 gap-2">
                {weekDays.map((day) => {
                  const dateKey = formatDateKey(day);
                  const appointments = getAppointmentsForDate(dateKey);
                  const isToday = dateKey === formatDateKey(new Date(2024, 0, 25)); // Mock "today"

                  return (
                    <div key={dateKey} className="min-h-[300px]">
                      <div
                        className={cn(
                          "text-center p-2 rounded-t border-b",
                          isToday ? "bg-[#ff5603] text-white" : "bg-muted/50"
                        )}
                      >
                        <div className="text-sm font-medium">
                          {dayNames[day.getDay()]}
                        </div>
                        <div className="text-lg font-bold">{day.getDate()}</div>
                      </div>
                      <div className="p-2 space-y-2 border-l border-r border-b rounded-b min-h-[250px]">
                        {appointments.map((apt) => (
                          <div
                            key={apt._id}
                            className={cn(
                              "p-2 rounded text-xs bg-white border",
                              apt.status === "cancelled" || apt.status === "no_show"
                                ? "opacity-50"
                                : ""
                            )}
                          >
                            <div className="font-medium flex items-center gap-1 mb-1 text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {apt.time}
                            </div>
                            <div className={cn(
                              "font-medium truncate text-foreground",
                              (apt.status === "cancelled" || apt.status === "no_show") && "line-through"
                            )}>
                              {apt.opportunityName}
                            </div>
                            <div className="truncate text-muted-foreground">
                              {apt.contactName}
                            </div>
                            <Badge className={cn("mt-1 text-[10px] px-1.5 py-0 text-white", typeColors[apt.appointmentType])}>
                              {typeLabels[apt.appointmentType]}
                            </Badge>
                          </div>
                        ))}
                        {appointments.length === 0 && (
                          <div className="text-xs text-muted-foreground text-center py-4">
                            No appointments
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* List View */}
      {viewMode === "list" && (
        <div className="rounded-lg border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Time</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Opportunity</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Location</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockAppointments
                .sort((a, b) => {
                  const dateCompare = a.date.localeCompare(b.date);
                  if (dateCompare !== 0) return dateCompare;
                  return a.time.localeCompare(b.time);
                })
                .map((appointment) => (
                  <TableRow
                    key={appointment._id}
                    className="cursor-pointer hover:bg-muted/50"
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">
                            {new Date(appointment.date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {appointment.time}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{appointment.contactName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="max-w-[200px] truncate">
                          {appointment.opportunityName}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-[#ff5603] flex items-center justify-center text-white text-xs font-medium">
                          {appointment.assignedUserName
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </div>
                        <span>{appointment.assignedUserName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${typeColors[appointment.appointmentType]} text-white`}>
                        {typeLabels[appointment.appointmentType]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${statusColors[appointment.status]} text-white`}>
                        {statusLabels[appointment.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {appointment.location ? (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="max-w-[150px] truncate">
                            {appointment.location}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              {mockAppointments.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No appointments found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
