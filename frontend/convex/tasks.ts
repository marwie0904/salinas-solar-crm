import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { taskStatus, taskPriority } from "./schema";
import { getFullName, now, startOfDay, endOfDay, isOverdue } from "./lib/helpers";
import {
  logCreation,
  logUpdate,
  logDeletion,
  logRestoration,
  logStatusChange,
} from "./lib/activityLogger";

// ============================================
// QUERIES
// ============================================

/**
 * List all active tasks
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_deleted", (q) => q.eq("isDeleted", false))
      .order("desc")
      .collect();

    // Enrich with related data
    const enriched = await Promise.all(
      tasks.map(async (task) => {
        const contact = task.contactId
          ? await ctx.db.get(task.contactId)
          : null;
        const opportunity = task.opportunityId
          ? await ctx.db.get(task.opportunityId)
          : null;
        const assignedUser = task.assignedTo
          ? await ctx.db.get(task.assignedTo)
          : null;

        return {
          ...task,
          contact: contact
            ? {
                _id: contact._id,
                fullName: getFullName(contact.firstName, contact.lastName),
              }
            : null,
          opportunity: opportunity
            ? { _id: opportunity._id, name: opportunity.name }
            : null,
          assignedUser: assignedUser
            ? {
                _id: assignedUser._id,
                fullName: getFullName(
                  assignedUser.firstName,
                  assignedUser.lastName
                ),
              }
            : null,
          isOverdue: task.dueDate ? isOverdue(task.dueDate) : false,
        };
      })
    );

    return enriched;
  },
});

/**
 * Get a single task by ID
 */
export const get = query({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.id);
    if (!task || task.isDeleted) return null;

    const contact = task.contactId ? await ctx.db.get(task.contactId) : null;
    const opportunity = task.opportunityId
      ? await ctx.db.get(task.opportunityId)
      : null;
    const assignedUser = task.assignedTo
      ? await ctx.db.get(task.assignedTo)
      : null;

    return {
      ...task,
      contact: contact
        ? {
            _id: contact._id,
            fullName: getFullName(contact.firstName, contact.lastName),
          }
        : null,
      opportunity: opportunity
        ? { _id: opportunity._id, name: opportunity.name }
        : null,
      assignedUser: assignedUser
        ? {
            _id: assignedUser._id,
            fullName: getFullName(
              assignedUser.firstName,
              assignedUser.lastName
            ),
          }
        : null,
      isOverdue: task.dueDate ? isOverdue(task.dueDate) : false,
    };
  },
});

/**
 * Get tasks by status
 */
export const getByStatus = query({
  args: { status: taskStatus },
  handler: async (ctx, args) => {
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_deleted_status", (q) =>
        q.eq("isDeleted", false).eq("status", args.status)
      )
      .collect();

    const enriched = await Promise.all(
      tasks.map(async (task) => {
        const contact = task.contactId
          ? await ctx.db.get(task.contactId)
          : null;
        const assignedUser = task.assignedTo
          ? await ctx.db.get(task.assignedTo)
          : null;

        return {
          ...task,
          contact: contact
            ? {
                _id: contact._id,
                fullName: getFullName(contact.firstName, contact.lastName),
              }
            : null,
          assignedUser: assignedUser
            ? {
                _id: assignedUser._id,
                fullName: getFullName(
                  assignedUser.firstName,
                  assignedUser.lastName
                ),
              }
            : null,
          isOverdue: task.dueDate ? isOverdue(task.dueDate) : false,
        };
      })
    );

    return enriched;
  },
});

/**
 * Get tasks assigned to a user
 */
export const getByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_assigned_deleted", (q) =>
        q.eq("assignedTo", args.userId).eq("isDeleted", false)
      )
      .collect();

    return tasks.map((task) => ({
      ...task,
      isOverdue: task.dueDate ? isOverdue(task.dueDate) : false,
    }));
  },
});

/**
 * Get tasks for a contact
 */
export const getByContact = query({
  args: { contactId: v.id("contacts") },
  handler: async (ctx, args) => {
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_contact", (q) => q.eq("contactId", args.contactId))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect();

    return tasks;
  },
});

/**
 * Get tasks for an opportunity
 */
export const getByOpportunity = query({
  args: { opportunityId: v.id("opportunities") },
  handler: async (ctx, args) => {
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_opportunity", (q) =>
        q.eq("opportunityId", args.opportunityId)
      )
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect();

    return tasks;
  },
});

/**
 * Get overdue tasks
 */
export const getOverdue = query({
  args: {},
  handler: async (ctx) => {
    const today = startOfDay(Date.now());

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_deleted", (q) => q.eq("isDeleted", false))
      .filter((q) =>
        q.and(
          q.neq(q.field("status"), "completed"),
          q.lt(q.field("dueDate"), today)
        )
      )
      .collect();

    return tasks;
  },
});

/**
 * Get tasks due today for a user
 */
export const getDueToday = query({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    const todayStart = startOfDay(Date.now());
    const todayEnd = endOfDay(Date.now());

    let query = ctx.db
      .query("tasks")
      .withIndex("by_deleted", (q) => q.eq("isDeleted", false))
      .filter((q) =>
        q.and(
          q.neq(q.field("status"), "completed"),
          q.gte(q.field("dueDate"), todayStart),
          q.lte(q.field("dueDate"), todayEnd)
        )
      );

    const tasks = await query.collect();

    // Filter by user if specified
    const filtered = args.userId
      ? tasks.filter((t) => t.assignedTo === args.userId)
      : tasks;

    return filtered;
  },
});

// ============================================
// MUTATIONS
// ============================================

/**
 * Create a new task
 */
export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    status: v.optional(taskStatus),
    priority: v.optional(taskPriority),
    dueDate: v.optional(v.number()),
    contactId: v.optional(v.id("contacts")),
    opportunityId: v.optional(v.id("opportunities")),
    assignedTo: v.optional(v.id("users")),
    createdBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const timestamp = now();

    const taskId = await ctx.db.insert("tasks", {
      title: args.title,
      description: args.description,
      status: args.status ?? "pending",
      priority: args.priority,
      dueDate: args.dueDate,
      contactId: args.contactId,
      opportunityId: args.opportunityId,
      assignedTo: args.assignedTo,
      isDeleted: false,
      createdBy: args.createdBy,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    await logCreation(ctx, "task", taskId, args.createdBy);

    return taskId;
  },
});

/**
 * Update a task
 */
export const update = mutation({
  args: {
    id: v.id("tasks"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    priority: v.optional(taskPriority),
    dueDate: v.optional(v.number()),
    contactId: v.optional(v.id("contacts")),
    opportunityId: v.optional(v.id("opportunities")),
    assignedTo: v.optional(v.id("users")),
    updatedBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const { id, updatedBy, ...updates } = args;

    const existing = await ctx.db.get(id);
    if (!existing) {
      throw new Error("Task not found");
    }

    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== undefined)
    );

    await ctx.db.patch(id, {
      ...filteredUpdates,
      updatedAt: now(),
    });

    await logUpdate(ctx, "task", id, filteredUpdates, updatedBy);

    return id;
  },
});

/**
 * Update task status
 */
export const updateStatus = mutation({
  args: {
    id: v.id("tasks"),
    status: taskStatus,
    updatedBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error("Task not found");
    }

    const updates: Record<string, unknown> = {
      status: args.status,
      updatedAt: now(),
    };

    // Set completedAt if marking as completed
    if (args.status === "completed" && existing.status !== "completed") {
      updates.completedAt = now();
    }

    // Clear completedAt if un-completing
    if (args.status !== "completed" && existing.status === "completed") {
      updates.completedAt = undefined;
    }

    await ctx.db.patch(args.id, updates);

    await logStatusChange(
      ctx,
      "task",
      args.id,
      existing.status,
      args.status,
      args.updatedBy
    );

    return args.id;
  },
});

/**
 * Toggle task completion
 */
export const toggleComplete = mutation({
  args: {
    id: v.id("tasks"),
    updatedBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.id);
    if (!task) {
      throw new Error("Task not found");
    }

    const newStatus = task.status === "completed" ? "pending" : "completed";

    const updates: Record<string, unknown> = {
      status: newStatus,
      updatedAt: now(),
    };

    if (newStatus === "completed") {
      updates.completedAt = now();
    } else {
      updates.completedAt = undefined;
    }

    await ctx.db.patch(args.id, updates);

    await logStatusChange(
      ctx,
      "task",
      args.id,
      task.status,
      newStatus,
      args.updatedBy
    );

    return args.id;
  },
});

/**
 * Soft delete a task
 */
export const remove = mutation({
  args: {
    id: v.id("tasks"),
    deletedBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.id);
    if (!task) {
      throw new Error("Task not found");
    }

    await ctx.db.patch(args.id, {
      isDeleted: true,
      updatedAt: now(),
    });

    await logDeletion(ctx, "task", args.id, args.deletedBy);

    return args.id;
  },
});

/**
 * Restore a deleted task
 */
export const restore = mutation({
  args: {
    id: v.id("tasks"),
    restoredBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.id);
    if (!task) {
      throw new Error("Task not found");
    }

    await ctx.db.patch(args.id, {
      isDeleted: false,
      updatedAt: now(),
    });

    await logRestoration(ctx, "task", args.id, args.restoredBy);

    return args.id;
  },
});
