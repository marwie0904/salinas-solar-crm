/**
 * Cron Jobs Configuration
 *
 * Scheduled tasks that run automatically at specified intervals.
 */

import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

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

export default crons;
