import { v } from "convex/values";
import { query } from "./_generated/server";
import {
  now,
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  formatPHP,
  getFullName,
} from "./lib/helpers";

// ============================================
// PIPELINE ANALYTICS
// ============================================

/**
 * Get pipeline value by stage
 */
export const getPipelineValue = query({
  args: {},
  handler: async (ctx) => {
    const opportunities = await ctx.db
      .query("opportunities")
      .withIndex("by_deleted", (q) => q.eq("isDeleted", false))
      .collect();

    const stages = [
      "inbox",
      "to_call",
      "did_not_answer",
      "booked_call",
      "did_not_book_call",
      "for_ocular",
      "follow_up",
      "contract_drafting",
      "contract_signing",
      "closed",
    ];

    const byStage = stages.map((stage) => {
      const stageOpps = opportunities.filter((o) => o.stage === stage);
      const count = stageOpps.length;
      const totalValue = stageOpps.reduce((sum, o) => sum + o.estimatedValue, 0);

      return {
        stage,
        count,
        totalValue,
        formattedValue: formatPHP(totalValue),
      };
    });

    const activePipeline = opportunities.filter(
      (o) => o.stage !== "closed"
    );
    const totalActiveValue = activePipeline.reduce(
      (sum, o) => sum + o.estimatedValue,
      0
    );

    return {
      byStage,
      totalActiveCount: activePipeline.length,
      totalActiveValue,
      formattedTotalActiveValue: formatPHP(totalActiveValue),
    };
  },
});

/**
 * Get conversion rate (closed vs total opportunities)
 */
export const getConversionRate = query({
  args: {},
  handler: async (ctx) => {
    const opportunities = await ctx.db
      .query("opportunities")
      .withIndex("by_deleted", (q) => q.eq("isDeleted", false))
      .collect();

    const closed = opportunities.filter((o) => o.stage === "closed");
    const totalOpportunities = opportunities.length;

    const conversionRate =
      totalOpportunities > 0 ? (closed.length / totalOpportunities) * 100 : 0;

    const closedValue = closed.reduce((sum, o) => sum + o.estimatedValue, 0);

    return {
      closedCount: closed.length,
      totalCount: totalOpportunities,
      conversionRate: Math.round(conversionRate * 100) / 100,
      closedValue,
      formattedClosedValue: formatPHP(closedValue),
    };
  },
});

/**
 * Get revenue by period
 */
export const getRevenueByPeriod = query({
  args: {
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    // Get all payments in the date range
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_payment_date", (q) =>
        q.gte("paymentDate", args.startDate).lte("paymentDate", args.endDate)
      )
      .collect();

    const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);

    // Group by day
    const byDay: Record<string, number> = {};
    for (const payment of payments) {
      const date = new Date(payment.paymentDate).toISOString().split("T")[0];
      byDay[date] = (byDay[date] || 0) + payment.amount;
    }

    return {
      totalRevenue,
      formattedTotalRevenue: formatPHP(totalRevenue),
      paymentCount: payments.length,
      byDay,
    };
  },
});

// ============================================
// TASK ANALYTICS
// ============================================

/**
 * Get tasks overview
 */
export const getTasksOverview = query({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("tasks")
      .withIndex("by_deleted", (q) => q.eq("isDeleted", false));

    const tasks = await query.collect();

    // Filter by user if specified
    const filtered = args.userId
      ? tasks.filter((t) => t.assignedTo === args.userId)
      : tasks;

    const pending = filtered.filter((t) => t.status === "pending");
    const doing = filtered.filter((t) => t.status === "doing");
    const completed = filtered.filter((t) => t.status === "completed");

    const today = startOfDay(now());
    const overdue = filtered.filter(
      (t) =>
        t.dueDate &&
        t.dueDate < today &&
        t.status !== "completed"
    );

    const dueToday = filtered.filter(
      (t) =>
        t.dueDate &&
        t.dueDate >= today &&
        t.dueDate <= endOfDay(now()) &&
        t.status !== "completed"
    );

    return {
      total: filtered.length,
      pending: pending.length,
      doing: doing.length,
      completed: completed.length,
      overdue: overdue.length,
      dueToday: dueToday.length,
    };
  },
});

// ============================================
// APPOINTMENT ANALYTICS
// ============================================

/**
 * Get today's appointments
 */
export const getAppointmentsToday = query({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    const todayStart = startOfDay(now());
    const todayEnd = endOfDay(now());

    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_start_time", (q) =>
        q.gte("startTime", todayStart).lte("startTime", todayEnd)
      )
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect();

    const filtered = args.userId
      ? appointments.filter((a) => a.assignedTo === args.userId)
      : appointments;

    // Enrich with contact and opportunity data
    const enriched = await Promise.all(
      filtered.map(async (apt) => {
        const contact = await ctx.db.get(apt.contactId);
        const opportunity = apt.opportunityId
          ? await ctx.db.get(apt.opportunityId)
          : null;

        return {
          ...apt,
          contact: contact
            ? {
                _id: contact._id,
                fullName: getFullName(contact.firstName, contact.lastName),
              }
            : null,
          opportunity: opportunity
            ? { _id: opportunity._id, name: opportunity.name }
            : null,
        };
      })
    );

    return enriched;
  },
});

// ============================================
// LEAD ANALYTICS
// ============================================

/**
 * Get new leads this week
 */
export const getNewLeadsThisWeek = query({
  args: {},
  handler: async (ctx) => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - dayOfWeek);
    startOfWeek.setHours(0, 0, 0, 0);

    const contacts = await ctx.db
      .query("contacts")
      .withIndex("by_deleted_created", (q) => q.eq("isDeleted", false))
      .filter((q) => q.gte(q.field("createdAt"), startOfWeek.getTime()))
      .collect();

    return {
      count: contacts.length,
      contacts: contacts.map((c) => ({
        _id: c._id,
        fullName: getFullName(c.firstName, c.lastName),
        source: c.source,
        createdAt: c.createdAt,
      })),
    };
  },
});

/**
 * Get new leads this month with daily breakdown
 */
export const getNewLeadsThisMonth = query({
  args: {},
  handler: async (ctx) => {
    const monthStart = startOfMonth(now());
    const monthEnd = endOfMonth(now());

    const contacts = await ctx.db
      .query("contacts")
      .withIndex("by_deleted_created", (q) => q.eq("isDeleted", false))
      .filter((q) =>
        q.and(
          q.gte(q.field("createdAt"), monthStart),
          q.lte(q.field("createdAt"), monthEnd)
        )
      )
      .collect();

    // Group by day
    const byDay: Record<string, number> = {};
    for (const contact of contacts) {
      const date = new Date(contact.createdAt).toISOString().split("T")[0];
      byDay[date] = (byDay[date] || 0) + 1;
    }

    // Group by source
    const bySource: Record<string, number> = {};
    for (const contact of contacts) {
      bySource[contact.source] = (bySource[contact.source] || 0) + 1;
    }

    return {
      totalCount: contacts.length,
      byDay,
      bySource,
    };
  },
});

/**
 * Get closed leads this month
 */
export const getClosedLeadsThisMonth = query({
  args: {},
  handler: async (ctx) => {
    const monthStart = startOfMonth(now());

    const opportunities = await ctx.db
      .query("opportunities")
      .withIndex("by_deleted", (q) => q.eq("isDeleted", false))
      .filter((q) =>
        q.and(
          q.gte(q.field("updatedAt"), monthStart),
          q.eq(q.field("stage"), "closed")
        )
      )
      .collect();

    const closedValue = opportunities.reduce((sum, o) => sum + o.estimatedValue, 0);

    return {
      totalClosed: opportunities.length,
      closedValue,
      formattedClosedValue: formatPHP(closedValue),
    };
  },
});

// ============================================
// DASHBOARD SUMMARY
// ============================================

/**
 * Get dashboard summary (all key metrics)
 */
export const getDashboardSummary = query({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    const today = now();
    const monthStart = startOfMonth(today);
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);

    // New leads this week
    const dayOfWeek = new Date().getDay();
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - dayOfWeek);
    weekStart.setHours(0, 0, 0, 0);

    const newLeadsThisWeek = await ctx.db
      .query("contacts")
      .withIndex("by_deleted_created", (q) => q.eq("isDeleted", false))
      .filter((q) => q.gte(q.field("createdAt"), weekStart.getTime()))
      .collect();

    // Closed this month
    const closedThisMonth = await ctx.db
      .query("opportunities")
      .withIndex("by_deleted", (q) => q.eq("isDeleted", false))
      .filter((q) =>
        q.and(
          q.gte(q.field("updatedAt"), monthStart),
          q.eq(q.field("stage"), "closed")
        )
      )
      .collect();

    // Today's appointments
    const appointmentsToday = await ctx.db
      .query("appointments")
      .withIndex("by_start_time", (q) =>
        q.gte("startTime", todayStart).lte("startTime", todayEnd)
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("isDeleted"), false),
          q.eq(q.field("status"), "pending")
        )
      )
      .collect();

    const filteredAppointments = args.userId
      ? appointmentsToday.filter((a) => a.assignedTo === args.userId)
      : appointmentsToday;

    // Pending messages (unread)
    const unreadMessages = await ctx.db
      .query("messages")
      .withIndex("by_unread", (q) => q.eq("isRead", false))
      .filter((q) => q.eq(q.field("isOutgoing"), false))
      .collect();

    // Overdue tasks
    const overdueTasks = await ctx.db
      .query("tasks")
      .withIndex("by_deleted", (q) => q.eq("isDeleted", false))
      .filter((q) =>
        q.and(
          q.neq(q.field("status"), "completed"),
          q.lt(q.field("dueDate"), todayStart)
        )
      )
      .collect();

    const filteredOverdueTasks = args.userId
      ? overdueTasks.filter((t) => t.assignedTo === args.userId)
      : overdueTasks;

    return {
      newLeadsThisWeek: newLeadsThisWeek.length,
      closedThisMonth: closedThisMonth.length,
      closedValueThisMonth: formatPHP(
        closedThisMonth.reduce((sum, o) => sum + o.estimatedValue, 0)
      ),
      appointmentsToday: filteredAppointments.length,
      pendingMessages: unreadMessages.length,
      overdueTasks: filteredOverdueTasks.length,
    };
  },
});
