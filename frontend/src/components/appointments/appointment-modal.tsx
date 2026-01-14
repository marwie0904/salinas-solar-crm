"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Calendar, ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";

export interface Appointment {
  _id: Id<"appointments">;
  title: string;
  description?: string;
  appointmentType: "discovery_call" | "field_inspection";
  status: "pending" | "cancelled" | "no_show" | "completed";
  date: string;
  time: string;
  startTime: number;
  endTime?: number;
  location?: string;
  contactId: Id<"contacts">;
  opportunityId?: Id<"opportunities">;
  assignedTo: Id<"users">;
  notes?: string;
  cancellationReason?: string;
  isDeleted: boolean;
  createdBy?: Id<"users">;
  createdAt: number;
  updatedAt: number;
  contact?: {
    _id: Id<"contacts">;
    fullName: string;
  } | null;
  opportunity?: {
    _id: Id<"opportunities">;
    name: string;
  } | null;
  assignedUser?: {
    _id: Id<"users">;
    fullName: string;
  } | null;
}

interface AppointmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  mode?: "create" | "edit";
  appointment?: Appointment | null;
  defaultContactId?: Id<"contacts">;
  defaultOpportunityId?: Id<"opportunities">;
}

interface FormData {
  title: string;
  notes: string;
  appointmentType: "discovery_call" | "field_inspection" | "";
  date: string;
  time: string;
  assignedTo: string;
  contactId: Id<"contacts"> | null;
  opportunityId: Id<"opportunities"> | null;
  location: string;
}

// Time slots from 8:00 AM to 5:00 PM (30 min intervals)
const timeSlots = [
  "8:00 AM", "8:30 AM",
  "9:00 AM", "9:30 AM",
  "10:00 AM", "10:30 AM",
  "11:00 AM", "11:30 AM",
  "12:00 PM", "12:30 PM",
  "1:00 PM", "1:30 PM",
  "2:00 PM", "2:30 PM",
  "3:00 PM", "3:30 PM",
  "4:00 PM", "4:30 PM",
];

type DateTimeStep = "none" | "date" | "time";

export function AppointmentModal({
  open,
  onOpenChange,
  onSuccess,
  mode = "create",
  appointment,
  defaultContactId,
  defaultOpportunityId,
}: AppointmentModalProps) {
  const isEditMode = mode === "edit";

  const [formData, setFormData] = useState<FormData>({
    title: "",
    notes: "",
    appointmentType: "",
    date: "",
    time: "",
    assignedTo: "",
    contactId: defaultContactId || null,
    opportunityId: defaultOpportunityId || null,
    location: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [dateTimeStep, setDateTimeStep] = useState<DateTimeStep>("none");
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [tempDate, setTempDate] = useState("");

  // Fetch data for dropdowns
  const users = useQuery(api.users.list, {});
  const contacts = useQuery(api.contacts.list, {});
  const opportunities = useQuery(api.opportunities.list, {});
  const systemConsultants = useQuery(api.users.listSystemConsultants, {});

  const createAppointment = useMutation(api.appointments.create);
  const updateAppointment = useMutation(api.appointments.update);

  // Initialize/reset form when modal opens or appointment changes
  useEffect(() => {
    if (open) {
      setDateTimeStep("none");
      setTempDate("");
      if (isEditMode && appointment) {
        setFormData({
          title: appointment.title,
          notes: appointment.notes || appointment.description || "",
          appointmentType: appointment.appointmentType,
          date: appointment.date,
          time: appointment.time,
          assignedTo: appointment.assignedTo,
          contactId: appointment.contactId,
          opportunityId: appointment.opportunityId || null,
          location: appointment.location || "",
        });
        // Set calendar to appointment date
        if (appointment.date) {
          setCalendarDate(new Date(appointment.date));
        }
      } else {
        // Reset form for create mode
        const today = new Date();
        const dateStr = today.toISOString().split("T")[0];
        setFormData({
          title: "",
          notes: "",
          appointmentType: "",
          date: dateStr,
          time: "",
          assignedTo: "",
          contactId: defaultContactId || null,
          opportunityId: defaultOpportunityId || null,
          location: "",
        });
        setCalendarDate(today);
      }
    }
  }, [open, isEditMode, appointment, defaultContactId, defaultOpportunityId]);

  // Calendar helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(calendarDate);

  const navigateMonth = (direction: number) => {
    const newDate = new Date(calendarDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setCalendarDate(newDate);
  };

  const isDateSelectable = (dateKey: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(dateKey);
    return checkDate >= today;
  };

  const formatDateKey = (year: number, month: number, day: number) => {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  };

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const todayKey = formatDateKey(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

  const handleDateSelect = (dateKey: string) => {
    if (isDateSelectable(dateKey)) {
      setTempDate(dateKey);
    }
  };

  const handleTimeSelect = (time: string) => {
    setFormData((prev) => ({ ...prev, date: tempDate, time }));
    setDateTimeStep("none");
  };

  const startDateTimeChange = () => {
    setTempDate(formData.date);
    if (formData.date) {
      setCalendarDate(new Date(formData.date));
    }
    setDateTimeStep("date");
  };

  // Filter opportunities based on selected contact
  const filteredOpportunities = opportunities?.filter(
    (opp) => !formData.contactId || opp.contactId === formData.contactId
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.title.trim() ||
      !formData.appointmentType ||
      !formData.date ||
      !formData.time ||
      !formData.assignedTo ||
      !formData.contactId
    ) {
      return;
    }

    setIsSaving(true);
    try {
      if (isEditMode && appointment) {
        await updateAppointment({
          id: appointment._id,
          title: formData.title,
          description: formData.notes || undefined,
          appointmentType: formData.appointmentType as "discovery_call" | "field_inspection",
          date: formData.date,
          time: formData.time,
          assignedTo: formData.assignedTo as Id<"users">,
          opportunityId: formData.opportunityId || undefined,
          location: formData.location || undefined,
          notes: formData.notes || undefined,
        });
      } else {
        await createAppointment({
          title: formData.title,
          description: formData.notes || undefined,
          appointmentType: formData.appointmentType as "discovery_call" | "field_inspection",
          date: formData.date,
          time: formData.time,
          assignedTo: formData.assignedTo as Id<"users">,
          contactId: formData.contactId,
          opportunityId: formData.opportunityId || undefined,
          location: formData.location || undefined,
          notes: formData.notes || undefined,
        });
      }

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error(`Failed to ${isEditMode ? "update" : "create"} appointment:`, error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("sm:max-w-[500px] bg-background border shadow-lg overflow-hidden")}>
        {/* Date/Time Picker Overlay for Edit Mode */}
        {dateTimeStep !== "none" && (
          <div className="absolute inset-0 bg-background z-50 flex flex-col">
            {/* Header */}
            <div className="p-6 pb-4 border-b">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-full bg-muted"
                  onClick={() => {
                    if (dateTimeStep === "time") {
                      setDateTimeStep("date");
                    } else {
                      setDateTimeStep("none");
                    }
                  }}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold">Change Date & Time</h2>
                  <p className="text-sm text-muted-foreground">
                    {dateTimeStep === "date" ? "Select a new date" : "Select a time"}
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 flex-1 overflow-auto">
              {/* Date Selection */}
              {dateTimeStep === "date" && (
                <div className="space-y-4">
                  {/* Calendar Navigation */}
                  <div className="flex items-center justify-between">
                    <Button variant="ghost" size="icon" onClick={() => navigateMonth(-1)}>
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <h3 className="text-lg font-semibold">
                      {monthNames[month]} {year}
                    </h3>
                    <Button variant="ghost" size="icon" onClick={() => navigateMonth(1)}>
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                  </div>

                  {/* Day Headers */}
                  <div className="grid grid-cols-7 gap-1">
                    {dayNames.map((day) => (
                      <div
                        key={day}
                        className="text-center text-sm font-medium text-muted-foreground py-2"
                      >
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-1">
                    {/* Empty cells */}
                    {Array.from({ length: startingDayOfWeek }).map((_, index) => (
                      <div key={`empty-${index}`} className="h-10" />
                    ))}

                    {/* Days */}
                    {Array.from({ length: daysInMonth }).map((_, index) => {
                      const day = index + 1;
                      const dateKey = formatDateKey(year, month, day);
                      const isSelectable = isDateSelectable(dateKey);
                      const isSelected = tempDate === dateKey;
                      const isToday = dateKey === todayKey;

                      return (
                        <button
                          key={day}
                          type="button"
                          className={cn(
                            "h-10 w-full rounded-full text-sm font-medium transition-all",
                            isSelectable
                              ? "hover:bg-muted cursor-pointer"
                              : "text-muted-foreground/40 cursor-not-allowed",
                            isSelected && "bg-[#ff5603] text-white hover:bg-[#ff5603]",
                            isToday && !isSelected && "bg-[#ff5603]/10 text-[#ff5603]"
                          )}
                          onClick={() => handleDateSelect(dateKey)}
                          disabled={!isSelectable}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>

                  {/* Next Button */}
                  <Button
                    className="w-full bg-[#ff5603] hover:bg-[#e64d00] mt-4"
                    onClick={() => setDateTimeStep("time")}
                    disabled={!tempDate}
                  >
                    Next: Select Time
                  </Button>
                </div>
              )}

              {/* Time Selection */}
              {dateTimeStep === "time" && (
                <div className="space-y-4">
                  <div className="text-center mb-4">
                    <p className="font-medium">{formatDisplayDate(tempDate)}</p>
                  </div>

                  {/* Time Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    {timeSlots.map((time) => (
                      <button
                        key={time}
                        type="button"
                        className={cn(
                          "p-4 rounded-lg border text-sm font-medium transition-all",
                          formData.time === time && formData.date === tempDate
                            ? "border-[#ff5603] bg-[#ff5603]/5 text-[#ff5603]"
                            : "hover:border-muted-foreground/50"
                        )}
                        onClick={() => handleTimeSelect(time)}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit Appointment" : "Add Appointment"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Appointment Title */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Appointment Title *</label>
            <Input
              placeholder="Enter appointment title"
              value={formData.title}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, title: e.target.value }))
              }
              required
            />
          </div>

          {/* Appointment Notes */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Notes</label>
            <Textarea
              placeholder="Enter appointment notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, notes: e.target.value }))
              }
              rows={3}
            />
          </div>

          {/* Appointment Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Appointment Type *</label>
            <Select
              value={formData.appointmentType}
              onValueChange={(value) => {
                const newType = value as "discovery_call" | "field_inspection";
                // If field_inspection is selected and no attendee is set, default to first system consultant
                if (newType === "field_inspection" && !formData.assignedTo && systemConsultants?.length) {
                  const defaultConsultant = systemConsultants[0];
                  setFormData((prev) => ({
                    ...prev,
                    appointmentType: newType,
                    assignedTo: defaultConsultant._id,
                  }));
                } else {
                  setFormData((prev) => ({
                    ...prev,
                    appointmentType: newType,
                  }));
                }
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="discovery_call">Discovery Call</SelectItem>
                <SelectItem value="field_inspection">Field Inspection</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date and Time - Different UI for edit mode */}
          {isEditMode ? (
            <div className="space-y-2">
              <label className="text-sm font-medium">Date & Time *</label>
              <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="font-medium">
                    {formData.date ? formatDisplayDate(formData.date) : "No date selected"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formData.time || "No time selected"}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={startDateTimeChange}
                >
                  Change Date & Time
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {/* Date */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Date *</label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, date: e.target.value }))
                  }
                  required
                />
              </div>

              {/* Time */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Time *</label>
                <Select
                  value={formData.time}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, time: value }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeSlots.map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Attendee (Assigned To) */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Attendee *</label>
            <Select
              value={formData.assignedTo}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, assignedTo: value }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select attendee" />
              </SelectTrigger>
              <SelectContent>
                {users?.map((user) => (
                  <SelectItem key={user._id} value={user._id}>
                    {user.firstName} {user.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Contact - disabled in edit mode */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Contact *</label>
            <Select
              value={formData.contactId || ""}
              onValueChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  contactId: value as Id<"contacts">,
                  opportunityId: null,
                }))
              }
              disabled={isEditMode}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select contact" />
              </SelectTrigger>
              <SelectContent>
                {contacts?.map((contact) => (
                  <SelectItem key={contact._id} value={contact._id}>
                    {contact.firstName} {contact.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Opportunity (optional) */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Opportunity (optional)</label>
            <Select
              value={formData.opportunityId || "none"}
              onValueChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  opportunityId: value === "none" ? null : (value as Id<"opportunities">),
                }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select opportunity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {filteredOpportunities?.map((opp) => (
                  <SelectItem key={opp._id} value={opp._id}>
                    {opp.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Location (optional, shown for field inspection) */}
          {formData.appointmentType === "field_inspection" && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Location</label>
              <Input
                placeholder="Enter location address"
                value={formData.location}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, location: e.target.value }))
                }
              />
            </div>
          )}

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-[#ff5603] hover:bg-[#e64d00] cursor-pointer"
              disabled={
                isSaving ||
                !formData.title.trim() ||
                !formData.appointmentType ||
                !formData.date ||
                !formData.time ||
                !formData.assignedTo ||
                !formData.contactId
              }
            >
              {isSaving
                ? isEditMode
                  ? "Saving..."
                  : "Creating..."
                : isEditMode
                  ? "Save Changes"
                  : "Create Appointment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
