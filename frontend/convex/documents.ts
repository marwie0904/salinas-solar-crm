import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { now, getFullName } from "./lib/helpers";
import { logCreation, logDeletion, logRestoration } from "./lib/activityLogger";

// ============================================
// QUERIES
// ============================================

/**
 * Get documents for a contact
 */
export const getByContact = query({
  args: { contactId: v.id("contacts") },
  handler: async (ctx, args) => {
    const documents = await ctx.db
      .query("documents")
      .withIndex("by_contact", (q) => q.eq("contactId", args.contactId))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .order("desc")
      .collect();

    // Enrich with uploader data
    const enriched = await Promise.all(
      documents.map(async (doc) => {
        const uploader = doc.uploadedBy
          ? await ctx.db.get(doc.uploadedBy)
          : null;
        return {
          ...doc,
          uploadedByUser: uploader
            ? {
                _id: uploader._id,
                fullName: getFullName(uploader.firstName, uploader.lastName),
              }
            : null,
        };
      })
    );

    return enriched;
  },
});

/**
 * Get documents for an opportunity
 */
export const getByOpportunity = query({
  args: { opportunityId: v.id("opportunities") },
  handler: async (ctx, args) => {
    const documents = await ctx.db
      .query("documents")
      .withIndex("by_opportunity", (q) => q.eq("opportunityId", args.opportunityId))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .order("desc")
      .collect();

    return documents;
  },
});

/**
 * Get documents for an invoice
 */
export const getByInvoice = query({
  args: { invoiceId: v.id("invoices") },
  handler: async (ctx, args) => {
    const documents = await ctx.db
      .query("documents")
      .withIndex("by_invoice", (q) => q.eq("invoiceId", args.invoiceId))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .order("desc")
      .collect();

    return documents;
  },
});

/**
 * Get a single document by ID
 */
export const get = query({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    const document = await ctx.db.get(args.id);
    if (!document || document.isDeleted) return null;

    const uploader = document.uploadedBy
      ? await ctx.db.get(document.uploadedBy)
      : null;

    return {
      ...document,
      uploadedByUser: uploader
        ? {
            _id: uploader._id,
            fullName: getFullName(uploader.firstName, uploader.lastName),
          }
        : null,
    };
  },
});

/**
 * Get recent documents
 */
export const getRecent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const documents = await ctx.db
      .query("documents")
      .withIndex("by_deleted", (q) => q.eq("isDeleted", false))
      .order("desc")
      .take(args.limit ?? 20);

    return documents;
  },
});

/**
 * Generate upload URL for file storage
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// ============================================
// MUTATIONS
// ============================================

/**
 * Create a document record (after file upload)
 */
export const create = mutation({
  args: {
    name: v.string(),
    mimeType: v.string(),
    storageId: v.string(),
    fileSize: v.optional(v.number()),
    contactId: v.optional(v.id("contacts")),
    opportunityId: v.optional(v.id("opportunities")),
    invoiceId: v.optional(v.id("invoices")),
    uploadedBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const timestamp = now();

    // Get URL for the uploaded file
    const url = await ctx.storage.getUrl(args.storageId);

    const documentId = await ctx.db.insert("documents", {
      name: args.name,
      mimeType: args.mimeType,
      storageId: args.storageId,
      url: url ?? undefined,
      fileSize: args.fileSize,
      contactId: args.contactId,
      opportunityId: args.opportunityId,
      invoiceId: args.invoiceId,
      uploadedBy: args.uploadedBy,
      isDeleted: false,
      createdAt: timestamp,
    });

    await logCreation(ctx, "document", documentId, args.uploadedBy);

    return documentId;
  },
});

/**
 * Update document metadata
 */
export const update = mutation({
  args: {
    id: v.id("documents"),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;

    const existing = await ctx.db.get(id);
    if (!existing) {
      throw new Error("Document not found");
    }

    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== undefined)
    );

    await ctx.db.patch(id, filteredUpdates);

    return id;
  },
});

/**
 * Move document to a different entity
 */
export const move = mutation({
  args: {
    id: v.id("documents"),
    contactId: v.optional(v.id("contacts")),
    opportunityId: v.optional(v.id("opportunities")),
    invoiceId: v.optional(v.id("invoices")),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;

    const existing = await ctx.db.get(id);
    if (!existing) {
      throw new Error("Document not found");
    }

    // Clear existing associations and set new ones
    await ctx.db.patch(id, {
      contactId: updates.contactId,
      opportunityId: updates.opportunityId,
      invoiceId: updates.invoiceId,
    });

    return id;
  },
});

/**
 * Soft delete a document
 */
export const remove = mutation({
  args: {
    id: v.id("documents"),
    deletedBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const document = await ctx.db.get(args.id);
    if (!document) {
      throw new Error("Document not found");
    }

    await ctx.db.patch(args.id, {
      isDeleted: true,
    });

    await logDeletion(ctx, "document", args.id, args.deletedBy);

    return args.id;
  },
});

/**
 * Restore a deleted document
 */
export const restore = mutation({
  args: {
    id: v.id("documents"),
    restoredBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const document = await ctx.db.get(args.id);
    if (!document) {
      throw new Error("Document not found");
    }

    await ctx.db.patch(args.id, {
      isDeleted: false,
    });

    await logRestoration(ctx, "document", args.id, args.restoredBy);

    return args.id;
  },
});

/**
 * Permanently delete a document (and its storage)
 */
export const permanentlyDelete = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    const document = await ctx.db.get(args.id);
    if (!document) {
      throw new Error("Document not found");
    }

    // Delete from storage
    await ctx.storage.delete(document.storageId);

    // Delete record
    await ctx.db.delete(args.id);

    return args.id;
  },
});

/**
 * Upload and create document in one step
 */
export const uploadAndCreate = mutation({
  args: {
    name: v.string(),
    mimeType: v.string(),
    storageId: v.string(),
    fileSize: v.optional(v.number()),
    contactId: v.optional(v.id("contacts")),
    opportunityId: v.optional(v.id("opportunities")),
    invoiceId: v.optional(v.id("invoices")),
    uploadedBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const timestamp = now();

    // Get URL for the uploaded file
    const url = await ctx.storage.getUrl(args.storageId);

    const documentId = await ctx.db.insert("documents", {
      name: args.name,
      mimeType: args.mimeType,
      storageId: args.storageId,
      url: url ?? undefined,
      fileSize: args.fileSize,
      contactId: args.contactId,
      opportunityId: args.opportunityId,
      invoiceId: args.invoiceId,
      uploadedBy: args.uploadedBy,
      isDeleted: false,
      createdAt: timestamp,
    });

    return {
      documentId,
      url,
    };
  },
});
