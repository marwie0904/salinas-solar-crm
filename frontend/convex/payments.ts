import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { paymentMethod } from "./schema";
import { now, determineInvoiceStatus, getFullName, formatPHP } from "./lib/helpers";
import { logCreation, logPaymentReceived, logStageChange } from "./lib/activityLogger";
import { shouldTransitionTo } from "./lib/stageOrder";

// ============================================
// QUERIES
// ============================================

/**
 * Get payments for an invoice
 */
export const getByInvoice = query({
  args: { invoiceId: v.id("invoices") },
  handler: async (ctx, args) => {
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_invoice", (q) => q.eq("invoiceId", args.invoiceId))
      .order("desc")
      .collect();

    // Enrich with user data
    const enriched = await Promise.all(
      payments.map(async (payment) => {
        const receivedBy = payment.receivedBy
          ? await ctx.db.get(payment.receivedBy)
          : null;

        return {
          ...payment,
          receivedByUser: receivedBy
            ? {
                _id: receivedBy._id,
                fullName: getFullName(receivedBy.firstName, receivedBy.lastName),
              }
            : null,
        };
      })
    );

    return enriched;
  },
});

/**
 * Get recent payments
 */
export const getRecent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_payment_date")
      .order("desc")
      .take(args.limit ?? 20);

    // Enrich with invoice and contact data
    const enriched = await Promise.all(
      payments.map(async (payment) => {
        const invoice = await ctx.db.get(payment.invoiceId);
        const opportunity = invoice
          ? await ctx.db.get(invoice.opportunityId)
          : null;
        const contact = opportunity
          ? await ctx.db.get(opportunity.contactId)
          : null;

        return {
          ...payment,
          invoice: invoice
            ? { _id: invoice._id, invoiceNumber: invoice.invoiceNumber }
            : null,
          opportunity: opportunity
            ? { _id: opportunity._id, name: opportunity.name }
            : null,
          contact: contact
            ? {
                _id: contact._id,
                fullName: getFullName(contact.firstName, contact.lastName),
              }
            : null,
        };
      })
    );

    return enriched;
  },
});

/**
 * Get payment summary by date range
 */
export const getSummary = query({
  args: {
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_payment_date", (q) =>
        q.gte("paymentDate", args.startDate).lte("paymentDate", args.endDate)
      )
      .collect();

    const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
    const paymentCount = payments.length;

    // Group by payment method
    const byMethod: Record<string, { count: number; total: number }> = {};
    for (const payment of payments) {
      if (!byMethod[payment.paymentMethod]) {
        byMethod[payment.paymentMethod] = { count: 0, total: 0 };
      }
      byMethod[payment.paymentMethod].count++;
      byMethod[payment.paymentMethod].total += payment.amount;
    }

    return {
      totalAmount,
      paymentCount,
      byMethod,
      formattedTotal: formatPHP(totalAmount),
    };
  },
});

/**
 * Get payments by method
 */
export const getByMethod = query({
  args: { method: paymentMethod },
  handler: async (ctx, args) => {
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_method", (q) => q.eq("paymentMethod", args.method))
      .order("desc")
      .take(50);

    return payments;
  },
});

// ============================================
// MUTATIONS
// ============================================

/**
 * Record a payment
 */
export const create = mutation({
  args: {
    invoiceId: v.id("invoices"),
    amount: v.number(),
    paymentMethod: paymentMethod,
    referenceNumber: v.optional(v.string()),
    notes: v.optional(v.string()),
    paymentDate: v.number(),
    receivedBy: v.optional(v.id("users")),
    createdBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) {
      throw new Error("Invoice not found");
    }

    if (invoice.isDeleted) {
      throw new Error("Cannot add payment to deleted invoice");
    }

    const timestamp = now();

    // Create payment record
    const paymentId = await ctx.db.insert("payments", {
      invoiceId: args.invoiceId,
      amount: args.amount,
      paymentMethod: args.paymentMethod,
      referenceNumber: args.referenceNumber,
      notes: args.notes,
      paymentDate: args.paymentDate,
      receivedBy: args.receivedBy,
      createdBy: args.createdBy,
      createdAt: timestamp,
    });

    // Update invoice amountPaid and status
    const newAmountPaid = invoice.amountPaid + args.amount;
    const newStatus = determineInvoiceStatus(invoice.total, newAmountPaid);

    const invoiceUpdates: Record<string, unknown> = {
      amountPaid: newAmountPaid,
      status: newStatus,
      updatedAt: timestamp,
    };

    // Set paidAt if fully paid
    if (newStatus === "paid_full" && !invoice.paidAt) {
      invoiceUpdates.paidAt = timestamp;
    }

    await ctx.db.patch(args.invoiceId, invoiceUpdates);

    await logCreation(ctx, "payment", paymentId, args.createdBy);
    await logPaymentReceived(
      ctx,
      args.invoiceId,
      args.amount,
      args.paymentMethod,
      args.createdBy
    );

    // Auto-transition opportunity to "closed" when invoice is fully paid
    if (newStatus === "paid_full") {
      const opportunity = await ctx.db.get(invoice.opportunityId);
      if (opportunity && shouldTransitionTo(opportunity.stage, "closed")) {
        const previousStage = opportunity.stage;
        await ctx.db.patch(invoice.opportunityId, {
          stage: "closed",
          updatedAt: timestamp,
        });
        await logStageChange(
          ctx,
          invoice.opportunityId,
          previousStage,
          "closed",
          args.createdBy
        );
      }
    }

    return paymentId;
  },
});

/**
 * Update a payment
 */
export const update = mutation({
  args: {
    id: v.id("payments"),
    amount: v.optional(v.number()),
    paymentMethod: v.optional(paymentMethod),
    referenceNumber: v.optional(v.string()),
    notes: v.optional(v.string()),
    paymentDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;

    const existing = await ctx.db.get(id);
    if (!existing) {
      throw new Error("Payment not found");
    }

    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== undefined)
    );

    // If amount changed, recalculate invoice totals
    if (updates.amount !== undefined && updates.amount !== existing.amount) {
      const invoice = await ctx.db.get(existing.invoiceId);
      if (invoice) {
        const amountDiff = updates.amount - existing.amount;
        const newAmountPaid = invoice.amountPaid + amountDiff;
        const newStatus = determineInvoiceStatus(invoice.total, newAmountPaid);

        await ctx.db.patch(existing.invoiceId, {
          amountPaid: newAmountPaid,
          status: newStatus,
          updatedAt: now(),
        });
      }
    }

    await ctx.db.patch(id, filteredUpdates);

    return id;
  },
});

/**
 * Delete a payment
 */
export const remove = mutation({
  args: { id: v.id("payments") },
  handler: async (ctx, args) => {
    const payment = await ctx.db.get(args.id);
    if (!payment) {
      throw new Error("Payment not found");
    }

    // Update invoice amountPaid
    const invoice = await ctx.db.get(payment.invoiceId);
    if (invoice) {
      const newAmountPaid = Math.max(0, invoice.amountPaid - payment.amount);
      const newStatus = determineInvoiceStatus(invoice.total, newAmountPaid);

      const invoiceUpdates: Record<string, unknown> = {
        amountPaid: newAmountPaid,
        status: newStatus,
        updatedAt: now(),
      };

      // Clear paidAt if no longer fully paid
      if (newStatus !== "paid_full" && invoice.paidAt) {
        invoiceUpdates.paidAt = undefined;
      }

      await ctx.db.patch(payment.invoiceId, invoiceUpdates);
    }

    await ctx.db.delete(args.id);

    return args.id;
  },
});

/**
 * Record multiple payments at once
 */
export const batchCreate = mutation({
  args: {
    payments: v.array(
      v.object({
        invoiceId: v.id("invoices"),
        amount: v.number(),
        paymentMethod: paymentMethod,
        referenceNumber: v.optional(v.string()),
        paymentDate: v.number(),
      })
    ),
    createdBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const timestamp = now();
    const paymentIds = [];

    for (const paymentData of args.payments) {
      const invoice = await ctx.db.get(paymentData.invoiceId);
      if (!invoice || invoice.isDeleted) continue;

      const paymentId = await ctx.db.insert("payments", {
        ...paymentData,
        receivedBy: args.createdBy,
        createdBy: args.createdBy,
        createdAt: timestamp,
      });

      paymentIds.push(paymentId);

      // Update invoice
      const newAmountPaid = invoice.amountPaid + paymentData.amount;
      const newStatus = determineInvoiceStatus(invoice.total, newAmountPaid);

      await ctx.db.patch(paymentData.invoiceId, {
        amountPaid: newAmountPaid,
        status: newStatus,
        paidAt: newStatus === "paid_full" ? timestamp : invoice.paidAt,
        updatedAt: timestamp,
      });

      // Auto-transition opportunity to "closed" when invoice is fully paid
      if (newStatus === "paid_full") {
        const opportunity = await ctx.db.get(invoice.opportunityId);
        if (opportunity && shouldTransitionTo(opportunity.stage, "closed")) {
          const previousStage = opportunity.stage;
          await ctx.db.patch(invoice.opportunityId, {
            stage: "closed",
            updatedAt: timestamp,
          });
          await logStageChange(
            ctx,
            invoice.opportunityId,
            previousStage,
            "closed",
            args.createdBy
          );
        }
      }
    }

    return paymentIds;
  },
});
