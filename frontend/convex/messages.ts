import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { messageChannel } from "./schema";
import { getFullName, now } from "./lib/helpers";
import { logActivity } from "./lib/activityLogger";

// ============================================
// QUERIES
// ============================================

/**
 * Get messages for a contact
 */
export const getByContact = query({
  args: {
    contactId: v.id("contacts"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_contact_time", (q) => q.eq("contactId", args.contactId))
      .order("asc")
      .take(args.limit ?? 100);

    return messages;
  },
});

/**
 * Get conversation list (contacts with their latest message)
 */
export const getConversations = query({
  args: {},
  handler: async (ctx) => {
    // Get all contacts with messages
    const contacts = await ctx.db
      .query("contacts")
      .withIndex("by_deleted", (q) => q.eq("isDeleted", false))
      .collect();

    const conversations = await Promise.all(
      contacts.map(async (contact) => {
        // Get latest message for this contact
        const latestMessage = await ctx.db
          .query("messages")
          .withIndex("by_contact_time", (q) => q.eq("contactId", contact._id))
          .order("desc")
          .first();

        if (!latestMessage) return null;

        // Get unread count
        const unreadMessages = await ctx.db
          .query("messages")
          .withIndex("by_contact_unread", (q) =>
            q.eq("contactId", contact._id).eq("isRead", false)
          )
          .filter((q) => q.eq(q.field("isOutgoing"), false))
          .collect();

        return {
          contact: {
            _id: contact._id,
            fullName: getFullName(contact.firstName, contact.lastName),
            phone: contact.phone,
            email: contact.email,
            preferredMessageChannel: contact.preferredMessageChannel,
            facebookPsid: contact.facebookPsid,
            instagramScopedId: contact.instagramScopedId,
          },
          latestMessage,
          unreadCount: unreadMessages.length,
        };
      })
    );

    // Filter out contacts without messages and sort by latest message
    return conversations
      .filter((c): c is NonNullable<typeof c> => c !== null)
      .sort((a, b) => b.latestMessage.createdAt - a.latestMessage.createdAt);
  },
});

/**
 * Get total unread message count
 */
export const getUnreadCount = query({
  args: {},
  handler: async (ctx) => {
    const unreadMessages = await ctx.db
      .query("messages")
      .withIndex("by_unread", (q) => q.eq("isRead", false))
      .filter((q) => q.eq(q.field("isOutgoing"), false))
      .collect();

    return unreadMessages.length;
  },
});

/**
 * Get unread count for a specific contact
 */
export const getUnreadCountByContact = query({
  args: { contactId: v.id("contacts") },
  handler: async (ctx, args) => {
    const unreadMessages = await ctx.db
      .query("messages")
      .withIndex("by_contact_unread", (q) =>
        q.eq("contactId", args.contactId).eq("isRead", false)
      )
      .filter((q) => q.eq(q.field("isOutgoing"), false))
      .collect();

    return unreadMessages.length;
  },
});

/**
 * Get messages by channel
 */
export const getByChannel = query({
  args: { channel: messageChannel },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_channel", (q) => q.eq("channel", args.channel))
      .order("desc")
      .take(100);

    // Enrich with contact data
    const enriched = await Promise.all(
      messages.map(async (msg) => {
        const contact = await ctx.db.get(msg.contactId);
        return {
          ...msg,
          contact: contact
            ? {
                _id: contact._id,
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
 * Send a message (outgoing)
 */
export const send = mutation({
  args: {
    contactId: v.id("contacts"),
    content: v.string(),
    channel: messageChannel,
    sentBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    // Get sender name
    let senderName = "System";
    if (args.sentBy) {
      const user = await ctx.db.get(args.sentBy);
      if (user) {
        senderName = getFullName(user.firstName, user.lastName);
      }
    }

    const messageId = await ctx.db.insert("messages", {
      content: args.content,
      contactId: args.contactId,
      channel: args.channel,
      isOutgoing: true,
      senderName,
      sentBy: args.sentBy,
      isRead: true, // Outgoing messages are always read
      createdAt: now(),
    });

    await logActivity(
      ctx,
      "message",
      messageId,
      "message_sent",
      { channel: args.channel, contactId: args.contactId },
      args.sentBy
    );

    return messageId;
  },
});

/**
 * Receive a message (incoming - typically from webhook)
 */
export const receive = mutation({
  args: {
    contactId: v.id("contacts"),
    content: v.string(),
    channel: messageChannel,
    senderName: v.string(),
    externalMessageId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const messageId = await ctx.db.insert("messages", {
      content: args.content,
      contactId: args.contactId,
      channel: args.channel,
      isOutgoing: false,
      senderName: args.senderName,
      externalMessageId: args.externalMessageId,
      isRead: false,
      createdAt: now(),
    });

    await logActivity(ctx, "message", messageId, "message_received", {
      channel: args.channel,
      contactId: args.contactId,
    });

    return messageId;
  },
});

/**
 * Mark a message as read
 */
export const markAsRead = mutation({
  args: { id: v.id("messages") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { isRead: true });
    return args.id;
  },
});

/**
 * Mark all messages from a contact as read
 */
export const markAllAsRead = mutation({
  args: { contactId: v.id("contacts") },
  handler: async (ctx, args) => {
    const unreadMessages = await ctx.db
      .query("messages")
      .withIndex("by_contact_unread", (q) =>
        q.eq("contactId", args.contactId).eq("isRead", false)
      )
      .collect();

    for (const message of unreadMessages) {
      await ctx.db.patch(message._id, { isRead: true });
    }

    return unreadMessages.length;
  },
});

/**
 * Create or find contact and receive message (for new conversations)
 */
export const receiveFromNewContact = mutation({
  args: {
    firstName: v.string(),
    lastName: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    channel: messageChannel,
    content: v.string(),
    externalMessageId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const timestamp = now();

    // Try to find existing contact by phone or email
    let contact = null;

    if (args.phone) {
      contact = await ctx.db
        .query("contacts")
        .withIndex("by_phone", (q) => q.eq("phone", args.phone))
        .first();
    }

    if (!contact && args.email) {
      contact = await ctx.db
        .query("contacts")
        .withIndex("by_email", (q) => q.eq("email", args.email))
        .first();
    }

    // Create new contact if not found
    if (!contact) {
      const contactId = await ctx.db.insert("contacts", {
        firstName: args.firstName,
        lastName: args.lastName ?? "",
        phone: args.phone,
        email: args.email,
        source: "other",
        preferredMessageChannel: args.channel,
        isDeleted: false,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      contact = await ctx.db.get(contactId);
    }

    if (!contact) {
      throw new Error("Failed to create or find contact");
    }

    // Create the message
    const senderName = getFullName(
      args.firstName,
      args.lastName ?? ""
    );

    const messageId = await ctx.db.insert("messages", {
      content: args.content,
      contactId: contact._id,
      channel: args.channel,
      isOutgoing: false,
      senderName,
      externalMessageId: args.externalMessageId,
      isRead: false,
      createdAt: timestamp,
    });

    return {
      contactId: contact._id,
      messageId,
    };
  },
});

// ============================================
// META (FACEBOOK/INSTAGRAM) MESSAGING
// ============================================

/**
 * Receive a message from Meta platforms (Facebook Messenger or Instagram DM)
 * Called by the webhook handler when a new message arrives
 */
export const receiveFromMeta = mutation({
  args: {
    channel: v.union(v.literal("facebook"), v.literal("instagram")),
    platformUserId: v.string(), // PSID (Facebook) or IG-scoped ID
    firstName: v.string(),
    lastName: v.string(),
    content: v.string(),
    externalMessageId: v.optional(v.string()),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    const currentTime = now();

    // Calculate messaging window expiries
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
    const standardWindowExpiry = args.timestamp + TWENTY_FOUR_HOURS;
    const humanAgentWindowExpiry = args.timestamp + SEVEN_DAYS;

    // Try to find existing contact by platform ID
    let contact = null;

    if (args.channel === "facebook") {
      contact = await ctx.db
        .query("contacts")
        .withIndex("by_facebook_psid", (q) =>
          q.eq("facebookPsid", args.platformUserId)
        )
        .first();
    } else {
      contact = await ctx.db
        .query("contacts")
        .withIndex("by_instagram_id", (q) =>
          q.eq("instagramScopedId", args.platformUserId)
        )
        .first();
    }

    // Create new contact if not found
    if (!contact) {
      const contactData: {
        firstName: string;
        lastName: string;
        source: "facebook" | "other";
        preferredMessageChannel: "facebook" | "instagram";
        facebookPsid?: string;
        instagramScopedId?: string;
        isDeleted: boolean;
        createdAt: number;
        updatedAt: number;
      } = {
        firstName: args.firstName,
        lastName: args.lastName,
        source: args.channel === "facebook" ? "facebook" : "other",
        preferredMessageChannel: args.channel,
        isDeleted: false,
        createdAt: currentTime,
        updatedAt: currentTime,
      };

      if (args.channel === "facebook") {
        contactData.facebookPsid = args.platformUserId;
      } else {
        contactData.instagramScopedId = args.platformUserId;
      }

      const contactId = await ctx.db.insert("contacts", contactData);
      contact = await ctx.db.get(contactId);

      await logActivity(ctx, "contact", contactId, "created", {
        source: `${args.channel}_message`,
        firstName: args.firstName,
        lastName: args.lastName,
      });
    } else {
      // Update platform ID if not set (contact was created through other means)
      if (args.channel === "facebook" && !contact.facebookPsid) {
        await ctx.db.patch(contact._id, {
          facebookPsid: args.platformUserId,
          updatedAt: currentTime,
        });
      } else if (args.channel === "instagram" && !contact.instagramScopedId) {
        await ctx.db.patch(contact._id, {
          instagramScopedId: args.platformUserId,
          updatedAt: currentTime,
        });
      }
    }

    if (!contact) {
      throw new Error("Failed to create or find contact");
    }

    // Create the message
    const senderName = getFullName(args.firstName, args.lastName);

    const messageId = await ctx.db.insert("messages", {
      content: args.content,
      contactId: contact._id,
      channel: args.channel,
      isOutgoing: false,
      senderName,
      externalMessageId: args.externalMessageId,
      isRead: false,
      createdAt: args.timestamp,
    });

    // Update or create messaging window record
    const existingWindow = await ctx.db
      .query("messagingWindows")
      .withIndex("by_platform_user", (q) =>
        q.eq("channel", args.channel).eq("platformUserId", args.platformUserId)
      )
      .first();

    if (existingWindow) {
      // Update existing window - customer messaged again, reset the windows
      await ctx.db.patch(existingWindow._id, {
        lastCustomerMessageAt: args.timestamp,
        standardWindowExpiresAt: standardWindowExpiry,
        humanAgentWindowExpiresAt: humanAgentWindowExpiry,
        updatedAt: currentTime,
      });
    } else {
      // Create new window record
      await ctx.db.insert("messagingWindows", {
        contactId: contact._id,
        channel: args.channel,
        platformUserId: args.platformUserId,
        lastCustomerMessageAt: args.timestamp,
        standardWindowExpiresAt: standardWindowExpiry,
        humanAgentWindowExpiresAt: humanAgentWindowExpiry,
        createdAt: currentTime,
        updatedAt: currentTime,
      });
    }

    await logActivity(ctx, "message", messageId, "message_received", {
      channel: args.channel,
      contactId: contact._id,
      platformUserId: args.platformUserId,
    });

    return {
      contactId: contact._id,
      messageId,
    };
  },
});

/**
 * Get messaging window status for a contact
 * Used by UI to show when the window is expiring
 */
export const getMessagingWindowStatus = query({
  args: {
    contactId: v.id("contacts"),
    channel: v.union(v.literal("facebook"), v.literal("instagram")),
  },
  handler: async (ctx, args) => {
    const contact = await ctx.db.get(args.contactId);
    if (!contact) return null;

    const platformUserId =
      args.channel === "facebook"
        ? contact.facebookPsid
        : contact.instagramScopedId;

    if (!platformUserId) {
      return {
        hasWindow: false,
        canSendAny: false,
        canSendHumanAgent: false,
        windowType: "none" as const,
        message: "No messaging connection established",
      };
    }

    const window = await ctx.db
      .query("messagingWindows")
      .withIndex("by_platform_user", (q) =>
        q.eq("channel", args.channel).eq("platformUserId", platformUserId)
      )
      .first();

    if (!window) {
      return {
        hasWindow: false,
        canSendAny: false,
        canSendHumanAgent: false,
        windowType: "none" as const,
        message: "Customer has not messaged yet",
      };
    }

    const now = Date.now();

    if (now < window.standardWindowExpiresAt) {
      return {
        hasWindow: true,
        canSendAny: true,
        canSendHumanAgent: true,
        windowType: "standard" as const,
        expiresAt: window.standardWindowExpiresAt,
        timeRemaining: window.standardWindowExpiresAt - now,
        message: "Full messaging available",
      };
    }

    if (now < window.humanAgentWindowExpiresAt) {
      return {
        hasWindow: true,
        canSendAny: false,
        canSendHumanAgent: true,
        windowType: "human_agent" as const,
        expiresAt: window.humanAgentWindowExpiresAt,
        timeRemaining: window.humanAgentWindowExpiresAt - now,
        message: "Human replies only (no bots/promo)",
      };
    }

    return {
      hasWindow: true,
      canSendAny: false,
      canSendHumanAgent: false,
      windowType: "expired" as const,
      message: "Window expired - message tags only",
    };
  },
});
