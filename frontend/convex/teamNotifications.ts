/**
 * Team Notifications - Internal Actions
 *
 * Internal actions that wrap email and SMS notifications for team members.
 * These are called from mutations via scheduler.runAfter().
 */

import { v } from "convex/values";
import { internalAction, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";

const RESEND_API_URL = "https://api.resend.com/emails";
const SEMAPHORE_API_BASE = "https://api.semaphore.co/api/v4";

// ============================================
// TEST MODE CONFIGURATION
// Set to true to forward ALL notifications to test recipients
// ============================================
const TEST_MODE = false;
const TEST_PHONE = "09765229475";
const TEST_EMAIL = "marwie0904@gmail.com";

// ============================================
// EMAIL TEMPLATES
// ============================================

function generateConsultantAssignmentEmailHtml(
  consultantFirstName: string,
  opportunityName: string,
  opportunityUrl: string
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Opportunity Assignment - Salinas Solar</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #ff5603 0%, #e64d00 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Salinas Solar</h1>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 12px 12px;">
    <p style="font-size: 16px; margin-bottom: 20px;">Hi ${consultantFirstName},</p>

    <p style="font-size: 16px; margin-bottom: 24px;">You have been assigned to <strong>${opportunityName}</strong>. Please check as soon as possible.</p>

    <div style="text-align: center; margin: 32px 0;">
      <a href="${opportunityUrl}" style="display: inline-block; background: #ff5603; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">View Opportunity</a>
    </div>

    <p style="font-size: 14px; color: #666; margin-top: 32px; padding-top: 20px; border-top: 1px solid #e5e5e5;">
      If you have any questions, please contact your supervisor.
    </p>

    <p style="font-size: 14px; color: #666;">
      Best regards,<br>
      <strong>Salinas Solar Team</strong>
    </p>
  </div>

  <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
    <p>Salinas Solar Philippines</p>
  </div>
</body>
</html>
  `.trim();
}

function generateAppointmentEmailHtml(
  firstName: string,
  assignedUserName: string,
  date: string,
  time: string
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Appointment Confirmation - Salinas Solar</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #ff5603 0%, #e64d00 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Salinas Solar</h1>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 12px 12px;">
    <p style="font-size: 16px; margin-bottom: 20px;">Hi ${firstName},</p>

    <p style="font-size: 16px; margin-bottom: 24px;">You have an appointment booked with <strong>${assignedUserName}</strong> at:</p>

    <div style="background: #f8f8f8; padding: 20px; border-radius: 8px; margin: 24px 0;">
      <p style="margin: 0; font-size: 18px; font-weight: 600; color: #ff5603;">${date}</p>
      <p style="margin: 8px 0 0 0; font-size: 16px; color: #666;">${time}</p>
    </div>

    <p style="font-size: 16px; margin-bottom: 24px;">If this is the wrong date and time, please contact us again to reschedule.</p>

    <p style="font-size: 14px; color: #666; margin-top: 32px; padding-top: 20px; border-top: 1px solid #e5e5e5;">
      We look forward to speaking with you!
    </p>

    <p style="font-size: 14px; color: #666;">
      Best regards,<br>
      <strong>Salinas Solar Team</strong>
    </p>
  </div>

  <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
    <p>Salinas Solar Philippines</p>
  </div>
</body>
</html>
  `.trim();
}

function generateConsultantAppointmentEmailHtml(
  consultantFirstName: string,
  contactName: string,
  appointmentType: string,
  date: string,
  time: string,
  location: string,
  appointmentUrl: string
): string {
  const typeLabel = appointmentType === "discovery_call" ? "Discovery Call" : "Field Inspection";
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Appointment Scheduled - Salinas Solar</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #ff5603 0%, #e64d00 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Salinas Solar</h1>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 12px 12px;">
    <p style="font-size: 16px; margin-bottom: 20px;">Hi ${consultantFirstName},</p>

    <p style="font-size: 16px; margin-bottom: 24px;">A new <strong>${typeLabel}</strong> has been scheduled for you:</p>

    <div style="background: #f8f8f8; padding: 20px; border-radius: 8px; margin: 24px 0;">
      <p style="margin: 0 0 8px 0;"><strong>Client:</strong> ${contactName}</p>
      <p style="margin: 0 0 8px 0;"><strong>Date:</strong> ${date}</p>
      <p style="margin: 0 0 8px 0;"><strong>Time:</strong> ${time}</p>
      <p style="margin: 0;"><strong>Location:</strong> ${location}</p>
    </div>

    <div style="text-align: center; margin: 32px 0;">
      <a href="${appointmentUrl}" style="display: inline-block; background: #ff5603; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">View Appointment</a>
    </div>

    <p style="font-size: 14px; color: #666; margin-top: 32px; padding-top: 20px; border-top: 1px solid #e5e5e5;">
      Please review the appointment details and prepare accordingly.
    </p>

    <p style="font-size: 14px; color: #666;">
      Best regards,<br>
      <strong>Salinas Solar Team</strong>
    </p>
  </div>

  <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
    <p>Salinas Solar Philippines</p>
  </div>
</body>
</html>
  `.trim();
}

function generateAgreementSignedPmEmailHtml(
  pmFirstName: string,
  clientName: string,
  opportunityName: string,
  opportunityUrl: string
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Agreement Signed - Salinas Solar</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #228B22 0%, #1e7b1e 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Salinas Solar</h1>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 12px 12px;">
    <p style="font-size: 16px; margin-bottom: 20px;">Hi ${pmFirstName},</p>

    <p style="font-size: 16px; margin-bottom: 24px;">Great news! An agreement has been signed:</p>

    <div style="background: #f0fff0; border: 1px solid #228B22; border-radius: 8px; padding: 20px; margin: 24px 0; text-align: center;">
      <p style="margin: 0; font-size: 18px; font-weight: 600; color: #228B22;">AGREEMENT SIGNED</p>
      <p style="margin: 8px 0 0 0; font-size: 16px; color: #333;"><strong>${clientName}</strong></p>
      <p style="margin: 4px 0 0 0; font-size: 14px; color: #666;">${opportunityName}</p>
    </div>

    <p style="font-size: 16px; margin-bottom: 24px;">Please review the project details and begin planning for installation.</p>

    <div style="text-align: center; margin: 32px 0;">
      <a href="${opportunityUrl}" style="display: inline-block; background: #228B22; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">View Project</a>
    </div>

    <p style="font-size: 14px; color: #666; margin-top: 32px; padding-top: 20px; border-top: 1px solid #e5e5e5;">
      Best regards,<br>
      <strong>Salinas Solar Team</strong>
    </p>
  </div>

  <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
    <p>Salinas Solar Philippines</p>
  </div>
</body>
</html>
  `.trim();
}

function generateClosureVerificationEmailHtml(
  opportunityName: string,
  opportunityUrl: string
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Project Closure Verification - Salinas Solar</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #228B22 0%, #1e7b1e 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Salinas Solar</h1>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 12px 12px;">
    <div style="background: #f0fff0; border: 1px solid #228B22; border-radius: 8px; padding: 24px; margin: 0 0 24px 0; text-align: center;">
      <p style="margin: 0 0 12px 0; font-size: 20px; font-weight: 600; color: #333;">${opportunityName}</p>
      <p style="margin: 0; font-size: 16px; color: #228B22; font-weight: 500;">has been closed</p>
    </div>

    <p style="font-size: 16px; margin-bottom: 24px; text-align: center;">Please verify and move to closed stage.</p>

    <div style="text-align: center; margin: 32px 0;">
      <a href="${opportunityUrl}" style="display: inline-block; background: #228B22; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">View Opportunity</a>
    </div>

    <p style="font-size: 14px; color: #666; margin-top: 32px; padding-top: 20px; border-top: 1px solid #e5e5e5;">
      Best regards,<br>
      <strong>Salinas Solar Team</strong>
    </p>
  </div>

  <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
    <p>Salinas Solar Philippines</p>
  </div>
</body>
</html>
  `.trim();
}

function generateInstallationStageEmailHtml(
  opportunityName: string,
  opportunityUrl: string
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Project Ready for Installation - Salinas Solar</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #ff5603 0%, #e64d00 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Salinas Solar</h1>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 12px 12px;">
    <div style="background: #fff8f0; border: 1px solid #ff5603; border-radius: 8px; padding: 24px; margin: 0 0 24px 0; text-align: center;">
      <p style="margin: 0 0 12px 0; font-size: 20px; font-weight: 600; color: #333;">${opportunityName}</p>
      <p style="margin: 0; font-size: 16px; color: #ff5603; font-weight: 500;">Is ready for installation.</p>
    </div>

    <div style="text-align: center; margin: 32px 0;">
      <a href="${opportunityUrl}" style="display: inline-block; background: #ff5603; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">Open Opportunity</a>
    </div>

    <p style="font-size: 14px; color: #666; margin-top: 32px; padding-top: 20px; border-top: 1px solid #e5e5e5;">
      Best regards,<br>
      <strong>Salinas Solar Team</strong>
    </p>
  </div>

  <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
    <p>Salinas Solar Philippines</p>
  </div>
</body>
</html>
  `.trim();
}

function generateClientAgreementConfirmationEmailHtml(
  firstName: string
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Signed Agreement - Salinas Solar</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #228B22 0%, #1e7b1e 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Salinas Solar</h1>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 12px 12px;">
    <p style="font-size: 16px; margin-bottom: 20px;">Hi ${firstName},</p>

    <p style="font-size: 16px; margin-bottom: 24px;">Thank you for trusting Salinas Solar. Please see the attached file for your copy of the signed agreement.</p>

    <div style="background: #f0fff0; border: 1px solid #228B22; border-radius: 8px; padding: 20px; margin: 24px 0; text-align: center;">
      <p style="margin: 0; font-size: 16px; color: #228B22; font-weight: 500;">Our team has been notified and doing all the necessary preparations for your Future Solar Savings!</p>
    </div>

    <p style="font-size: 14px; color: #666; margin-top: 32px; padding-top: 20px; border-top: 1px solid #e5e5e5;">
      If you have any questions, please don't hesitate to contact us.
    </p>

    <p style="font-size: 14px; color: #666;">
      Best regards,<br>
      <strong>Salinas Solar Team</strong>
    </p>
  </div>

  <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
    <p>Salinas Solar Philippines</p>
  </div>
</body>
</html>
  `.trim();
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Format Philippine phone number
 */
function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");

  if (cleaned.startsWith("63")) {
    return cleaned;
  } else if (cleaned.startsWith("09")) {
    return "63" + cleaned.substring(1);
  } else if (cleaned.startsWith("9") && cleaned.length === 10) {
    return "63" + cleaned;
  }

  return cleaned;
}

/**
 * Send email via Resend API
 */
async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<{ success: boolean; emailId?: string; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "Salinas Solar <noreply@salinassolar.com>";

  if (!apiKey) {
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  if (!to) {
    return { success: false, error: "No email address provided" };
  }

  // TEST MODE: Forward to test email
  const actualTo = TEST_MODE ? TEST_EMAIL : to;
  const actualSubject = TEST_MODE ? `[TEST - Original: ${to}] ${subject}` : subject;

  const body = {
    from: fromEmail,
    to: [actualTo],
    subject: actualSubject,
    html,
  };

  try {
    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[Team Notifications] Email failed:", data);
      return { success: false, error: data.message || "Failed to send email" };
    }

    return { success: true, emailId: data.id };
  } catch (error) {
    console.error("[Team Notifications] Email error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Network error" };
  }
}

/**
 * Send SMS via Semaphore API
 */
async function sendSms(
  phoneNumber: string,
  message: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const apiKey = process.env.SEMAPHORE_API_KEY;
  const senderName = process.env.SEMAPHORE_SENDER_NAME || "SEMAPHORE";

  if (!apiKey) {
    return { success: false, error: "SEMAPHORE_API_KEY not configured" };
  }

  // TEST MODE: Forward to test phone
  const actualPhone = TEST_MODE ? TEST_PHONE : phoneNumber;
  const actualMessage = TEST_MODE ? `[TEST - Original: ${phoneNumber}]\n\n${message}` : message;

  const formattedPhone = formatPhoneNumber(actualPhone);

  if (!/^639\d{9}$/.test(formattedPhone)) {
    return { success: false, error: `Invalid Philippine phone number: ${actualPhone}` };
  }

  const body = new URLSearchParams({
    apikey: apiKey,
    number: formattedPhone,
    message: actualMessage,
    sendername: senderName,
  });

  try {
    const response = await fetch(`${SEMAPHORE_API_BASE}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[Team Notifications] SMS failed:", data);
      return { success: false, error: data.message || "Failed to send SMS" };
    }

    const results = data as Array<{ message_id: number }>;
    if (results && results.length > 0) {
      return { success: true, messageId: results[0].message_id.toString() };
    }

    return { success: false, error: "Unexpected response" };
  } catch (error) {
    console.error("[Team Notifications] SMS error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Network error" };
  }
}

/**
 * Send email with attachment via Resend API
 */
async function sendEmailWithAttachment(
  to: string,
  subject: string,
  html: string,
  attachmentFilename: string,
  attachmentBase64: string,
  fromEmail?: string
): Promise<{ success: boolean; emailId?: string; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = fromEmail || process.env.RESEND_FROM_EMAIL || "Salinas Solar <noreply@salinassolar.com>";

  if (!apiKey) {
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  if (!to) {
    return { success: false, error: "No email address provided" };
  }

  // TEST MODE: Forward to test email
  const actualTo = TEST_MODE ? TEST_EMAIL : to;
  const actualSubject = TEST_MODE ? `[TEST - Original: ${to}] ${subject}` : subject;

  const body = {
    from,
    to: [actualTo],
    subject: actualSubject,
    html,
    attachments: [
      {
        filename: attachmentFilename,
        content: attachmentBase64,
      },
    ],
  };

  try {
    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[Team Notifications] Email with attachment failed:", data);
      return { success: false, error: data.message || "Failed to send email" };
    }

    return { success: true, emailId: data.id };
  } catch (error) {
    console.error("[Team Notifications] Email with attachment error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Network error" };
  }
}

// ============================================
// INTERNAL QUERIES
// ============================================

/**
 * Get all active project managers
 */
export const getProjectManagers = internalQuery({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "project_manager"))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    return users;
  },
});

/**
 * Get operations team members (technicians and project managers)
 */
export const getOperationsTeam = internalQuery({
  args: {},
  handler: async (ctx) => {
    const allUsers = await ctx.db
      .query("users")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    // Filter for operations roles: technician, project_manager, admin
    return allUsers.filter(
      (user) =>
        user.role === "technician" ||
        user.role === "project_manager" ||
        user.role === "admin"
    );
  },
});

/**
 * Get finance team members
 */
export const getFinanceTeam = internalQuery({
  args: {},
  handler: async (ctx) => {
    const allUsers = await ctx.db
      .query("users")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    // Filter for finance role
    return allUsers.filter((user) => user.role === "finance_manager");
  },
});

// ============================================
// CONSULTANT ASSIGNMENT NOTIFICATIONS
// ============================================

/**
 * Send consultant assignment email (internal action)
 */
export const sendConsultantAssignmentEmailInternal = internalAction({
  args: {
    to: v.string(),
    consultantFirstName: v.string(),
    opportunityName: v.string(),
    opportunityUrl: v.string(),
  },
  handler: async (_, args): Promise<{ success: boolean; emailId?: string; error?: string }> => {
    const html = generateConsultantAssignmentEmailHtml(
      args.consultantFirstName,
      args.opportunityName,
      args.opportunityUrl
    );

    const result = await sendEmail(
      args.to,
      `New Assignment: ${args.opportunityName} - Salinas Solar`,
      html
    );

    console.log("[Team Notifications] Consultant assignment email:", result);
    return result;
  },
});

// ============================================
// CONSULTANT APPOINTMENT NOTIFICATIONS
// ============================================

/**
 * Send consultant appointment notification (email via internal action)
 */
export const sendConsultantAppointmentNotification = internalAction({
  args: {
    consultantEmail: v.string(),
    consultantPhone: v.optional(v.string()),
    consultantFirstName: v.string(),
    contactName: v.string(),
    appointmentType: v.string(),
    date: v.string(),
    time: v.string(),
    location: v.string(),
    appointmentUrl: v.string(),
  },
  handler: async (_, args): Promise<{ email?: { success: boolean; error?: string } }> => {
    const results: { email?: { success: boolean; error?: string } } = {};

    // Format the date nicely
    const dateObj = new Date(args.date);
    const formattedDate = dateObj.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Send email to consultant
    if (args.consultantEmail) {
      const html = generateConsultantAppointmentEmailHtml(
        args.consultantFirstName,
        args.contactName,
        args.appointmentType,
        formattedDate,
        args.time,
        args.location,
        args.appointmentUrl
      );

      const typeLabel = args.appointmentType === "discovery_call" ? "Discovery Call" : "Field Inspection";
      results.email = await sendEmail(
        args.consultantEmail,
        `New ${typeLabel} Scheduled - ${args.contactName}`,
        html
      );
    }

    console.log("[Team Notifications] Consultant appointment notification:", results);
    return results;
  },
});

// ============================================
// CLIENT APPOINTMENT NOTIFICATIONS
// ============================================

/**
 * Send appointment email to client
 */
export const sendClientAppointmentEmail = internalAction({
  args: {
    to: v.string(),
    firstName: v.string(),
    assignedUserName: v.string(),
    date: v.string(),
    time: v.string(),
  },
  handler: async (_, args): Promise<{ success: boolean; emailId?: string; error?: string }> => {
    // Format the date nicely
    const dateObj = new Date(args.date);
    const formattedDate = dateObj.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const html = generateAppointmentEmailHtml(
      args.firstName,
      args.assignedUserName,
      formattedDate,
      args.time
    );

    const result = await sendEmail(
      args.to,
      "Appointment Confirmation - Salinas Solar",
      html
    );

    console.log("[Team Notifications] Client appointment email:", result);
    return result;
  },
});

// ============================================
// AGREEMENT SIGNED NOTIFICATIONS (PROJECT MANAGER)
// ============================================

/**
 * Notify all project managers when an agreement is signed
 */
export const notifyProjectManagersAgreementSigned = internalAction({
  args: {
    clientName: v.string(),
    opportunityName: v.string(),
    opportunityId: v.string(),
  },
  handler: async (ctx, args): Promise<Array<{ userId: string; email?: { success: boolean }; sms?: { success: boolean } }>> => {
    // Get all project managers
    const projectManagers = await ctx.runQuery(
      internal.teamNotifications.getProjectManagers,
      {}
    );

    console.log(`[Team Notifications] Notifying ${projectManagers.length} project managers about signed agreement`);

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://crm.salinassolar.com";
    const opportunityUrl = `${baseUrl}/pipeline?opportunity=${args.opportunityId}`;

    const results: Array<{ userId: string; email?: { success: boolean }; sms?: { success: boolean } }> = [];

    for (const pm of projectManagers) {
      const result: { userId: string; email?: { success: boolean }; sms?: { success: boolean } } = {
        userId: pm._id,
      };

      // Send email
      if (pm.email) {
        const html = generateAgreementSignedPmEmailHtml(
          pm.firstName,
          args.clientName,
          args.opportunityName,
          opportunityUrl
        );

        result.email = await sendEmail(
          pm.email,
          `Agreement Signed: ${args.opportunityName} - Salinas Solar`,
          html
        );
      }

      // Send SMS
      if (pm.phone) {
        result.sms = await sendSms(
          pm.phone,
          `Hi ${pm.firstName},

Agreement signed by ${args.clientName} for ${args.opportunityName}.

Please check the CRM to review and proceed with project planning.

(automated sms, do not reply)`
        );
      }

      results.push(result);
    }

    console.log("[Team Notifications] PM notification results:", results);
    return results;
  },
});

// ============================================
// INSTALLATION STAGE NOTIFICATIONS (OPERATIONS & FINANCE TEAMS)
// ============================================

/**
 * Notify operations and finance teams when opportunity moves to installation stage
 */
export const notifyOperationsTeamInstallation = internalAction({
  args: {
    clientName: v.string(),
    opportunityName: v.string(),
    opportunityId: v.string(),
    location: v.string(),
  },
  handler: async (ctx, args): Promise<Array<{ userId: string; email?: { success: boolean }; sms?: { success: boolean } }>> => {
    // Get operations team members
    const operationsTeam = await ctx.runQuery(
      internal.teamNotifications.getOperationsTeam,
      {}
    );

    // Get finance team members
    const financeTeam = await ctx.runQuery(
      internal.teamNotifications.getFinanceTeam,
      {}
    );

    // Combine both teams for notification
    const allTeamMembers = [...operationsTeam, ...financeTeam];

    console.log(`[Team Notifications] Notifying ${operationsTeam.length} operations + ${financeTeam.length} finance team members about installation`);

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://crm.salinassolar.com";
    const opportunityUrl = `${baseUrl}/pipeline?opportunity=${args.opportunityId}`;

    const results: Array<{ userId: string; email?: { success: boolean }; sms?: { success: boolean } }> = [];

    for (const member of allTeamMembers) {
      const result: { userId: string; email?: { success: boolean }; sms?: { success: boolean } } = {
        userId: member._id,
      };

      // Send email with simplified format
      if (member.email) {
        const html = generateInstallationStageEmailHtml(
          args.opportunityName,
          opportunityUrl
        );

        result.email = await sendEmail(
          member.email,
          `${args.opportunityName} - Ready for Installation`,
          html
        );
      }

      // Send SMS with simplified format and link
      if (member.phone) {
        result.sms = await sendSms(
          member.phone,
          `${args.opportunityName}

Is ready for installation.

${opportunityUrl}

(automated sms, do not reply)`
        );
      }

      results.push(result);
    }

    console.log("[Team Notifications] Operations & Finance team notification results:", results);
    return results;
  },
});

// ============================================
// CLIENT AGREEMENT CONFIRMATION NOTIFICATIONS
// ============================================

/**
 * Notify client when agreement is signed (SMS + Email with signed agreement PDF)
 */
export const notifyClientAgreementSigned = internalAction({
  args: {
    contactPhone: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactFirstName: v.string(),
    signedPdfBase64: v.optional(v.string()),
    signedPdfFilename: v.optional(v.string()),
  },
  handler: async (_, args): Promise<{ sms?: { success: boolean; error?: string }; email?: { success: boolean; error?: string } }> => {
    console.log("[Team Notifications] Sending client agreement confirmation notifications");

    const results: { sms?: { success: boolean; error?: string }; email?: { success: boolean; error?: string } } = {};

    // Send SMS to client
    if (args.contactPhone) {
      const smsMessage = `Thank you for trusting Salinas Solar, a copy of the signed agreement has been sent to your email at ${args.contactEmail || "your registered email"}.

Our team has been notified and are doing the necessary preparations for your Future Solar Savings!`;

      results.sms = await sendSms(args.contactPhone, smsMessage);
      console.log("[Team Notifications] Client SMS result:", results.sms);
    }

    // Send email with signed agreement PDF
    if (args.contactEmail) {
      const html = generateClientAgreementConfirmationEmailHtml(args.contactFirstName);

      if (args.signedPdfBase64 && args.signedPdfFilename) {
        // Send with attachment
        results.email = await sendEmailWithAttachment(
          args.contactEmail,
          "Your Signed Agreement - Salinas Solar",
          html,
          args.signedPdfFilename,
          args.signedPdfBase64,
          "Salinas Solar <info@salinassolar.ph>"
        );
      } else {
        // Send without attachment (fallback)
        results.email = await sendEmail(
          args.contactEmail,
          "Thank You for Choosing Salinas Solar",
          html
        );
      }
      console.log("[Team Notifications] Client email result:", results.email);
    }

    console.log("[Team Notifications] Client notification results:", results);
    return results;
  },
});

// ============================================
// PROJECT MANAGER CLOSURE VERIFICATION NOTIFICATIONS
// ============================================

/**
 * Notify all project managers to verify and close an opportunity
 */
export const notifyProjectManagersForClosure = internalAction({
  args: {
    opportunityName: v.string(),
    opportunityId: v.string(),
  },
  handler: async (ctx, args): Promise<Array<{ userId: string; email?: { success: boolean }; sms?: { success: boolean } }>> => {
    // Get all project managers
    const projectManagers = await ctx.runQuery(
      internal.teamNotifications.getProjectManagers,
      {}
    );

    console.log(`[Team Notifications] Notifying ${projectManagers.length} project managers for closure verification`);

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://crm.salinassolar.com";
    const opportunityUrl = `${baseUrl}/pipeline?opportunity=${args.opportunityId}`;

    const results: Array<{ userId: string; email?: { success: boolean }; sms?: { success: boolean } }> = [];

    for (const pm of projectManagers) {
      const result: { userId: string; email?: { success: boolean }; sms?: { success: boolean } } = {
        userId: pm._id,
      };

      // Send email
      if (pm.email) {
        const html = generateClosureVerificationEmailHtml(
          args.opportunityName,
          opportunityUrl
        );

        result.email = await sendEmail(
          pm.email,
          `${args.opportunityName} - Closure Verification Required`,
          html
        );
      }

      // Send SMS
      if (pm.phone) {
        result.sms = await sendSms(
          pm.phone,
          `${args.opportunityName} has been closed

Please verify and move to closed stage.

${opportunityUrl}

(automated sms, do not reply)`
        );
      }

      results.push(result);
    }

    console.log("[Team Notifications] PM closure verification notification results:", results);
    return results;
  },
});
