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

export default crons;
