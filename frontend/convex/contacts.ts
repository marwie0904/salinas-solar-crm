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

    // Get related messages (ascending order for chat view)
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_contact_time", (q) => q.eq("contactId", args.id))
      .order("asc")
      .take(100);

    // Get related tasks with assigned user info
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_contact", (q) => q.eq("contactId", args.id))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect();

    const tasksWithUsers = await Promise.all(
      tasks.map(async (task) => {
        const assignedUser = task.assignedTo
          ? await ctx.db.get(task.assignedTo)
          : null;
        return {
          ...task,
          assignedUserName: assignedUser
            ? getFullName(assignedUser.firstName, assignedUser.lastName)
            : undefined,
        };
      })
    );

    // Get related appointments with assigned user info
    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_contact", (q) => q.eq("contactId", args.id))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect();

    const appointmentsWithUsers = await Promise.all(
      appointments.map(async (apt) => {
        const assignedUser = apt.assignedTo
          ? await ctx.db.get(apt.assignedTo)
          : null;
        return {
          ...apt,
          assignedUserName: assignedUser
            ? getFullName(assignedUser.firstName, assignedUser.lastName)
            : undefined,
        };
      })
    );

    // Get related documents
    const documents = await ctx.db
      .query("documents")
      .withIndex("by_contact", (q) => q.eq("contactId", args.id))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect();

    // Get invoices through opportunities
    const opportunityIds = opportunities.map((o) => o._id);
    const allInvoices = await Promise.all(
      opportunityIds.map(async (oppId) => {
        const invoices = await ctx.db
          .query("invoices")
          .withIndex("by_opportunity", (q) => q.eq("opportunityId", oppId))
          .filter((q) => q.eq(q.field("isDeleted"), false))
          .collect();
        return invoices;
      })
    );
    const invoices = allInvoices.flat();

    // Get messaging window status
    let messagingWindow = null;
    if (contact.facebookPsid) {
      const fbWindow = await ctx.db
        .query("messagingWindows")
        .withIndex("by_platform_user", (q) =>
          q.eq("channel", "facebook").eq("platformUserId", contact.facebookPsid!)
        )
        .first();
      if (fbWindow) {
        const now = Date.now();
        messagingWindow = {
          channel: "facebook" as const,
          platformUserId: contact.facebookPsid,
          canSend: now < fbWindow.humanAgentWindowExpiresAt,
          isStandardWindow: now < fbWindow.standardWindowExpiresAt,
          expiresAt: fbWindow.humanAgentWindowExpiresAt,
        };
      }
    } else if (contact.instagramScopedId) {
      const igWindow = await ctx.db
        .query("messagingWindows")
        .withIndex("by_platform_user", (q) =>
          q.eq("channel", "instagram").eq("platformUserId", contact.instagramScopedId!)
        )
        .first();
      if (igWindow) {
        const now = Date.now();
        messagingWindow = {
          channel: "instagram" as const,
          platformUserId: contact.instagramScopedId,
          canSend: now < igWindow.humanAgentWindowExpiresAt,
          isStandardWindow: now < igWindow.standardWindowExpiresAt,
          expiresAt: igWindow.humanAgentWindowExpiresAt,
        };
      }
    }

    return {
      ...contact,
      fullName: getFullName(contact.firstName, contact.lastName),
      opportunities,
      messages,
      tasks: tasksWithUsers,
      appointments: appointmentsWithUsers,
      documents,
      invoices,
      messagingWindow,
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
 * List contacts with their primary opportunity (for table view)
 * Supports pagination with limit and cursor
 */
export const listWithOpportunities = query({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.id("contacts")),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 30;

    let contactsQuery = ctx.db
      .query("contacts")
      .withIndex("by_deleted_created", (q) => q.eq("isDeleted", false))
      .order("desc");

    // If we have a cursor, we need to skip past it
    // Since Convex doesn't have built-in cursor support, we use take and filter
    let contacts;
    if (args.cursor) {
      // Fetch extra to find cursor position, then take limit after
      const allContacts = await contactsQuery.collect();
      const cursorIndex = allContacts.findIndex(c => c._id === args.cursor);
      if (cursorIndex !== -1) {
        contacts = allContacts.slice(cursorIndex + 1, cursorIndex + 1 + limit);
      } else {
        contacts = allContacts.slice(0, limit);
      }
    } else {
      contacts = await contactsQuery.take(limit);
    }

    // Fetch primary opportunity for each contact
    const contactsWithOpportunities = await Promise.all(
      contacts.map(async (contact) => {
        // Get the first active opportunity for this contact
        const opportunity = await ctx.db
          .query("opportunities")
          .withIndex("by_contact_deleted", (q) =>
            q.eq("contactId", contact._id).eq("isDeleted", false)
          )
          .first();

        return {
          ...contact,
          fullName: getFullName(contact.firstName, contact.lastName),
          opportunity: opportunity
            ? {
                _id: opportunity._id,
                name: opportunity.name,
                stage: opportunity.stage,
              }
            : null,
        };
      })
    );

    // Get next cursor (last item's id if there might be more)
    const nextCursor = contacts.length === limit ? contacts[contacts.length - 1]?._id : undefined;

    return {
      contacts: contactsWithOpportunities,
      nextCursor,
    };
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
 * Get contacts created this month (for dashboard)
 */
export const getThisMonth = query({
  args: {},
  handler: async (ctx) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    const contacts = await ctx.db
      .query("contacts")
      .withIndex("by_deleted_created", (q) => q.eq("isDeleted", false))
      .order("desc")
      .collect();

    // Filter contacts created this month
    const thisMonthContacts = contacts.filter(
      (contact) => contact.createdAt >= startOfMonth
    );

    return thisMonthContacts.map((contact) => ({
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
 * Create a new contact (with auto opportunity creation)
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
    skipOpportunity: v.optional(v.boolean()),
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

    // Auto-create opportunity unless skipped
    if (!args.skipOpportunity) {
      // Get total opportunity count for numbering
      const allOpportunities = await ctx.db.query("opportunities").collect();
      const opportunityNumber = allOpportunities.length + 1;

      const contactName = getFullName(args.firstName, args.lastName);
      const opportunityName = `Opportunity #${opportunityNumber}: ${contactName}`;

      const opportunityId = await ctx.db.insert("opportunities", {
        name: opportunityName,
        contactId,
        stage: "inbox",
        estimatedValue: 0,
        isDeleted: false,
        createdBy: args.createdBy,
        createdAt: timestamp,
        updatedAt: timestamp,
      });

      await logCreation(ctx, "opportunity", opportunityId, args.createdBy);
    }

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
 * Also creates an opportunity in "inbox" stage for each contact
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
        notes: v.optional(v.string()),
      })
    ),
    createdBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const timestamp = now();
    const contactIds: Id<"contacts">[] = [];

    // Get current opportunity count for numbering
    const allOpportunities = await ctx.db.query("opportunities").collect();
    let opportunityNumber = allOpportunities.length;

    for (const contact of args.contacts) {
      // Create contact
      const contactId = await ctx.db.insert("contacts", {
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email,
        phone: contact.phone,
        address: contact.address,
        company: contact.company,
        source: contact.source,
        notes: contact.notes,
        isDeleted: false,
        createdBy: args.createdBy,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      contactIds.push(contactId);

      // Create opportunity in inbox stage
      opportunityNumber++;
      const contactName = getFullName(contact.firstName, contact.lastName);
      const opportunityName = `Opportunity #${opportunityNumber}: ${contactName}`;

      await ctx.db.insert("opportunities", {
        name: opportunityName,
        contactId,
        stage: "inbox",
        estimatedValue: 0,
        location: contact.address,
        isDeleted: false,
        createdBy: args.createdBy,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }

    return contactIds;
  },
});
