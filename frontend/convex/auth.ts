import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Simple hash function for password (in production, use bcrypt via action)
// This is a basic implementation for simplicity
function simpleHash(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  // Add salt and convert to hex
  const salted = `salinas_solar_${hash}_auth`;
  let saltedHash = 0;
  for (let i = 0; i < salted.length; i++) {
    const char = salted.charCodeAt(i);
    saltedHash = (saltedHash << 5) - saltedHash + char;
    saltedHash = saltedHash & saltedHash;
  }
  return Math.abs(saltedHash).toString(16);
}

// Generate a random session token
function generateSessionToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// 7 days in milliseconds
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

// Login mutation
export const login = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const { email, password } = args;

    // Find user by email
    const user = await ctx.db
      .query("authUsers")
      .withIndex("by_email", (q) => q.eq("email", email.toLowerCase()))
      .first();

    if (!user) {
      return { success: false, error: "Invalid email or password" };
    }

    if (!user.isActive) {
      return { success: false, error: "Account is disabled" };
    }

    // Verify password
    const passwordHash = simpleHash(password);
    if (user.passwordHash !== passwordHash) {
      return { success: false, error: "Invalid email or password" };
    }

    // Create session
    const now = Date.now();
    const sessionToken = generateSessionToken();
    const expiresAt = now + SESSION_DURATION_MS;

    await ctx.db.insert("sessions", {
      authUserId: user._id,
      sessionToken,
      expiresAt,
      createdAt: now,
    });

    // Update last login
    await ctx.db.patch(user._id, {
      lastLoginAt: now,
      updatedAt: now,
    });

    return {
      success: true,
      sessionToken,
      expiresAt,
      user: {
        id: user._id,
        email: user.email,
      },
    };
  },
});

// Logout mutation
export const logout = mutation({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("sessionToken", args.sessionToken))
      .first();

    if (session) {
      await ctx.db.delete(session._id);
    }

    return { success: true };
  },
});

// Verify session query
export const verifySession = query({
  args: {
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { sessionToken } = args;
    if (!sessionToken) {
      return { valid: false, user: null };
    }

    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("sessionToken", sessionToken))
      .first();

    if (!session) {
      return { valid: false, user: null };
    }

    // Check if session is expired
    if (session.expiresAt < Date.now()) {
      // Delete expired session
      return { valid: false, user: null, expired: true };
    }

    // Get user
    const user = await ctx.db.get(session.authUserId);
    if (!user || !user.isActive) {
      return { valid: false, user: null };
    }

    return {
      valid: true,
      user: {
        id: user._id,
        email: user.email,
      },
      expiresAt: session.expiresAt,
    };
  },
});

// Seed users mutation (run once to create initial users)
export const seedUsers = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Check if users already exist
    const existingUser1 = await ctx.db
      .query("authUsers")
      .withIndex("by_email", (q) => q.eq("email", "marwie0904@gmail.com"))
      .first();

    const existingUser2 = await ctx.db
      .query("authUsers")
      .withIndex("by_email", (q) => q.eq("email", "salinastest@gmail.com"))
      .first();

    const results: string[] = [];

    if (!existingUser1) {
      await ctx.db.insert("authUsers", {
        email: "marwie0904@gmail.com",
        passwordHash: simpleHash("ayokonga123"),
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
      results.push("Created user: marwie0904@gmail.com");
    } else {
      results.push("User already exists: marwie0904@gmail.com");
    }

    if (!existingUser2) {
      await ctx.db.insert("authUsers", {
        email: "salinastest@gmail.com",
        passwordHash: simpleHash("solar123"),
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
      results.push("Created user: salinastest@gmail.com");
    } else {
      results.push("User already exists: salinastest@gmail.com");
    }

    return { success: true, results };
  },
});

// Add new auth user and CRM users
export const seedAdditionalUsers = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const results: string[] = [];

    // Add Jay R. Salinas auth user
    const existingAuthUser = await ctx.db
      .query("authUsers")
      .withIndex("by_email", (q) => q.eq("email", "jgs@salinassolarservices.com"))
      .first();

    if (!existingAuthUser) {
      await ctx.db.insert("authUsers", {
        email: "jgs@salinassolarservices.com",
        passwordHash: simpleHash("salinas123"),
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
      results.push("Created auth user: jgs@salinassolarservices.com");
    } else {
      results.push("Auth user already exists: jgs@salinassolarservices.com");
    }

    // Add Jay R. Salinas CRM user
    const existingCrmUser1 = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", "jgs@salinassolarservices.com"))
      .first();

    if (!existingCrmUser1) {
      await ctx.db.insert("users", {
        firstName: "Jay R.",
        lastName: "Salinas",
        email: "jgs@salinassolarservices.com",
        phone: "+63 917 824 2334",
        role: "project_manager",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
      results.push("Created CRM user: Jay R. Salinas");
    } else {
      results.push("CRM user already exists: Jay R. Salinas");
    }

    // Update or create Mar Wie Ang CRM user
    const existingCrmUser2 = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", "marwie0904@gmail.com"))
      .first();

    if (existingCrmUser2) {
      await ctx.db.patch(existingCrmUser2._id, {
        firstName: "Mar Wie",
        lastName: "Ang",
        phone: "+63 976 522 9475",
        role: "developer",
        updatedAt: now,
      });
      results.push("Updated CRM user: Mar Wie Ang");
    } else {
      await ctx.db.insert("users", {
        firstName: "Mar Wie",
        lastName: "Ang",
        email: "marwie0904@gmail.com",
        phone: "+63 976 522 9475",
        role: "developer",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
      results.push("Created CRM user: Mar Wie Ang");
    }

    return { success: true, results };
  },
});

// Seed Alex Cruz as System Consultant
export const seedSystemConsultant = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const results: string[] = [];

    // Alex Cruz - System Consultant (test user)
    const alexEmail = "jgs@salinassolarservices.com";

    // Always create new auth user for testing
    await ctx.db.insert("authUsers", {
      email: alexEmail,
      passwordHash: simpleHash("solar123"),
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    results.push(`Created auth user: ${alexEmail}`);

    // Always create new CRM user for testing
    await ctx.db.insert("users", {
      firstName: "Alex",
      lastName: "Cruz",
      email: alexEmail,
      phone: "+63 912 345 6789",
      role: "system_consultant",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    results.push("Created CRM user: Alex Cruz (System Consultant)");

    return { success: true, results };
  },
});

// Clean expired sessions mutation (can be run periodically)
export const cleanExpiredSessions = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const expiredSessions = await ctx.db
      .query("sessions")
      .withIndex("by_expires")
      .filter((q) => q.lt(q.field("expiresAt"), now))
      .collect();

    for (const session of expiredSessions) {
      await ctx.db.delete(session._id);
    }

    return { deleted: expiredSessions.length };
  },
});
