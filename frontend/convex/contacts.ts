import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { contactSource, messageChannel } from "./schema";
import { getFullName, now } from "./lib/helpers";
import {
  logCreation,
  logUpdate,
  logDeletion,
  logRestoration,
} from "./lib/activityLogger";
import { Id } from "./_generated/dataModel";

// ============================================
// QUERIES
// ============================================

/**
 * List all active contacts
 */
export const list = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("contacts")
      .withIndex("by_deleted_created", (q) => q.eq("isDeleted", false))
      .order("desc");

    const contacts = args.limit
      ? await query.take(args.limit)
      : await query.collect();

    return contacts.map((contact) => ({
      ...contact,
      fullName: getFullName(contact.firstName, contact.lastName),
    }));
  },
});

/**
 * Get a single contact by ID with related data
 */
export const get = query({
  args: { id: v.id("contacts") },
  handler: async (ctx, args) => {
    const contact = await ctx.db.get(args.id);
    if (!contact || contact.isDeleted) return null;

    return {
      ...contact,
      fullName: getFullName(contact.firstName, contact.lastName),
    };
  },
});

/**
 * Get contact with all related data (opportunities, messages, tasks, etc.)
 */
export const getWithRelations = query({
  args: { id: v.id("contacts") },
  handler: async (ctx, args) => {
    const contact = await ctx.db.get(args.id);
    if (!contact || contact.isDeleted) return null;

    // Get related opportunities
    const opportunities = await ctx.db
      .query("opportunities")
      .withIndex("by_contact_deleted", (q) =>
        q.eq("contactId", args.id).eq("isDeleted", false)
      )
      .collect();

    // Get related messages
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_contact_time", (q) => q.eq("contactId", args.id))
      .order("desc")
      .take(50);

    // Get related tasks
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_contact", (q) => q.eq("contactId", args.id))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect();

    // Get related appointments
    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_contact", (q) => q.eq("contactId", args.id))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect();

    // Get related documents
    const documents = await ctx.db
      .query("documents")
      .withIndex("by_contact", (q) => q.eq("contactId", args.id))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect();

    return {
      ...contact,
      fullName: getFullName(contact.firstName, contact.lastName),
      opportunities,
      messages,
      tasks,
      appointments,
      documents,
    };
  },
});

/**
 * Search contacts by name, email, or phone
 */
export const search = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const searchTerm = args.query.toLowerCase();

    const contacts = await ctx.db
      .query("contacts")
      .withIndex("by_deleted", (q) => q.eq("isDeleted", false))
      .collect();

    const filtered = contacts.filter((contact) => {
      const fullName = getFullName(
        contact.firstName,
        contact.lastName
      ).toLowerCase();
      const email = contact.email?.toLowerCase() ?? "";
      const phone = contact.phone ?? "";

      return (
        fullName.includes(searchTerm) ||
        email.includes(searchTerm) ||
        phone.includes(searchTerm)
      );
    });

    return filtered.map((contact) => ({
      ...contact,
      fullName: getFullName(contact.firstName, contact.lastName),
    }));
  },
});

/**
 * Get contacts by source
 */
export const getBySource = query({
  args: { source: contactSource },
  handler: async (ctx, args) => {
    const contacts = await ctx.db
      .query("contacts")
      .withIndex("by_source", (q) => q.eq("source", args.source))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect();

    return contacts.map((contact) => ({
      ...contact,
      fullName: getFullName(contact.firstName, contact.lastName),
    }));
  },
});

/**
 * Get recently created contacts
 */
export const getRecent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const contacts = await ctx.db
      .query("contacts")
      .withIndex("by_deleted_created", (q) => q.eq("isDeleted", false))
      .order("desc")
      .take(args.limit ?? 10);

    return contacts.map((contact) => ({
      ...contact,
      fullName: getFullName(contact.firstName, contact.lastName),
    }));
  },
});

/**
 * Get contacts with unread messages
 */
export const getWithUnreadMessages = query({
  args: {},
  handler: async (ctx) => {
    // Get all unread messages
    const unreadMessages = await ctx.db
      .query("messages")
      .withIndex("by_unread", (q) => q.eq("isRead", false))
      .filter((q) => q.eq(q.field("isOutgoing"), false))
      .collect();

    // Get unique contact IDs
    const contactIds = [...new Set(unreadMessages.map((m) => m.contactId))];

    // Get contacts
    const contacts = await Promise.all(
      contactIds.map((id) => ctx.db.get(id))
    );

    return contacts
      .filter((c): c is NonNullable<typeof c> => c !== null && !c.isDeleted)
      .map((contact) => ({
        ...contact,
        fullName: getFullName(contact.firstName, contact.lastName),
        unreadCount: unreadMessages.filter((m) => m.contactId === contact._id)
          .length,
      }));
  },
});

// ============================================
// MUTATIONS
// ============================================

/**
 * Create a new contact
 */
export const create = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    company: v.optional(v.string()),
    source: contactSource,
    preferredMessageChannel: v.optional(messageChannel),
    notes: v.optional(v.string()),
    createdBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const timestamp = now();

    const contactId = await ctx.db.insert("contacts", {
      firstName: args.firstName,
      lastName: args.lastName,
      email: args.email,
      phone: args.phone,
      address: args.address,
      company: args.company,
      source: args.source,
      preferredMessageChannel: args.preferredMessageChannel,
      notes: args.notes,
      isDeleted: false,
      createdBy: args.createdBy,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    await logCreation(ctx, "contact", contactId, args.createdBy);

    return contactId;
  },
});

/**
 * Update a contact
 */
export const update = mutation({
  args: {
    id: v.id("contacts"),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    company: v.optional(v.string()),
    source: v.optional(contactSource),
    preferredMessageChannel: v.optional(messageChannel),
    notes: v.optional(v.string()),
    updatedBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const { id, updatedBy, ...updates } = args;

    const existing = await ctx.db.get(id);
    if (!existing) {
      throw new Error("Contact not found");
    }

    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== undefined)
    );

    await ctx.db.patch(id, {
      ...filteredUpdates,
      updatedAt: now(),
    });

    await logUpdate(ctx, "contact", id, filteredUpdates, updatedBy);

    return id;
  },
});

/**
 * Soft delete a contact
 */
export const remove = mutation({
  args: {
    id: v.id("contacts"),
    deletedBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const contact = await ctx.db.get(args.id);
    if (!contact) {
      throw new Error("Contact not found");
    }

    await ctx.db.patch(args.id, {
      isDeleted: true,
      updatedAt: now(),
    });

    await logDeletion(ctx, "contact", args.id, args.deletedBy);

    return args.id;
  },
});

/**
 * Restore a deleted contact
 */
export const restore = mutation({
  args: {
    id: v.id("contacts"),
    restoredBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const contact = await ctx.db.get(args.id);
    if (!contact) {
      throw new Error("Contact not found");
    }

    await ctx.db.patch(args.id, {
      isDeleted: false,
      updatedAt: now(),
    });

    await logRestoration(ctx, "contact", args.id, args.restoredBy);

    return args.id;
  },
});

/**
 * Batch create contacts (for import)
 */
export const batchCreate = mutation({
  args: {
    contacts: v.array(
      v.object({
        firstName: v.string(),
        lastName: v.string(),
        email: v.optional(v.string()),
        phone: v.optional(v.string()),
        address: v.optional(v.string()),
        company: v.optional(v.string()),
        source: contactSource,
      })
    ),
    createdBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const timestamp = now();
    const contactIds: Id<"contacts">[] = [];

    for (const contact of args.contacts) {
      const contactId = await ctx.db.insert("contacts", {
        ...contact,
        isDeleted: false,
        createdBy: args.createdBy,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      contactIds.push(contactId);
    }

    return contactIds;
  },
});
