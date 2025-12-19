import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { appointmentType, appointmentStatus } from "./schema";
import { getFullName, now, startOfDay, endOfDay } from "./lib/helpers";
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
 * List all active appointments
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_deleted", (q) => q.eq("isDeleted", false))
      .order("desc")
      .collect();

    const enriched = await Promise.all(
      appointments.map(async (apt) => {
        const contact = await ctx.db.get(apt.contactId);
        const opportunity = apt.opportunityId
          ? await ctx.db.get(apt.opportunityId)
          : null;
        const assignedUser = await ctx.db.get(apt.assignedTo);

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
          assignedUser: assignedUser
            ? {
                _id: assignedUser._id,
                fullName: getFullName(
                  assignedUser.firstName,
                  assignedUser.lastName
                ),
              }
            : null,
        };
      })
    );

    return enriched;
  },
});

/**
 * Get a single appointment by ID
 */
export const get = query({
  args: { id: v.id("appointments") },
  handler: async (ctx, args) => {
    const appointment = await ctx.db.get(args.id);
    if (!appointment || appointment.isDeleted) return null;

    const contact = await ctx.db.get(appointment.contactId);
    const opportunity = appointment.opportunityId
      ? await ctx.db.get(appointment.opportunityId)
      : null;
    const assignedUser = await ctx.db.get(appointment.assignedTo);

    return {
      ...appointment,
      contact: contact
        ? {
            _id: contact._id,
            fullName: getFullName(contact.firstName, contact.lastName),
            phone: contact.phone,
            email: contact.email,
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
    };
  },
});

/**
 * Get appointments by date (for calendar day view)
 */
export const getByDate = query({
  args: { date: v.string() }, // YYYY-MM-DD format
  handler: async (ctx, args) => {
    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_deleted_date", (q) =>
        q.eq("isDeleted", false).eq("date", args.date)
      )
      .collect();

    const enriched = await Promise.all(
      appointments.map(async (apt) => {
        const contact = await ctx.db.get(apt.contactId);
        const assignedUser = await ctx.db.get(apt.assignedTo);

        return {
          ...apt,
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
        };
      })
    );

    return enriched;
  },
});

/**
 * Get appointments by date range (for calendar month/week view)
 */
export const getByDateRange = query({
  args: {
    startDate: v.string(), // YYYY-MM-DD
    endDate: v.string(), // YYYY-MM-DD
  },
  handler: async (ctx, args) => {
    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_deleted", (q) => q.eq("isDeleted", false))
      .filter((q) =>
        q.and(
          q.gte(q.field("date"), args.startDate),
          q.lte(q.field("date"), args.endDate)
        )
      )
      .collect();

    const enriched = await Promise.all(
      appointments.map(async (apt) => {
        const contact = await ctx.db.get(apt.contactId);
        const assignedUser = await ctx.db.get(apt.assignedTo);

        return {
          ...apt,
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
        };
      })
    );

    return enriched;
  },
});

/**
 * Get appointments for a user
 */
export const getByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_assigned", (q) => q.eq("assignedTo", args.userId))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect();

    return appointments;
  },
});

/**
 * Get appointments for a contact
 */
export const getByContact = query({
  args: { contactId: v.id("contacts") },
  handler: async (ctx, args) => {
    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_contact", (q) => q.eq("contactId", args.contactId))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect();

    return appointments;
  },
});

/**
 * Get appointments for an opportunity
 */
export const getByOpportunity = query({
  args: { opportunityId: v.id("opportunities") },
  handler: async (ctx, args) => {
    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_opportunity", (q) =>
        q.eq("opportunityId", args.opportunityId)
      )
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect();

    return appointments;
  },
});

/**
 * Get upcoming appointments for a user
 */
export const getUpcoming = query({
  args: {
    userId: v.optional(v.id("users")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const todayStart = startOfDay(Date.now());

    let query = ctx.db
      .query("appointments")
      .withIndex("by_start_time", (q) => q.gte("startTime", todayStart))
      .filter((q) =>
        q.and(
          q.eq(q.field("isDeleted"), false),
          q.eq(q.field("status"), "pending")
        )
      );

    const appointments = await query.take(args.limit ?? 10);

    // Filter by user if specified
    const filtered = args.userId
      ? appointments.filter((a) => a.assignedTo === args.userId)
      : appointments;

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

/**
 * Get today's appointments
 */
export const getToday = query({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    const todayStart = startOfDay(Date.now());
    const todayEnd = endOfDay(Date.now());

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
// MUTATIONS
// ============================================

/**
 * Create a new appointment
 */
export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    appointmentType: appointmentType,
    date: v.string(),
    time: v.string(),
    location: v.optional(v.string()),
    contactId: v.id("contacts"),
    opportunityId: v.optional(v.id("opportunities")),
    assignedTo: v.id("users"),
    notes: v.optional(v.string()),
    createdBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const timestamp = now();

    // Parse date and time to create startTime
    const [year, month, day] = args.date.split("-").map(Number);
    const timeParts = args.time.match(/(\d+):(\d+)\s*(AM|PM)?/i);
    let hours = parseInt(timeParts?.[1] ?? "0");
    const minutes = parseInt(timeParts?.[2] ?? "0");
    const meridiem = timeParts?.[3]?.toUpperCase();

    if (meridiem === "PM" && hours !== 12) hours += 12;
    if (meridiem === "AM" && hours === 12) hours = 0;

    const startTime = new Date(year, month - 1, day, hours, minutes).getTime();

    const appointmentId = await ctx.db.insert("appointments", {
      title: args.title,
      description: args.description,
      appointmentType: args.appointmentType,
      status: "pending",
      date: args.date,
      time: args.time,
      startTime,
      location: args.location,
      contactId: args.contactId,
      opportunityId: args.opportunityId,
      assignedTo: args.assignedTo,
      notes: args.notes,
      isDeleted: false,
      createdBy: args.createdBy,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    await logCreation(ctx, "appointment", appointmentId, args.createdBy);

    return appointmentId;
  },
});

/**
 * Update an appointment
 */
export const update = mutation({
  args: {
    id: v.id("appointments"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    appointmentType: v.optional(appointmentType),
    date: v.optional(v.string()),
    time: v.optional(v.string()),
    location: v.optional(v.string()),
    opportunityId: v.optional(v.id("opportunities")),
    assignedTo: v.optional(v.id("users")),
    notes: v.optional(v.string()),
    updatedBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const { id, updatedBy, ...updates } = args;

    const existing = await ctx.db.get(id);
    if (!existing) {
      throw new Error("Appointment not found");
    }

    const filteredUpdates: Record<string, unknown> = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== undefined)
    );

    // Recalculate startTime if date or time changed
    if (updates.date || updates.time) {
      const date = updates.date ?? existing.date;
      const time = updates.time ?? existing.time;

      const [year, month, day] = date.split("-").map(Number);
      const timeParts = time.match(/(\d+):(\d+)\s*(AM|PM)?/i);
      let hours = parseInt(timeParts?.[1] ?? "0");
      const minutes = parseInt(timeParts?.[2] ?? "0");
      const meridiem = timeParts?.[3]?.toUpperCase();

      if (meridiem === "PM" && hours !== 12) hours += 12;
      if (meridiem === "AM" && hours === 12) hours = 0;

      filteredUpdates.startTime = new Date(
        year,
        month - 1,
        day,
        hours,
        minutes
      ).getTime();
    }

    await ctx.db.patch(id, {
      ...filteredUpdates,
      updatedAt: now(),
    });

    await logUpdate(ctx, "appointment", id, filteredUpdates, updatedBy);

    return id;
  },
});

/**
 * Update appointment status
 */
export const updateStatus = mutation({
  args: {
    id: v.id("appointments"),
    status: appointmentStatus,
    cancellationReason: v.optional(v.string()),
    updatedBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error("Appointment not found");
    }

    const updates: Record<string, unknown> = {
      status: args.status,
      updatedAt: now(),
    };

    if (args.status === "cancelled" && args.cancellationReason) {
      updates.cancellationReason = args.cancellationReason;
    }

    await ctx.db.patch(args.id, updates);

    await logStatusChange(
      ctx,
      "appointment",
      args.id,
      existing.status,
      args.status,
      args.updatedBy
    );

    return args.id;
  },
});

/**
 * Cancel an appointment
 */
export const cancel = mutation({
  args: {
    id: v.id("appointments"),
    reason: v.optional(v.string()),
    cancelledBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error("Appointment not found");
    }

    await ctx.db.patch(args.id, {
      status: "cancelled",
      cancellationReason: args.reason,
      updatedAt: now(),
    });

    await logStatusChange(
      ctx,
      "appointment",
      args.id,
      existing.status,
      "cancelled",
      args.cancelledBy
    );

    return args.id;
  },
});

/**
 * Soft delete an appointment
 */
export const remove = mutation({
  args: {
    id: v.id("appointments"),
    deletedBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const appointment = await ctx.db.get(args.id);
    if (!appointment) {
      throw new Error("Appointment not found");
    }

    await ctx.db.patch(args.id, {
      isDeleted: true,
      updatedAt: now(),
    });

    await logDeletion(ctx, "appointment", args.id, args.deletedBy);

    return args.id;
  },
});

/**
 * Restore a deleted appointment
 */
export const restore = mutation({
  args: {
    id: v.id("appointments"),
    restoredBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const appointment = await ctx.db.get(args.id);
    if (!appointment) {
      throw new Error("Appointment not found");
    }

    await ctx.db.patch(args.id, {
      isDeleted: false,
      updatedAt: now(),
    });

    await logRestoration(ctx, "appointment", args.id, args.restoredBy);

    return args.id;
  },
});
