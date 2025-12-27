"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useAction, useConvex } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { PipelineStage, PIPELINE_STAGE_LABELS } from "@/lib/types";
import type { PipelineOpportunity } from "@/app/(dashboard)/pipeline/page";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  User,
  DollarSign,
  FileText,
  Receipt,
  MessageSquare,
  CheckSquare,
  Trash2,
  ClipboardList,
  Send,
  Loader2,
  AlertCircle,
  Clock,
  Plus,
  Target,
  MoreHorizontal,
  Pencil,
  HardHat,
  MapPin,
  X,
  Check,
  ExternalLink,
  Sun,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { TaskStatus } from "@/lib/types";
import { TaskEditModal } from "@/components/tasks/task-edit-modal";
import { Task } from "@/components/tasks/task-table";
import { cn } from "@/lib/utils";
import { LocationCaptureModal, LocationDisplay } from "./location-capture-modal";
import { AppointmentModal, Appointment } from "@/components/appointments/appointment-modal";
import { DocumentUpload } from "@/components/documents/document-upload";
import { DocumentList } from "@/components/documents/document-list";

type Channel = "facebook" | "instagram";

interface OpportunityDetailModalProps {
  opportunity: PipelineOpportunity | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (opportunity: PipelineOpportunity) => void;
  onDelete: (opportunityId: string) => void;
}

type NavItem = "details" | "messages" | "tasks" | "documents" | "invoices";

const stageOptions: { value: PipelineStage; label: string }[] = [
  { value: "inbox", label: PIPELINE_STAGE_LABELS.inbox },
  { value: "scheduled_discovery_call", label: PIPELINE_STAGE_LABELS.scheduled_discovery_call },
  { value: "discovery_call", label: PIPELINE_STAGE_LABELS.discovery_call },
  { value: "no_show_discovery_call", label: PIPELINE_STAGE_LABELS.no_show_discovery_call },
  { value: "field_inspection", label: PIPELINE_STAGE_LABELS.field_inspection },
  { value: "to_follow_up", label: PIPELINE_STAGE_LABELS.to_follow_up },
  { value: "contract_drafting", label: PIPELINE_STAGE_LABELS.contract_drafting },
  { value: "contract_signing", label: PIPELINE_STAGE_LABELS.contract_signing },
  { value: "closed", label: PIPELINE_STAGE_LABELS.closed },
];

const navItems: { id: NavItem; label: string; icon: React.ElementType }[] = [
  { id: "details", label: "Details", icon: ClipboardList },
  { id: "messages", label: "Messages", icon: MessageSquare },
  { id: "tasks", label: "Tasks", icon: CheckSquare },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "invoices", label: "Invoices", icon: Receipt },
];

// Social media icons
const FacebookIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
  </svg>
);

const sourceLabels: Record<string, string> = {
  website: "Website",
  referral: "Referral",
  facebook: "Facebook",
  instagram: "Instagram",
  google_ads: "Google Ads",
  walk_in: "Walk-in",
  cold_call: "Cold Call",
  other: "Other",
};

export function OpportunityDetailModal({
  opportunity,
  open,
  onOpenChange,
  onSave,
  onDelete,
}: OpportunityDetailModalProps) {
  const router = useRouter();
  const [editedOpportunity, setEditedOpportunity] = useState<PipelineOpportunity | null>(null);
  const [activeNav, setActiveNav] = useState<NavItem>("details");
  const [isSaving, setIsSaving] = useState(false);

  // Message state
  const [messageInput, setMessageInput] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Task state
  const [isEditTaskModalOpen, setIsEditTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);

  // Location capture state
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isCreatingOpenSolar, setIsCreatingOpenSolar] = useState(false);
  const [openSolarError, setOpenSolarError] = useState<string | null>(null);

  // Appointment edit state
  const [isEditAppointmentModalOpen, setIsEditAppointmentModalOpen] = useState(false);

  // Name editing state
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");

  const updateOpportunity = useMutation(api.opportunities.update);
  const updateStage = useMutation(api.opportunities.updateStage);
  const removeOpportunity = useMutation(api.opportunities.remove);

  // OpenSolar action
  const createOpenSolarProject = useAction(api.openSolar.createProject);

  // Message queries and actions
  const messages = useQuery(
    api.messages.getByOpportunity,
    opportunity ? { opportunityId: opportunity._id } : "skip"
  );
  const messagingWindow = useQuery(
    api.messages.getMessagingWindowForOpportunity,
    opportunity ? { opportunityId: opportunity._id } : "skip"
  );
  const sendMetaMessage = useAction(api.meta.sendMessage);
  const markAllAsRead = useMutation(api.messages.markAllAsRead);

  // Task queries and mutations
  const tasks = useQuery(
    api.tasks.getByOpportunity,
    opportunity ? { opportunityId: opportunity._id } : "skip"
  );

  // Document queries
  const documents = useQuery(
    api.documents.getByOpportunity,
    opportunity ? { opportunityId: opportunity._id } : "skip"
  );
  const toggleTaskComplete = useMutation(api.tasks.toggleComplete);
  const updateTaskStatus = useMutation(api.tasks.updateStatus);
  const removeTask = useMutation(api.tasks.remove);

  // Reset state when modal opens or opportunity changes
  useEffect(() => {
    if (open && opportunity) {
      setEditedOpportunity({ ...opportunity });
      setActiveNav("details");
      setMessageInput("");
      setMessageError(null);
      setOpenSolarError(null);
      setIsEditTaskModalOpen(false);
      setSelectedTask(null);
      setIsCreateTaskModalOpen(false);
      setIsEditingName(false);
      setEditedName(opportunity.name);
    }
  }, [open, opportunity]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (activeNav === "messages") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, activeNav]);

  // Mark messages as read when viewing messages tab
  useEffect(() => {
    if (activeNav === "messages" && messagingWindow?.contactId) {
      markAllAsRead({ contactId: messagingWindow.contactId });
    }
  }, [activeNav, messagingWindow?.contactId, markAllAsRead]);

  if (!editedOpportunity) return null;

  const formatCurrency = (value: number) => {
    return "₱" + new Intl.NumberFormat("en-PH", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Cancel handler - reset to original and close
  const handleCancel = () => {
    if (opportunity) {
      setEditedOpportunity({ ...opportunity });
    }
    setOpenSolarError(null);
    onOpenChange(false);
  };

  const handleSave = async () => {
    if (!editedOpportunity) return;

    setIsSaving(true);
    try {
      // Update stage if changed
      if (editedOpportunity.stage !== opportunity?.stage) {
        await updateStage({
          id: editedOpportunity._id,
          stage: editedOpportunity.stage,
        });
      }

      // Update other fields
      await updateOpportunity({
        id: editedOpportunity._id,
        name: editedOpportunity.name,
        estimatedValue: editedOpportunity.estimatedValue,
        location: editedOpportunity.location,
        locationLat: editedOpportunity.locationLat,
        locationLng: editedOpportunity.locationLng,
        locationCapturedAt: editedOpportunity.locationCapturedAt,
        openSolarProjectId: editedOpportunity.openSolarProjectId,
        openSolarProjectUrl: editedOpportunity.openSolarProjectUrl,
        notes: editedOpportunity.notes,
      });

      onSave(editedOpportunity);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save opportunity:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editedOpportunity) return;

    if (confirm("Are you sure you want to delete this opportunity?")) {
      try {
        await removeOpportunity({ id: editedOpportunity._id });
        onDelete(editedOpportunity._id);
        onOpenChange(false);
      } catch (error) {
        console.error("Failed to delete opportunity:", error);
      }
    }
  };

  const handleLocationCapture = async (location: { lat: number; lng: number; address: string }) => {
    // Update local state with location
    setEditedOpportunity({
      ...editedOpportunity,
      location: location.address,
      locationLat: location.lat,
      locationLng: location.lng,
      locationCapturedAt: Date.now(),
    });

    // Create OpenSolar project if not already created
    if (!editedOpportunity.openSolarProjectId) {
      setIsCreatingOpenSolar(true);
      setOpenSolarError(null);

      try {
        const result = await createOpenSolarProject({
          opportunityId: editedOpportunity._id,
          title: editedOpportunity.name,
          address: location.address,
          lat: location.lat,
          lng: location.lng,
          // Contact info from CRM
          contactFirstName: editedOpportunity.contact?.firstName || "Unknown",
          contactLastName: editedOpportunity.contact?.lastName || "Contact",
          contactEmail: editedOpportunity.contact?.email,
          contactPhone: editedOpportunity.contact?.phone,
          // TODO: Map system consultant to OpenSolar role ID
        });

        if (result.success && result.project) {
          setEditedOpportunity((prev) =>
            prev
              ? {
                  ...prev,
                  location: location.address,
                  locationLat: location.lat,
                  locationLng: location.lng,
                  locationCapturedAt: Date.now(),
                  openSolarProjectId: result.project!.id,
                  openSolarProjectUrl: result.project!.url,
                }
              : prev
          );
        } else {
          setOpenSolarError(result.error || "Failed to create OpenSolar project");
        }
      } catch (error) {
        console.error("OpenSolar error:", error);
        setOpenSolarError(error instanceof Error ? error.message : "Failed to create OpenSolar project");
      } finally {
        setIsCreatingOpenSolar(false);
      }
    }
  };

  const handleClearLocation = () => {
    setEditedOpportunity({
      ...editedOpportunity,
      location: undefined,
      locationLat: undefined,
      locationLng: undefined,
      locationCapturedAt: undefined,
    });
  };

  const handleClearOpenSolar = () => {
    setEditedOpportunity({
      ...editedOpportunity,
      openSolarProjectId: undefined,
      openSolarProjectUrl: undefined,
    });
    setOpenSolarError(null);
  };

  const renderDetails = () => (
    <div className="space-y-6">
      {/* Location */}
      <div className="space-y-2">
        <label className="text-sm font-medium flex items-center gap-2">
          <MapPin className="h-4 w-4 text-[#ff5603]" />
          Location
        </label>
        {editedOpportunity.locationLat && editedOpportunity.locationLng ? (
          <LocationDisplay
            lat={editedOpportunity.locationLat}
            lng={editedOpportunity.locationLng}
            address={editedOpportunity.location}
            capturedAt={editedOpportunity.locationCapturedAt}
            onClear={handleClearLocation}
          />
        ) : (
          <div className="space-y-2">
            <Input
              value={editedOpportunity.location || ""}
              onChange={(e) =>
                setEditedOpportunity({
                  ...editedOpportunity,
                  location: e.target.value,
                })
              }
              placeholder="Enter location address or use Capture Location button..."
            />
            <p className="text-xs text-muted-foreground">
              Use the "Capture Location" button above to save GPS coordinates with a map preview.
            </p>
          </div>
        )}
      </div>

      {/* OpenSolar Integration */}
      <div className="space-y-2">
        <label className="text-sm font-medium flex items-center gap-2">
          <Sun className="h-4 w-4 text-yellow-500" />
          OpenSolar
        </label>
        {isCreatingOpenSolar ? (
          <div className="p-4 bg-muted/50 rounded-lg flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-yellow-500" />
            <span className="text-sm text-muted-foreground">Creating OpenSolar project...</span>
          </div>
        ) : editedOpportunity.openSolarProjectUrl ? (
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Project #{editedOpportunity.openSolarProjectId}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Design and price your solar system in OpenSolar
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={handleClearOpenSolar}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => window.open(editedOpportunity.openSolarProjectUrl, "_blank")}
                >
                  <ExternalLink className="h-4 w-4" />
                  Open in OpenSolar
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
            {openSolarError ? (
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span>{openSolarError}</span>
              </div>
            ) : (
              <p>Capture location to automatically create an OpenSolar project</p>
            )}
          </div>
        )}
      </div>

      {/* Contact */}
      <div className="space-y-2">
        <label className="text-sm font-medium flex items-center gap-2">
          <User className="h-4 w-4 text-[#ff5603]" />
          Contact
        </label>
        {editedOpportunity.contact ? (
          <div
            className="p-4 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted/70 transition-colors"
            onClick={() => {
              onOpenChange(false);
              router.push(`/contacts/${editedOpportunity.contact!._id}`);
            }}
          >
            <p className="font-medium underline hover:text-[#ff5603]">
              {editedOpportunity.contact.firstName} {editedOpportunity.contact.lastName}
            </p>
            <div className="mt-2 space-y-1 text-sm text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">Phone:</span>{" "}
                {editedOpportunity.contact.phone || "—"}
              </p>
              <p>
                <span className="font-medium text-foreground">Email:</span>{" "}
                {editedOpportunity.contact.email || "—"}
              </p>
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">Source:</span>{" "}
                {editedOpportunity.contact.source === "facebook" ? (
                  <Badge className="bg-blue-600 text-white text-xs flex items-center gap-1">
                    <FacebookIcon className="h-3 w-3" />
                    Facebook
                  </Badge>
                ) : editedOpportunity.contact.source === "instagram" ? (
                  <Badge className="bg-pink-500 text-white text-xs flex items-center gap-1">
                    <InstagramIcon className="h-3 w-3" />
                    Instagram
                  </Badge>
                ) : (
                  <Badge variant="outline">{sourceLabels[editedOpportunity.contact.source] || editedOpportunity.contact.source}</Badge>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
            No contact associated
          </div>
        )}
      </div>

      {/* System Consultant */}
      <div className="space-y-2">
        <label className="text-sm font-medium flex items-center gap-2">
          <HardHat className="h-4 w-4 text-[#ff5603]" />
          System Consultant
        </label>
        {editedOpportunity.systemConsultant ? (
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="font-medium">
              {editedOpportunity.systemConsultant.firstName} {editedOpportunity.systemConsultant.lastName}
            </p>
            <div className="mt-2 space-y-1 text-sm text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">Email:</span>{" "}
                {editedOpportunity.systemConsultant.email || "—"}
              </p>
              <p>
                <span className="font-medium text-foreground">Phone:</span>{" "}
                {editedOpportunity.systemConsultant.phone || "—"}
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
            No system consultant assigned
          </div>
        )}
      </div>

      {/* Scheduled Appointment */}
      <div className="space-y-2">
        <label className="text-sm font-medium flex items-center gap-2">
          <Calendar className="h-4 w-4 text-[#ff5603]" />
          Scheduled Appointment
        </label>
        {editedOpportunity.scheduledAppointment ? (
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="font-medium">
                  {editedOpportunity.scheduledAppointment.title}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {new Date(editedOpportunity.scheduledAppointment.date).toLocaleDateString(
                    "en-US",
                    {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    }
                  )}{" "}
                  at {editedOpportunity.scheduledAppointment.time}
                </p>
                {editedOpportunity.scheduledAppointment.location && (
                  <p className="text-sm text-muted-foreground mt-1">
                    📍 {editedOpportunity.scheduledAppointment.location}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => setIsEditAppointmentModalOpen(true)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
            No appointment scheduled
          </div>
        )}
      </div>

      {/* Estimated Value */}
      <div className="space-y-2">
        <label className="text-sm font-medium flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-green-600" />
          Estimated Value
        </label>
        <Input
          type="number"
          value={editedOpportunity.estimatedValue}
          onChange={(e) =>
            setEditedOpportunity({
              ...editedOpportunity,
              estimatedValue: Number(e.target.value),
            })
          }
          className="text-lg font-semibold"
        />
      </div>

      {/* Opportunity Notes */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Opportunity Notes</label>
        <Textarea
          value={editedOpportunity.notes || ""}
          onChange={(e) =>
            setEditedOpportunity({
              ...editedOpportunity,
              notes: e.target.value,
            })
          }
          placeholder="Add notes about this opportunity..."
          className="min-h-[150px] resize-none"
        />
      </div>
    </div>
  );

  const renderPlaceholder = (icon: React.ElementType, message: string) => {
    const Icon = icon;
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Icon className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>{message}</p>
        <p className="text-sm mt-2">Coming soon</p>
      </div>
    );
  };

  // Messaging helpers
  const getChannel = (): Channel | null => {
    if (!messagingWindow) return null;
    if (messagingWindow.facebookPsid) return "facebook";
    if (messagingWindow.instagramScopedId) return "instagram";
    return null;
  };

  const getPlatformUserId = (): string | null => {
    if (!messagingWindow) return null;
    if (messagingWindow.facebookPsid) return messagingWindow.facebookPsid;
    if (messagingWindow.instagramScopedId) return messagingWindow.instagramScopedId;
    return null;
  };

  const canSendMessage = (): boolean => {
    const channel = getChannel();
    if (!channel || !messagingWindow) return false;
    const window = channel === "facebook" ? messagingWindow.facebookWindow : messagingWindow.instagramWindow;
    return window?.canSend || false;
  };

  const formatTimeRemaining = (ms: number): string => {
    if (ms <= 0) return "Expired";
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const formatMessageTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !messagingWindow?.contactId) return;

    const channel = getChannel();
    const platformUserId = getPlatformUserId();

    if (!channel || !platformUserId) {
      setMessageError("This contact has no Facebook or Instagram connection");
      return;
    }

    setSendingMessage(true);
    setMessageError(null);

    try {
      const result = await sendMetaMessage({
        contactId: messagingWindow.contactId,
        channel,
        platformUserId,
        content: messageInput.trim(),
        senderName: "CRM User",
      });

      if (result.success) {
        setMessageInput("");
      } else {
        setMessageError(result.error || "Failed to send message");
      }
    } catch (err) {
      setMessageError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setSendingMessage(false);
    }
  };

  const renderMessages = () => {
    const channel = getChannel();
    const windowData = channel === "facebook" ? messagingWindow?.facebookWindow : messagingWindow?.instagramWindow;

    return (
      <>
        {/* Messages List - Scrollable area that fills remaining space */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
          {!messages ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <MessageSquare className="h-10 w-10 mb-3 opacity-50" />
              <p className="text-sm">No messages yet</p>
              {!channel && (
                <p className="text-xs mt-2 text-center">Customer needs to message via Facebook or Instagram first</p>
              )}
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <div
                  key={message._id}
                  className={cn(
                    "flex",
                    message.isOutgoing ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[70%] rounded-lg px-3 py-2 shadow-sm",
                      message.isOutgoing
                        ? "bg-[#ff5603] text-white"
                        : "bg-white border"
                    )}
                  >
                    <p className="text-sm">{message.content}</p>
                    <div
                      className={cn(
                        "text-[10px] mt-1 flex items-center gap-2",
                        message.isOutgoing ? "text-white/70" : "text-muted-foreground"
                      )}
                    >
                      <span>{formatMessageTime(message.createdAt)}</span>
                      {message.channel && (
                        <span>via {message.channel === "facebook" ? "FB" : message.channel === "instagram" ? "IG" : message.channel}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Error Message */}
        {messageError && (
          <div className="px-4 py-2 bg-red-50 border-t border-red-200 flex-shrink-0">
            <div className="flex items-center gap-2 text-sm text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span>{messageError}</span>
            </div>
          </div>
        )}

        {/* Message Input - Sticky at bottom */}
        <div className="p-4 border-t bg-white flex-shrink-0">
          {!channel ? (
            <div className="text-center py-2 text-muted-foreground text-sm">
              No Facebook or Instagram connection.
              <br />
              <span className="text-xs">Customer needs to message you first.</span>
            </div>
          ) : !canSendMessage() ? (
            <div className="text-center py-2 text-amber-600 text-sm">
              <Clock className="h-4 w-4 inline mr-1" />
              Messaging window expired. Wait for customer to message.
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                placeholder={`Message via ${channel === "facebook" ? "Facebook" : "Instagram"}...`}
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                disabled={sendingMessage}
                className="flex-1"
              />
              <Button
                onClick={handleSendMessage}
                disabled={sendingMessage || !messageInput.trim()}
                className="bg-[#ff5603] hover:bg-[#e64d00]"
              >
                {sendingMessage ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          )}
        </div>
      </>
    );
  };

  const statusConfig: Record<TaskStatus, { label: string; className: string }> = {
    pending: {
      label: "Pending",
      className: "bg-gray-100 text-gray-700 hover:bg-gray-200",
    },
    doing: {
      label: "Doing",
      className: "bg-yellow-100 text-yellow-700 hover:bg-yellow-200",
    },
    completed: {
      label: "Completed",
      className: "bg-green-100 text-green-700 hover:bg-green-200",
    },
  };

  const handleToggleTaskComplete = async (taskId: string) => {
    try {
      await toggleTaskComplete({ id: taskId as any });
    } catch (error) {
      console.error("Failed to toggle task:", error);
    }
  };

  const handleTaskStatusChange = async (taskId: string, status: TaskStatus) => {
    try {
      await updateTaskStatus({ id: taskId as any, status });
    } catch (error) {
      console.error("Failed to update task status:", error);
    }
  };

  const handleEditTask = (task: any) => {
    setSelectedTask(task as Task);
    setIsEditTaskModalOpen(true);
  };

  const handleDeleteTask = async (taskId: string) => {
    if (confirm("Are you sure you want to delete this task?")) {
      try {
        await removeTask({ id: taskId as any });
      } catch (error) {
        console.error("Failed to delete task:", error);
      }
    }
  };

  const renderTasks = () => (
    <div className="space-y-4">
      {/* Add Task Button */}
      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={() => setIsCreateTaskModalOpen(true)}
          className="bg-[#ff5603] hover:bg-[#e64d00] gap-2 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Add Task
        </Button>
      </div>

      {/* Tasks List */}
      {!tasks ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <CheckSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No tasks for this opportunity</p>
          <p className="text-sm mt-2">Click "Add Task" to create one</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => {
            const isCompleted = task.status === "completed";
            return (
              <div
                key={task._id}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border bg-white transition-colors",
                  isCompleted && "bg-muted/30"
                )}
              >
                <Checkbox
                  checked={isCompleted}
                  onCheckedChange={() => handleToggleTaskComplete(task._id)}
                  className="mt-0.5 border-gray-300"
                />
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      "font-medium text-sm",
                      isCompleted && "line-through text-muted-foreground"
                    )}
                  >
                    {task.title}
                  </p>
                  {task.description && (
                    <p className={cn(
                      "text-xs text-muted-foreground mt-1",
                      isCompleted && "line-through"
                    )}>
                      {task.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    {task.dueDate && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {new Date(task.dueDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <Badge
                  variant="secondary"
                  className={cn(
                    "cursor-pointer text-xs",
                    statusConfig[task.status].className
                  )}
                  onClick={() => {
                    const statuses: TaskStatus[] = ["pending", "doing", "completed"];
                    const currentIndex = statuses.indexOf(task.status);
                    const nextStatus = statuses[(currentIndex + 1) % statuses.length];
                    handleTaskStatusChange(task._id, nextStatus);
                  }}
                >
                  {statusConfig[task.status].label}
                </Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEditTask(task)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDeleteTask(task._id)}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderDocuments = () => (
    <div className="space-y-6">
      {/* Upload Section */}
      <div>
        <h3 className="text-sm font-medium mb-3">Upload Documents</h3>
        <DocumentUpload
          opportunityId={editedOpportunity._id}
          contactId={editedOpportunity.contact?._id}
        />
      </div>

      {/* Documents List */}
      <div>
        <h3 className="text-sm font-medium mb-3">
          Uploaded Documents
          {documents && documents.length > 0 && (
            <span className="text-muted-foreground font-normal ml-2">
              ({documents.length})
            </span>
          )}
        </h3>
        <DocumentList
          documents={documents}
          isLoading={documents === undefined}
          emptyMessage="No documents uploaded for this opportunity"
          showUploader={false}
        />
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeNav) {
      case "details":
        return renderDetails();
      case "messages":
        return renderMessages();
      case "tasks":
        return renderTasks();
      case "documents":
        return renderDocuments();
      case "invoices":
        return renderPlaceholder(Receipt, "Invoices will appear here");
      default:
        return renderDetails();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[75vw] h-[60vh] p-0 gap-0 overflow-hidden flex flex-col">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b">
          <div className="flex items-start justify-between">
            <div className="flex-1 pr-8">
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                {isEditingName ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      className="text-xl font-bold h-9"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && editedName.trim()) {
                          setEditedOpportunity({ ...editedOpportunity, name: editedName.trim() });
                          setIsEditingName(false);
                        } else if (e.key === "Escape") {
                          setEditedName(editedOpportunity.name);
                          setIsEditingName(false);
                        }
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => {
                        setEditedName(editedOpportunity.name);
                        setIsEditingName(false);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                      disabled={!editedName.trim()}
                      onClick={() => {
                        if (editedName.trim()) {
                          setEditedOpportunity({ ...editedOpportunity, name: editedName.trim() });
                          setIsEditingName(false);
                        }
                      }}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <span>{editedOpportunity.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => {
                        setEditedName(editedOpportunity.name);
                        setIsEditingName(true);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
              </DialogTitle>
              <div className="flex items-center justify-between mt-2">
                <Select
                  value={editedOpportunity.stage}
                  onValueChange={(value: PipelineStage) =>
                    setEditedOpportunity({ ...editedOpportunity, stage: value })
                  }
                >
                  <SelectTrigger className="w-[200px] h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {stageOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-2"
                    onClick={() => {
                      // Build query params with opportunity data
                      const params = new URLSearchParams();

                      // Client info
                      if (editedOpportunity.contact) {
                        params.set("clientName", `${editedOpportunity.contact.firstName} ${editedOpportunity.contact.lastName}`);
                        params.set("contactId", editedOpportunity.contact._id);
                        if (editedOpportunity.contact.address) {
                          params.set("clientAddress", editedOpportunity.contact.address);
                        }
                      }

                      // Location
                      if (editedOpportunity.location) {
                        params.set("projectLocation", editedOpportunity.location);
                      }

                      // Estimated value as total amount
                      if (editedOpportunity.estimatedValue) {
                        params.set("totalAmount", editedOpportunity.estimatedValue.toString());
                      }

                      // Opportunity reference
                      params.set("opportunityId", editedOpportunity._id);
                      params.set("opportunityName", editedOpportunity.name);

                      onOpenChange(false);
                      router.push(`/agreements?${params.toString()}`);
                    }}
                  >
                    <FileText className="h-4 w-4" />
                    Generate Agreement
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-2"
                    onClick={() => setIsLocationModalOpen(true)}
                  >
                    <MapPin className="h-4 w-4" />
                    {editedOpportunity.locationLat ? "Update Location" : "Capture Location"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Body with sidebar navigation */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Navigation */}
          <nav className="w-56 border-r bg-muted/30 p-3 flex-shrink-0">
            <ul className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeNav === item.id;

                return (
                  <li key={item.id}>
                    <button
                      onClick={() => setActiveNav(item.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left",
                        isActive
                          ? "bg-[#ff5603] text-white"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      <span className="flex-1">{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Right Content Area */}
          {activeNav === "messages" ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              {renderMessages()}
            </div>
          ) : (
            <ScrollArea className="flex-1 p-6">
              {renderContent()}
            </ScrollArea>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex items-center justify-end gap-3">
          <Button
            variant="destructive"
            onClick={handleDelete}
            className="mr-auto"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-[#ff5603] hover:bg-[#e64d00]"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>

      {/* Task Edit Modal */}
      <TaskEditModal
        task={selectedTask}
        open={isEditTaskModalOpen}
        onOpenChange={(open) => {
          setIsEditTaskModalOpen(open);
          if (!open) setSelectedTask(null);
        }}
      />

      {/* Task Create Modal */}
      <TaskEditModal
        task={null}
        mode="create"
        defaultOpportunityId={editedOpportunity._id}
        defaultContactId={editedOpportunity.contact?._id}
        open={isCreateTaskModalOpen}
        onOpenChange={setIsCreateTaskModalOpen}
        showOverlay
      />

      {/* Location Capture Modal */}
      <LocationCaptureModal
        open={isLocationModalOpen}
        onOpenChange={setIsLocationModalOpen}
        onConfirm={handleLocationCapture}
        initialLocation={
          editedOpportunity.locationLat && editedOpportunity.locationLng
            ? { lat: editedOpportunity.locationLat, lng: editedOpportunity.locationLng }
            : null
        }
      />

      {/* Appointment Edit Modal */}
      {editedOpportunity.scheduledAppointment && (
        <AppointmentModal
          open={isEditAppointmentModalOpen}
          onOpenChange={setIsEditAppointmentModalOpen}
          mode="edit"
          appointment={editedOpportunity.scheduledAppointment as Appointment}
        />
      )}
    </Dialog>
  );
}
