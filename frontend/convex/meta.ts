/**
 * Meta (Facebook/Instagram) Messaging Actions
 *
 * Convex actions that call the Meta Graph API to send messages.
 * Actions can make HTTP requests to external services.
 */

import { v } from "convex/values";
import { action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

const GRAPH_API_VERSION = "v21.0";
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

// ============================================
// TYPES
// ============================================

interface SendMessageResponse {
  recipient_id: string;
  message_id: string;
}

interface MetaApiError {
  error: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id: string;
  };
}

// ============================================
// ACTIONS (Can make HTTP requests)
// ============================================

/**
 * Send a message via Meta API (Facebook or Instagram)
 * This action calls the Meta Graph API, then stores the message on success.
 */
export const sendMessage = action({
  args: {
    contactId: v.id("contacts"),
    channel: v.union(v.literal("facebook"), v.literal("instagram")),
    platformUserId: v.string(), // PSID or IG-scoped ID
    content: v.string(),
    senderName: v.string(),
    sentBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args): Promise<{ success: boolean; messageId?: string; error?: string }> => {
    // Get environment variables
    const pageAccessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
    const facebookPageId = process.env.FACEBOOK_PAGE_ID;
    const instagramAccountId = process.env.INSTAGRAM_ACCOUNT_ID;

    if (!pageAccessToken) {
      return { success: false, error: "FACEBOOK_PAGE_ACCESS_TOKEN not configured" };
    }

    // Determine the endpoint based on channel
    let endpoint: string;
    if (args.channel === "facebook") {
      if (!facebookPageId) {
        return { success: false, error: "FACEBOOK_PAGE_ID not configured" };
      }
      endpoint = `${GRAPH_API_BASE}/${facebookPageId}/messages`;
    } else {
      if (!instagramAccountId) {
        return { success: false, error: "INSTAGRAM_ACCOUNT_ID not configured" };
      }
      endpoint = `${GRAPH_API_BASE}/${instagramAccountId}/messages`;
    }

    // Build the request body
    const body = {
      recipient: { id: args.platformUserId },
      message: { text: args.content },
      messaging_type: "RESPONSE",
    };

    try {
      // Send to Meta API
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${pageAccessToken}`,
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorData = data as MetaApiError;
        console.error("[Meta API] Send failed:", errorData);
        return {
          success: false,
          error: errorData.error?.message || "Failed to send message",
        };
      }

      const successData = data as SendMessageResponse;
      console.log("[Meta API] Message sent successfully:", successData.message_id);

      // Store the message in the database
      await ctx.runMutation(internal.meta.storeOutgoingMessage, {
        contactId: args.contactId,
        channel: args.channel,
        content: args.content,
        senderName: args.senderName,
        sentBy: args.sentBy,
        externalMessageId: successData.message_id,
      });

      return {
        success: true,
        messageId: successData.message_id,
      };
    } catch (error) {
      console.error("[Meta API] Network error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Network error",
      };
    }
  },
});

/**
 * Internal mutation to store outgoing message after successful send
 */
export const storeOutgoingMessage = internalMutation({
  args: {
    contactId: v.id("contacts"),
    channel: v.union(v.literal("facebook"), v.literal("instagram")),
    content: v.string(),
    senderName: v.string(),
    sentBy: v.optional(v.id("users")),
    externalMessageId: v.string(),
  },
  handler: async (ctx, args) => {
    const messageId = await ctx.db.insert("messages", {
      content: args.content,
      contactId: args.contactId,
      channel: args.channel,
      isOutgoing: true,
      senderName: args.senderName,
      sentBy: args.sentBy,
      externalMessageId: args.externalMessageId,
      isRead: true,
      createdAt: Date.now(),
    });

    return messageId;
  },
});
