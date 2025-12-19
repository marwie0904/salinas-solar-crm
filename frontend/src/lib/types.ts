import { Id } from "../../convex/_generated/dataModel";

// ============================================
// ENUM TYPES
// ============================================

export type TaskStatus = "pending" | "doing" | "completed";
export type TaskPriority = "low" | "medium" | "high";

export type PipelineStage =
  | "new_lead"
  | "contacted"
  | "qualified"
  | "proposal"
  | "negotiation"
  | "closed_won"
  | "closed_lost";

export type ContactSource =
  | "website"
  | "referral"
  | "facebook"
  | "google_ads"
  | "walk_in"
  | "cold_call"
  | "other";

export type MessageChannel = "sms" | "facebook" | "instagram";

export type AppointmentStatus = "pending" | "cancelled" | "no_show" | "completed";
export type AppointmentType = "discovery_call" | "field_inspection";

export type InvoiceStatus = "pending" | "partially_paid" | "paid_full" | "cancelled";

export type ProductCategory =
  | "solar_panel"
  | "inverter"
  | "battery"
  | "mounting_system"
  | "installation_package"
  | "labor"
  | "accessory"
  | "service"
  | "other";

export type PaymentMethod =
  | "cash"
  | "bank_transfer"
  | "check"
  | "credit_card"
  | "gcash"
  | "maya"
  | "other";

export type UserRole = "admin" | "sales" | "technician";

// ============================================
// LABEL MAPS
// ============================================

export const PIPELINE_STAGE_LABELS: Record<PipelineStage, string> = {
  new_lead: "New Lead",
  contacted: "Contacted",
  qualified: "Qualified",
  proposal: "Proposal",
  negotiation: "Negotiation",
  closed_won: "Closed Won",
  closed_lost: "Closed Lost",
};

export const CONTACT_SOURCE_LABELS: Record<ContactSource, string> = {
  website: "Website",
  referral: "Referral",
  facebook: "Facebook",
  google_ads: "Google Ads",
  walk_in: "Walk-in",
  cold_call: "Cold Call",
  other: "Other",
};

export const MESSAGE_CHANNEL_LABELS: Record<MessageChannel, string> = {
  sms: "SMS",
  facebook: "Facebook",
  instagram: "Instagram",
};

export const APPOINTMENT_TYPE_LABELS: Record<AppointmentType, string> = {
  discovery_call: "Discovery Call",
  field_inspection: "Field Inspection",
};

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  pending: "Pending",
  cancelled: "Cancelled",
  no_show: "No Show",
  completed: "Completed",
};

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  pending: "Pending",
  partially_paid: "Partially Paid",
  paid_full: "Paid Full",
  cancelled: "Cancelled",
};

export const PRODUCT_CATEGORY_LABELS: Record<ProductCategory, string> = {
  solar_panel: "Solar Panel",
  inverter: "Inverter",
  battery: "Battery",
  mounting_system: "Mounting System",
  installation_package: "Installation Package",
  labor: "Labor",
  accessory: "Accessory",
  service: "Service",
  other: "Other",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Cash",
  bank_transfer: "Bank Transfer",
  check: "Check",
  credit_card: "Credit Card",
  gcash: "GCash",
  maya: "Maya",
  other: "Other",
};

// ============================================
// ENTITY INTERFACES
// ============================================

export interface User {
  _id: Id<"users">;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role?: UserRole;
  avatarUrl?: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
  // Computed
  fullName?: string;
}

export interface Contact {
  _id: Id<"contacts">;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  address?: string;
  company?: string;
  source: ContactSource;
  preferredMessageChannel?: MessageChannel;
  notes?: string;
  isDeleted: boolean;
  createdBy?: Id<"users">;
  createdAt: number;
  updatedAt: number;
  // Computed
  fullName?: string;
}

export interface Opportunity {
  _id: Id<"opportunities">;
  name: string;
  contactId: Id<"contacts">;
  stage: PipelineStage;
  estimatedValue: number;
  notes?: string;
  expectedCloseDate?: number;
  lostReason?: string;
  assignedTo?: Id<"users">;
  isDeleted: boolean;
  createdBy?: Id<"users">;
  createdAt: number;
  updatedAt: number;
  // Joined data
  contact?: Contact | null;
  assignedUser?: User | null;
}

export interface Task {
  _id: Id<"tasks">;
  title: string;
  description?: string;
  status: TaskStatus;
  priority?: TaskPriority;
  dueDate?: number;
  completedAt?: number;
  contactId?: Id<"contacts">;
  opportunityId?: Id<"opportunities">;
  assignedTo?: Id<"users">;
  isDeleted: boolean;
  createdBy?: Id<"users">;
  createdAt: number;
  updatedAt: number;
  // Computed
  isOverdue?: boolean;
  // Joined data
  contact?: { _id: Id<"contacts">; fullName: string } | null;
  opportunity?: { _id: Id<"opportunities">; name: string } | null;
  assignedUser?: { _id: Id<"users">; fullName: string } | null;
}

export interface Appointment {
  _id: Id<"appointments">;
  title: string;
  description?: string;
  appointmentType: AppointmentType;
  status: AppointmentStatus;
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
  // Joined data
  contact?: { _id: Id<"contacts">; fullName: string; phone?: string; email?: string } | null;
  opportunity?: { _id: Id<"opportunities">; name: string } | null;
  assignedUser?: { _id: Id<"users">; fullName: string } | null;
}

export interface Message {
  _id: Id<"messages">;
  content: string;
  contactId: Id<"contacts">;
  channel: MessageChannel;
  isOutgoing: boolean;
  senderName: string;
  sentBy?: Id<"users">;
  externalMessageId?: string;
  isRead: boolean;
  createdAt: number;
}

export interface Product {
  _id: Id<"products">;
  name: string;
  sku?: string;
  category: ProductCategory;
  description?: string;
  unitPrice: number;
  unit: string;
  specifications?: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Invoice {
  _id: Id<"invoices">;
  invoiceNumber: string;
  opportunityId: Id<"opportunities">;
  subtotal: number;
  taxRate?: number;
  taxAmount?: number;
  discountAmount?: number;
  total: number;
  amountPaid: number;
  status: InvoiceStatus;
  notes?: string;
  dueDate: number;
  dateSent?: number;
  paidAt?: number;
  isDeleted: boolean;
  createdBy?: Id<"users">;
  createdAt: number;
  updatedAt: number;
  // Computed
  isOverdue?: boolean;
  remainingBalance?: number;
  // Joined data
  opportunity?: { _id: Id<"opportunities">; name: string } | null;
  contact?: Contact | null;
  lineItems?: InvoiceLineItem[];
  payments?: Payment[];
  documents?: Document[];
}

export interface InvoiceLineItem {
  _id: Id<"invoiceLineItems">;
  invoiceId: Id<"invoices">;
  productId?: Id<"products">;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  sortOrder: number;
  createdAt: number;
  // Joined data
  product?: { _id: Id<"products">; name: string; sku?: string } | null;
}

export interface Payment {
  _id: Id<"payments">;
  invoiceId: Id<"invoices">;
  amount: number;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  notes?: string;
  paymentDate: number;
  receivedBy?: Id<"users">;
  createdBy?: Id<"users">;
  createdAt: number;
  // Joined data
  receivedByUser?: { _id: Id<"users">; fullName: string } | null;
  invoice?: { _id: Id<"invoices">; invoiceNumber: string } | null;
}

export interface Document {
  _id: Id<"documents">;
  name: string;
  mimeType: string;
  storageId: string;
  url?: string;
  fileSize?: number;
  contactId?: Id<"contacts">;
  opportunityId?: Id<"opportunities">;
  invoiceId?: Id<"invoices">;
  uploadedBy?: Id<"users">;
  isDeleted: boolean;
  createdAt: number;
  // Joined data
  uploadedByUser?: { _id: Id<"users">; fullName: string } | null;
}

export interface ActivityLog {
  _id: Id<"activityLogs">;
  entityType: string;
  entityId: string;
  action: string;
  changes?: string;
  performedBy?: Id<"users">;
  createdAt: number;
  // Computed
  parsedChanges?: Record<string, unknown> | null;
  // Joined data
  performedByUser?: { _id: Id<"users">; fullName: string } | null;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get full name from first and last name
 */
export function getFullName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}

/**
 * Format currency in PHP
 */
export function formatPHP(amount: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format date to readable string
 */
export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Format date and time
 */
export function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Get relative time (e.g., "2 hours ago")
 */
export function getRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return formatDate(timestamp);
}

// ============================================
// LEGACY TYPES (for backward compatibility during migration)
// ============================================

/**
 * @deprecated Use Contact interface instead
 */
export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
}
