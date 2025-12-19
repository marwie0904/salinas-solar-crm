"use client";

import { useState, useEffect } from "react";
import { PipelineStage } from "@/lib/types";
import { MockOpportunity } from "@/lib/data/opportunities";
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
import { Separator } from "@/components/ui/separator";
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
  Upload,
  Trash2,
  ClipboardList,
  Send,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface OpportunityDetailModalProps {
  opportunity: MockOpportunity | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (opportunity: MockOpportunity) => void;
  onDelete: (opportunityId: string) => void;
}

type NavItem = "details" | "messages" | "tasks" | "documents" | "invoices";

const stageOptions: { value: PipelineStage; label: string }[] = [
  { value: "new_lead", label: "New Lead" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "proposal", label: "Proposal" },
  { value: "negotiation", label: "Negotiation" },
  { value: "closed_won", label: "Closed Won" },
  { value: "closed_lost", label: "Closed Lost" },
];

const navItems: { id: NavItem; label: string; icon: React.ElementType }[] = [
  { id: "details", label: "Details", icon: ClipboardList },
  { id: "messages", label: "Messages", icon: MessageSquare },
  { id: "tasks", label: "Tasks", icon: CheckSquare },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "invoices", label: "Invoices", icon: Receipt },
];

const invoiceStatusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  paid: "bg-green-100 text-green-700",
  overdue: "bg-red-100 text-red-700",
};

export function OpportunityDetailModal({
  opportunity,
  open,
  onOpenChange,
  onSave,
  onDelete,
}: OpportunityDetailModalProps) {
  const [editedOpportunity, setEditedOpportunity] = useState<MockOpportunity | null>(null);
  const [activeNav, setActiveNav] = useState<NavItem>("details");
  const [newMessage, setNewMessage] = useState("");

  useEffect(() => {
    if (opportunity) {
      setEditedOpportunity(opportunity);
      setActiveNav("details");
    }
  }, [opportunity]);

  if (!editedOpportunity) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleSave = () => {
    if (editedOpportunity) {
      onSave(editedOpportunity);
      onOpenChange(false);
    }
  };

  const handleDelete = () => {
    if (editedOpportunity && confirm("Are you sure you want to delete this opportunity?")) {
      onDelete(editedOpportunity._id);
      onOpenChange(false);
    }
  };

  const formatDate = (timestamp: number | undefined) => {
    if (!timestamp) return "—";
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const renderDetails = () => (
    <div className="space-y-6">
      {/* Associated Contact */}
      <div className="space-y-2">
        <label className="text-sm font-medium flex items-center gap-2">
          <User className="h-4 w-4 text-[#ff5603]" />
          Associated Contact
        </label>
        <div className="p-4 bg-muted/50 rounded-lg">
          <p className="font-medium">{editedOpportunity.contact.firstName} {editedOpportunity.contact.lastName}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {editedOpportunity.contact.email}
          </p>
          <p className="text-sm text-muted-foreground">
            {editedOpportunity.contact.phone}
          </p>
          {editedOpportunity.contact.address && (
            <p className="text-sm text-muted-foreground mt-2">
              {editedOpportunity.contact.address}
            </p>
          )}
        </div>
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

  const renderMessages = () => (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 pr-4">
        <div className="space-y-3">
          {editedOpportunity.messages.length > 0 ? (
            editedOpportunity.messages.map((message) => (
              <div
                key={message._id}
                className={cn(
                  "p-3 rounded-lg text-sm max-w-[80%]",
                  message.isOutgoing
                    ? "bg-[#ff5603] text-white ml-auto"
                    : "bg-muted mr-auto"
                )}
              >
                <div className="flex items-center justify-between mb-1 gap-4">
                  <span className={cn("font-medium text-xs", message.isOutgoing ? "text-white/80" : "text-muted-foreground")}>
                    {message.senderName}
                  </span>
                  <span className={cn("text-xs", message.isOutgoing ? "text-white/70" : "text-muted-foreground")}>
                    {new Date(message.createdAt).toLocaleString()}
                  </span>
                </div>
                <p>{message.content}</p>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No messages yet</p>
            </div>
          )}
        </div>
      </ScrollArea>
      <div className="flex gap-2 mt-4 pt-4 border-t">
        <Textarea
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="resize-none min-h-[80px]"
        />
        <Button className="bg-[#ff5603] hover:bg-[#e64d00] self-end">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  const renderTasks = () => (
    <div className="space-y-3">
      {editedOpportunity.tasks.length > 0 ? (
        editedOpportunity.tasks.map((task) => {
          const isCompleted = task.status === "completed";
          return (
          <div
            key={task._id}
            className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={isCompleted}
                readOnly
                className="h-4 w-4 rounded border-gray-300"
              />
              <div>
                <p
                  className={cn(
                    "font-medium",
                    isCompleted && "line-through text-muted-foreground"
                  )}
                >
                  {task.title}
                </p>
                {task.description && (
                  <p className="text-sm text-muted-foreground">
                    {task.description}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Due: {formatDate(task.dueDate)} • Assigned to: {task.assignedUserName || "—"}
                </p>
              </div>
            </div>
            <Badge
              variant="secondary"
              className={cn(
                task.status === "pending" && "bg-gray-100 text-gray-700",
                task.status === "doing" && "bg-yellow-100 text-yellow-700",
                task.status === "completed" && "bg-green-100 text-green-700"
              )}
            >
              {task.status}
            </Badge>
          </div>
        )})
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <CheckSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No tasks associated</p>
        </div>
      )}
    </div>
  );

  const renderDocuments = () => (
    <div className="space-y-4">
      <div className="border-2 border-dashed rounded-lg p-8 text-center">
        <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground mb-2">
          Drop files here or click to upload
        </p>
        <Button variant="outline" size="sm">
          Browse Files
        </Button>
      </div>

      {editedOpportunity.documents.length > 0 ? (
        <div className="space-y-2">
          {editedOpportunity.documents.map((doc) => (
            <div
              key={doc._id}
              className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium text-sm">{doc.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Uploaded: {formatDate(doc.createdAt)}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm">
                Download
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">No documents uploaded yet</p>
        </div>
      )}
    </div>
  );

  const renderInvoices = () => (
    <div className="space-y-3">
      {editedOpportunity.invoices.length > 0 ? (
        editedOpportunity.invoices.map((invoice) => (
          <div
            key={invoice._id}
            className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
          >
            <div>
              <p className="font-medium">{invoice.invoiceNumber}</p>
              <p className="text-sm text-muted-foreground">
                Due: {formatDate(invoice.dueDate)}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-semibold text-lg">
                {formatCurrency(invoice.total)}
              </span>
              <Badge
                className={cn("capitalize", invoiceStatusColors[invoice.status])}
              >
                {invoice.status}
              </Badge>
            </div>
          </div>
        ))
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <Receipt className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No invoices associated</p>
        </div>
      )}
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
        return renderInvoices();
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
                  <SelectTrigger className="w-[160px] h-8 text-sm">
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
                const count =
                  item.id === "messages"
                    ? editedOpportunity.messages.length
                    : item.id === "tasks"
                    ? editedOpportunity.tasks.length
                    : item.id === "documents"
                    ? editedOpportunity.documents.length
                    : item.id === "invoices"
                    ? editedOpportunity.invoices.length
                    : null;

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
                      {count !== null && count > 0 && (
                        <Badge
                          variant="secondary"
                          className={cn(
                            "h-5 min-w-[20px] text-xs",
                            isActive
                              ? "bg-white/20 text-white"
                              : "bg-muted-foreground/20"
                          )}
                        >
                          {count}
                        </Badge>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Right Content Area */}
          <ScrollArea className="flex-1 p-6">
            {renderContent()}
          </ScrollArea>
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
            className="bg-[#ff5603] hover:bg-[#e64d00]"
          >
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
