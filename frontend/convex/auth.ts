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

    // Check if verification is needed (30 days)
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
    const lastVerified = user.emailVerifiedAt || 0;
    const needsVerification = (now - lastVerified) >= THIRTY_DAYS;

    return {
      success: true,
      sessionToken,
      expiresAt,
      user: {
        id: user._id,
        email: user.email,
      },
      // Additional flags for login flow
      isDualAccount: user.isDualAccount || false,
      linkedUserEmails: user.linkedUserEmails || [],
      needsPasswordChange: user.hasChangedPassword === false,
      needsVerification,
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

    // Get auth user
    const authUser = await ctx.db.get(session.authUserId);
    if (!authUser || !authUser.isActive) {
      return { valid: false, user: null };
    }

    // For dual accounts, check if user has been selected
    if (authUser.isDualAccount) {
      if (!session.selectedUserEmail) {
        // User needs to select which profile to use
        return {
          valid: true,
          user: null,
          needsUserSelection: true,
          isDualAccount: true,
          linkedUserEmails: authUser.linkedUserEmails || [],
          authEmail: authUser.email,
          needsPasswordChange: authUser.hasChangedPassword === false,
        };
      }

      // Look up the selected CRM user
      const selectedUserEmail = session.selectedUserEmail;
      const selectedUser = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", selectedUserEmail!))
        .first();

      if (!selectedUser) {
        return { valid: false, user: null, error: "Selected user not found" };
      }

      return {
        valid: true,
        user: {
          id: selectedUser._id,
          authUserId: authUser._id,
          email: selectedUser.email,
          firstName: selectedUser.firstName,
          lastName: selectedUser.lastName,
          role: selectedUser.role,
        },
        expiresAt: session.expiresAt,
        isDualAccount: true,
        needsPasswordChange: authUser.hasChangedPassword === false,
      };
    }

    // Look up the corresponding CRM user by email
    const crmUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", authUser.email))
      .first();

    return {
      valid: true,
      user: {
        id: crmUser?._id ?? authUser._id, // Use CRM user ID if available
        authUserId: authUser._id,
        email: authUser.email,
        firstName: crmUser?.firstName,
        lastName: crmUser?.lastName,
        role: crmUser?.role,
      },
      expiresAt: session.expiresAt,
      needsPasswordChange: authUser.hasChangedPassword === false,
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
    const alexEmail = "marwie0904@gmail.com";

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

// Remove duplicate Alex Cruz (jgs@salinassolarservices.com version)
export const removeDuplicateAlexCruz = mutation({
  args: {},
  handler: async (ctx) => {
    const results: string[] = [];

    // Find Alex Cruz with jgs email in users table
    const users = await ctx.db.query("users").collect();
    const alexCruzJgs = users.find(
      (u) => u.firstName === "Alex" && u.lastName === "Cruz" && u.email === "jgs@salinassolarservices.com"
    );

    if (alexCruzJgs) {
      await ctx.db.delete(alexCruzJgs._id);
      results.push("Deleted CRM user: Alex Cruz (jgs@salinassolarservices.com)");
    } else {
      results.push("Alex Cruz (jgs@salinassolarservices.com) not found in users");
    }

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

// ============================================
// CLEAR AND SEED NEW USERS
// ============================================

// Clear all existing users (auth and CRM)
export const clearAllUsers = mutation({
  args: {},
  handler: async (ctx) => {
    const results: string[] = [];

    // Delete all sessions first
    const sessions = await ctx.db.query("sessions").collect();
    for (const session of sessions) {
      await ctx.db.delete(session._id);
    }
    results.push(`Deleted ${sessions.length} sessions`);

    // Delete all authUsers
    const authUsers = await ctx.db.query("authUsers").collect();
    for (const authUser of authUsers) {
      await ctx.db.delete(authUser._id);
    }
    results.push(`Deleted ${authUsers.length} auth users`);

    // Delete all CRM users
    const users = await ctx.db.query("users").collect();
    for (const user of users) {
      await ctx.db.delete(user._id);
    }
    results.push(`Deleted ${users.length} CRM users`);

    return { success: true, results };
  },
});

// Seed the new Salinas Solar team users
export const seedSalinasTeam = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const results: string[] = [];

    // 1. Jay-R G. Salinas - Head, Sales
    const jayEmail = "jgs@salinassolar.ph";
    const existingJay = await ctx.db
      .query("authUsers")
      .withIndex("by_email", (q) => q.eq("email", jayEmail))
      .first();

    if (!existingJay) {
      await ctx.db.insert("authUsers", {
        email: jayEmail,
        passwordHash: simpleHash("JgsSolar2026!"),
        isActive: true,
        hasChangedPassword: false,
        createdAt: now,
        updatedAt: now,
      });
      results.push(`Created auth user: ${jayEmail}`);

      await ctx.db.insert("users", {
        firstName: "Jay-R G.",
        lastName: "Salinas",
        email: jayEmail,
        phone: "09178242334",
        role: "head_sales",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
      results.push("Created CRM user: Jay-R G. Salinas (Head, Sales)");
    }

    // 2. Sales dual account - Kim Lan Gan & Betina May Bugay
    const salesEmail = "sales@salinassolar.ph";
    const existingSales = await ctx.db
      .query("authUsers")
      .withIndex("by_email", (q) => q.eq("email", salesEmail))
      .first();

    if (!existingSales) {
      // Kim's email for CRM profile
      const kimEmail = "kim@salinassolar.ph";
      // Betina's email for CRM profile
      const betinaEmail = "betina@salinassolar.ph";

      await ctx.db.insert("authUsers", {
        email: salesEmail,
        passwordHash: simpleHash("SalesSolar2026!"),
        isActive: true,
        hasChangedPassword: false,
        isDualAccount: true,
        linkedUserEmails: [kimEmail, betinaEmail],
        createdAt: now,
        updatedAt: now,
      });
      results.push(`Created dual auth user: ${salesEmail}`);

      // Create Kim's CRM profile
      await ctx.db.insert("users", {
        firstName: "Kim Lan",
        lastName: "Gan",
        email: kimEmail,
        phone: "9563713390",
        role: "system_consultant",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
      results.push("Created CRM user: Kim Lan Gan (System Consultant)");

      // Create Betina's CRM profile
      await ctx.db.insert("users", {
        firstName: "Betina May",
        lastName: "Bugay",
        email: betinaEmail,
        phone: "09215565857",
        role: "system_associate",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
      results.push("Created CRM user: Betina May Bugay (System Associate)");
    }

    // 3. Mark Joseph Suguitan - Project Manager
    const markEmail = "operations@salinassolar.ph";
    const existingMark = await ctx.db
      .query("authUsers")
      .withIndex("by_email", (q) => q.eq("email", markEmail))
      .first();

    if (!existingMark) {
      await ctx.db.insert("authUsers", {
        email: markEmail,
        passwordHash: simpleHash("OperationsSolar2026!"),
        isActive: true,
        hasChangedPassword: false,
        createdAt: now,
        updatedAt: now,
      });
      results.push(`Created auth user: ${markEmail}`);

      await ctx.db.insert("users", {
        firstName: "Mark Joseph",
        lastName: "Suguitan",
        email: markEmail,
        phone: "09620443432",
        role: "project_manager",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
      results.push("Created CRM user: Mark Joseph Suguitan (Project Manager)");
    }

    // 4. Cesiah Faith Hernandez - Manager, Finance
    const cesiahEmail = "finance@salinassolar.ph";
    const existingCesiah = await ctx.db
      .query("authUsers")
      .withIndex("by_email", (q) => q.eq("email", cesiahEmail))
      .first();

    if (!existingCesiah) {
      await ctx.db.insert("authUsers", {
        email: cesiahEmail,
        passwordHash: simpleHash("FinanceSolar2026!"),
        isActive: true,
        hasChangedPassword: false,
        createdAt: now,
        updatedAt: now,
      });
      results.push(`Created auth user: ${cesiahEmail}`);

      await ctx.db.insert("users", {
        firstName: "Cesiah Faith",
        lastName: "Hernandez",
        email: cesiahEmail,
        phone: "09387982792",
        role: "finance_manager",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
      results.push("Created CRM user: Cesiah Faith Hernandez (Finance Manager)");
    }

    // 5. Mar Wie Ang - Developer
    const marEmail = "marwie0904@gmail.com";
    const existingMar = await ctx.db
      .query("authUsers")
      .withIndex("by_email", (q) => q.eq("email", marEmail))
      .first();

    if (!existingMar) {
      await ctx.db.insert("authUsers", {
        email: marEmail,
        passwordHash: simpleHash("ayokonga123"),
        isActive: true,
        hasChangedPassword: true, // Developer doesn't need to change password
        createdAt: now,
        updatedAt: now,
      });
      results.push(`Created auth user: ${marEmail}`);

      await ctx.db.insert("users", {
        firstName: "Mar Wie",
        lastName: "Ang",
        email: marEmail,
        phone: "09765229475",
        role: "developer",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
      results.push("Created CRM user: Mar Wie Ang (Developer)");
    }

    return { success: true, results };
  },
});

// ============================================
// DUAL ACCOUNT USER SELECTION
// ============================================

// Get linked users for a dual account
export const getLinkedUsers = query({
  args: {
    authUserEmail: v.string(),
  },
  handler: async (ctx, args) => {
    const authUser = await ctx.db
      .query("authUsers")
      .withIndex("by_email", (q) => q.eq("email", args.authUserEmail.toLowerCase()))
      .first();

    if (!authUser || !authUser.isDualAccount || !authUser.linkedUserEmails) {
      return { users: [] };
    }

    const linkedUsers = [];
    for (const email of authUser.linkedUserEmails) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", email))
        .first();
      if (user) {
        linkedUsers.push({
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        });
      }
    }

    return { users: linkedUsers };
  },
});

// Select user for dual account session
export const selectDualAccountUser = mutation({
  args: {
    sessionToken: v.string(),
    selectedUserEmail: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("sessionToken", args.sessionToken))
      .first();

    if (!session) {
      return { success: false, error: "Invalid session" };
    }

    // Get auth user to verify this is a dual account
    const authUser = await ctx.db.get(session.authUserId);
    if (!authUser || !authUser.isDualAccount) {
      return { success: false, error: "Not a dual account" };
    }

    // Verify the selected email is one of the linked users
    if (!authUser.linkedUserEmails?.includes(args.selectedUserEmail)) {
      return { success: false, error: "Invalid user selection" };
    }

    // Update session with selected user
    await ctx.db.patch(session._id, {
      selectedUserEmail: args.selectedUserEmail,
    });

    return { success: true };
  },
});

// ============================================
// PASSWORD CHANGE
// ============================================

// Change password
export const changePassword = mutation({
  args: {
    sessionToken: v.string(),
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("sessionToken", args.sessionToken))
      .first();

    if (!session) {
      return { success: false, error: "Invalid session" };
    }

    const authUser = await ctx.db.get(session.authUserId);
    if (!authUser) {
      return { success: false, error: "User not found" };
    }

    // Verify current password
    if (authUser.passwordHash !== simpleHash(args.currentPassword)) {
      return { success: false, error: "Current password is incorrect" };
    }

    // Validate new password (at least 8 chars)
    if (args.newPassword.length < 8) {
      return { success: false, error: "New password must be at least 8 characters" };
    }

    // Update password
    await ctx.db.patch(authUser._id, {
      passwordHash: simpleHash(args.newPassword),
      hasChangedPassword: true,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Skip password change (user chooses to keep current password)
export const skipPasswordChange = mutation({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("sessionToken", args.sessionToken))
      .first();

    if (!session) {
      return { success: false, error: "Invalid session" };
    }

    const authUser = await ctx.db.get(session.authUserId);
    if (!authUser) {
      return { success: false, error: "User not found" };
    }

    // Mark as having "changed" password (they chose to skip)
    await ctx.db.patch(authUser._id, {
      hasChangedPassword: true,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// ============================================
// EMAIL VERIFICATION (30 days)
// ============================================

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const VERIFICATION_TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

// Generate verification token
function generateVerificationToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// Check if email verification is needed
export const checkVerificationNeeded = query({
  args: {
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const token = args.sessionToken;
    if (!token) {
      return { needsVerification: false };
    }

    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("sessionToken", token))
      .first();

    if (!session) {
      return { needsVerification: false };
    }

    const authUser = await ctx.db.get(session.authUserId);
    if (!authUser) {
      return { needsVerification: false };
    }

    const now = Date.now();
    const lastVerified = authUser.emailVerifiedAt || 0;
    const daysSinceVerification = (now - lastVerified) / THIRTY_DAYS_MS;

    return {
      needsVerification: daysSinceVerification >= 1,
      email: authUser.email,
      lastVerifiedAt: authUser.emailVerifiedAt,
    };
  },
});

// Request email verification (sends email)
export const requestEmailVerification = mutation({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("sessionToken", args.sessionToken))
      .first();

    if (!session) {
      return { success: false, error: "Invalid session" };
    }

    const authUser = await ctx.db.get(session.authUserId);
    if (!authUser) {
      return { success: false, error: "User not found" };
    }

    const now = Date.now();
    const token = generateVerificationToken();

    await ctx.db.patch(authUser._id, {
      emailVerificationToken: token,
      emailVerificationExpiresAt: now + VERIFICATION_TOKEN_EXPIRY_MS,
      updatedAt: now,
    });

    return {
      success: true,
      token, // Return token so action can send email
      email: authUser.email,
    };
  },
});

// Verify email with token
export const verifyEmail = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const authUser = await ctx.db
      .query("authUsers")
      .withIndex("by_verification_token", (q) => q.eq("emailVerificationToken", args.token))
      .first();

    if (!authUser) {
      return { success: false, error: "Invalid verification token" };
    }

    const now = Date.now();
    if (authUser.emailVerificationExpiresAt && authUser.emailVerificationExpiresAt < now) {
      return { success: false, error: "Verification token has expired" };
    }

    await ctx.db.patch(authUser._id, {
      emailVerifiedAt: now,
      emailVerificationToken: undefined,
      emailVerificationExpiresAt: undefined,
      updatedAt: now,
    });

    return { success: true, email: authUser.email };
  },
});
