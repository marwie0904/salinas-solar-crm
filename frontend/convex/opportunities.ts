import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { pipelineStage } from "./schema";
import { getFullName, now } from "./lib/helpers";
import {
  logCreation,
  logUpdate,
  logDeletion,
  logRestoration,
  logStageChange,
} from "./lib/activityLogger";

// ============================================
// TYPES
// ============================================

type PipelineStage =
  | "new_lead"
  | "contacted"
  | "qualified"
  | "proposal"
  | "negotiation"
  | "closed_won"
  | "closed_lost";

// ============================================
// QUERIES
// ============================================

/**
 * List all active opportunities
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const opportunities = await ctx.db
      .query("opportunities")
      .withIndex("by_deleted", (q) => q.eq("isDeleted", false))
      .order("desc")
      .collect();

    // Enrich with contact data
    const enriched = await Promise.all(
      opportunities.map(async (opp) => {
        const contact = await ctx.db.get(opp.contactId);
        return {
          ...opp,
          contact: contact
            ? {
                ...contact,
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
 * Get a single opportunity by ID with full details
 */
export const get = query({
  args: { id: v.id("opportunities") },
  handler: async (ctx, args) => {
    const opportunity = await ctx.db.get(args.id);
    if (!opportunity || opportunity.isDeleted) return null;

    const contact = await ctx.db.get(opportunity.contactId);

    return {
      ...opportunity,
      contact: contact
        ? {
            ...contact,
            fullName: getFullName(contact.firstName, contact.lastName),
          }
        : null,
    };
  },
});

/**
 * Get opportunity with all related data
 */
export const getWithRelations = query({
  args: { id: v.id("opportunities") },
  handler: async (ctx, args) => {
    const opportunity = await ctx.db.get(args.id);
    if (!opportunity || opportunity.isDeleted) return null;

    // Get contact
    const contact = await ctx.db.get(opportunity.contactId);

    // Get assigned user
    const assignedUser = opportunity.assignedTo
      ? await ctx.db.get(opportunity.assignedTo)
      : null;

    // Get related tasks
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_opportunity", (q) => q.eq("opportunityId", args.id))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect();

    // Get related appointments
    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_opportunity", (q) => q.eq("opportunityId", args.id))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect();

    // Get related invoices
    const invoices = await ctx.db
      .query("invoices")
      .withIndex("by_opportunity", (q) => q.eq("opportunityId", args.id))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect();

    // Get related documents
    const documents = await ctx.db
      .query("documents")
      .withIndex("by_opportunity", (q) => q.eq("opportunityId", args.id))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect();

    // Get messages through contact
    const messages = contact
      ? await ctx.db
          .query("messages")
          .withIndex("by_contact_time", (q) => q.eq("contactId", contact._id))
          .order("desc")
          .take(50)
      : [];

    return {
      ...opportunity,
      contact: contact
        ? {
            ...contact,
            fullName: getFullName(contact.firstName, contact.lastName),
          }
        : null,
      assignedUser: assignedUser
        ? {
            ...assignedUser,
            fullName: getFullName(assignedUser.firstName, assignedUser.lastName),
          }
        : null,
      tasks,
      appointments,
      invoices,
      documents,
      messages,
    };
  },
});

/**
 * Get opportunities by stage (for pipeline view)
 */
export const getByStage = query({
  args: { stage: pipelineStage },
  handler: async (ctx, args) => {
    const opportunities = await ctx.db
      .query("opportunities")
      .withIndex("by_deleted_stage", (q) =>
        q.eq("isDeleted", false).eq("stage", args.stage)
      )
      .collect();

    const enriched = await Promise.all(
      opportunities.map(async (opp) => {
        const contact = await ctx.db.get(opp.contactId);
        return {
          ...opp,
          contact: contact
            ? {
                ...contact,
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
 * Get pipeline summary (counts and values by stage)
 */
export const getPipelineSummary = query({
  args: {},
  handler: async (ctx) => {
    const opportunities = await ctx.db
      .query("opportunities")
      .withIndex("by_deleted", (q) => q.eq("isDeleted", false))
      .collect();

    const stages: PipelineStage[] = [
      "new_lead",
      "contacted",
      "qualified",
      "proposal",
      "negotiation",
      "closed_won",
      "closed_lost",
    ];

    const summary = stages.map((stage) => {
      const stageOpps = opportunities.filter((o) => o.stage === stage);
      return {
        stage,
        count: stageOpps.length,
        totalValue: stageOpps.reduce((sum, o) => sum + o.estimatedValue, 0),
      };
    });

    const totalCount = opportunities.length;
    const totalValue = opportunities.reduce(
      (sum, o) => sum + o.estimatedValue,
      0
    );

    return {
      stages: summary,
      totalCount,
      totalValue,
    };
  },
});

/**
 * Get opportunities by contact
 */
export const getByContact = query({
  args: { contactId: v.id("contacts") },
  handler: async (ctx, args) => {
    const opportunities = await ctx.db
      .query("opportunities")
      .withIndex("by_contact_deleted", (q) =>
        q.eq("contactId", args.contactId).eq("isDeleted", false)
      )
      .collect();

    return opportunities;
  },
});

/**
 * Get opportunities assigned to a user
 */
export const getByAssignee = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const opportunities = await ctx.db
      .query("opportunities")
      .withIndex("by_assigned", (q) => q.eq("assignedTo", args.userId))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect();

    const enriched = await Promise.all(
      opportunities.map(async (opp) => {
        const contact = await ctx.db.get(opp.contactId);
        return {
          ...opp,
          contact: contact
            ? {
                ...contact,
                fullName: getFullName(contact.firstName, contact.lastName),
              }
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
 * Create a new opportunity
 */
export const create = mutation({
  args: {
    name: v.string(),
    contactId: v.id("contacts"),
    stage: v.optional(pipelineStage),
    estimatedValue: v.number(),
    notes: v.optional(v.string()),
    expectedCloseDate: v.optional(v.number()),
    assignedTo: v.optional(v.id("users")),
    createdBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const timestamp = now();

    const opportunityId = await ctx.db.insert("opportunities", {
      name: args.name,
      contactId: args.contactId,
      stage: args.stage ?? "new_lead",
      estimatedValue: args.estimatedValue,
      notes: args.notes,
      expectedCloseDate: args.expectedCloseDate,
      assignedTo: args.assignedTo,
      isDeleted: false,
      createdBy: args.createdBy,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    await logCreation(ctx, "opportunity", opportunityId, args.createdBy);

    return opportunityId;
  },
});

/**
 * Update an opportunity
 */
export const update = mutation({
  args: {
    id: v.id("opportunities"),
    name: v.optional(v.string()),
    estimatedValue: v.optional(v.number()),
    notes: v.optional(v.string()),
    expectedCloseDate: v.optional(v.number()),
    lostReason: v.optional(v.string()),
    assignedTo: v.optional(v.id("users")),
    updatedBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const { id, updatedBy, ...updates } = args;

    const existing = await ctx.db.get(id);
    if (!existing) {
      throw new Error("Opportunity not found");
    }

    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== undefined)
    );

    await ctx.db.patch(id, {
      ...filteredUpdates,
      updatedAt: now(),
    });

    await logUpdate(ctx, "opportunity", id, filteredUpdates, updatedBy);

    return id;
  },
});

/**
 * Update opportunity stage
 */
export const updateStage = mutation({
  args: {
    id: v.id("opportunities"),
    stage: pipelineStage,
    lostReason: v.optional(v.string()),
    updatedBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error("Opportunity not found");
    }

    const updates: Record<string, unknown> = {
      stage: args.stage,
      updatedAt: now(),
    };

    // Add lost reason if moving to closed_lost
    if (args.stage === "closed_lost" && args.lostReason) {
      updates.lostReason = args.lostReason;
    }

    await ctx.db.patch(args.id, updates);

    await logStageChange(
      ctx,
      args.id,
      existing.stage,
      args.stage,
      args.updatedBy
    );

    return args.id;
  },
});

/**
 * Soft delete an opportunity
 */
export const remove = mutation({
  args: {
    id: v.id("opportunities"),
    deletedBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const opportunity = await ctx.db.get(args.id);
    if (!opportunity) {
      throw new Error("Opportunity not found");
    }

    await ctx.db.patch(args.id, {
      isDeleted: true,
      updatedAt: now(),
    });

    await logDeletion(ctx, "opportunity", args.id, args.deletedBy);

    return args.id;
  },
});

/**
 * Restore a deleted opportunity
 */
export const restore = mutation({
  args: {
    id: v.id("opportunities"),
    restoredBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const opportunity = await ctx.db.get(args.id);
    if (!opportunity) {
      throw new Error("Opportunity not found");
    }

    await ctx.db.patch(args.id, {
      isDeleted: false,
      updatedAt: now(),
    });

    await logRestoration(ctx, "opportunity", args.id, args.restoredBy);

    return args.id;
  },
});

/**
 * Assign opportunity to a user
 */
export const assign = mutation({
  args: {
    id: v.id("opportunities"),
    assignedTo: v.id("users"),
    assignedBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const opportunity = await ctx.db.get(args.id);
    if (!opportunity) {
      throw new Error("Opportunity not found");
    }

    await ctx.db.patch(args.id, {
      assignedTo: args.assignedTo,
      updatedAt: now(),
    });

    return args.id;
  },
});
