import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// ============================================
// TYPES
// ============================================

export const notificationType = v.union(
  v.literal("lead_assigned"),
  v.literal("appointment_scheduled"),
  v.literal("agreement_approved"),
  v.literal("task_due_tomorrow"),
  v.literal("task_due_soon"),
  v.literal("task_overdue")
);

type NotificationType =
  | "lead_assigned"
  | "appointment_scheduled"
  | "agreement_approved"
  | "task_due_tomorrow"
  | "task_due_soon"
  | "task_overdue";

// ============================================
// QUERIES
// ============================================

/**
 * Get notifications for a user
 */
export const getForUser = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_created", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(args.limit ?? 50);

    return notifications;
  },
});

/**
 * Get unread count for a user
 */
export const getUnreadCount = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_read", (q) =>
        q.eq("userId", args.userId).eq("read", false)
      )
      .collect();

    return unread.length;
  },
});

/**
 * Check if user has unread notifications
 */
export const hasUnread = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_read", (q) =>
        q.eq("userId", args.userId).eq("read", false)
      )
      .first();

    return unread !== null;
  },
});

// ============================================
// MUTATIONS
// ============================================

/**
 * Create a notification
 */
export const create = mutation({
  args: {
    userId: v.id("users"),
    type: notificationType,
    title: v.string(),
    message: v.string(),
    opportunityId: v.optional(v.id("opportunities")),
    contactId: v.optional(v.id("contacts")),
    appointmentId: v.optional(v.id("appointments")),
    agreementId: v.optional(v.id("agreements")),
    taskId: v.optional(v.id("tasks")),
  },
  handler: async (ctx, args) => {
    const notificationId = await ctx.db.insert("notifications", {
      userId: args.userId,
      type: args.type,
      title: args.title,
      message: args.message,
      opportunityId: args.opportunityId,
      contactId: args.contactId,
      appointmentId: args.appointmentId,
      agreementId: args.agreementId,
      taskId: args.taskId,
      read: false,
      createdAt: Date.now(),
    });

    return notificationId;
  },
});

/**
 * Internal mutation to create notifications (for use in other modules)
 */
export const internalCreate = internalMutation({
  args: {
    userId: v.id("users"),
    type: notificationType,
    title: v.string(),
    message: v.string(),
    opportunityId: v.optional(v.id("opportunities")),
    contactId: v.optional(v.id("contacts")),
    appointmentId: v.optional(v.id("appointments")),
    agreementId: v.optional(v.id("agreements")),
    taskId: v.optional(v.id("tasks")),
  },
  handler: async (ctx, args) => {
    const notificationId = await ctx.db.insert("notifications", {
      userId: args.userId,
      type: args.type,
      title: args.title,
      message: args.message,
      opportunityId: args.opportunityId,
      contactId: args.contactId,
      appointmentId: args.appointmentId,
      agreementId: args.agreementId,
      taskId: args.taskId,
      read: false,
      createdAt: Date.now(),
    });

    return notificationId;
  },
});

/**
 * Mark a notification as read
 */
export const markAsRead = mutation({
  args: {
    id: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { read: true });
    return args.id;
  },
});

/**
 * Mark all notifications as read for a user
 */
export const markAllAsRead = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_read", (q) =>
        q.eq("userId", args.userId).eq("read", false)
      )
      .collect();

    await Promise.all(
      unread.map((notification) =>
        ctx.db.patch(notification._id, { read: true })
      )
    );

    return unread.length;
  },
});

/**
 * Delete a notification
 */
export const remove = mutation({
  args: {
    id: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return args.id;
  },
});

/**
 * Delete all read notifications older than X days for a user
 */
export const cleanupOld = mutation({
  args: {
    userId: v.id("users"),
    daysOld: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const cutoff = Date.now() - (args.daysOld ?? 30) * 24 * 60 * 60 * 1000;

    const old = await ctx.db
      .query("notifications")
      .withIndex("by_user_created", (q) => q.eq("userId", args.userId))
      .filter((q) =>
        q.and(q.eq(q.field("read"), true), q.lt(q.field("createdAt"), cutoff))
      )
      .collect();

    await Promise.all(old.map((notification) => ctx.db.delete(notification._id)));

    return old.length;
  },
});

// ============================================
// INTERNAL MUTATIONS FOR CRON JOBS
// ============================================

/**
 * Create task due notifications (called by cron job)
 */
export const createTaskDueNotifications = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const oneHourFromNow = now + 60 * 60 * 1000;
    const tomorrowStart = new Date(now);
    tomorrowStart.setHours(0, 0, 0, 0);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    const tomorrowEnd = new Date(tomorrowStart);
    tomorrowEnd.setHours(23, 59, 59, 999);

    // Get all incomplete tasks
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_deleted", (q) => q.eq("isDeleted", false))
      .filter((q) => q.neq(q.field("status"), "completed"))
      .collect();

    let notificationsCreated = 0;

    for (const task of tasks) {
      if (!task.dueDate || !task.assignedTo) continue;

      const dueDate = task.dueDate;

      // Check for task due in 1 hour
      if (dueDate > now && dueDate <= oneHourFromNow) {
        // Check if we already sent a "due soon" notification
        const existing = await ctx.db
          .query("notifications")
          .withIndex("by_task_type", (q) =>
            q.eq("taskId", task._id).eq("type", "task_due_soon")
          )
          .first();

        if (!existing) {
          await ctx.db.insert("notifications", {
            userId: task.assignedTo,
            type: "task_due_soon",
            title: "Task Due in 1 Hour",
            message: task.title,
            taskId: task._id,
            opportunityId: task.opportunityId,
            contactId: task.contactId,
            read: false,
            createdAt: now,
          });
          notificationsCreated++;
        }
      }

      // Check for task due tomorrow
      if (dueDate >= tomorrowStart.getTime() && dueDate <= tomorrowEnd.getTime()) {
        const existing = await ctx.db
          .query("notifications")
          .withIndex("by_task_type", (q) =>
            q.eq("taskId", task._id).eq("type", "task_due_tomorrow")
          )
          .first();

        if (!existing) {
          await ctx.db.insert("notifications", {
            userId: task.assignedTo,
            type: "task_due_tomorrow",
            title: "Task Due Tomorrow",
            message: task.title,
            taskId: task._id,
            opportunityId: task.opportunityId,
            contactId: task.contactId,
            read: false,
            createdAt: now,
          });
          notificationsCreated++;
        }
      }

      // Check for overdue tasks
      if (dueDate < now) {
        // Check when we last sent an overdue notification
        const existing = await ctx.db
          .query("notifications")
          .withIndex("by_task_type", (q) =>
            q.eq("taskId", task._id).eq("type", "task_overdue")
          )
          .order("desc")
          .first();

        // Send if never sent, or if last sent more than 24 hours ago
        const shouldSend =
          !existing ||
          (existing.lastNotifiedAt && now - existing.lastNotifiedAt >= 24 * 60 * 60 * 1000);

        if (shouldSend) {
          const daysOverdue = Math.floor((now - dueDate) / (24 * 60 * 60 * 1000));
          await ctx.db.insert("notifications", {
            userId: task.assignedTo,
            type: "task_overdue",
            title: "Overdue Task",
            message: `${task.title} - ${daysOverdue} day${daysOverdue !== 1 ? "s" : ""} overdue`,
            taskId: task._id,
            opportunityId: task.opportunityId,
            contactId: task.contactId,
            read: false,
            lastNotifiedAt: now,
            createdAt: now,
          });
          notificationsCreated++;
        }
      }
    }

    return { notificationsCreated };
  },
});
