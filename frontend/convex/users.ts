import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { userRole } from "./schema";
import { getFullName, now } from "./lib/helpers";
import { logCreation, logUpdate } from "./lib/activityLogger";

// ============================================
// QUERIES
// ============================================

/**
 * List all active users
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db
      .query("users")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    return users.map((user) => ({
      ...user,
      fullName: getFullName(user.firstName, user.lastName),
    }));
  },
});

/**
 * List all users (including inactive)
 */
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();

    return users.map((user) => ({
      ...user,
      fullName: getFullName(user.firstName, user.lastName),
    }));
  },
});

/**
 * Get a single user by ID
 */
export const get = query({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.id);
    if (!user) return null;

    return {
      ...user,
      fullName: getFullName(user.firstName, user.lastName),
    };
  },
});

/**
 * Get user by email
 */
export const getByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!user) return null;

    return {
      ...user,
      fullName: getFullName(user.firstName, user.lastName),
    };
  },
});

/**
 * Get users by role
 */
export const getByRole = query({
  args: { role: userRole },
  handler: async (ctx, args) => {
    const users = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", args.role))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    return users.map((user) => ({
      ...user,
      fullName: getFullName(user.firstName, user.lastName),
    }));
  },
});

/**
 * List all active system consultants and system associates
 * Both roles can be assigned to opportunities
 */
export const listSystemConsultants = query({
  args: {},
  handler: async (ctx) => {
    // Get system consultants
    const consultants = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "system_consultant"))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Get system associates
    const associates = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "system_associate"))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const users = [...consultants, ...associates];

    return users.map((user) => ({
      ...user,
      fullName: getFullName(user.firstName, user.lastName),
    }));
  },
});

// ============================================
// MUTATIONS
// ============================================

/**
 * Create a new user
 */
export const create = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    role: v.optional(userRole),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const timestamp = now();

    const userId = await ctx.db.insert("users", {
      firstName: args.firstName,
      lastName: args.lastName,
      email: args.email,
      phone: args.phone,
      role: args.role,
      avatarUrl: args.avatarUrl,
      isActive: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    await logCreation(ctx, "user", userId);

    return userId;
  },
});

/**
 * Update a user
 */
export const update = mutation({
  args: {
    id: v.id("users"),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    role: v.optional(userRole),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;

    const existing = await ctx.db.get(id);
    if (!existing) {
      throw new Error("User not found");
    }

    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== undefined)
    );

    await ctx.db.patch(id, {
      ...filteredUpdates,
      updatedAt: now(),
    });

    await logUpdate(ctx, "user", id, filteredUpdates);

    return id;
  },
});

/**
 * Toggle user active status
 */
export const toggleActive = mutation({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.id);
    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(args.id, {
      isActive: !user.isActive,
      updatedAt: now(),
    });

    return args.id;
  },
});

/**
 * Deactivate a user
 */
export const deactivate = mutation({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.id);
    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(args.id, {
      isActive: false,
      updatedAt: now(),
    });

    return args.id;
  },
});

/**
 * Activate a user
 */
export const activate = mutation({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.id);
    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(args.id, {
      isActive: true,
      updatedAt: now(),
    });

    return args.id;
  },
});
