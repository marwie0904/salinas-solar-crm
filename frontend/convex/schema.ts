import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// ============================================
// ENUM VALIDATORS
// ============================================

export const pipelineStage = v.union(
  v.literal("inbox"),
  v.literal("to_call"),
  v.literal("did_not_answer"),
  v.literal("booked_call"),
  v.literal("did_not_book_call"),
  v.literal("for_ocular"),
  v.literal("follow_up"),
  v.literal("contract_sent"),
  v.literal("invoice_sent"),
  v.literal("for_installation"),
  v.literal("closed")
);

export const taskStatus = v.union(
  v.literal("pending"),
  v.literal("doing"),
  v.literal("completed")
);

export const taskPriority = v.union(
  v.literal("low"),
  v.literal("medium"),
  v.literal("high")
);

export const appointmentStatus = v.union(
  v.literal("pending"),
  v.literal("cancelled"),
  v.literal("no_show"),
  v.literal("completed")
);

export const appointmentType = v.union(
  v.literal("discovery_call"),
  v.literal("field_inspection")
);

export const invoiceStatus = v.union(
  v.literal("pending"),
  v.literal("partially_paid"),
  v.literal("paid_full"),
  v.literal("cancelled")
);

export const contactSource = v.union(
  v.literal("website"),
  v.literal("referral"),
  v.literal("facebook"),
  v.literal("instagram"),
  v.literal("google_ads"),
  v.literal("walk_in"),
  v.literal("cold_call"),
  v.literal("other")
);

export const messageChannel = v.union(
  v.literal("sms"),
  v.literal("facebook"),
  v.literal("instagram")
);

export const productCategory = v.union(
  v.literal("solar_panel"),
  v.literal("inverter"),
  v.literal("battery"),
  v.literal("mounting_system"),
  v.literal("installation_package"),
  v.literal("labor"),
  v.literal("accessory"),
  v.literal("service"),
  v.literal("other")
);

export const paymentMethod = v.union(
  v.literal("cash"),
  v.literal("bank_transfer"),
  v.literal("check"),
  v.literal("credit_card"),
  v.literal("gcash"),
  v.literal("maya"),
  v.literal("other")
);

export const paymentType = v.union(
  v.literal("one_time"),
  v.literal("installment"),
  v.literal("downpayment"),
  v.literal("progress_billing")
);

export const userRole = v.union(
  v.literal("admin"),
  v.literal("sales"),
  v.literal("technician"),
  v.literal("project_manager"),
  v.literal("developer"),
  v.literal("system_consultant")
);

export const agreementStatus = v.union(
  v.literal("pending"),
  v.literal("sent"),
  v.literal("viewed"),
  v.literal("signed"),
  v.literal("expired")
);

// ============================================
// SCHEMA DEFINITION
// ============================================

export default defineSchema({
  // ----------------------------------------
  // AUTH USERS TABLE (for login)
  // ----------------------------------------
  authUsers: defineTable({
    email: v.string(),
    passwordHash: v.string(),
    isActive: v.boolean(),
    lastLoginAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_active", ["isActive"]),

  // ----------------------------------------
  // SESSIONS TABLE
  // ----------------------------------------
  sessions: defineTable({
    authUserId: v.id("authUsers"),
    sessionToken: v.string(),
    expiresAt: v.number(), // 7 days from creation
    createdAt: v.number(),
  })
    .index("by_token", ["sessionToken"])
    .index("by_user", ["authUserId"])
    .index("by_expires", ["expiresAt"]),

  // ----------------------------------------
  // USERS TABLE
  // ----------------------------------------
  users: defineTable({
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    role: v.optional(userRole),
    avatarUrl: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_role", ["role"])
    .index("by_active", ["isActive"]),

  // ----------------------------------------
  // CONTACTS TABLE
  // ----------------------------------------
  contacts: defineTable({
    firstName: v.string(),
    lastName: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    company: v.optional(v.string()),
    source: contactSource,
    preferredMessageChannel: v.optional(messageChannel),
    notes: v.optional(v.string()),
    // Meta platform identifiers
    facebookPsid: v.optional(v.string()), // Facebook Page-Scoped ID
    instagramScopedId: v.optional(v.string()), // Instagram-Scoped ID
    isDeleted: v.boolean(),
    createdBy: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_phone", ["phone"])
    .index("by_source", ["source"])
    .index("by_created_at", ["createdAt"])
    .index("by_deleted", ["isDeleted"])
    .index("by_deleted_created", ["isDeleted", "createdAt"])
    .index("by_facebook_psid", ["facebookPsid"])
    .index("by_instagram_id", ["instagramScopedId"]),

  // ----------------------------------------
  // OPPORTUNITIES TABLE
  // ----------------------------------------
  opportunities: defineTable({
    name: v.string(),
    contactId: v.id("contacts"),
    stage: pipelineStage,
    estimatedValue: v.number(),
    location: v.optional(v.string()),
    locationLat: v.optional(v.number()),
    locationLng: v.optional(v.number()),
    locationCapturedAt: v.optional(v.number()),
    // OpenSolar integration
    openSolarProjectId: v.optional(v.number()),
    openSolarProjectUrl: v.optional(v.string()),
    notes: v.optional(v.string()),
    expectedCloseDate: v.optional(v.number()),
    lostReason: v.optional(v.string()),
    assignedTo: v.optional(v.id("users")),
    isDeleted: v.boolean(),
    createdBy: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_contact", ["contactId"])
    .index("by_stage", ["stage"])
    .index("by_assigned", ["assignedTo"])
    .index("by_created_at", ["createdAt"])
    .index("by_deleted", ["isDeleted"])
    .index("by_deleted_stage", ["isDeleted", "stage"])
    .index("by_contact_deleted", ["contactId", "isDeleted"]),

  // ----------------------------------------
  // TASKS TABLE
  // ----------------------------------------
  tasks: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    status: taskStatus,
    priority: v.optional(taskPriority),
    dueDate: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    contactId: v.optional(v.id("contacts")),
    opportunityId: v.optional(v.id("opportunities")),
    assignedTo: v.optional(v.id("users")),
    isDeleted: v.boolean(),
    createdBy: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_assigned", ["assignedTo"])
    .index("by_contact", ["contactId"])
    .index("by_opportunity", ["opportunityId"])
    .index("by_due_date", ["dueDate"])
    .index("by_deleted", ["isDeleted"])
    .index("by_deleted_status", ["isDeleted", "status"])
    .index("by_assigned_status", ["assignedTo", "status"])
    .index("by_assigned_deleted", ["assignedTo", "isDeleted"]),

  // ----------------------------------------
  // APPOINTMENTS TABLE
  // ----------------------------------------
  appointments: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    appointmentType: appointmentType,
    status: appointmentStatus,
    date: v.string(), // ISO date string YYYY-MM-DD
    time: v.string(), // Time string like "10:00 AM"
    startTime: v.number(), // Unix timestamp for sorting/filtering
    endTime: v.optional(v.number()),
    location: v.optional(v.string()),
    contactId: v.id("contacts"),
    opportunityId: v.optional(v.id("opportunities")),
    assignedTo: v.id("users"),
    notes: v.optional(v.string()),
    cancellationReason: v.optional(v.string()),
    isDeleted: v.boolean(),
    createdBy: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_contact", ["contactId"])
    .index("by_opportunity", ["opportunityId"])
    .index("by_assigned", ["assignedTo"])
    .index("by_date", ["date"])
    .index("by_start_time", ["startTime"])
    .index("by_status", ["status"])
    .index("by_type", ["appointmentType"])
    .index("by_deleted", ["isDeleted"])
    .index("by_deleted_date", ["isDeleted", "date"])
    .index("by_assigned_date", ["assignedTo", "date"]),

  // ----------------------------------------
  // MESSAGES TABLE
  // ----------------------------------------
  messages: defineTable({
    content: v.string(),
    contactId: v.id("contacts"),
    channel: messageChannel,
    isOutgoing: v.boolean(),
    senderName: v.string(),
    sentBy: v.optional(v.id("users")),
    externalMessageId: v.optional(v.string()),
    isRead: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_contact", ["contactId"])
    .index("by_contact_time", ["contactId", "createdAt"])
    .index("by_channel", ["channel"])
    .index("by_unread", ["isRead"])
    .index("by_contact_unread", ["contactId", "isRead"]),

  // ----------------------------------------
  // PRODUCTS TABLE
  // ----------------------------------------
  products: defineTable({
    name: v.string(),
    sku: v.optional(v.string()),
    category: productCategory,
    description: v.optional(v.string()),
    unitPrice: v.number(),
    unit: v.string(), // "piece", "watt", "kWh", "hour", "package"
    specifications: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_category", ["category"])
    .index("by_sku", ["sku"])
    .index("by_active", ["isActive"])
    .index("by_name", ["name"])
    .index("by_active_category", ["isActive", "category"]),

  // ----------------------------------------
  // INVOICES TABLE
  // ----------------------------------------
  invoices: defineTable({
    invoiceNumber: v.string(),
    opportunityId: v.id("opportunities"),
    subtotal: v.number(),
    taxRate: v.optional(v.number()),
    taxAmount: v.optional(v.number()),
    discountAmount: v.optional(v.number()),
    total: v.number(),
    amountPaid: v.number(),
    status: invoiceStatus,
    // Payment type and method
    paymentType: v.optional(paymentType),
    paymentMethod: v.optional(paymentMethod),
    installmentAmount: v.optional(v.number()),
    numberOfInstallments: v.optional(v.number()),
    notes: v.optional(v.string()),
    dueDate: v.number(),
    dateSent: v.optional(v.number()),
    paidAt: v.optional(v.number()),
    // Public viewing token for sharing invoices
    viewingToken: v.optional(v.string()),
    isDeleted: v.boolean(),
    createdBy: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_invoice_number", ["invoiceNumber"])
    .index("by_opportunity", ["opportunityId"])
    .index("by_status", ["status"])
    .index("by_due_date", ["dueDate"])
    .index("by_deleted", ["isDeleted"])
    .index("by_deleted_status", ["isDeleted", "status"])
    .index("by_created_at", ["createdAt"])
    .index("by_viewing_token", ["viewingToken"]),

  // ----------------------------------------
  // INVOICE LINE ITEMS TABLE
  // ----------------------------------------
  invoiceLineItems: defineTable({
    invoiceId: v.id("invoices"),
    productId: v.optional(v.id("products")),
    description: v.string(),
    quantity: v.number(),
    unitPrice: v.number(),
    lineTotal: v.number(),
    sortOrder: v.number(),
    createdAt: v.number(),
  })
    .index("by_invoice", ["invoiceId"])
    .index("by_product", ["productId"])
    .index("by_invoice_order", ["invoiceId", "sortOrder"]),

  // ----------------------------------------
  // PAYMENTS TABLE
  // ----------------------------------------
  payments: defineTable({
    invoiceId: v.id("invoices"),
    amount: v.number(),
    paymentMethod: paymentMethod,
    referenceNumber: v.optional(v.string()),
    notes: v.optional(v.string()),
    paymentDate: v.number(),
    receivedBy: v.optional(v.id("users")),
    createdBy: v.optional(v.id("users")),
    createdAt: v.number(),
  })
    .index("by_invoice", ["invoiceId"])
    .index("by_payment_date", ["paymentDate"])
    .index("by_method", ["paymentMethod"]),

  // ----------------------------------------
  // DOCUMENTS TABLE
  // ----------------------------------------
  documents: defineTable({
    name: v.string(),
    mimeType: v.string(),
    storageId: v.string(),
    url: v.optional(v.string()),
    fileSize: v.optional(v.number()),
    contactId: v.optional(v.id("contacts")),
    opportunityId: v.optional(v.id("opportunities")),
    invoiceId: v.optional(v.id("invoices")),
    uploadedBy: v.optional(v.id("users")),
    isDeleted: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_contact", ["contactId"])
    .index("by_opportunity", ["opportunityId"])
    .index("by_invoice", ["invoiceId"])
    .index("by_deleted", ["isDeleted"])
    .index("by_created_at", ["createdAt"]),

  // ----------------------------------------
  // ACTIVITY LOGS TABLE
  // ----------------------------------------
  activityLogs: defineTable({
    entityType: v.string(), // "contact", "opportunity", "invoice", etc.
    entityId: v.string(),
    action: v.string(), // "created", "updated", "deleted", "stage_changed"
    changes: v.optional(v.string()), // JSON of field changes
    performedBy: v.optional(v.id("users")),
    createdAt: v.number(),
  })
    .index("by_entity", ["entityType", "entityId"])
    .index("by_user", ["performedBy"])
    .index("by_created_at", ["createdAt"])
    .index("by_entity_time", ["entityType", "entityId", "createdAt"]),

  // ----------------------------------------
  // MESSAGING WINDOWS TABLE
  // Tracks the messaging window for Meta platforms (Facebook/Instagram)
  // - 0-24h: Standard window (any message type)
  // - 24h-7d: Human Agent window (human replies only)
  // - After 7d: Message Tags only (transactional updates)
  // ----------------------------------------
  messagingWindows: defineTable({
    contactId: v.id("contacts"),
    channel: messageChannel,
    platformUserId: v.string(), // PSID (Facebook) or IG-scoped ID
    lastCustomerMessageAt: v.number(), // Timestamp of last customer message
    standardWindowExpiresAt: v.number(), // 24h window expiry
    humanAgentWindowExpiresAt: v.number(), // 7-day window expiry
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_contact", ["contactId"])
    .index("by_contact_channel", ["contactId", "channel"])
    .index("by_platform_user", ["channel", "platformUserId"])
    .index("by_standard_window", ["standardWindowExpiresAt"])
    .index("by_human_agent_window", ["humanAgentWindowExpiresAt"]),

  // ----------------------------------------
  // AGREEMENTS TABLE
  // Stores solar installation agreements for digital signing
  // ----------------------------------------
  agreements: defineTable({
    // Unique signing token for public access
    signingToken: v.string(),
    // Links
    opportunityId: v.id("opportunities"),
    contactId: v.id("contacts"),
    documentId: v.optional(v.id("documents")), // Link to the PDF document
    // Agreement details (stored for display on signing page)
    clientName: v.string(),
    clientAddress: v.string(),
    projectLocation: v.string(),
    systemType: v.string(),
    systemSize: v.number(),
    batteryCapacity: v.optional(v.number()),
    totalAmount: v.number(),
    agreementDate: v.string(),
    // Materials and payments stored as JSON strings
    materialsJson: v.string(),
    paymentsJson: v.string(),
    phasesJson: v.optional(v.string()),
    warrantyTerms: v.optional(v.string()),
    additionalTerms: v.optional(v.string()),
    // Status tracking
    status: agreementStatus,
    sentAt: v.optional(v.number()),
    viewedAt: v.optional(v.number()),
    // Signature data
    signatureData: v.optional(v.string()), // Base64 signature image
    signedAt: v.optional(v.number()),
    signedByName: v.optional(v.string()),
    signedByIp: v.optional(v.string()),
    // Signed PDF
    signedDocumentId: v.optional(v.id("documents")),
    // Metadata
    expiresAt: v.optional(v.number()),
    createdBy: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_signing_token", ["signingToken"])
    .index("by_opportunity", ["opportunityId"])
    .index("by_contact", ["contactId"])
    .index("by_status", ["status"])
    .index("by_created_at", ["createdAt"]),
  // ----------------------------------------
  // NOTIFICATIONS TABLE
  // ----------------------------------------
  notifications: defineTable({
    userId: v.id("users"), // The user who receives the notification
    type: v.union(
      v.literal("lead_assigned"),
      v.literal("appointment_scheduled"),
      v.literal("agreement_approved"),
      v.literal("task_due_tomorrow"),
      v.literal("task_due_soon"),
      v.literal("task_overdue")
    ),
    title: v.string(),
    message: v.string(),
    // Related entity references
    opportunityId: v.optional(v.id("opportunities")),
    contactId: v.optional(v.id("contacts")),
    appointmentId: v.optional(v.id("appointments")),
    agreementId: v.optional(v.id("agreements")),
    taskId: v.optional(v.id("tasks")),
    // Status
    read: v.boolean(),
    // For overdue task tracking - last notification sent timestamp
    lastNotifiedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_read", ["userId", "read"])
    .index("by_user_created", ["userId", "createdAt"])
    .index("by_type", ["type"])
    .index("by_task", ["taskId"])
    .index("by_task_type", ["taskId", "type"]),
});
