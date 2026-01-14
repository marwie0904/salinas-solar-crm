/**
 * Message Queue System
 *
 * Rate-limited queue for sending emails and SMS messages.
 *
 * Rate Limits:
 * - Email (Resend): 10 per minute (6 seconds between each)
 * - SMS (Semaphore): 60 per minute (1 second between each)
 *
 * Retry Strategy (Exponential Backoff):
 * - Retry 1: 30 seconds
 * - Retry 2: 1 minute
 * - Retry 3: 2 minutes
 * - Retry 4: 5 minutes
 * - Retry 5: 10 minutes
 * - Retry 6: 30 minutes
 * - Retry 7: 1 hour
 * - Retry 8: 2 hours
 * - Retry 9: 4 hours
 * - Retry 10: 8 hours (final attempt)
 */

import { v } from "convex/values";
import {
  mutation,
  internalMutation,
  internalAction,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// ============================================
// CONSTANTS
// ============================================

// Rate limits (messages per minute)
const EMAIL_RATE_LIMIT = 10; // 10 emails per minute
const SMS_RATE_LIMIT = 60; // 60 SMS per minute (conservative, API allows 120)

// Delay between messages (in milliseconds)
const EMAIL_DELAY_MS = 60000 / EMAIL_RATE_LIMIT; // 6 seconds
const SMS_DELAY_MS = 60000 / SMS_RATE_LIMIT; // 1 second

// Retry configuration
const MAX_RETRIES = 10;
const RETRY_DELAYS_MS = [
  30 * 1000, // 30 seconds
  60 * 1000, // 1 minute
  2 * 60 * 1000, // 2 minutes
  5 * 60 * 1000, // 5 minutes
  10 * 60 * 1000, // 10 minutes
  30 * 60 * 1000, // 30 minutes
  60 * 60 * 1000, // 1 hour
  2 * 60 * 60 * 1000, // 2 hours
  4 * 60 * 60 * 1000, // 4 hours
  8 * 60 * 60 * 1000, // 8 hours
];

// Batch size for processing
const BATCH_SIZE = 10;

// ============================================
// TYPES
// ============================================

export type MessageType = "email" | "sms";
export type QueueStatus = "pending" | "processing" | "completed" | "failed";

export interface QueueEmailPayload {
  actionName: string;
  args: Record<string, unknown>;
}

export interface QueueSmsPayload {
  actionName: string;
  args: Record<string, unknown>;
}

// ============================================
// QUEUE MANAGEMENT MUTATIONS
// ============================================

/**
 * Add an email to the queue
 */
export const queueEmail = mutation({
  args: {
    actionName: v.string(),
    payload: v.string(), // JSON stringified payload
    priority: v.optional(v.number()),
    scheduledFor: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const queueId = await ctx.db.insert("messageQueue", {
      type: "email",
      status: "pending",
      priority: args.priority ?? 5,
      payload: args.payload,
      actionName: args.actionName,
      retryCount: 0,
      maxRetries: MAX_RETRIES,
      scheduledFor: args.scheduledFor ?? now,
      createdAt: now,
    });

    console.log(`[MessageQueue] Email queued: ${queueId} (${args.actionName})`);
    return queueId;
  },
});

/**
 * Add an SMS to the queue
 */
export const queueSms = mutation({
  args: {
    actionName: v.string(),
    payload: v.string(), // JSON stringified payload
    priority: v.optional(v.number()),
    scheduledFor: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const queueId = await ctx.db.insert("messageQueue", {
      type: "sms",
      status: "pending",
      priority: args.priority ?? 5,
      payload: args.payload,
      actionName: args.actionName,
      retryCount: 0,
      maxRetries: MAX_RETRIES,
      scheduledFor: args.scheduledFor ?? now,
      createdAt: now,
    });

    console.log(`[MessageQueue] SMS queued: ${queueId} (${args.actionName})`);
    return queueId;
  },
});

/**
 * Internal mutation to add email to queue (for use from actions)
 */
export const internalQueueEmail = internalMutation({
  args: {
    actionName: v.string(),
    payload: v.string(),
    priority: v.optional(v.number()),
    scheduledFor: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const queueId = await ctx.db.insert("messageQueue", {
      type: "email",
      status: "pending",
      priority: args.priority ?? 5,
      payload: args.payload,
      actionName: args.actionName,
      retryCount: 0,
      maxRetries: MAX_RETRIES,
      scheduledFor: args.scheduledFor ?? now,
      createdAt: now,
    });

    console.log(`[MessageQueue] Email queued (internal): ${queueId} (${args.actionName})`);
    return queueId;
  },
});

/**
 * Internal mutation to add SMS to queue (for use from actions)
 */
export const internalQueueSms = internalMutation({
  args: {
    actionName: v.string(),
    payload: v.string(),
    priority: v.optional(v.number()),
    scheduledFor: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const queueId = await ctx.db.insert("messageQueue", {
      type: "sms",
      status: "pending",
      priority: args.priority ?? 5,
      payload: args.payload,
      actionName: args.actionName,
      retryCount: 0,
      maxRetries: MAX_RETRIES,
      scheduledFor: args.scheduledFor ?? now,
      createdAt: now,
    });

    console.log(`[MessageQueue] SMS queued (internal): ${queueId} (${args.actionName})`);
    return queueId;
  },
});

/**
 * Mark a queue item as processing
 */
export const markAsProcessing = internalMutation({
  args: {
    queueId: v.id("messageQueue"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.queueId, {
      status: "processing",
      processedAt: Date.now(),
    });
  },
});

/**
 * Mark a queue item as completed
 */
export const markAsCompleted = internalMutation({
  args: {
    queueId: v.id("messageQueue"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.queueId, {
      status: "completed",
      completedAt: Date.now(),
    });
    console.log(`[MessageQueue] Completed: ${args.queueId}`);
  },
});

/**
 * Mark a queue item as failed and schedule retry if applicable
 */
export const markAsFailed = internalMutation({
  args: {
    queueId: v.id("messageQueue"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.queueId);
    if (!item) return;

    const newRetryCount = item.retryCount + 1;

    if (newRetryCount >= item.maxRetries) {
      // Max retries reached, mark as permanently failed
      await ctx.db.patch(args.queueId, {
        status: "failed",
        lastError: args.error,
        retryCount: newRetryCount,
      });
      console.error(
        `[MessageQueue] Permanently failed after ${newRetryCount} retries: ${args.queueId}`,
        args.error
      );
    } else {
      // Schedule retry with exponential backoff
      const retryDelay = RETRY_DELAYS_MS[newRetryCount - 1] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];
      const nextRetryAt = Date.now() + retryDelay;

      await ctx.db.patch(args.queueId, {
        status: "pending",
        lastError: args.error,
        retryCount: newRetryCount,
        nextRetryAt,
        scheduledFor: nextRetryAt,
      });

      const retryDelayMinutes = Math.round(retryDelay / 60000);
      console.log(
        `[MessageQueue] Retry ${newRetryCount}/${item.maxRetries} scheduled in ${retryDelayMinutes} min: ${args.queueId}`
      );
    }
  },
});

// ============================================
// QUEUE QUERIES
// ============================================

/**
 * Get pending items ready to be processed
 */
export const getPendingItems = internalMutation({
  args: {
    type: v.union(v.literal("email"), v.literal("sms")),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Get pending items that are scheduled for now or earlier
    const items = await ctx.db
      .query("messageQueue")
      .withIndex("by_type_status", (q) =>
        q.eq("type", args.type).eq("status", "pending")
      )
      .filter((q) => q.lte(q.field("scheduledFor"), now))
      .order("asc")
      .take(args.limit);

    // Sort by priority (lower number = higher priority) then by createdAt
    return items.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return a.createdAt - b.createdAt;
    });
  },
});

/**
 * Get queue statistics
 */
export const getQueueStats = query({
  args: {},
  handler: async (ctx) => {
    const emailPending = await ctx.db
      .query("messageQueue")
      .withIndex("by_type_status", (q) =>
        q.eq("type", "email").eq("status", "pending")
      )
      .collect();

    const smsPending = await ctx.db
      .query("messageQueue")
      .withIndex("by_type_status", (q) =>
        q.eq("type", "sms").eq("status", "pending")
      )
      .collect();

    const emailFailed = await ctx.db
      .query("messageQueue")
      .withIndex("by_type_status", (q) =>
        q.eq("type", "email").eq("status", "failed")
      )
      .collect();

    const smsFailed = await ctx.db
      .query("messageQueue")
      .withIndex("by_type_status", (q) =>
        q.eq("type", "sms").eq("status", "failed")
      )
      .collect();

    return {
      email: {
        pending: emailPending.length,
        failed: emailFailed.length,
      },
      sms: {
        pending: smsPending.length,
        failed: smsFailed.length,
      },
    };
  },
});

// ============================================
// QUEUE PROCESSING ACTIONS
// ============================================

/**
 * Process the email queue
 * Called by cron job every minute
 */
export const processEmailQueue = internalAction({
  args: {},
  handler: async (ctx): Promise<{ processed: number; succeeded: number; failed: number }> => {
    console.log("[MessageQueue] Processing email queue...");

    // Get pending emails
    const items = await ctx.runMutation(internal.messageQueue.getPendingItems, {
      type: "email",
      limit: EMAIL_RATE_LIMIT, // Max 10 per minute
    });

    if (items.length === 0) {
      console.log("[MessageQueue] No pending emails");
      return { processed: 0, succeeded: 0, failed: 0 };
    }

    console.log(`[MessageQueue] Processing ${items.length} emails...`);

    let succeeded = 0;
    let failed = 0;

    for (const item of items) {
      try {
        // Mark as processing
        await ctx.runMutation(internal.messageQueue.markAsProcessing, {
          queueId: item._id,
        });

        // Parse payload and execute the email action
        const payload = JSON.parse(item.payload);
        let result: { success: boolean; error?: string };

        // Route to the correct email action
        switch (item.actionName) {
          case "sendVerificationEmail":
            result = await ctx.runAction(internal.email.sendVerificationEmailInternal, payload);
            break;
          case "sendInvoiceEmail":
            result = await ctx.runAction(internal.email.sendInvoiceEmailInternal, payload);
            break;
          case "sendAgreementEmail":
            result = await ctx.runAction(internal.email.sendAgreementEmailInternal, payload);
            break;
          case "sendAppointmentEmail":
            result = await ctx.runAction(internal.email.sendAppointmentEmailInternal, payload);
            break;
          case "sendConsultantAssignmentEmail":
            result = await ctx.runAction(internal.email.sendConsultantAssignmentEmailInternal, payload);
            break;
          case "sendReceiptEmail":
            result = await ctx.runAction(internal.email.sendReceiptEmailInternal, payload);
            break;
          case "sendConsultantAppointmentEmail":
            result = await ctx.runAction(internal.email.sendConsultantAppointmentEmailInternal, payload);
            break;
          case "sendAgreementSignedPmEmail":
            result = await ctx.runAction(internal.email.sendAgreementSignedPmEmailInternal, payload);
            break;
          case "sendInstallationStageEmail":
            result = await ctx.runAction(internal.email.sendInstallationStageEmailInternal, payload);
            break;
          default:
            throw new Error(`Unknown email action: ${item.actionName}`);
        }

        if (result.success) {
          await ctx.runMutation(internal.messageQueue.markAsCompleted, {
            queueId: item._id,
          });
          succeeded++;
        } else {
          await ctx.runMutation(internal.messageQueue.markAsFailed, {
            queueId: item._id,
            error: result.error || "Unknown error",
          });
          failed++;
        }
      } catch (error) {
        await ctx.runMutation(internal.messageQueue.markAsFailed, {
          queueId: item._id,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        failed++;
      }

      // Rate limit: wait between emails
      if (items.indexOf(item) < items.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, EMAIL_DELAY_MS));
      }
    }

    console.log(
      `[MessageQueue] Email queue processed: ${succeeded} succeeded, ${failed} failed`
    );

    return { processed: items.length, succeeded, failed };
  },
});

/**
 * Process the SMS queue
 * Called by cron job every minute
 */
export const processSmsQueue = internalAction({
  args: {},
  handler: async (ctx): Promise<{ processed: number; succeeded: number; failed: number }> => {
    console.log("[MessageQueue] Processing SMS queue...");

    // Get pending SMS messages
    const items = await ctx.runMutation(internal.messageQueue.getPendingItems, {
      type: "sms",
      limit: SMS_RATE_LIMIT, // Max 60 per minute
    });

    if (items.length === 0) {
      console.log("[MessageQueue] No pending SMS messages");
      return { processed: 0, succeeded: 0, failed: 0 };
    }

    console.log(`[MessageQueue] Processing ${items.length} SMS messages...`);

    let succeeded = 0;
    let failed = 0;

    for (const item of items) {
      try {
        // Mark as processing
        await ctx.runMutation(internal.messageQueue.markAsProcessing, {
          queueId: item._id,
        });

        // Parse payload and execute the SMS action
        const payload = JSON.parse(item.payload);
        let result: { success: boolean; error?: string };

        // Route to the correct SMS action
        switch (item.actionName) {
          case "sendMessage":
            result = await ctx.runAction(internal.semaphore.sendMessageInternal, payload);
            break;
          case "sendBulkMessage":
            const bulkResult = await ctx.runAction(internal.semaphore.sendBulkMessageInternal, payload);
            result = { success: bulkResult.success, error: bulkResult.errors?.[0] };
            break;
          default:
            throw new Error(`Unknown SMS action: ${item.actionName}`);
        }

        if (result.success) {
          await ctx.runMutation(internal.messageQueue.markAsCompleted, {
            queueId: item._id,
          });
          succeeded++;
        } else {
          await ctx.runMutation(internal.messageQueue.markAsFailed, {
            queueId: item._id,
            error: result.error || "Unknown error",
          });
          failed++;
        }
      } catch (error) {
        await ctx.runMutation(internal.messageQueue.markAsFailed, {
          queueId: item._id,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        failed++;
      }

      // Rate limit: wait between SMS messages
      if (items.indexOf(item) < items.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, SMS_DELAY_MS));
      }
    }

    console.log(
      `[MessageQueue] SMS queue processed: ${succeeded} succeeded, ${failed} failed`
    );

    return { processed: items.length, succeeded, failed };
  },
});

/**
 * Process both queues (convenience function for cron)
 */
export const processQueues = internalAction({
  args: {},
  handler: async (ctx): Promise<{
    email: { processed: number; succeeded: number; failed: number };
    sms: { processed: number; succeeded: number; failed: number };
  }> => {
    // Process both queues in parallel
    const [emailResult, smsResult] = await Promise.all([
      ctx.runAction(internal.messageQueue.processEmailQueue, {}),
      ctx.runAction(internal.messageQueue.processSmsQueue, {}),
    ]);

    return {
      email: emailResult,
      sms: smsResult,
    };
  },
});

// ============================================
// CLEANUP
// ============================================

/**
 * Clean up old completed/failed queue items
 * Called periodically to prevent table bloat
 */
export const cleanupOldItems = internalMutation({
  args: {
    olderThanDays: v.number(),
  },
  handler: async (ctx, args) => {
    const cutoffTime = Date.now() - args.olderThanDays * 24 * 60 * 60 * 1000;

    // Get old completed items
    const completedItems = await ctx.db
      .query("messageQueue")
      .withIndex("by_status", (q) => q.eq("status", "completed"))
      .filter((q) => q.lt(q.field("createdAt"), cutoffTime))
      .take(100);

    // Get old failed items
    const failedItems = await ctx.db
      .query("messageQueue")
      .withIndex("by_status", (q) => q.eq("status", "failed"))
      .filter((q) => q.lt(q.field("createdAt"), cutoffTime))
      .take(100);

    // Delete old items
    let deleted = 0;
    for (const item of [...completedItems, ...failedItems]) {
      await ctx.db.delete(item._id);
      deleted++;
    }

    if (deleted > 0) {
      console.log(`[MessageQueue] Cleaned up ${deleted} old queue items`);
    }

    return { deleted };
  },
});

/**
 * Weekly cleanup action (called by cron)
 * Removes items older than 7 days
 */
export const weeklyCleanup = internalAction({
  args: {},
  handler: async (ctx): Promise<{ deleted: number }> => {
    return await ctx.runMutation(internal.messageQueue.cleanupOldItems, {
      olderThanDays: 7,
    });
  },
});
