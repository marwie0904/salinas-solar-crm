import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { productCategory } from "./schema";
import { now } from "./lib/helpers";
import { logCreation, logUpdate } from "./lib/activityLogger";

// ============================================
// QUERIES
// ============================================

/**
 * List all active products
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db
      .query("products")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .order("asc")
      .collect();

    return products;
  },
});

/**
 * List all products (including inactive)
 */
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query("products").order("asc").collect();
    return products;
  },
});

/**
 * Get a single product by ID
 */
export const get = query({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/**
 * Get products by category
 */
export const getByCategory = query({
  args: { category: productCategory },
  handler: async (ctx, args) => {
    const products = await ctx.db
      .query("products")
      .withIndex("by_active_category", (q) =>
        q.eq("isActive", true).eq("category", args.category)
      )
      .collect();

    return products;
  },
});

/**
 * Search products by name
 */
export const search = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const searchTerm = args.query.toLowerCase();

    const products = await ctx.db
      .query("products")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    const filtered = products.filter(
      (product) =>
        product.name.toLowerCase().includes(searchTerm) ||
        product.sku?.toLowerCase().includes(searchTerm) ||
        product.description?.toLowerCase().includes(searchTerm)
    );

    return filtered;
  },
});

/**
 * Get product by SKU
 */
export const getBySKU = query({
  args: { sku: v.string() },
  handler: async (ctx, args) => {
    const product = await ctx.db
      .query("products")
      .withIndex("by_sku", (q) => q.eq("sku", args.sku))
      .first();

    return product;
  },
});

// ============================================
// MUTATIONS
// ============================================

/**
 * Create a new product
 */
export const create = mutation({
  args: {
    name: v.string(),
    sku: v.optional(v.string()),
    category: productCategory,
    description: v.optional(v.string()),
    unitPrice: v.number(),
    unit: v.string(),
    specifications: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const timestamp = now();

    const productId = await ctx.db.insert("products", {
      name: args.name,
      sku: args.sku,
      category: args.category,
      description: args.description,
      unitPrice: args.unitPrice,
      unit: args.unit,
      specifications: args.specifications,
      isActive: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    await logCreation(ctx, "product", productId);

    return productId;
  },
});

/**
 * Update a product
 */
export const update = mutation({
  args: {
    id: v.id("products"),
    name: v.optional(v.string()),
    sku: v.optional(v.string()),
    category: v.optional(productCategory),
    description: v.optional(v.string()),
    unitPrice: v.optional(v.number()),
    unit: v.optional(v.string()),
    specifications: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;

    const existing = await ctx.db.get(id);
    if (!existing) {
      throw new Error("Product not found");
    }

    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== undefined)
    );

    await ctx.db.patch(id, {
      ...filteredUpdates,
      updatedAt: now(),
    });

    await logUpdate(ctx, "product", id, filteredUpdates);

    return id;
  },
});

/**
 * Toggle product active status
 */
export const toggleActive = mutation({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.id);
    if (!product) {
      throw new Error("Product not found");
    }

    await ctx.db.patch(args.id, {
      isActive: !product.isActive,
      updatedAt: now(),
    });

    return args.id;
  },
});

/**
 * Deactivate a product
 */
export const deactivate = mutation({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      isActive: false,
      updatedAt: now(),
    });

    return args.id;
  },
});

/**
 * Activate a product
 */
export const activate = mutation({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      isActive: true,
      updatedAt: now(),
    });

    return args.id;
  },
});

/**
 * Delete a product (hard delete - only if not used in any invoices)
 */
export const remove = mutation({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    // Check if product is used in any invoice line items
    const lineItems = await ctx.db
      .query("invoiceLineItems")
      .withIndex("by_product", (q) => q.eq("productId", args.id))
      .first();

    if (lineItems) {
      throw new Error(
        "Cannot delete product that is used in invoices. Deactivate it instead."
      );
    }

    await ctx.db.delete(args.id);

    return args.id;
  },
});
