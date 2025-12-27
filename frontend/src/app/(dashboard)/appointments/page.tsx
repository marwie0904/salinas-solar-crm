"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Calendar as CalendarIcon,
  List,
  ChevronLeft,
  ChevronRight,
  Plus,
  User,
  Building2,
  MapPin,
  Clock,
  MoreHorizontal,
  Pencil,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AppointmentModal, Appointment } from "@/components/appointments/appointment-modal";
import { AppointmentWizardModal } from "@/components/appointments/appointment-wizard-modal";

type AppointmentStatus = "pending" | "cancelled" | "no_show" | "completed";
type AppointmentType = "discovery_call" | "field_inspection";

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
  const [currentDate, setCurrentDate] = useState(new Date());

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  // Delete confirmation state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [appointmentToDelete, setAppointmentToDelete] = useState<Appointment | null>(null);

  // Fetch real appointments data
  const appointments = useQuery(api.appointments.list, {});

  // Mutations
  const deleteAppointment = useMutation(api.appointments.remove);
  const updateAppointmentStatus = useMutation(api.appointments.updateStatus);

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
    start.setDate(start.getDate() - start.getDay());
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
    return appointments?.filter((apt) => apt.date === dateKey) || [];
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
  const todayKey = formatDateKey(new Date());

  // Handlers
  const handleEditClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (appointment: Appointment) => {
    setAppointmentToDelete(appointment);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (appointmentToDelete) {
      await deleteAppointment({ id: appointmentToDelete._id });
      setIsDeleteDialogOpen(false);
      setAppointmentToDelete(null);
    }
  };

  const handleStatusChange = async (appointmentId: Id<"appointments">, status: AppointmentStatus) => {
    await updateAppointmentStatus({ id: appointmentId, status });
  };

  const renderCalendarCard = (appointment: Appointment) => (
    <div
      key={appointment._id}
      className={cn(
        "text-xs p-1.5 rounded mb-1 bg-white border cursor-pointer hover:shadow-sm transition-shadow",
        appointment.status === "cancelled" || appointment.status === "no_show"
          ? "opacity-50"
          : ""
      )}
      onClick={() => handleEditClick(appointment)}
      title={`${appointment.opportunity?.name || "No opportunity"} - ${appointment.contact?.fullName || "Unknown"}`}
    >
      <div className={cn(
        "font-medium truncate text-foreground",
        (appointment.status === "cancelled" || appointment.status === "no_show") && "line-through"
      )}>
        {appointment.title}
      </div>
      <div className="truncate text-muted-foreground">{appointment.contact?.fullName || "Unknown"}</div>
      <Badge className={cn("mt-1 text-[10px] px-1.5 py-0 text-white", typeColors[appointment.appointmentType])}>
        {typeLabels[appointment.appointmentType]}
      </Badge>
    </div>
  );

  // Sort appointments for list view
  const sortedAppointments = [...(appointments || [])].sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;
    return a.time.localeCompare(b.time);
  });

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
        <Button
          className="bg-[#ff5603] hover:bg-[#ff5603]/90"
          onClick={() => setIsCreateModalOpen(true)}
        >
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
                  const dayAppointments = getAppointmentsForDate(dateKey);
                  const isToday = dateKey === todayKey;

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
                        {dayAppointments.slice(0, 2).map(renderCalendarCard)}
                        {dayAppointments.length > 2 && (
                          <div className="text-xs text-muted-foreground">
                            +{dayAppointments.length - 2} more
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
                  const dayAppointments = getAppointmentsForDate(dateKey);
                  const isToday = dateKey === todayKey;

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
                        {dayAppointments.map((apt) => (
                          <div
                            key={apt._id}
                            className={cn(
                              "p-2 rounded text-xs bg-white border cursor-pointer hover:shadow-sm transition-shadow",
                              apt.status === "cancelled" || apt.status === "no_show"
                                ? "opacity-50"
                                : ""
                            )}
                            onClick={() => handleEditClick(apt)}
                          >
                            <div className="font-medium flex items-center gap-1 mb-1 text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {apt.time}
                            </div>
                            <div className={cn(
                              "font-medium truncate text-foreground",
                              (apt.status === "cancelled" || apt.status === "no_show") && "line-through"
                            )}>
                              {apt.title}
                            </div>
                            <div className="truncate text-muted-foreground">
                              {apt.contact?.fullName || "Unknown"}
                            </div>
                            <Badge className={cn("mt-1 text-[10px] px-1.5 py-0 text-white", typeColors[apt.appointmentType])}>
                              {typeLabels[apt.appointmentType]}
                            </Badge>
                          </div>
                        ))}
                        {dayAppointments.length === 0 && (
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
                <TableHead>Title</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAppointments.map((appointment) => (
                <TableRow
                  key={appointment._id}
                  className="cursor-pointer hover:bg-muted/50"
                >
                  <TableCell onClick={() => handleEditClick(appointment)}>
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
                  <TableCell onClick={() => handleEditClick(appointment)}>
                    <span className={cn(
                      (appointment.status === "cancelled" || appointment.status === "no_show") && "line-through opacity-50"
                    )}>
                      {appointment.title}
                    </span>
                  </TableCell>
                  <TableCell onClick={() => handleEditClick(appointment)}>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>{appointment.contact?.fullName || "Unknown"}</span>
                    </div>
                  </TableCell>
                  <TableCell onClick={() => handleEditClick(appointment)}>
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-[#ff5603] flex items-center justify-center text-white text-xs font-medium">
                        {appointment.assignedUser?.fullName
                          ?.split(" ")
                          .map((n) => n[0])
                          .join("") || "?"}
                      </div>
                      <span>{appointment.assignedUser?.fullName || "Unassigned"}</span>
                    </div>
                  </TableCell>
                  <TableCell onClick={() => handleEditClick(appointment)}>
                    <Badge className={`${typeColors[appointment.appointmentType]} text-white`}>
                      {typeLabels[appointment.appointmentType]}
                    </Badge>
                  </TableCell>
                  <TableCell onClick={() => handleEditClick(appointment)}>
                    <Badge className={`${statusColors[appointment.status]} text-white`}>
                      {statusLabels[appointment.status]}
                    </Badge>
                  </TableCell>
                  <TableCell onClick={() => handleEditClick(appointment)}>
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
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditClick(appointment)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {appointment.status === "pending" && (
                          <>
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(appointment._id, "completed")}
                            >
                              <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                              Mark Completed
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(appointment._id, "no_show")}
                            >
                              <AlertCircle className="h-4 w-4 mr-2 text-slate-500" />
                              Mark No-Show
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(appointment._id, "cancelled")}
                            >
                              <XCircle className="h-4 w-4 mr-2 text-red-500" />
                              Cancel
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </>
                        )}
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleDeleteClick(appointment)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {(!appointments || appointments.length === 0) && (
                <TableRow>
                  <TableCell
                    colSpan={8}
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

      {/* Create Appointment Wizard Modal */}
      <AppointmentWizardModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
      />

      {/* Edit Appointment Modal */}
      <AppointmentModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        mode="edit"
        appointment={selectedAppointment}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Appointment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{appointmentToDelete?.title}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
