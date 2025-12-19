"use client";

import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery, useAction } from "convex/react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

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

export function OpportunityDetailModal({
  opportunity,
  open,
  onOpenChange,
  onSave,
  onDelete,
}: OpportunityDetailModalProps) {
  const [editedOpportunity, setEditedOpportunity] = useState<PipelineOpportunity | null>(null);
  const [activeNav, setActiveNav] = useState<NavItem>("details");
  const [isSaving, setIsSaving] = useState(false);

  // Message state
  const [messageInput, setMessageInput] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const updateOpportunity = useMutation(api.opportunities.update);
  const updateStage = useMutation(api.opportunities.updateStage);
  const removeOpportunity = useMutation(api.opportunities.remove);

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

  useEffect(() => {
    if (opportunity) {
      setEditedOpportunity(opportunity);
      setActiveNav("details");
      setMessageInput("");
      setMessageError(null);
    }
  }, [opportunity]);

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
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
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
        estimatedValue: editedOpportunity.estimatedValue,
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

  const renderDetails = () => (
    <div className="space-y-6">
      {/* Associated Contact */}
      <div className="space-y-2">
        <label className="text-sm font-medium flex items-center gap-2">
          <User className="h-4 w-4 text-[#ff5603]" />
          Associated Contact
        </label>
        {editedOpportunity.contact ? (
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="font-medium">
              {editedOpportunity.contact.firstName} {editedOpportunity.contact.lastName}
            </p>
            {editedOpportunity.contact.email && (
              <p className="text-sm text-muted-foreground mt-1">
                {editedOpportunity.contact.email}
              </p>
            )}
            {editedOpportunity.contact.phone && (
              <p className="text-sm text-muted-foreground">
                {editedOpportunity.contact.phone}
              </p>
            )}
            {editedOpportunity.contact.address && (
              <p className="text-sm text-muted-foreground mt-2">
                {editedOpportunity.contact.address}
              </p>
            )}
          </div>
        ) : (
          <div className="p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
            No contact associated
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
        {/* Messaging Window Status Header */}
        {messagingWindow && channel && windowData && (
          <div className="px-4 py-3 bg-muted/50 border-b flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2 text-xs">
              <Badge className={cn(
                "text-white",
                channel === "facebook" ? "bg-blue-600" : "bg-gradient-to-r from-purple-500 to-pink-500"
              )}>
                {channel === "facebook" ? "Facebook" : "Instagram"}
              </Badge>
              <span className="text-muted-foreground">
                {editedOpportunity?.contact?.firstName} {editedOpportunity?.contact?.lastName}
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs">
              <Clock className="h-3.5 w-3.5" />
              <span className={cn(
                windowData.isStandardWindow ? "text-green-600" :
                windowData.canSend ? "text-amber-600" : "text-red-600"
              )}>
                {windowData.isStandardWindow
                  ? `24h window: ${formatTimeRemaining(windowData.expiresAt - Date.now())}`
                  : windowData.canSend
                  ? `Human agent: ${formatTimeRemaining(windowData.expiresAt - Date.now())}`
                  : "Window expired"}
              </span>
            </div>
          </div>
        )}

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

  const renderContent = () => {
    switch (activeNav) {
      case "details":
        return renderDetails();
      case "messages":
        return renderMessages();
      case "tasks":
        return renderPlaceholder(CheckSquare, "Tasks will appear here");
      case "documents":
        return renderPlaceholder(FileText, "Documents will appear here");
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
              <DialogTitle className="text-xl font-bold">
                {editedOpportunity.name}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-2">
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>
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
    </Dialog>
  );
}
