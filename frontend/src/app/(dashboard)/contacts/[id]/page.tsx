"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ContactSource,
  PipelineStage,
  AppointmentStatus,
  AppointmentType,
  InvoiceStatus,
  TaskStatus,
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
} from "lucide-react";
import { cn } from "@/lib/utils";

type ContentView = "messages" | "tasks" | "appointments_invoices" | "documents";

// Local mock interfaces (aligned with Convex schema)
interface MockMessage {
  _id: string;
  content: string;
  senderName: string;
  createdAt: number;
  isOutgoing: boolean;
}

interface MockTask {
  _id: string;
  title: string;
  description?: string;
  dueDate?: number;
  assignedUserName?: string;
  status: TaskStatus;
}

interface MockAppointment {
  _id: string;
  title: string;
  date: string;
  time: string;
  location?: string;
  contactId: string;
  contactName: string;
  opportunityId?: string;
  opportunityName?: string;
  assignedUserId: string;
  assignedUserName: string;
  status: AppointmentStatus;
  appointmentType: AppointmentType;
}

interface MockDocument {
  _id: string;
  name: string;
  mimeType: string;
  url?: string;
  createdAt: number;
}

interface MockInvoice {
  _id: string;
  invoiceNumber: string;
  opportunityId: string;
  opportunityName: string;
  total: number;
  amountPaid: number;
  status: InvoiceStatus;
  notes?: string;
  dueDate: number;
  dateSent?: number;
}

interface MockContact {
  _id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  address?: string;
  source: ContactSource;
  opportunityId?: string;
  opportunityName?: string;
  opportunityStage?: PipelineStage;
  messages: MockMessage[];
  tasks: MockTask[];
  appointments: MockAppointment[];
  invoices: MockInvoice[];
  documents: MockDocument[];
  createdAt: number;
  updatedAt: number;
}

// Mock contact data
const getMockContact = (id: string): MockContact => ({
  _id: id,
  firstName: "Maria",
  lastName: "Santos",
  email: "maria.santos@email.com",
  phone: "+63 917 123 4567",
  address: "123 Solar Street, Salinas, Cavite",
  source: "website",
  opportunityId: "opp1",
  opportunityName: "Santos Residence Solar Installation",
  opportunityStage: "contract_drafting",
  messages: [
    {
      _id: "m1",
      content: "Hi, I'm interested in getting a solar panel installation for my home.",
      senderName: "Maria Santos",
      createdAt: Date.parse("2024-01-15T08:30:00Z"),
      isOutgoing: false,
    },
    {
      _id: "m2",
      content: "Thank you for your interest! I'd be happy to help you with that. Can you tell me more about your home's energy needs?",
      senderName: "Sales Rep",
      createdAt: Date.parse("2024-01-15T09:00:00Z"),
      isOutgoing: true,
    },
    {
      _id: "m3",
      content: "We typically use around 500 kWh per month. Our roof faces south and is about 100 sqm.",
      senderName: "Maria Santos",
      createdAt: Date.parse("2024-01-15T10:15:00Z"),
      isOutgoing: false,
    },
    {
      _id: "m4",
      content: "That's great! A south-facing roof is ideal for solar. I'll prepare a proposal for a 5kW system which should cover your needs.",
      senderName: "Sales Rep",
      createdAt: Date.parse("2024-01-15T11:00:00Z"),
      isOutgoing: true,
    },
  ],
  tasks: [
    {
      _id: "t1",
      title: "Send proposal document",
      description: "Prepare and send the solar installation proposal",
      dueDate: Date.parse("2024-01-25"),
      assignedUserName: "John Sales",
      status: "completed",
    },
    {
      _id: "t2",
      title: "Schedule site visit",
      description: "Arrange a site visit to assess roof condition",
      dueDate: Date.parse("2024-01-28"),
      assignedUserName: "Tech Team",
      status: "doing",
    },
    {
      _id: "t3",
      title: "Follow up on proposal",
      description: "Call to discuss the proposal and answer questions",
      dueDate: Date.parse("2024-01-30"),
      assignedUserName: "John Sales",
      status: "pending",
    },
  ],
  appointments: [
    {
      _id: "a1",
      title: "Initial Consultation",
      date: "2024-01-20",
      time: "10:00 AM",
      location: "123 Solar Street, Salinas, Cavite",
      contactId: id,
      contactName: "Maria Santos",
      opportunityId: "opp1",
      opportunityName: "Santos Residence Solar Installation",
      assignedUserId: "u1",
      assignedUserName: "Juan Rivera",
      status: "completed",
      appointmentType: "discovery_call",
    },
    {
      _id: "a2",
      title: "Site Assessment",
      date: "2024-01-28",
      time: "2:00 PM",
      location: "123 Solar Street, Salinas, Cavite",
      contactId: id,
      contactName: "Maria Santos",
      opportunityId: "opp1",
      opportunityName: "Santos Residence Solar Installation",
      assignedUserId: "u2",
      assignedUserName: "Carlos Reyes",
      status: "pending",
      appointmentType: "field_inspection",
    },
  ],
  invoices: [
    {
      _id: "i1",
      invoiceNumber: "INV-2024-001",
      opportunityId: "opp1",
      opportunityName: "Santos Residence Solar Installation",
      total: 15000,
      amountPaid: 15000,
      status: "paid_full",
      notes: "Deposit payment",
      dueDate: Date.parse("2024-01-20"),
      dateSent: Date.parse("2024-01-15"),
    },
    {
      _id: "i2",
      invoiceNumber: "INV-2024-015",
      opportunityId: "opp1",
      opportunityName: "Santos Residence Solar Installation",
      total: 250000,
      amountPaid: 0,
      status: "pending",
      notes: "Full installation balance",
      dueDate: Date.parse("2024-02-15"),
      dateSent: Date.parse("2024-01-25"),
    },
  ],
  documents: [
    {
      _id: "d1",
      name: "Solar Proposal - Santos Residence.pdf",
      mimeType: "application/pdf",
      url: "/documents/proposal-santos.pdf",
      createdAt: Date.parse("2024-01-18T14:00:00Z"),
    },
    {
      _id: "d2",
      name: "Site Photos.zip",
      mimeType: "application/zip",
      url: "/documents/site-photos.zip",
      createdAt: Date.parse("2024-01-20T16:30:00Z"),
    },
    {
      _id: "d3",
      name: "Contract Draft.docx",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      url: "/documents/contract-draft.docx",
      createdAt: Date.parse("2024-01-22T10:00:00Z"),
    },
  ],
  createdAt: Date.parse("2024-01-15T08:00:00Z"),
  updatedAt: Date.parse("2024-01-20T10:30:00Z"),
});

const sourceLabels: Record<ContactSource, string> = {
  website: "Website",
  referral: "Referral",
  facebook: "Facebook",
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
  const contact = getMockContact(id);

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

  const viewOptions: { id: ContentView; label: string; icon: React.ElementType }[] = [
    { id: "messages", label: "Messages", icon: MessageSquare },
    { id: "tasks", label: "Tasks", icon: CheckSquare },
    { id: "appointments_invoices", label: "Appointments & Invoices", icon: Calendar },
    { id: "documents", label: "Documents", icon: FileText },
  ];

  const renderMessages = () => (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {contact.messages.map((message) => (
          <div
            key={message._id}
            className={cn(
              "flex",
              message.isOutgoing ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cn(
                "max-w-[70%] rounded-lg px-4 py-2",
                message.isOutgoing
                  ? "bg-[#ff5603] text-white"
                  : "bg-muted"
              )}
            >
              <p className="text-sm">{message.content}</p>
              <p
                className={cn(
                  "text-xs mt-1",
                  message.isOutgoing ? "text-white/70" : "text-muted-foreground"
                )}
              >
                {formatTime(message.createdAt)}
              </p>
            </div>
          </div>
        ))}
      </div>
      <div className="border-t p-4">
        <div className="flex gap-2">
          <Input
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1"
          />
          <Button className="bg-[#ff5603] hover:bg-[#ff5603]/90">
            <Send className="h-4 w-4" />
          </Button>
        </div>
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
      </div>
    </div>
  );

  const renderAppointmentsAndInvoices = () => (
    <div className="p-4 space-y-6">
      {/* Appointments - Top Half */}
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
                </div>
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

      {/* Invoices - Bottom Half */}
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
                    invoiceStatusColors[invoice.status]
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

  const fullName = getFullName(contact.firstName, contact.lastName);

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
                <h2 className="text-xl font-semibold">{fullName}</h2>
                <Badge variant="outline" className="mt-1">
                  {sourceLabels[contact.source]}
                </Badge>
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
            {contact.opportunityName && (
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Associated Opportunity
                </h3>

                <div className="flex items-start gap-3">
                  <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span className="text-sm">{contact.opportunityName}</span>
                </div>

                {contact.opportunityStage && (
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">Stage:</span>
                    <Badge
                      className={cn(
                        "text-white",
                        stageColors[contact.opportunityStage]
                      )}
                    >
                      {PIPELINE_STAGE_LABELS[contact.opportunityStage]}
                    </Badge>
                  </div>
                )}
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
          <div className="flex border-b">
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
          <div className="flex-1 overflow-y-auto bg-muted/30">
            {activeView === "messages" && renderMessages()}
            {activeView === "tasks" && renderTasks()}
            {activeView === "appointments_invoices" && renderAppointmentsAndInvoices()}
            {activeView === "documents" && renderDocuments()}
          </div>
        </div>
      </div>
    </div>
  );
}
