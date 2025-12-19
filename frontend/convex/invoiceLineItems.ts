import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { now, calculateInvoiceTotals, determineInvoiceStatus } from "./lib/helpers";

// ============================================
// QUERIES
// ============================================

/**
 * Get line items for an invoice
 */
export const getByInvoice = query({
  args: { invoiceId: v.id("invoices") },
  handler: async (ctx, args) => {
    const lineItems = await ctx.db
      .query("invoiceLineItems")
      .withIndex("by_invoice_order", (q) => q.eq("invoiceId", args.invoiceId))
      .collect();

    // Enrich with product data
    const enriched = await Promise.all(
      lineItems.map(async (item) => {
        const product = item.productId
          ? await ctx.db.get(item.productId)
          : null;
        return {
          ...item,
          product: product
            ? { _id: product._id, name: product.name, sku: product.sku }
            : null,
        };
      })
    );

    return enriched;
  },
});

// ============================================
// MUTATIONS
// ============================================

/**
 * Add a line item to an invoice
 */
export const add = mutation({
  args: {
    invoiceId: v.id("invoices"),
    productId: v.optional(v.id("products")),
    description: v.string(),
    quantity: v.number(),
    unitPrice: v.number(),
  },
  handler: async (ctx, args) => {
    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) {
      throw new Error("Invoice not found");
    }

    // Get current max sort order
    const existingItems = await ctx.db
      .query("invoiceLineItems")
      .withIndex("by_invoice", (q) => q.eq("invoiceId", args.invoiceId))
      .collect();

    const maxSortOrder = existingItems.reduce(
      (max, item) => Math.max(max, item.sortOrder),
      -1
    );

    // Create line item
    const lineItemId = await ctx.db.insert("invoiceLineItems", {
      invoiceId: args.invoiceId,
      productId: args.productId,
      description: args.description,
      quantity: args.quantity,
      unitPrice: args.unitPrice,
      lineTotal: args.quantity * args.unitPrice,
      sortOrder: maxSortOrder + 1,
      createdAt: now(),
    });

    // Recalculate invoice totals
    await recalculateInvoiceTotals(ctx, args.invoiceId);

    return lineItemId;
  },
});

/**
 * Update a line item
 */
export const update = mutation({
  args: {
    id: v.id("invoiceLineItems"),
    productId: v.optional(v.id("products")),
    description: v.optional(v.string()),
    quantity: v.optional(v.number()),
    unitPrice: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;

    const existing = await ctx.db.get(id);
    if (!existing) {
      throw new Error("Line item not found");
    }

    const filteredUpdates: Record<string, unknown> = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== undefined)
    );

    // Recalculate line total if quantity or price changed
    const quantity = updates.quantity ?? existing.quantity;
    const unitPrice = updates.unitPrice ?? existing.unitPrice;
    filteredUpdates.lineTotal = quantity * unitPrice;

    await ctx.db.patch(id, filteredUpdates);

    // Recalculate invoice totals
    await recalculateInvoiceTotals(ctx, existing.invoiceId);

    return id;
  },
});

/**
 * Remove a line item
 */
export const remove = mutation({
  args: { id: v.id("invoiceLineItems") },
  handler: async (ctx, args) => {
    const lineItem = await ctx.db.get(args.id);
    if (!lineItem) {
      throw new Error("Line item not found");
    }

    const invoiceId = lineItem.invoiceId;

    await ctx.db.delete(args.id);

    // Recalculate invoice totals
    await recalculateInvoiceTotals(ctx, invoiceId);

    return args.id;
  },
});

/**
 * Reorder line items
 */
export const reorder = mutation({
  args: {
    invoiceId: v.id("invoices"),
    itemIds: v.array(v.id("invoiceLineItems")),
  },
  handler: async (ctx, args) => {
    for (let i = 0; i < args.itemIds.length; i++) {
      await ctx.db.patch(args.itemIds[i], { sortOrder: i });
    }

    return args.invoiceId;
  },
});

/**
 * Add line item from product
 */
export const addFromProduct = mutation({
  args: {
    invoiceId: v.id("invoices"),
    productId: v.id("products"),
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product) {
      throw new Error("Product not found");
    }

    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) {
      throw new Error("Invoice not found");
    }

    // Get current max sort order
    const existingItems = await ctx.db
      .query("invoiceLineItems")
      .withIndex("by_invoice", (q) => q.eq("invoiceId", args.invoiceId))
      .collect();

    const maxSortOrder = existingItems.reduce(
      (max, item) => Math.max(max, item.sortOrder),
      -1
    );

    // Create line item from product
    const lineItemId = await ctx.db.insert("invoiceLineItems", {
      invoiceId: args.invoiceId,
      productId: args.productId,
      description: product.name,
      quantity: args.quantity,
      unitPrice: product.unitPrice,
      lineTotal: args.quantity * product.unitPrice,
      sortOrder: maxSortOrder + 1,
      createdAt: now(),
    });

    // Recalculate invoice totals
    await recalculateInvoiceTotals(ctx, args.invoiceId);

    return lineItemId;
  },
});

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Recalculate invoice totals after line item changes
 */
async function recalculateInvoiceTotals(
  ctx: { db: any },
  invoiceId: any
) {
  const invoice = await ctx.db.get(invoiceId);
  if (!invoice) return;

  const lineItems = await ctx.db
    .query("invoiceLineItems")
    .withIndex("by_invoice", (q: any) => q.eq("invoiceId", invoiceId))
    .collect();

  const { subtotal, taxAmount, total } = calculateInvoiceTotals(
    lineItems,
    invoice.taxRate,
    invoice.discountAmount
  );

  const status = determineInvoiceStatus(total, invoice.amountPaid);

  await ctx.db.patch(invoiceId, {
    subtotal,
    taxAmount,
    total,
    status,
    updatedAt: now(),
  });
}
