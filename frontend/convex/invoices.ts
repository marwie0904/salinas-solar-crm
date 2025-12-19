import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { invoiceStatus } from "./schema";
import {
  now,
  generateInvoiceNumber,
  calculateInvoiceTotals,
  determineInvoiceStatus,
  getFullName,
  isOverdue,
} from "./lib/helpers";
import {
  logCreation,
  logUpdate,
  logDeletion,
  logRestoration,
  logStatusChange,
  logActivity,
} from "./lib/activityLogger";

// ============================================
// QUERIES
// ============================================

/**
 * List all active invoices
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const invoices = await ctx.db
      .query("invoices")
      .withIndex("by_deleted", (q) => q.eq("isDeleted", false))
      .order("desc")
      .collect();

    const enriched = await Promise.all(
      invoices.map(async (invoice) => {
        const opportunity = await ctx.db.get(invoice.opportunityId);
        const contact = opportunity
          ? await ctx.db.get(opportunity.contactId)
          : null;

        return {
          ...invoice,
          opportunity: opportunity
            ? { _id: opportunity._id, name: opportunity.name }
            : null,
          contact: contact
            ? {
                _id: contact._id,
                fullName: getFullName(contact.firstName, contact.lastName),
              }
            : null,
          isOverdue: isOverdue(invoice.dueDate) && invoice.status !== "paid_full",
        };
      })
    );

    return enriched;
  },
});

/**
 * Get a single invoice by ID with all details
 */
export const get = query({
  args: { id: v.id("invoices") },
  handler: async (ctx, args) => {
    const invoice = await ctx.db.get(args.id);
    if (!invoice || invoice.isDeleted) return null;

    const opportunity = await ctx.db.get(invoice.opportunityId);
    const contact = opportunity
      ? await ctx.db.get(opportunity.contactId)
      : null;

    // Get line items
    const lineItems = await ctx.db
      .query("invoiceLineItems")
      .withIndex("by_invoice_order", (q) => q.eq("invoiceId", args.id))
      .collect();

    // Enrich line items with product data
    const enrichedLineItems = await Promise.all(
      lineItems.map(async (item) => {
        const product = item.productId
          ? await ctx.db.get(item.productId)
          : null;
        return {
          ...item,
          product: product ? { _id: product._id, name: product.name } : null,
        };
      })
    );

    // Get payments
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_invoice", (q) => q.eq("invoiceId", args.id))
      .order("desc")
      .collect();

    // Get documents
    const documents = await ctx.db
      .query("documents")
      .withIndex("by_invoice", (q) => q.eq("invoiceId", args.id))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect();

    return {
      ...invoice,
      opportunity: opportunity
        ? { _id: opportunity._id, name: opportunity.name }
        : null,
      contact: contact
        ? {
            _id: contact._id,
            fullName: getFullName(contact.firstName, contact.lastName),
            email: contact.email,
            phone: contact.phone,
            address: contact.address,
          }
        : null,
      lineItems: enrichedLineItems,
      payments,
      documents,
      isOverdue: isOverdue(invoice.dueDate) && invoice.status !== "paid_full",
      remainingBalance: invoice.total - invoice.amountPaid,
    };
  },
});

/**
 * Get invoices for an opportunity
 */
export const getByOpportunity = query({
  args: { opportunityId: v.id("opportunities") },
  handler: async (ctx, args) => {
    const invoices = await ctx.db
      .query("invoices")
      .withIndex("by_opportunity", (q) => q.eq("opportunityId", args.opportunityId))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect();

    return invoices;
  },
});

/**
 * Get invoices by status
 */
export const getByStatus = query({
  args: { status: invoiceStatus },
  handler: async (ctx, args) => {
    const invoices = await ctx.db
      .query("invoices")
      .withIndex("by_deleted_status", (q) =>
        q.eq("isDeleted", false).eq("status", args.status)
      )
      .collect();

    return invoices;
  },
});

/**
 * Get overdue invoices
 */
export const getOverdue = query({
  args: {},
  handler: async (ctx) => {
    const today = now();

    const invoices = await ctx.db
      .query("invoices")
      .withIndex("by_deleted", (q) => q.eq("isDeleted", false))
      .filter((q) =>
        q.and(
          q.neq(q.field("status"), "paid_full"),
          q.neq(q.field("status"), "cancelled"),
          q.lt(q.field("dueDate"), today)
        )
      )
      .collect();

    const enriched = await Promise.all(
      invoices.map(async (invoice) => {
        const opportunity = await ctx.db.get(invoice.opportunityId);
        const contact = opportunity
          ? await ctx.db.get(opportunity.contactId)
          : null;

        return {
          ...invoice,
          opportunity: opportunity
            ? { _id: opportunity._id, name: opportunity.name }
            : null,
          contact: contact
            ? {
                _id: contact._id,
                fullName: getFullName(contact.firstName, contact.lastName),
              }
            : null,
          daysOverdue: Math.floor((today - invoice.dueDate) / (1000 * 60 * 60 * 24)),
        };
      })
    );

    return enriched;
  },
});

/**
 * Get next invoice number
 */
export const getNextInvoiceNumber = query({
  args: {},
  handler: async (ctx) => {
    return await generateInvoiceNumber(ctx);
  },
});

// ============================================
// MUTATIONS
// ============================================

/**
 * Create a new invoice with line items
 */
export const create = mutation({
  args: {
    opportunityId: v.id("opportunities"),
    lineItems: v.array(
      v.object({
        productId: v.optional(v.id("products")),
        description: v.string(),
        quantity: v.number(),
        unitPrice: v.number(),
      })
    ),
    taxRate: v.optional(v.number()),
    discountAmount: v.optional(v.number()),
    notes: v.optional(v.string()),
    dueDate: v.number(),
    createdBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const timestamp = now();

    // Generate invoice number
    const invoiceNumber = await generateInvoiceNumber(ctx);

    // Calculate totals
    const { subtotal, taxAmount, total } = calculateInvoiceTotals(
      args.lineItems,
      args.taxRate,
      args.discountAmount
    );

    // Create invoice
    const invoiceId = await ctx.db.insert("invoices", {
      invoiceNumber,
      opportunityId: args.opportunityId,
      subtotal,
      taxRate: args.taxRate,
      taxAmount,
      discountAmount: args.discountAmount,
      total,
      amountPaid: 0,
      status: "pending",
      notes: args.notes,
      dueDate: args.dueDate,
      isDeleted: false,
      createdBy: args.createdBy,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    // Create line items
    for (let i = 0; i < args.lineItems.length; i++) {
      const item = args.lineItems[i];
      await ctx.db.insert("invoiceLineItems", {
        invoiceId,
        productId: item.productId,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.quantity * item.unitPrice,
        sortOrder: i,
        createdAt: timestamp,
      });
    }

    await logCreation(ctx, "invoice", invoiceId, args.createdBy);

    return invoiceId;
  },
});

/**
 * Update invoice details (not line items)
 */
export const update = mutation({
  args: {
    id: v.id("invoices"),
    notes: v.optional(v.string()),
    dueDate: v.optional(v.number()),
    taxRate: v.optional(v.number()),
    discountAmount: v.optional(v.number()),
    updatedBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const { id, updatedBy, ...updates } = args;

    const existing = await ctx.db.get(id);
    if (!existing) {
      throw new Error("Invoice not found");
    }

    const filteredUpdates: Record<string, unknown> = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== undefined)
    );

    // Recalculate totals if tax or discount changed
    if (updates.taxRate !== undefined || updates.discountAmount !== undefined) {
      const lineItems = await ctx.db
        .query("invoiceLineItems")
        .withIndex("by_invoice", (q) => q.eq("invoiceId", id))
        .collect();

      const taxRate = updates.taxRate ?? existing.taxRate;
      const discountAmount = updates.discountAmount ?? existing.discountAmount;

      const { subtotal, taxAmount, total } = calculateInvoiceTotals(
        lineItems,
        taxRate,
        discountAmount
      );

      filteredUpdates.subtotal = subtotal;
      filteredUpdates.taxAmount = taxAmount;
      filteredUpdates.total = total;

      // Update status based on new total
      filteredUpdates.status = determineInvoiceStatus(total, existing.amountPaid);
    }

    await ctx.db.patch(id, {
      ...filteredUpdates,
      updatedAt: now(),
    });

    await logUpdate(ctx, "invoice", id, filteredUpdates, updatedBy);

    return id;
  },
});

/**
 * Mark invoice as sent
 */
export const send = mutation({
  args: {
    id: v.id("invoices"),
    sentBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const invoice = await ctx.db.get(args.id);
    if (!invoice) {
      throw new Error("Invoice not found");
    }

    await ctx.db.patch(args.id, {
      dateSent: now(),
      updatedAt: now(),
    });

    await logActivity(ctx, "invoice", args.id, "invoice_sent", undefined, args.sentBy);

    return args.id;
  },
});

/**
 * Update invoice status
 */
export const updateStatus = mutation({
  args: {
    id: v.id("invoices"),
    status: invoiceStatus,
    updatedBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error("Invoice not found");
    }

    const updates: Record<string, unknown> = {
      status: args.status,
      updatedAt: now(),
    };

    if (args.status === "paid_full") {
      updates.paidAt = now();
    }

    await ctx.db.patch(args.id, updates);

    await logStatusChange(
      ctx,
      "invoice",
      args.id,
      existing.status,
      args.status,
      args.updatedBy
    );

    return args.id;
  },
});

/**
 * Soft delete an invoice
 */
export const remove = mutation({
  args: {
    id: v.id("invoices"),
    deletedBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const invoice = await ctx.db.get(args.id);
    if (!invoice) {
      throw new Error("Invoice not found");
    }

    await ctx.db.patch(args.id, {
      isDeleted: true,
      updatedAt: now(),
    });

    await logDeletion(ctx, "invoice", args.id, args.deletedBy);

    return args.id;
  },
});

/**
 * Restore a deleted invoice
 */
export const restore = mutation({
  args: {
    id: v.id("invoices"),
    restoredBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const invoice = await ctx.db.get(args.id);
    if (!invoice) {
      throw new Error("Invoice not found");
    }

    await ctx.db.patch(args.id, {
      isDeleted: false,
      updatedAt: now(),
    });

    await logRestoration(ctx, "invoice", args.id, args.restoredBy);

    return args.id;
  },
});

/**
 * Recalculate invoice totals (called after line item changes)
 */
export const recalculateTotals = mutation({
  args: { id: v.id("invoices") },
  handler: async (ctx, args) => {
    const invoice = await ctx.db.get(args.id);
    if (!invoice) {
      throw new Error("Invoice not found");
    }

    const lineItems = await ctx.db
      .query("invoiceLineItems")
      .withIndex("by_invoice", (q) => q.eq("invoiceId", args.id))
      .collect();

    const { subtotal, taxAmount, total } = calculateInvoiceTotals(
      lineItems,
      invoice.taxRate,
      invoice.discountAmount
    );

    const status = determineInvoiceStatus(total, invoice.amountPaid);

    await ctx.db.patch(args.id, {
      subtotal,
      taxAmount,
      total,
      status,
      updatedAt: now(),
    });

    return args.id;
  },
});
