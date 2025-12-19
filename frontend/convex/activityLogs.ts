import { v } from "convex/values";
import { query } from "./_generated/server";
import { getFullName } from "./lib/helpers";

// ============================================
// QUERIES
// ============================================

/**
 * Get activity logs for an entity
 */
export const getByEntity = query({
  args: {
    entityType: v.string(),
    entityId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const logs = await ctx.db
      .query("activityLogs")
      .withIndex("by_entity_time", (q) =>
        q.eq("entityType", args.entityType).eq("entityId", args.entityId)
      )
      .order("desc")
      .take(args.limit ?? 50);

    // Enrich with user data
    const enriched = await Promise.all(
      logs.map(async (log) => {
        const user = log.performedBy
          ? await ctx.db.get(log.performedBy)
          : null;

        return {
          ...log,
          performedByUser: user
            ? {
                _id: user._id,
                fullName: getFullName(user.firstName, user.lastName),
              }
            : null,
          parsedChanges: log.changes ? JSON.parse(log.changes) : null,
        };
      })
    );

    return enriched;
  },
});

/**
 * Get recent activity logs
 */
export const getRecent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const logs = await ctx.db
      .query("activityLogs")
      .withIndex("by_created_at")
      .order("desc")
      .take(args.limit ?? 50);

    // Enrich with user data
    const enriched = await Promise.all(
      logs.map(async (log) => {
        const user = log.performedBy
          ? await ctx.db.get(log.performedBy)
          : null;

        return {
          ...log,
          performedByUser: user
            ? {
                _id: user._id,
                fullName: getFullName(user.firstName, user.lastName),
              }
            : null,
          parsedChanges: log.changes ? JSON.parse(log.changes) : null,
        };
      })
    );

    return enriched;
  },
});

/**
 * Get activity logs by user
 */
export const getByUser = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const logs = await ctx.db
      .query("activityLogs")
      .withIndex("by_user", (q) => q.eq("performedBy", args.userId))
      .order("desc")
      .take(args.limit ?? 50);

    return logs.map((log) => ({
      ...log,
      parsedChanges: log.changes ? JSON.parse(log.changes) : null,
    }));
  },
});

/**
 * Get activity logs by entity type
 */
export const getByEntityType = query({
  args: {
    entityType: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const logs = await ctx.db
      .query("activityLogs")
      .withIndex("by_entity", (q) => q.eq("entityType", args.entityType))
      .order("desc")
      .take(args.limit ?? 50);

    // Enrich with user data
    const enriched = await Promise.all(
      logs.map(async (log) => {
        const user = log.performedBy
          ? await ctx.db.get(log.performedBy)
          : null;

        return {
          ...log,
          performedByUser: user
            ? {
                _id: user._id,
                fullName: getFullName(user.firstName, user.lastName),
              }
            : null,
          parsedChanges: log.changes ? JSON.parse(log.changes) : null,
        };
      })
    );

    return enriched;
  },
});

/**
 * Get activity logs by action type
 */
export const getByAction = query({
  args: {
    action: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const logs = await ctx.db
      .query("activityLogs")
      .order("desc")
      .filter((q) => q.eq(q.field("action"), args.action))
      .take(args.limit ?? 50);

    // Enrich with user data
    const enriched = await Promise.all(
      logs.map(async (log) => {
        const user = log.performedBy
          ? await ctx.db.get(log.performedBy)
          : null;

        return {
          ...log,
          performedByUser: user
            ? {
                _id: user._id,
                fullName: getFullName(user.firstName, user.lastName),
              }
            : null,
          parsedChanges: log.changes ? JSON.parse(log.changes) : null,
        };
      })
    );

    return enriched;
  },
});

/**
 * Get activity summary (counts by action type)
 */
export const getSummary = query({
  args: {
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("activityLogs").withIndex("by_created_at");

    const logs = await query.collect();

    // Filter by date range if provided
    const filtered = logs.filter((log) => {
      if (args.startDate && log.createdAt < args.startDate) return false;
      if (args.endDate && log.createdAt > args.endDate) return false;
      return true;
    });

    // Group by action
    const byAction: Record<string, number> = {};
    // Group by entity type
    const byEntityType: Record<string, number> = {};

    for (const log of filtered) {
      byAction[log.action] = (byAction[log.action] || 0) + 1;
      byEntityType[log.entityType] = (byEntityType[log.entityType] || 0) + 1;
    }

    return {
      totalCount: filtered.length,
      byAction,
      byEntityType,
    };
  },
});
