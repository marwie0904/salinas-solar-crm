/**
 * Cron Jobs Configuration
 *
 * Scheduled tasks that run automatically at specified intervals.
 */

import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// ============================================
// MESSAGE QUEUE PROCESSING
// Process queued emails and SMS with rate limiting
// ============================================

/**
 * Process email queue every minute
 * Rate limited to 10 emails per minute
 */
crons.interval(
  "process-email-queue",
  { seconds: 60 },
  internal.messageQueue.processEmailQueue
);

/**
 * Process SMS queue every minute
 * Rate limited to 60 SMS per minute (conservative, API allows 120)
 */
crons.interval(
  "process-sms-queue",
  { seconds: 60 },
  internal.messageQueue.processSmsQueue
);

/**
 * Clean up old queue items weekly
 * Removes completed/failed items older than 7 days
 */
crons.weekly(
  "cleanup-message-queue",
  { dayOfWeek: "sunday", hourUTC: 2, minuteUTC: 0 },
  internal.messageQueue.weeklyCleanup
);

// ============================================
// APPOINTMENT & NOTIFICATION CRONS
// ============================================

/**
 * Send daily appointment reminders at 7:00 AM Philippine Time (PHT)
 *
 * PHT is UTC+8, so 7:00 AM PHT = 23:00 UTC (previous day)
 * This cron runs every day at 23:00 UTC which is 7:00 AM PHT
 */
crons.daily(
  "daily-appointment-reminders",
  { hourUTC: 23, minuteUTC: 0 }, // 7:00 AM PHT
  internal.autoSms.sendDailyAppointmentReminders
);

/**
 * Check for task due notifications every hour
 * This handles:
 * - Tasks due in 1 hour
 * - Tasks due tomorrow (sent at 7 AM PHT)
 * - Overdue tasks (sent once when overdue, then every 24 hours)
 */
crons.hourly(
  "task-due-notifications",
  { minuteUTC: 0 },
  internal.notifications.createTaskDueNotifications
);

/**
 * Send follow-up SMS on Wednesday at 9:00 AM Philippine Time (PHT)
 *
 * PHT is UTC+8, so 9:00 AM PHT = 1:00 AM UTC
 * This sends SMS to opportunities in:
 * - "did_not_book_call" stage (until booked for ocular visit)
 * - "follow_up" stage (until confirmed)
 *
 * Messages rotate through 25 different templates.
 */
crons.weekly(
  "follow-up-sms-wednesday",
  { dayOfWeek: "wednesday", hourUTC: 1, minuteUTC: 0 }, // 9:00 AM PHT
  internal.autoSms.sendScheduledFollowUpSms
);

/**
 * Send follow-up SMS on Thursday at 9:00 AM Philippine Time (PHT)
 *
 * This is the second weekly send (twice a week = Monday + Thursday)
 */
crons.weekly(
  "follow-up-sms-thursday",
  { dayOfWeek: "thursday", hourUTC: 1, minuteUTC: 0 }, // 9:00 AM PHT
  internal.autoSms.sendScheduledFollowUpSms
);

export default crons;
