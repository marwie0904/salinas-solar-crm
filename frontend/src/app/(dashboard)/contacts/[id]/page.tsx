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
} from "lucide-react";
import { cn } from "@/lib/utils";

type ContentView = "messages" | "tasks" | "appointments_invoices" | "documents";
type Channel = "facebook" | "instagram";

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
  scheduled_discovery_call: "bg-blue-500",
  discovery_call: "bg-cyan-500",
  no_show_discovery_call: "bg-red-400",
  field_inspection: "bg-purple-500",
  to_follow_up: "bg-amber-500",
  contract_drafting: "bg-orange-500",
  contract_signing: "bg-indigo-500",
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

  // Convex queries
  const contact = useQuery(api.contacts.getWithRelations, {
    id: id as Id<"contacts">,
  });

  // Convex actions/mutations
  const sendMetaMessage = useAction(api.meta.sendMessage);
  const markAllAsRead = useMutation(api.messages.markAllAsRead);

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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
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

  const renderMessages = () => (
    <div className="flex flex-col h-full">
      {/* Messaging Window Status */}
      {channel && messagingWindow && (
        <div className="px-4 py-2 bg-muted/50 border-b flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 text-xs">
            <Badge className={cn(
              "text-white",
              channel === "facebook" ? "bg-blue-600" : "bg-gradient-to-r from-purple-500 to-pink-500"
            )}>
              {channel === "facebook" ? "Facebook" : "Instagram"}
            </Badge>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <Clock className="h-3.5 w-3.5" />
            <span className={cn(
              messagingWindow.isStandardWindow ? "text-green-600" :
              messagingWindow.canSend ? "text-amber-600" : "text-red-600"
            )}>
              {messagingWindow.isStandardWindow
                ? `24h window: ${formatTimeRemaining(messagingWindow.expiresAt - Date.now())}`
                : messagingWindow.canSend
                ? `Human agent: ${formatTimeRemaining(messagingWindow.expiresAt - Date.now())}`
                : "Window expired"}
            </span>
          </div>
        </div>
      )}

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
                <p className="text-sm">{message.content}</p>
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

  const renderTasks = () => (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Tasks</h3>
        <Button size="sm" className="bg-[#ff5603] hover:bg-[#ff5603]/90">
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
              className="flex items-start gap-3 p-3 rounded-lg border bg-white"
            >
              <Checkbox checked={isCompleted} className="mt-1" />
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
                  <p className="text-xs text-muted-foreground mt-1">
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
                variant="outline"
                className={cn(
                  task.status === "completed" && "border-green-500 text-green-600",
                  task.status === "doing" && "border-yellow-500 text-yellow-600",
                  task.status === "pending" && "border-slate-400 text-slate-600"
                )}
              >
                {task.status}
              </Badge>
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
          <Button size="sm" variant="outline">
            <Plus className="h-4 w-4 mr-1" />
            Create Invoice
          </Button>
        </div>
        <div className="space-y-3">
          {contact.invoices.map((invoice) => (
            <div
              key={invoice._id}
              className="p-3 rounded-lg border bg-white flex justify-between items-center"
            >
              <div>
                <p className="font-medium text-sm">{invoice.invoiceNumber}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Due: {formatDate(invoice.dueDate)}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-sm">
                  {formatCurrency(invoice.total)}
                </p>
                <Badge
                  className={cn(
                    "mt-1 text-white text-xs",
                    invoiceStatusColors[invoice.status as InvoiceStatus]
                  )}
                >
                  {invoice.status}
                </Badge>
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
    <div className="h-[calc(100vh-8rem)]">
      {/* Header with back button */}
      <div className="flex items-center gap-4 mb-6">
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

      <div className="flex gap-6 h-[calc(100%-3rem)]">
        {/* Left Sidebar - Contact Details */}
        <div className="w-80 flex-shrink-0 bg-white rounded-lg border p-6 overflow-y-auto">
          <div className="space-y-6">
            {/* Contact Name and Avatar */}
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-[#ff5603]/10 flex items-center justify-center">
                <User className="h-8 w-8 text-[#ff5603]" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">{contact.fullName}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline">
                    {sourceLabels[contact.source as ContactSource] || contact.source}
                  </Badge>
                  {contact.facebookPsid && (
                    <Badge className="bg-blue-600 text-white text-xs">FB</Badge>
                  )}
                  {contact.instagramScopedId && (
                    <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs">IG</Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Contact Information
              </h3>

              {contact.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{contact.phone}</span>
                </div>
              )}

              {contact.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{contact.email}</span>
                </div>
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

                <div className="flex items-start gap-3">
                  <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span className="text-sm">{primaryOpportunity.name}</span>
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
              <Button className="w-full bg-[#ff5603] hover:bg-[#ff5603]/90">
                <Phone className="h-4 w-4 mr-2" />
                Call
              </Button>
              <Button variant="outline" className="w-full">
                <Mail className="h-4 w-4 mr-2" />
                Send Email
              </Button>
            </div>
          </div>
        </div>

        {/* Right Side - Content Area */}
        <div className="flex-1 bg-white rounded-lg border overflow-hidden flex flex-col">
          {/* View Selector */}
          <div className="flex border-b flex-shrink-0">
            {viewOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => setActiveView(option.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors",
                  activeView === option.id
                    ? "text-[#ff5603] border-b-2 border-[#ff5603] -mb-px"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <option.icon className="h-4 w-4" />
                {option.label}
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
    </div>
  );
}
