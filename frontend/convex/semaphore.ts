/**
 * Semaphore SMS Messaging Actions
 *
 * Convex actions that call the Semaphore API to send SMS messages.
 * Actions can make HTTP requests to external services.
 */

import { v } from "convex/values";
import { action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

const SEMAPHORE_API_BASE = "https://api.semaphore.co/api/v4";

// ============================================
// TYPES
// ============================================

interface SemaphoreSendResponse {
  message_id: number;
  user_id: number;
  user: string;
  account_id: number;
  account: string;
  recipient: string;
  message: string;
  sender_name: string;
  network: string;
  status: "Queued" | "Pending" | "Sent" | "Failed" | "Refunded";
  type: string;
  source: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Format Philippine phone number to proper format
 * Semaphore accepts: 09XXXXXXXXX or 639XXXXXXXXX
 */
function formatPhoneNumber(phone: string): string {
  // Remove all non-numeric characters
  let cleaned = phone.replace(/\D/g, "");

  // Handle different formats
  if (cleaned.startsWith("63")) {
    // Already in international format (639XXXXXXXXX)
    return cleaned;
  } else if (cleaned.startsWith("09")) {
    // Local format (09XXXXXXXXX) - convert to international
    return "63" + cleaned.substring(1);
  } else if (cleaned.startsWith("9") && cleaned.length === 10) {
    // Without leading 0 (9XXXXXXXXX)
    return "63" + cleaned;
  }

  // Return as-is if we can't parse it
  return cleaned;
}

/**
 * Validate Philippine phone number
 */
function isValidPhilippinePhone(phone: string): boolean {
  const formatted = formatPhoneNumber(phone);
  // Should be 12 digits starting with 639
  return /^639\d{9}$/.test(formatted);
}

// ============================================
// ACTIONS (Can make HTTP requests)
// ============================================

/**
 * Send an SMS message via Semaphore
 * This action calls the Semaphore API, then stores the message on success.
 */
export const sendMessage = action({
  args: {
    contactId: v.id("contacts"),
    phoneNumber: v.string(),
    content: v.string(),
    senderName: v.string(),
    sentBy: v.optional(v.id("users")),
    priority: v.optional(v.boolean()), // Use priority queue (2 credits)
  },
  handler: async (ctx, args): Promise<{ success: boolean; messageId?: string; error?: string }> => {
    // Get Semaphore API key from environment
    const apiKey = process.env.SEMAPHORE_API_KEY;
    const defaultSenderName = process.env.SEMAPHORE_SENDER_NAME || "SEMAPHORE";

    if (!apiKey) {
      return { success: false, error: "SEMAPHORE_API_KEY not configured" };
    }

    // Format and validate phone number
    const formattedPhone = formatPhoneNumber(args.phoneNumber);

    if (!isValidPhilippinePhone(formattedPhone)) {
      return {
        success: false,
        error: `Invalid Philippine phone number: ${args.phoneNumber}. Must be in format 09XXXXXXXXX or 639XXXXXXXXX`
      };
    }

    // Determine endpoint (regular or priority)
    const endpoint = args.priority
      ? `${SEMAPHORE_API_BASE}/priority`
      : `${SEMAPHORE_API_BASE}/messages`;

    // Build the request body
    const body = new URLSearchParams({
      apikey: apiKey,
      number: formattedPhone,
      message: args.content,
    });

    // Only add sender name if configured
    if (defaultSenderName) {
      body.append("sendername", defaultSenderName);
    }

    try {
      // Send to Semaphore API
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("[Semaphore API] Send failed:", data);
        // Handle validation errors (returned as object with field names)
        if (typeof data === "object" && !Array.isArray(data)) {
          const errorMessages = Object.entries(data)
            .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(", ") : msgs}`)
            .join("; ");
          return {
            success: false,
            error: errorMessages || "Failed to send SMS",
          };
        }
        return {
          success: false,
          error: data.message || "Failed to send SMS",
        };
      }

      // Semaphore returns an array of responses (one per recipient)
      const results = data as SemaphoreSendResponse[];

      if (!results || !Array.isArray(results) || results.length === 0) {
        console.error("[Semaphore API] Unexpected response format:", data);
        return {
          success: false,
          error: "Unexpected response from Semaphore API",
        };
      }

      const result = results[0];
      console.log("[Semaphore API] SMS sent successfully:", result.message_id);

      // Store the message in the database
      await ctx.runMutation(internal.semaphore.storeOutgoingMessage, {
        contactId: args.contactId,
        content: args.content,
        senderName: args.senderName,
        sentBy: args.sentBy,
        externalMessageId: result.message_id.toString(),
      });

      return {
        success: true,
        messageId: result.message_id.toString(),
      };
    } catch (error) {
      console.error("[Semaphore API] Network error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Network error",
      };
    }
  },
});

/**
 * Send a bulk SMS message to multiple recipients
 */
export const sendBulkMessage = action({
  args: {
    recipients: v.array(v.object({
      contactId: v.id("contacts"),
      phoneNumber: v.string(),
    })),
    content: v.string(),
    senderName: v.string(),
    sentBy: v.optional(v.id("users")),
    priority: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    sent: number;
    failed: number;
    errors?: string[]
  }> => {
    const apiKey = process.env.SEMAPHORE_API_KEY;
    const defaultSenderName = process.env.SEMAPHORE_SENDER_NAME || "SEMAPHORE";

    if (!apiKey) {
      return { success: false, sent: 0, failed: args.recipients.length, errors: ["SEMAPHORE_API_KEY not configured"] };
    }

    // Validate and format all phone numbers
    const validRecipients: Array<{ contactId: typeof args.recipients[0]["contactId"]; phone: string }> = [];
    const errors: string[] = [];

    for (const recipient of args.recipients) {
      const formattedPhone = formatPhoneNumber(recipient.phoneNumber);
      if (isValidPhilippinePhone(formattedPhone)) {
        validRecipients.push({ contactId: recipient.contactId, phone: formattedPhone });
      } else {
        errors.push(`Invalid phone: ${recipient.phoneNumber}`);
      }
    }

    if (validRecipients.length === 0) {
      return { success: false, sent: 0, failed: args.recipients.length, errors };
    }

    // Semaphore supports up to 1000 comma-separated numbers
    const phoneNumbers = validRecipients.map(r => r.phone).join(",");

    const endpoint = args.priority
      ? `${SEMAPHORE_API_BASE}/priority`
      : `${SEMAPHORE_API_BASE}/messages`;

    const body = new URLSearchParams({
      apikey: apiKey,
      number: phoneNumbers,
      message: args.content,
      sendername: defaultSenderName,
    });

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("[Semaphore API] Bulk send failed:", data);
        return {
          success: false,
          sent: 0,
          failed: args.recipients.length,
          errors: [data.message || "Failed to send bulk SMS"],
        };
      }

      const results = data as SemaphoreSendResponse[];

      // Store messages for each successful recipient
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const recipient = validRecipients[i];

        if (result && recipient) {
          await ctx.runMutation(internal.semaphore.storeOutgoingMessage, {
            contactId: recipient.contactId,
            content: args.content,
            senderName: args.senderName,
            sentBy: args.sentBy,
            externalMessageId: result.message_id.toString(),
          });
        }
      }

      return {
        success: true,
        sent: results.length,
        failed: args.recipients.length - results.length,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      console.error("[Semaphore API] Network error:", error);
      return {
        success: false,
        sent: 0,
        failed: args.recipients.length,
        errors: [error instanceof Error ? error.message : "Network error"],
      };
    }
  },
});

/**
 * Get Semaphore account info (credit balance, etc.)
 */
export const getAccountInfo = action({
  args: {},
  handler: async (): Promise<{
    success: boolean;
    creditBalance?: number;
    accountName?: string;
    error?: string
  }> => {
    const apiKey = process.env.SEMAPHORE_API_KEY;

    if (!apiKey) {
      return { success: false, error: "SEMAPHORE_API_KEY not configured" };
    }

    try {
      const response = await fetch(`${SEMAPHORE_API_BASE}/account?apikey=${apiKey}`, {
        method: "GET",
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || "Failed to get account info",
        };
      }

      return {
        success: true,
        creditBalance: data.credit_balance,
        accountName: data.account_name,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Network error",
      };
    }
  },
});

/**
 * Internal mutation to store outgoing SMS message after successful send
 */
export const storeOutgoingMessage = internalMutation({
  args: {
    contactId: v.id("contacts"),
    content: v.string(),
    senderName: v.string(),
    sentBy: v.optional(v.id("users")),
    externalMessageId: v.string(),
  },
  handler: async (ctx, args) => {
    const messageId = await ctx.db.insert("messages", {
      content: args.content,
      contactId: args.contactId,
      channel: "sms",
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
