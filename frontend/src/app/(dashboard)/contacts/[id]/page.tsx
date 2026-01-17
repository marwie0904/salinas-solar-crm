"use client";

import { use, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useAction, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import {
  ContactSource,
  PipelineStage,
  InvoiceStatus,
  getFullName,
  PIPELINE_STAGE_LABELS,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  Building2,
  Calendar,
  MessageSquare,
  CheckSquare,
  FileText,
  Receipt,
  Send,
  Clock,
  Plus,
  Download,
  Trash2,
  Loader2,
  AlertCircle,
  MoreHorizontal,
  Pencil,
  X,
  Check,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TaskEditModal } from "@/components/tasks/task-edit-modal";
import { Task } from "@/components/tasks/task-table";
import { TaskStatus, INVOICE_STATUS_LABELS, PAYMENT_TYPE_LABELS, PaymentType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { MessageContent } from "@/components/messages/message-content";
import { InvoiceCreateModal } from "@/components/invoices";
import { generateInvoicePDF } from "@/components/invoices/invoice-pdf-generator";

type ContentView = "messages" | "tasks" | "appointments_invoices" | "documents";
type Channel = "facebook" | "instagram";

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

const sourceLabels: Record<ContactSource, string> = {
  website: "Website",
  referral: "Referral",
  facebook: "Facebook",
  instagram: "Instagram",
  google_ads: "Google Ads",
  walk_in: "Walk-in",
  cold_call: "Cold Call",
  other: "Other",
};

const stageColors: Record<PipelineStage, string> = {
  inbox: "bg-slate-500",
  to_call: "bg-blue-500",
  did_not_answer: "bg-red-400",
  booked_call: "bg-cyan-500",
  did_not_book_call: "bg-amber-500",
  for_ocular: "bg-purple-500",
  follow_up: "bg-yellow-500",
  contract_sent: "bg-orange-500",
  for_installation: "bg-teal-500",
  closed: "bg-green-500",
};

const invoiceStatusColors: Record<InvoiceStatus, string> = {
  pending: "bg-amber-500",
  partially_paid: "bg-blue-500",
  paid_full: "bg-green-500",
  cancelled: "bg-red-500",
};

export default function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [activeView, setActiveView] = useState<ContentView>("messages");
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Task state
  const [isEditTaskModalOpen, setIsEditTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);

  // Invoice state
  const [isCreateInvoiceModalOpen, setIsCreateInvoiceModalOpen] = useState(false);

  // Contact edit state
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [isSavingContact, setIsSavingContact] = useState(false);

  // Convex queries
  const contact = useQuery(api.contacts.getWithRelations, {
    id: id as Id<"contacts">,
  });

  // Convex actions/mutations
  const sendMetaMessage = useAction(api.meta.sendMessage);
  const markAllAsRead = useMutation(api.messages.markAllAsRead);

  // Task mutations
  const toggleTaskComplete = useMutation(api.tasks.toggleComplete);
  const updateTaskStatus = useMutation(api.tasks.updateStatus);
  const removeTask = useMutation(api.tasks.remove);

  // Contact mutation
  const updateContact = useMutation(api.contacts.update);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (activeView === "messages") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [contact?.messages, activeView]);

  // Mark messages as read when viewing
  useEffect(() => {
    if (activeView === "messages" && contact?._id) {
      markAllAsRead({ contactId: contact._id });
    }
  }, [activeView, contact?._id, markAllAsRead]);

  // Initialize edit fields when contact loads
  useEffect(() => {
    if (contact) {
      setEditFirstName(contact.firstName || "");
      setEditLastName(contact.lastName || "");
      setEditPhone(contact.phone || "");
      setEditEmail(contact.email || "");
    }
  }, [contact]);

  // Contact edit handlers
  const handleStartEditContact = () => {
    if (contact) {
      setEditFirstName(contact.firstName || "");
      setEditLastName(contact.lastName || "");
      setEditPhone(contact.phone || "");
      setEditEmail(contact.email || "");
      setIsEditingContact(true);
    }
  };

  const handleCancelEditContact = () => {
    setIsEditingContact(false);
    if (contact) {
      setEditFirstName(contact.firstName || "");
      setEditLastName(contact.lastName || "");
      setEditPhone(contact.phone || "");
      setEditEmail(contact.email || "");
    }
  };

  const handleSaveContact = async () => {
    if (!contact?._id) return;

    setIsSavingContact(true);
    try {
      await updateContact({
        id: contact._id,
        firstName: editFirstName.trim(),
        lastName: editLastName.trim(),
        phone: editPhone.trim() || undefined,
        email: editEmail.trim() || undefined,
      });
      setIsEditingContact(false);
    } catch (error) {
      console.error("Failed to update contact:", error);
    } finally {
      setIsSavingContact(false);
    }
  };

  const formatCurrency = (value: number) => {
    return "₱" + new Intl.NumberFormat("en-PH", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatDateString = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
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

  const getChannel = (): Channel | null => {
    if (!contact) return null;
    if (contact.facebookPsid) return "facebook";
    if (contact.instagramScopedId) return "instagram";
    return null;
  };

  const getPlatformUserId = (): string | null => {
    if (!contact) return null;
    if (contact.facebookPsid) return contact.facebookPsid;
    if (contact.instagramScopedId) return contact.instagramScopedId;
    return null;
  };

  const canSendMessage = (): boolean => {
    return contact?.messagingWindow?.canSend || false;
  };

  // Task handlers
  const handleToggleTaskComplete = async (taskId: Id<"tasks">) => {
    try {
      await toggleTaskComplete({ id: taskId });
    } catch (error) {
      console.error("Failed to toggle task:", error);
    }
  };

  const handleTaskStatusChange = async (taskId: Id<"tasks">, status: TaskStatus) => {
    try {
      await updateTaskStatus({ id: taskId, status });
    } catch (error) {
      console.error("Failed to update task status:", error);
    }
  };

  const handleEditTask = (task: any) => {
    // Convert to Task type for the modal
    setSelectedTask(task as Task);
    setIsEditTaskModalOpen(true);
  };

  const handleDeleteTask = async (taskId: Id<"tasks">) => {
    if (confirm("Are you sure you want to delete this task?")) {
      try {
        await removeTask({ id: taskId });
      } catch (error) {
        console.error("Failed to delete task:", error);
      }
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !contact?._id) return;

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
        contactId: contact._id,
        channel,
        platformUserId,
        content: newMessage.trim(),
        senderName: "CRM User",
      });

      if (result.success) {
        setNewMessage("");
      } else {
        setMessageError(result.error || "Failed to send message");
      }
    } catch (err) {
      setMessageError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setSendingMessage(false);
    }
  };

  const viewOptions: { id: ContentView; label: string; icon: React.ElementType }[] = [
    { id: "messages", label: "Messages", icon: MessageSquare },
    { id: "tasks", label: "Tasks", icon: CheckSquare },
    { id: "appointments_invoices", label: "Appointments & Invoices", icon: Calendar },
    { id: "documents", label: "Documents", icon: FileText },
  ];

  // Loading state
  if (contact === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading contact...</span>
        </div>
      </div>
    );
  }

  // Not found state
  if (contact === null) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-muted-foreground mb-4">Contact not found</p>
        <Button onClick={() => router.push("/contacts")}>Back to Contacts</Button>
      </div>
    );
  }

  const channel = getChannel();
  const messagingWindow = contact.messagingWindow;
  const primaryOpportunity = contact.opportunities?.[0];

  const handleDownloadInvoicePDF = (invoice: any) => {
    const pdfData = {
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: new Date(invoice.createdAt).toISOString(),
      dueDate: new Date(invoice.dueDate).toISOString().split("T")[0],
      billedTo: {
        name: contact.fullName,
        address: contact.address || "",
      },
      opportunityName: primaryOpportunity?.name || "",
      paymentType: invoice.paymentType || "one_time",
      paymentMethod: invoice.paymentMethod || "bank_transfer",
      total: invoice.total,
      installmentAmount: invoice.installmentAmount,
      numberOfInstallments: invoice.numberOfInstallments,
      notes: invoice.notes,
    };

    const pdf = generateInvoicePDF(pdfData);
    pdf.download();
  };

  const renderMessages = () => (
    <div className="flex flex-col h-full">
      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {contact.messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <MessageSquare className="h-10 w-10 mb-3 opacity-50" />
            <p className="text-sm">No messages yet</p>
            {!channel && (
              <p className="text-xs mt-2 text-center">Customer needs to message via Facebook or Instagram first</p>
            )}
          </div>
        ) : (
          contact.messages.map((message) => (
            <div
              key={message._id}
              className={cn(
                "flex",
                message.isOutgoing ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[70%] rounded-lg px-4 py-2 shadow-sm",
                  message.isOutgoing
                    ? "bg-[#ff5603] text-white"
                    : "bg-white border"
                )}
              >
                <MessageContent
                  content={message.content}
                  isOutgoing={message.isOutgoing}
                  contactId={contact._id}
                  contactEmail={contact.email}
                  contactPhone={contact.phone}
                />
                <div
                  className={cn(
                    "text-xs mt-1 flex items-center gap-2",
                    message.isOutgoing ? "text-white/70" : "text-muted-foreground"
                  )}
                >
                  <span>{formatTime(message.createdAt)}</span>
                  {message.channel && (
                    <span className="flex items-center gap-1">
                      via
                      {message.channel === "facebook" ? (
                        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                      ) : message.channel === "instagram" ? (
                        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                        </svg>
                      ) : (
                        message.channel
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
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

      {/* Message Input */}
      <div className="border-t p-4 flex-shrink-0">
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
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
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
              disabled={sendingMessage || !newMessage.trim()}
              className="bg-[#ff5603] hover:bg-[#ff5603]/90"
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
    </div>
  );

  const taskStatusConfig: Record<TaskStatus, { label: string; className: string }> = {
    pending: {
      label: "Pending",
      className: "bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer",
    },
    doing: {
      label: "Doing",
      className: "bg-yellow-100 text-yellow-700 hover:bg-yellow-200 cursor-pointer",
    },
    completed: {
      label: "Completed",
      className: "bg-green-100 text-green-700 hover:bg-green-200 cursor-pointer",
    },
  };

  const renderTasks = () => (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Tasks</h3>
        <Button
          size="sm"
          onClick={() => setIsCreateTaskModalOpen(true)}
          className="bg-[#ff5603] hover:bg-[#ff5603]/90 cursor-pointer"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Task
        </Button>
      </div>
      <div className="space-y-3">
        {contact.tasks.map((task) => {
          const isCompleted = task.status === "completed";
          return (
            <div
              key={task._id}
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg border bg-white",
                isCompleted && "bg-muted/30"
              )}
            >
              <Checkbox
                checked={isCompleted}
                onCheckedChange={() => handleToggleTaskComplete(task._id)}
                className="mt-1 border-gray-300"
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
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  {task.dueDate && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(task.dueDate)}
                    </span>
                  )}
                  {task.assignedUserName && <span>{task.assignedUserName}</span>}
                </div>
              </div>
              <Badge
                variant="secondary"
                className={cn(
                  "text-xs",
                  taskStatusConfig[task.status as TaskStatus].className
                )}
                onClick={() => {
                  const statuses: TaskStatus[] = ["pending", "doing", "completed"];
                  const currentIndex = statuses.indexOf(task.status as TaskStatus);
                  const nextStatus = statuses[(currentIndex + 1) % statuses.length];
                  handleTaskStatusChange(task._id, nextStatus);
                }}
              >
                {taskStatusConfig[task.status as TaskStatus].label}
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
        {contact.tasks.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            No tasks created
          </p>
        )}
      </div>
    </div>
  );

  const renderAppointmentsAndInvoices = () => (
    <div className="p-4 space-y-6">
      {/* Appointments */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold flex items-center gap-2">
            <Calendar className="h-4 w-4 text-[#ff5603]" />
            Appointments
          </h3>
          <Button size="sm" variant="outline">
            <Plus className="h-4 w-4 mr-1" />
            Schedule
          </Button>
        </div>
        <div className="space-y-3">
          {contact.appointments.map((appointment) => (
            <div
              key={appointment._id}
              className="p-3 rounded-lg border bg-white"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-sm">{appointment.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDateString(appointment.date)} at {appointment.time}
                  </p>
                  {appointment.location && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3" />
                      {appointment.location}
                    </p>
                  )}
                  {appointment.assignedUserName && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Assigned: {appointment.assignedUserName}
                    </p>
                  )}
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    appointment.status === "completed" && "border-green-500 text-green-600",
                    appointment.status === "pending" && "border-amber-500 text-amber-600",
                    appointment.status === "cancelled" && "border-red-500 text-red-600"
                  )}
                >
                  {appointment.status}
                </Badge>
              </div>
            </div>
          ))}
          {contact.appointments.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No appointments scheduled
            </p>
          )}
        </div>
      </div>

      {/* Invoices */}
      <div className="space-y-4 border-t pt-6">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold flex items-center gap-2">
            <Receipt className="h-4 w-4 text-[#ff5603]" />
            Invoices
          </h3>
          <Button
            size="sm"
            onClick={() => setIsCreateInvoiceModalOpen(true)}
            className="bg-[#ff5603] hover:bg-[#e64d00] cursor-pointer"
          >
            <Plus className="h-4 w-4 mr-1" />
            Create Invoice
          </Button>
        </div>
        <div className="space-y-3">
          {contact.invoices.map((invoice: any) => (
            <div
              key={invoice._id}
              className="p-4 rounded-lg border bg-white hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <Receipt className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{invoice.invoiceNumber}</span>
                    <Badge
                      className={cn(
                        "text-white text-xs",
                        invoiceStatusColors[invoice.status as InvoiceStatus]
                      )}
                    >
                      {INVOICE_STATUS_LABELS[invoice.status as InvoiceStatus]}
                    </Badge>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                    <div>
                      <span className="text-muted-foreground">Total:</span>{" "}
                      <span className="font-medium">{formatCurrency(invoice.total)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Paid:</span>{" "}
                      <span className="font-medium text-green-600">
                        {formatCurrency(invoice.amountPaid)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Due:</span>{" "}
                      {formatDate(invoice.dueDate)}
                    </div>
                    {invoice.paymentType && (
                      <div>
                        <span className="text-muted-foreground">Type:</span>{" "}
                        {PAYMENT_TYPE_LABELS[invoice.paymentType as PaymentType]}
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDownloadInvoicePDF(invoice)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          {contact.invoices.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No invoices created
            </p>
          )}
        </div>
      </div>
    </div>
  );

  const renderDocuments = () => (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Documents</h3>
        <Button size="sm" className="bg-[#ff5603] hover:bg-[#ff5603]/90">
          <Plus className="h-4 w-4 mr-1" />
          Upload
        </Button>
      </div>
      <div className="space-y-3">
        {contact.documents.map((doc) => (
          <div
            key={doc._id}
            className="flex items-center gap-3 p-3 rounded-lg border bg-white"
          >
            <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
              <FileText className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{doc.name}</p>
              <p className="text-xs text-muted-foreground">
                Uploaded {formatDate(doc.createdAt)}
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost">
                <Download className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        {contact.documents.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            No documents uploaded
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div className="h-[calc(100vh-8rem)] sm:h-[calc(100vh-8rem)]">
      {/* Header with back button - Desktop only */}
      <div className="hidden sm:flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/contacts")}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Contacts
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 h-full sm:h-[calc(100%-3rem)]">
        {/* Mobile: Compact Details Header (15%) */}
        <div className="sm:hidden h-[15%] flex-shrink-0 bg-white rounded-lg border px-3 py-2">
          {/* Row 1: Back, Avatar, Name, Stage, Source */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/contacts")}
              className="h-7 w-7 -ml-1 flex-shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="h-6 w-6 rounded-full bg-[#ff5603]/10 flex items-center justify-center flex-shrink-0">
              <User className="h-3 w-3 text-[#ff5603]" />
            </div>
            <h2 className="text-sm font-semibold truncate flex-1">{contact.fullName}</h2>
            {primaryOpportunity && (
              <Badge
                className={cn(
                  "text-white text-[10px] px-1.5 py-0 h-5 flex-shrink-0",
                  stageColors[primaryOpportunity.stage as PipelineStage]
                )}
              >
                {PIPELINE_STAGE_LABELS[primaryOpportunity.stage as PipelineStage]}
              </Badge>
            )}
            {contact.facebookPsid && (
              <Badge className="bg-blue-600 text-white text-[10px] px-1.5 py-0 h-5 flex items-center gap-0.5 flex-shrink-0">
                <FacebookIcon className="h-2.5 w-2.5" />
                FB
              </Badge>
            )}
            {contact.instagramScopedId && (
              <Badge className="bg-pink-500 text-white text-[10px] px-1.5 py-0 h-5 flex items-center gap-0.5 flex-shrink-0">
                <InstagramIcon className="h-2.5 w-2.5" />
                IG
              </Badge>
            )}
            {!contact.facebookPsid && !contact.instagramScopedId && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 flex-shrink-0">
                {sourceLabels[contact.source as ContactSource] || contact.source}
              </Badge>
            )}
          </div>

          {/* Row 2: Phone, Email */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1.5 ml-9">
            <span className="flex items-center gap-1">
              <Phone className="h-3 w-3" />
              <span>{contact.phone || "—"}</span>
            </span>
            <span className="flex items-center gap-1">
              <Mail className="h-3 w-3" />
              <span className="truncate max-w-[120px]">{contact.email || "—"}</span>
            </span>
          </div>

          {/* Row 3: Opportunity */}
          {primaryOpportunity && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1.5 ml-9">
              <Building2 className="h-3 w-3" />
              <span className="truncate">{primaryOpportunity.name.replace(/^Opportunity\s*/i, '')}</span>
            </div>
          )}
        </div>

        {/* Desktop: Left Sidebar - Contact Details */}
        <div className="hidden sm:block w-80 flex-shrink-0 bg-white rounded-lg border p-6 overflow-y-auto">
          <div className="space-y-6">
            {/* Contact Name and Avatar */}
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-[#ff5603]/10 flex items-center justify-center">
                <User className="h-8 w-8 text-[#ff5603]" />
              </div>
              <div className="flex-1">
                {isEditingContact ? (
                  <div className="space-y-2">
                    <Input
                      value={editFirstName}
                      onChange={(e) => setEditFirstName(e.target.value)}
                      placeholder="First name"
                      className="h-8 text-sm"
                    />
                    <Input
                      value={editLastName}
                      onChange={(e) => setEditLastName(e.target.value)}
                      placeholder="Last name"
                      className="h-8 text-sm"
                    />
                  </div>
                ) : (
                  <h2 className="text-xl font-semibold">{contact.fullName}</h2>
                )}
                <div className="flex items-center gap-2 mt-1">
                  {contact.facebookPsid && (
                    <Badge className="bg-blue-600 text-white text-xs flex items-center gap-1">
                      <FacebookIcon className="h-3 w-3" />
                      Facebook
                    </Badge>
                  )}
                  {contact.instagramScopedId && (
                    <Badge className="bg-pink-500 text-white text-xs flex items-center gap-1">
                      <InstagramIcon className="h-3 w-3" />
                      Instagram
                    </Badge>
                  )}
                  {!contact.facebookPsid && !contact.instagramScopedId && (
                    <Badge variant="outline">
                      {sourceLabels[contact.source as ContactSource] || contact.source}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Contact Information
                </h3>
                {isEditingContact ? (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCancelEditContact}
                      disabled={isSavingContact}
                      className="h-7 w-7 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSaveContact}
                      disabled={isSavingContact || !editFirstName.trim() || !editLastName.trim()}
                      className="h-7 w-7 p-0 text-green-600 hover:text-green-700"
                    >
                      {isSavingContact ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleStartEditContact}
                    className="h-7 w-7 p-0"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>

              {isEditingContact ? (
                <>
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <Input
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="Phone number"
                      className="h-8 text-sm flex-1"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <Input
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      placeholder="Email address"
                      type="email"
                      className="h-8 text-sm flex-1"
                    />
                  </div>
                </>
              ) : (
                <>
                  {contact.phone ? (
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{contact.phone}</span>
                    </div>
                  ) : (
                    <button
                      onClick={handleStartEditContact}
                      className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors group"
                    >
                      <Phone className="h-4 w-4" />
                      <span className="text-sm flex items-center gap-1">
                        <Plus className="h-3 w-3" />
                        Add phone
                      </span>
                    </button>
                  )}

                  {contact.email ? (
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{contact.email}</span>
                    </div>
                  ) : (
                    <button
                      onClick={handleStartEditContact}
                      className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors group"
                    >
                      <Mail className="h-4 w-4" />
                      <span className="text-sm flex items-center gap-1">
                        <Plus className="h-3 w-3" />
                        Add email
                      </span>
                    </button>
                  )}
                </>
              )}

              {contact.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span className="text-sm">{contact.address}</span>
                </div>
              )}
            </div>

            {/* Opportunity Info */}
            {primaryOpportunity && (
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Associated Opportunity
                </h3>

                <div
                  className="flex items-start gap-3 cursor-pointer hover:text-[#ff5603] transition-colors"
                  onClick={() => router.push(`/pipeline?opportunityId=${primaryOpportunity._id}`)}
                >
                  <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span className="text-sm underline">{primaryOpportunity.name}</span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">Stage:</span>
                  <Badge
                    className={cn(
                      "text-white",
                      stageColors[primaryOpportunity.stage as PipelineStage]
                    )}
                  >
                    {PIPELINE_STAGE_LABELS[primaryOpportunity.stage as PipelineStage]}
                  </Badge>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-3 pt-4 border-t">
              <Button variant="outline" className="w-full">
                <Mail className="h-4 w-4 mr-2" />
                Send Email
              </Button>
            </div>
          </div>
        </div>

        {/* Right Side - Content Area (85% on mobile) */}
        <div className="h-[85%] sm:h-auto flex-1 bg-white rounded-lg border overflow-hidden flex flex-col">
          {/* View Selector */}
          <div className="flex border-b flex-shrink-0 overflow-x-auto">
            {viewOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => setActiveView(option.id)}
                className={cn(
                  "flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap",
                  activeView === option.id
                    ? "text-[#ff5603] border-b-2 border-[#ff5603] -mb-px"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <option.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">{option.label}</span>
                <span className="sm:hidden">{option.label.split(' ')[0]}</span>
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden bg-muted/30">
            {activeView === "messages" && renderMessages()}
            {activeView === "tasks" && (
              <div className="overflow-y-auto h-full">{renderTasks()}</div>
            )}
            {activeView === "appointments_invoices" && (
              <div className="overflow-y-auto h-full">{renderAppointmentsAndInvoices()}</div>
            )}
            {activeView === "documents" && (
              <div className="overflow-y-auto h-full">{renderDocuments()}</div>
            )}
          </div>
        </div>
      </div>

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
        defaultContactId={contact._id}
        open={isCreateTaskModalOpen}
        onOpenChange={setIsCreateTaskModalOpen}
        showOverlay
        offsetForSidebar
      />

      {/* Invoice Create Modal */}
      <InvoiceCreateModal
        open={isCreateInvoiceModalOpen}
        onOpenChange={setIsCreateInvoiceModalOpen}
        preselectedOpportunityId={primaryOpportunity?._id}
      />
    </div>
  );
}
