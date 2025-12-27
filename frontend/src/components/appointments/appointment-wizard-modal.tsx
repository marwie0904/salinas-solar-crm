"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  User,
  Target,
  Calendar,
  Clock,
  CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AppointmentWizardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  defaultContactId?: Id<"contacts">;
  defaultOpportunityId?: Id<"opportunities">;
}

type Step = "details" | "date" | "time" | "confirm";

interface WizardData {
  assignedTo: string;
  assignedUserName: string;
  contactId: Id<"contacts"> | null;
  contactName: string;
  opportunityId: Id<"opportunities"> | null;
  opportunityName: string;
  appointmentType: "discovery_call" | "field_inspection" | "";
  date: string;
  time: string;
  selectedContactOpportunity: string; // Combined selector value
}

interface ContactOpportunityOption {
  id: string;
  contactId: Id<"contacts">;
  contactName: string;
  opportunityId: Id<"opportunities"> | null;
  opportunityName: string | null;
}

const appointmentTypeLabels: Record<string, string> = {
  discovery_call: "Discovery Call",
  field_inspection: "Field Inspection",
};

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

export function AppointmentWizardModal({
  open,
  onOpenChange,
  onSuccess,
  defaultContactId,
  defaultOpportunityId,
}: AppointmentWizardModalProps) {
  const [currentStep, setCurrentStep] = useState<Step>("details");
  const [wizardData, setWizardData] = useState<WizardData>({
    assignedTo: "",
    assignedUserName: "",
    contactId: defaultContactId || null,
    contactName: "",
    opportunityId: defaultOpportunityId || null,
    opportunityName: "",
    appointmentType: "",
    date: "",
    time: "",
    selectedContactOpportunity: "",
  });
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [isSaving, setIsSaving] = useState(false);

  // Fetch data
  const users = useQuery(api.users.list, {});
  const contacts = useQuery(api.contacts.list, {});
  const opportunities = useQuery(api.opportunities.list, {});

  const createAppointment = useMutation(api.appointments.create);

  // Reset wizard when modal opens
  useEffect(() => {
    if (open) {
      setCurrentStep("details");
      setWizardData({
        assignedTo: "",
        assignedUserName: "",
        contactId: defaultContactId || null,
        contactName: "",
        opportunityId: defaultOpportunityId || null,
        opportunityName: "",
        appointmentType: "",
        date: "",
        time: "",
        selectedContactOpportunity: "",
      });
      setCalendarDate(new Date());
    }
  }, [open, defaultContactId, defaultOpportunityId]);

  // Build combined contact/opportunity options
  const contactOpportunityOptions: ContactOpportunityOption[] = [];

  if (contacts && opportunities) {
    const opportunitiesByContact = new Map<string, typeof opportunities>();

    opportunities.forEach((opp) => {
      const existing = opportunitiesByContact.get(opp.contactId) || [];
      opportunitiesByContact.set(opp.contactId, [...existing, opp]);
    });

    contacts.forEach((contact) => {
      const contactOpps = opportunitiesByContact.get(contact._id) || [];

      if (contactOpps.length > 0) {
        contactOpps.forEach((opp) => {
          contactOpportunityOptions.push({
            id: `${contact._id}|${opp._id}`,
            contactId: contact._id,
            contactName: `${contact.firstName} ${contact.lastName}`,
            opportunityId: opp._id,
            opportunityName: opp.name,
          });
        });
      } else {
        contactOpportunityOptions.push({
          id: `${contact._id}|none`,
          contactId: contact._id,
          contactName: `${contact.firstName} ${contact.lastName}`,
          opportunityId: null,
          opportunityName: null,
        });
      }
    });
  }

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
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  // Generate auto title
  const generateTitle = () => {
    const parts = [];
    if (wizardData.assignedUserName) parts.push(wizardData.assignedUserName);
    if (wizardData.appointmentType) parts.push(appointmentTypeLabels[wizardData.appointmentType]);

    let suffix = "";
    if (wizardData.opportunityName && wizardData.contactName) {
      suffix = `${wizardData.opportunityName} : ${wizardData.contactName}`;
    } else if (wizardData.contactName) {
      suffix = wizardData.contactName;
    }

    if (parts.length > 0 && suffix) {
      return `${parts.join(" - ")} - ${suffix}`;
    }
    return parts.join(" - ") || suffix;
  };

  // Step validation
  const canProceedFromDetails = () => {
    return (
      wizardData.assignedTo &&
      wizardData.selectedContactOpportunity &&
      wizardData.appointmentType
    );
  };

  const canProceedFromDate = () => {
    return !!wizardData.date;
  };

  const canProceedFromTime = () => {
    return !!wizardData.time;
  };

  // Navigation
  const goBack = () => {
    switch (currentStep) {
      case "date":
        setCurrentStep("details");
        break;
      case "time":
        setCurrentStep("date");
        break;
      case "confirm":
        setCurrentStep("time");
        break;
    }
  };

  const goNext = () => {
    switch (currentStep) {
      case "details":
        if (canProceedFromDetails()) setCurrentStep("date");
        break;
      case "date":
        if (canProceedFromDate()) setCurrentStep("time");
        break;
      case "time":
        if (canProceedFromTime()) setCurrentStep("confirm");
        break;
    }
  };

  // Handle user selection
  const handleUserSelect = (userId: string) => {
    const user = users?.find((u) => u._id === userId);
    setWizardData((prev) => ({
      ...prev,
      assignedTo: userId,
      assignedUserName: user ? `${user.firstName} ${user.lastName}` : "",
    }));
  };

  // Handle combined contact/opportunity selection
  const handleContactOpportunitySelect = (value: string) => {
    const option = contactOpportunityOptions.find((opt) => opt.id === value);
    if (option) {
      setWizardData((prev) => ({
        ...prev,
        selectedContactOpportunity: value,
        contactId: option.contactId,
        contactName: option.contactName,
        opportunityId: option.opportunityId,
        opportunityName: option.opportunityName || "",
      }));
    }
  };

  // Get display value for combined selector
  const getContactOpportunityDisplay = () => {
    if (!wizardData.selectedContactOpportunity) return null;
    return contactOpportunityOptions.find(
      (opt) => opt.id === wizardData.selectedContactOpportunity
    );
  };

  // Handle date selection
  const handleDateSelect = (dateKey: string) => {
    if (isDateSelectable(dateKey)) {
      setWizardData((prev) => ({ ...prev, date: dateKey }));
    }
  };

  // Handle time selection
  const handleTimeSelect = (time: string) => {
    setWizardData((prev) => ({ ...prev, time }));
    // Auto-advance to confirm
    setTimeout(() => setCurrentStep("confirm"), 150);
  };

  // Submit
  const handleSubmit = async () => {
    if (!wizardData.contactId || !wizardData.assignedTo || !wizardData.appointmentType) {
      return;
    }

    setIsSaving(true);
    try {
      await createAppointment({
        title: generateTitle(),
        appointmentType: wizardData.appointmentType as "discovery_call" | "field_inspection",
        date: wizardData.date,
        time: wizardData.time,
        assignedTo: wizardData.assignedTo as Id<"users">,
        contactId: wizardData.contactId,
        opportunityId: wizardData.opportunityId || undefined,
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Failed to create appointment:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Get subtitle for header
  const getSubtitle = () => {
    switch (currentStep) {
      case "details":
        return "Meeting Details";
      case "date":
        const parts = [];
        if (wizardData.appointmentType) parts.push(appointmentTypeLabels[wizardData.appointmentType]);
        return parts.join(" - ") || "Select Date";
      case "time":
        return "Select a time";
      case "confirm":
        return "Confirm Appointment";
    }
  };

  const todayKey = formatDateKey(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px] bg-background border shadow-lg p-0 gap-0" showCloseButton={false}>
        {/* Header */}
        <div className="p-6 pb-4 border-b">
          <div className="flex items-center gap-4">
            {currentStep !== "details" && (
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full bg-muted"
                onClick={goBack}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <div className="flex-1">
              <h2 className="text-lg font-semibold">
                {wizardData.contactName || "New Appointment"}
              </h2>
              <p className="text-sm text-muted-foreground">{getSubtitle()}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Details */}
          {currentStep === "details" && (
            <div className="space-y-5">
              {/* Attendee (User) */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  Attendee <span className="text-red-500">*</span>
                </label>
                <Select
                  value={wizardData.assignedTo}
                  onValueChange={handleUserSelect}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select team member" />
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

              {/* Contact & Opportunity Combined */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  Contact & Opportunity <span className="text-red-500">*</span>
                </label>
                <Select
                  value={wizardData.selectedContactOpportunity}
                  onValueChange={handleContactOpportunitySelect}
                >
                  <SelectTrigger className="w-full">
                    {getContactOpportunityDisplay() ? (
                      <div className="flex items-center gap-2 text-sm truncate">
                        <span>{getContactOpportunityDisplay()?.contactName}</span>
                        {getContactOpportunityDisplay()?.opportunityName && (
                          <>
                            <span className="text-muted-foreground">|</span>
                            <span className="truncate">{getContactOpportunityDisplay()?.opportunityName}</span>
                          </>
                        )}
                      </div>
                    ) : (
                      <SelectValue placeholder="Select contact & opportunity" />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {contactOpportunityOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>{option.contactName}</span>
                          {option.opportunityName && (
                            <>
                              <span className="text-muted-foreground">|</span>
                              <Target className="h-4 w-4 text-muted-foreground" />
                              <span>{option.opportunityName}</span>
                            </>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Appointment Type */}
              <div className="space-y-3">
                <label className="text-sm font-medium">
                  Appointment Type <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  {[
                    { value: "discovery_call", label: "Discovery Call", icon: "📞" },
                    { value: "field_inspection", label: "Field Inspection", icon: "📍" },
                  ].map((type) => (
                    <div
                      key={type.value}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                        wizardData.appointmentType === type.value
                          ? "border-[#ff5603] bg-[#ff5603]/5"
                          : "hover:border-muted-foreground/30"
                      )}
                      onClick={() =>
                        setWizardData((prev) => ({
                          ...prev,
                          appointmentType: type.value as "discovery_call" | "field_inspection",
                        }))
                      }
                    >
                      <div
                        className={cn(
                          "h-5 w-5 rounded-full border-2 flex items-center justify-center",
                          wizardData.appointmentType === type.value
                            ? "border-[#ff5603]"
                            : "border-muted-foreground/30"
                        )}
                      >
                        {wizardData.appointmentType === type.value && (
                          <div className="h-2.5 w-2.5 rounded-full bg-[#ff5603]" />
                        )}
                      </div>
                      <span className="text-lg">{type.icon}</span>
                      <span className="font-medium">{type.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Next Button */}
              <Button
                className="w-full bg-[#ff5603] hover:bg-[#e64d00] mt-4"
                onClick={goNext}
                disabled={!canProceedFromDetails()}
              >
                Next: Select Date
              </Button>
            </div>
          )}

          {/* Step 2: Date Selection */}
          {currentStep === "date" && (
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
                  const isSelected = wizardData.date === dateKey;
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
                onClick={goNext}
                disabled={!canProceedFromDate()}
              >
                Next: Select Time
              </Button>
            </div>
          )}

          {/* Step 3: Time Selection */}
          {currentStep === "time" && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <p className="font-medium">{formatDisplayDate(wizardData.date)}</p>
              </div>

              {/* Time Grid */}
              <div className="grid grid-cols-2 gap-3">
                {timeSlots.map((time) => (
                  <button
                    key={time}
                    type="button"
                    className={cn(
                      "p-4 rounded-lg border text-sm font-medium transition-all",
                      wizardData.time === time
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

          {/* Step 4: Confirmation */}
          {currentStep === "confirm" && (
            <div className="space-y-6">
              {/* Summary Card */}
              <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-[#ff5603] flex items-center justify-center text-white">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-lg">{generateTitle()}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {appointmentTypeLabels[wizardData.appointmentType]}
                    </p>
                  </div>
                </div>

                <div className="border-t pt-4 space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{formatDisplayDate(wizardData.date)}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{wizardData.time}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{wizardData.assignedUserName}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{wizardData.contactName}</span>
                  </div>
                  {wizardData.opportunityName && (
                    <div className="flex items-center gap-3 text-sm">
                      <Target className="h-4 w-4 text-muted-foreground" />
                      <span>{wizardData.opportunityName}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Confirm Button */}
              <Button
                className="w-full bg-[#ff5603] hover:bg-[#e64d00]"
                onClick={handleSubmit}
                disabled={isSaving}
              >
                {isSaving ? (
                  "Creating..."
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Confirm Appointment
                  </>
                )}
              </Button>

              {/* Cancel Button */}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => onOpenChange(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
