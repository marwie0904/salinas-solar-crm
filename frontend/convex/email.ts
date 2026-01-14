/**
 * Email Actions
 *
 * Convex actions that call the Resend API to send emails.
 * Actions can make HTTP requests to external services.
 */

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

const RESEND_API_URL = "https://api.resend.com/emails";

// ============================================
// TEST MODE CONFIGURATION
// Set to true to forward ALL emails to test recipient
// ============================================
const TEST_MODE = false;
const TEST_EMAIL = "marwie0904@gmail.com";

// ============================================
// EMAIL TEMPLATES
// ============================================

function generateInvoiceEmailHtml(
  firstName: string,
  invoiceUrl: string
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice from Salinas Solar</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #ff5603 0%, #e64d00 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Salinas Solar</h1>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 12px 12px;">
    <p style="font-size: 16px; margin-bottom: 20px;">Hi ${firstName},</p>

    <p style="font-size: 16px; margin-bottom: 24px;">Please pay your invoice from Salinas Solar by clicking the button below. See attached file for the copy of the invoice.</p>

    <div style="text-align: center; margin: 32px 0;">
      <a href="${invoiceUrl}" style="display: inline-block; background: #ff5603; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">View Invoice</a>
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

function generateAgreementEmailHtml(
  firstName: string,
  location: string,
  signingUrl: string
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Agreement from Salinas Solar</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #ff5603 0%, #e64d00 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Salinas Solar</h1>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 12px 12px;">
    <p style="font-size: 16px; margin-bottom: 20px;">Hi ${firstName},</p>

    <p style="font-size: 16px; margin-bottom: 24px;">Your solar installation agreement for your home at <strong>${location}</strong> is ready for your review and signature.</p>

    <p style="font-size: 16px; margin-bottom: 24px;">Please click the button below to review and sign your agreement:</p>

    <div style="text-align: center; margin: 32px 0;">
      <a href="${signingUrl}" style="display: inline-block; background: #ff5603; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">Sign Agreement</a>
    </div>

    <p style="font-size: 14px; color: #666; margin-bottom: 16px;">
      This link will expire in 30 days. If you have any questions about the agreement, please don't hesitate to contact us.
    </p>

    <p style="font-size: 14px; color: #666; margin-top: 32px; padding-top: 20px; border-top: 1px solid #e5e5e5;">
      Thank you for choosing Salinas Solar for your solar energy needs!
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

function generateReceiptEmailHtml(
  firstName: string
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Receipt from Salinas Solar</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #228B22 0%, #1e7b1e 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Salinas Solar</h1>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 12px 12px;">
    <p style="font-size: 16px; margin-bottom: 20px;">Hi ${firstName},</p>

    <p style="font-size: 16px; margin-bottom: 24px;">Thank you for your business! Your solar installation project has been completed successfully.</p>

    <p style="font-size: 16px; margin-bottom: 24px;">Please find the attached receipt for your records. This serves as confirmation of your completed transaction with Salinas Solar.</p>

    <div style="background: #f0fff0; border: 1px solid #228B22; border-radius: 8px; padding: 20px; margin: 24px 0; text-align: center;">
      <p style="margin: 0; font-size: 18px; font-weight: 600; color: #228B22;">TRANSACTION COMPLETE</p>
      <p style="margin: 8px 0 0 0; font-size: 14px; color: #666;">Your receipt is attached to this email</p>
    </div>

    <p style="font-size: 14px; color: #666; margin-top: 32px; padding-top: 20px; border-top: 1px solid #e5e5e5;">
      If you have any questions about your installation or need support, please don't hesitate to contact us.
    </p>

    <p style="font-size: 14px; color: #666;">
      Thank you for trusting Salinas Solar Services!<br><br>
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
// EMAIL VERIFICATION TEMPLATE
// ============================================

function generateVerificationEmailHtml(
  verificationCode: string
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email - Salinas Solar</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #ff5603 0%, #e64d00 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Salinas Solar</h1>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 12px 12px;">
    <p style="font-size: 16px; margin-bottom: 20px;">Hi there,</p>

    <p style="font-size: 16px; margin-bottom: 24px;">Please use the verification code below to verify your email address. This verification is required every 30 days for security purposes.</p>

    <div style="text-align: center; margin: 32px 0;">
      <div style="background: #f5f5f5; border: 2px dashed #ff5603; border-radius: 12px; padding: 24px; display: inline-block;">
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #666;">Your verification code:</p>
        <p style="margin: 0; font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #ff5603;">${verificationCode}</p>
      </div>
    </div>

    <p style="font-size: 14px; color: #666; margin-bottom: 16px; text-align: center;">
      This code will expire in <strong>10 minutes</strong>. If you did not request this verification, you can safely ignore this email.
    </p>

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

// ============================================
// ACTIONS
// ============================================

/**
 * Send email verification email with 6-digit code
 * Note: Verification emails are sent directly (not queued) for immediate delivery
 */
export const sendVerificationEmail = action({
  args: {
    to: v.string(),
    verificationCode: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; emailId?: string; error?: string }> => {
    // Verification emails are time-sensitive, send directly
    return await ctx.runAction(internal.email.sendVerificationEmailInternal, args);
  },
});

/**
 * Send an invoice email with PDF attachment (queued)
 */
export const sendInvoiceEmail = action({
  args: {
    to: v.string(),
    firstName: v.string(),
    invoiceUrl: v.string(),
    pdfBase64: v.optional(v.string()),
    pdfFilename: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ success: boolean; queued?: boolean; error?: string }> => {
    if (!args.to) {
      return { success: false, error: "No email address provided" };
    }

    await ctx.runMutation(internal.messageQueue.internalQueueEmail, {
      actionName: "sendInvoiceEmail",
      payload: JSON.stringify(args),
      priority: 3, // Higher priority for customer-facing emails
    });

    return { success: true, queued: true };
  },
});

/**
 * Send an agreement email with signing link (queued)
 */
export const sendAgreementEmail = action({
  args: {
    to: v.string(),
    firstName: v.string(),
    location: v.string(),
    signingUrl: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; queued?: boolean; error?: string }> => {
    if (!args.to) {
      return { success: false, error: "No email address provided" };
    }

    await ctx.runMutation(internal.messageQueue.internalQueueEmail, {
      actionName: "sendAgreementEmail",
      payload: JSON.stringify(args),
      priority: 3, // Higher priority for customer-facing emails
    });

    return { success: true, queued: true };
  },
});

/**
 * Send an appointment confirmation email (queued)
 */
export const sendAppointmentEmail = action({
  args: {
    to: v.string(),
    firstName: v.string(),
    assignedUserName: v.string(),
    date: v.string(),
    time: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; queued?: boolean; error?: string }> => {
    if (!args.to) {
      return { success: false, error: "No email address provided" };
    }

    await ctx.runMutation(internal.messageQueue.internalQueueEmail, {
      actionName: "sendAppointmentEmail",
      payload: JSON.stringify(args),
      priority: 3, // Higher priority for customer-facing emails
    });

    return { success: true, queued: true };
  },
});

/**
 * Send a consultant assignment notification email (queued)
 */
export const sendConsultantAssignmentEmail = action({
  args: {
    to: v.string(),
    consultantFirstName: v.string(),
    opportunityName: v.string(),
    opportunityUrl: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; queued?: boolean; error?: string }> => {
    if (!args.to) {
      return { success: false, error: "No email address provided" };
    }

    await ctx.runMutation(internal.messageQueue.internalQueueEmail, {
      actionName: "sendConsultantAssignmentEmail",
      payload: JSON.stringify(args),
      priority: 5, // Normal priority for internal emails
    });

    return { success: true, queued: true };
  },
});

/**
 * Send a receipt email with PDF attachment (queued)
 */
export const sendReceiptEmail = action({
  args: {
    to: v.string(),
    firstName: v.string(),
    pdfBase64: v.string(),
    pdfFilename: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; queued?: boolean; error?: string }> => {
    if (!args.to) {
      return { success: false, error: "No email address provided" };
    }

    await ctx.runMutation(internal.messageQueue.internalQueueEmail, {
      actionName: "sendReceiptEmail",
      payload: JSON.stringify(args),
      priority: 3, // Higher priority for customer-facing emails
    });

    return { success: true, queued: true };
  },
});

// ============================================
// INTERNAL TEAM EMAIL TEMPLATES
// ============================================

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

function generateInstallationStageEmailHtml(
  firstName: string,
  clientName: string,
  opportunityName: string,
  location: string,
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
    <p style="font-size: 16px; margin-bottom: 20px;">Hi ${firstName},</p>

    <p style="font-size: 16px; margin-bottom: 24px;">A project is ready for installation:</p>

    <div style="background: #fff8f0; border: 1px solid #ff5603; border-radius: 8px; padding: 20px; margin: 24px 0;">
      <p style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #ff5603;">FOR INSTALLATION</p>
      <p style="margin: 8px 0 0 0;"><strong>Project:</strong> ${opportunityName}</p>
      <p style="margin: 8px 0 0 0;"><strong>Client:</strong> ${clientName}</p>
      <p style="margin: 8px 0 0 0;"><strong>Location:</strong> ${location}</p>
    </div>

    <p style="font-size: 16px; margin-bottom: 24px;">Please review the project details and coordinate the installation schedule.</p>

    <div style="text-align: center; margin: 32px 0;">
      <a href="${opportunityUrl}" style="display: inline-block; background: #ff5603; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">View Project</a>
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

// ============================================
// INTERNAL TEAM EMAIL ACTIONS (Queued)
// ============================================

/**
 * Send appointment notification email to consultant (queued)
 */
export const sendConsultantAppointmentEmail = action({
  args: {
    to: v.string(),
    consultantFirstName: v.string(),
    contactName: v.string(),
    appointmentType: v.string(),
    date: v.string(),
    time: v.string(),
    location: v.string(),
    appointmentUrl: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; queued?: boolean; error?: string }> => {
    if (!args.to) {
      return { success: false, error: "No email address provided" };
    }

    await ctx.runMutation(internal.messageQueue.internalQueueEmail, {
      actionName: "sendConsultantAppointmentEmail",
      payload: JSON.stringify(args),
      priority: 5, // Normal priority for internal emails
    });

    return { success: true, queued: true };
  },
});

/**
 * Send agreement signed notification email to project manager (queued)
 */
export const sendAgreementSignedPmEmail = action({
  args: {
    to: v.string(),
    pmFirstName: v.string(),
    clientName: v.string(),
    opportunityName: v.string(),
    opportunityUrl: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; queued?: boolean; error?: string }> => {
    if (!args.to) {
      return { success: false, error: "No email address provided" };
    }

    await ctx.runMutation(internal.messageQueue.internalQueueEmail, {
      actionName: "sendAgreementSignedPmEmail",
      payload: JSON.stringify(args),
      priority: 5, // Normal priority for internal emails
    });

    return { success: true, queued: true };
  },
});

/**
 * Send installation stage notification email to operations team (queued)
 */
export const sendInstallationStageEmail = action({
  args: {
    to: v.string(),
    firstName: v.string(),
    clientName: v.string(),
    opportunityName: v.string(),
    location: v.string(),
    opportunityUrl: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; queued?: boolean; error?: string }> => {
    if (!args.to) {
      return { success: false, error: "No email address provided" };
    }

    await ctx.runMutation(internal.messageQueue.internalQueueEmail, {
      actionName: "sendInstallationStageEmail",
      payload: JSON.stringify(args),
      priority: 5, // Normal priority for internal emails
    });

    return { success: true, queued: true };
  },
});

// ============================================
// INTERNAL ACTIONS (Called by Queue Processor)
// These actually send the emails via Resend API
// ============================================

/**
 * Internal: Send verification email (not queued - time sensitive)
 */
export const sendVerificationEmailInternal = internalAction({
  args: {
    to: v.string(),
    verificationCode: v.string(),
  },
  handler: async (_, args): Promise<{ success: boolean; emailId?: string; error?: string }> => {
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = "Salinas Solar <info@otomatelegal.com>";

    if (!apiKey) {
      return { success: false, error: "RESEND_API_KEY not configured" };
    }

    const html = generateVerificationEmailHtml(args.verificationCode);
    const actualTo = TEST_MODE ? TEST_EMAIL : args.to;
    const actualSubject = TEST_MODE ? `[TEST - Original: ${args.to}] Verify Your Email - Salinas Solar CRM` : "Verify Your Email - Salinas Solar CRM";

    try {
      const response = await fetch(RESEND_API_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [actualTo],
          subject: actualSubject,
          html,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("[Resend API] Send failed:", data);
        return { success: false, error: data.message || "Failed to send email" };
      }

      console.log("[Resend API] Verification email sent successfully:", data.id);
      return { success: true, emailId: data.id };
    } catch (error) {
      console.error("[Resend API] Network error:", error);
      return { success: false, error: error instanceof Error ? error.message : "Network error" };
    }
  },
});

/**
 * Internal: Send invoice email
 */
export const sendInvoiceEmailInternal = internalAction({
  args: {
    to: v.string(),
    firstName: v.string(),
    invoiceUrl: v.string(),
    pdfBase64: v.optional(v.string()),
    pdfFilename: v.optional(v.string()),
  },
  handler: async (_, args): Promise<{ success: boolean; emailId?: string; error?: string }> => {
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = "Salinas Solar <info@salinassolar.ph>";

    if (!apiKey) {
      return { success: false, error: "RESEND_API_KEY not configured" };
    }

    const html = generateInvoiceEmailHtml(args.firstName, args.invoiceUrl);
    const actualTo = TEST_MODE ? TEST_EMAIL : args.to;
    const actualSubject = TEST_MODE ? `[TEST - Original: ${args.to}] Invoice from Salinas Solar` : "Invoice from Salinas Solar";

    const body: {
      from: string;
      to: string[];
      subject: string;
      html: string;
      attachments?: { filename: string; content: string }[];
    } = {
      from: fromEmail,
      to: [actualTo],
      subject: actualSubject,
      html,
    };

    if (args.pdfBase64 && args.pdfFilename) {
      body.attachments = [{ filename: args.pdfFilename, content: args.pdfBase64 }];
    }

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
        console.error("[Resend API] Send failed:", data);
        return { success: false, error: data.message || "Failed to send email" };
      }

      console.log("[Resend API] Invoice email sent successfully:", data.id);
      return { success: true, emailId: data.id };
    } catch (error) {
      console.error("[Resend API] Network error:", error);
      return { success: false, error: error instanceof Error ? error.message : "Network error" };
    }
  },
});

/**
 * Internal: Send agreement email
 */
export const sendAgreementEmailInternal = internalAction({
  args: {
    to: v.string(),
    firstName: v.string(),
    location: v.string(),
    signingUrl: v.string(),
  },
  handler: async (_, args): Promise<{ success: boolean; emailId?: string; error?: string }> => {
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = "Salinas Solar <info@salinassolar.ph>";

    if (!apiKey) {
      return { success: false, error: "RESEND_API_KEY not configured" };
    }

    const html = generateAgreementEmailHtml(args.firstName, args.location, args.signingUrl);
    const actualTo = TEST_MODE ? TEST_EMAIL : args.to;
    const actualSubject = TEST_MODE ? `[TEST - Original: ${args.to}] Sign Your Solar Installation Agreement - Salinas Solar` : "Sign Your Solar Installation Agreement - Salinas Solar";

    try {
      const response = await fetch(RESEND_API_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [actualTo],
          subject: actualSubject,
          html,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("[Resend API] Send failed:", data);
        return { success: false, error: data.message || "Failed to send email" };
      }

      console.log("[Resend API] Agreement email sent successfully:", data.id);
      return { success: true, emailId: data.id };
    } catch (error) {
      console.error("[Resend API] Network error:", error);
      return { success: false, error: error instanceof Error ? error.message : "Network error" };
    }
  },
});

/**
 * Internal: Send appointment email
 */
export const sendAppointmentEmailInternal = internalAction({
  args: {
    to: v.string(),
    firstName: v.string(),
    assignedUserName: v.string(),
    date: v.string(),
    time: v.string(),
  },
  handler: async (_, args): Promise<{ success: boolean; emailId?: string; error?: string }> => {
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = "Salinas Solar <info@salinassolar.ph>";

    if (!apiKey) {
      return { success: false, error: "RESEND_API_KEY not configured" };
    }

    const dateObj = new Date(args.date);
    const formattedDate = dateObj.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const html = generateAppointmentEmailHtml(args.firstName, args.assignedUserName, formattedDate, args.time);
    const actualTo = TEST_MODE ? TEST_EMAIL : args.to;
    const actualSubject = TEST_MODE ? `[TEST - Original: ${args.to}] Appointment Confirmation - Salinas Solar` : "Appointment Confirmation - Salinas Solar";

    try {
      const response = await fetch(RESEND_API_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [actualTo],
          subject: actualSubject,
          html,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("[Resend API] Send failed:", data);
        return { success: false, error: data.message || "Failed to send email" };
      }

      console.log("[Resend API] Appointment email sent successfully:", data.id);
      return { success: true, emailId: data.id };
    } catch (error) {
      console.error("[Resend API] Network error:", error);
      return { success: false, error: error instanceof Error ? error.message : "Network error" };
    }
  },
});

/**
 * Internal: Send consultant assignment email
 */
export const sendConsultantAssignmentEmailInternal = internalAction({
  args: {
    to: v.string(),
    consultantFirstName: v.string(),
    opportunityName: v.string(),
    opportunityUrl: v.string(),
  },
  handler: async (_, args): Promise<{ success: boolean; emailId?: string; error?: string }> => {
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = "Salinas Solar <notification@salinassolar.ph>";

    if (!apiKey) {
      return { success: false, error: "RESEND_API_KEY not configured" };
    }

    const html = generateConsultantAssignmentEmailHtml(args.consultantFirstName, args.opportunityName, args.opportunityUrl);
    const actualTo = TEST_MODE ? TEST_EMAIL : args.to;
    const subject = `New Assignment: ${args.opportunityName} - Salinas Solar`;
    const actualSubject = TEST_MODE ? `[TEST - Original: ${args.to}] ${subject}` : subject;

    try {
      const response = await fetch(RESEND_API_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [actualTo],
          subject: actualSubject,
          html,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("[Resend API] Send failed:", data);
        return { success: false, error: data.message || "Failed to send email" };
      }

      console.log("[Resend API] Consultant assignment email sent successfully:", data.id);
      return { success: true, emailId: data.id };
    } catch (error) {
      console.error("[Resend API] Network error:", error);
      return { success: false, error: error instanceof Error ? error.message : "Network error" };
    }
  },
});

/**
 * Internal: Send receipt email
 */
export const sendReceiptEmailInternal = internalAction({
  args: {
    to: v.string(),
    firstName: v.string(),
    pdfBase64: v.string(),
    pdfFilename: v.string(),
  },
  handler: async (_, args): Promise<{ success: boolean; emailId?: string; error?: string }> => {
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = "Salinas Solar <sales@salinassolar.ph>";

    if (!apiKey) {
      return { success: false, error: "RESEND_API_KEY not configured" };
    }

    const html = generateReceiptEmailHtml(args.firstName);
    const actualTo = TEST_MODE ? TEST_EMAIL : args.to;
    const actualSubject = TEST_MODE ? `[TEST - Original: ${args.to}] Receipt from Salinas Solar - Project Complete` : "Receipt from Salinas Solar - Project Complete";

    try {
      const response = await fetch(RESEND_API_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [actualTo],
          subject: actualSubject,
          html,
          attachments: [{ filename: args.pdfFilename, content: args.pdfBase64 }],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("[Resend API] Send failed:", data);
        return { success: false, error: data.message || "Failed to send email" };
      }

      console.log("[Resend API] Receipt email sent successfully:", data.id);
      return { success: true, emailId: data.id };
    } catch (error) {
      console.error("[Resend API] Network error:", error);
      return { success: false, error: error instanceof Error ? error.message : "Network error" };
    }
  },
});

/**
 * Internal: Send consultant appointment email
 */
export const sendConsultantAppointmentEmailInternal = internalAction({
  args: {
    to: v.string(),
    consultantFirstName: v.string(),
    contactName: v.string(),
    appointmentType: v.string(),
    date: v.string(),
    time: v.string(),
    location: v.string(),
    appointmentUrl: v.string(),
  },
  handler: async (_, args): Promise<{ success: boolean; emailId?: string; error?: string }> => {
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = "Salinas Solar <notification@salinassolar.ph>";

    if (!apiKey) {
      return { success: false, error: "RESEND_API_KEY not configured" };
    }

    const dateObj = new Date(args.date);
    const formattedDate = dateObj.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const typeLabel = args.appointmentType === "discovery_call" ? "Discovery Call" : "Field Inspection";
    const html = generateConsultantAppointmentEmailHtml(
      args.consultantFirstName,
      args.contactName,
      args.appointmentType,
      formattedDate,
      args.time,
      args.location,
      args.appointmentUrl
    );
    const actualTo = TEST_MODE ? TEST_EMAIL : args.to;
    const subject = `New ${typeLabel} Scheduled - ${args.contactName}`;
    const actualSubject = TEST_MODE ? `[TEST - Original: ${args.to}] ${subject}` : subject;

    try {
      const response = await fetch(RESEND_API_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [actualTo],
          subject: actualSubject,
          html,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("[Resend API] Send failed:", data);
        return { success: false, error: data.message || "Failed to send email" };
      }

      console.log("[Resend API] Consultant appointment email sent successfully:", data.id);
      return { success: true, emailId: data.id };
    } catch (error) {
      console.error("[Resend API] Network error:", error);
      return { success: false, error: error instanceof Error ? error.message : "Network error" };
    }
  },
});

/**
 * Internal: Send agreement signed PM email
 */
export const sendAgreementSignedPmEmailInternal = internalAction({
  args: {
    to: v.string(),
    pmFirstName: v.string(),
    clientName: v.string(),
    opportunityName: v.string(),
    opportunityUrl: v.string(),
  },
  handler: async (_, args): Promise<{ success: boolean; emailId?: string; error?: string }> => {
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = "Salinas Solar <notification@salinassolar.ph>";

    if (!apiKey) {
      return { success: false, error: "RESEND_API_KEY not configured" };
    }

    const html = generateAgreementSignedPmEmailHtml(args.pmFirstName, args.clientName, args.opportunityName, args.opportunityUrl);
    const actualTo = TEST_MODE ? TEST_EMAIL : args.to;
    const subject = `Agreement Signed: ${args.opportunityName} - Salinas Solar`;
    const actualSubject = TEST_MODE ? `[TEST - Original: ${args.to}] ${subject}` : subject;

    try {
      const response = await fetch(RESEND_API_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [actualTo],
          subject: actualSubject,
          html,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("[Resend API] Send failed:", data);
        return { success: false, error: data.message || "Failed to send email" };
      }

      console.log("[Resend API] Agreement signed PM email sent successfully:", data.id);
      return { success: true, emailId: data.id };
    } catch (error) {
      console.error("[Resend API] Network error:", error);
      return { success: false, error: error instanceof Error ? error.message : "Network error" };
    }
  },
});

/**
 * Internal: Send installation stage email
 */
export const sendInstallationStageEmailInternal = internalAction({
  args: {
    to: v.string(),
    firstName: v.string(),
    clientName: v.string(),
    opportunityName: v.string(),
    location: v.string(),
    opportunityUrl: v.string(),
  },
  handler: async (_, args): Promise<{ success: boolean; emailId?: string; error?: string }> => {
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = "Salinas Solar <notification@salinassolar.ph>";

    if (!apiKey) {
      return { success: false, error: "RESEND_API_KEY not configured" };
    }

    const html = generateInstallationStageEmailHtml(args.firstName, args.clientName, args.opportunityName, args.location, args.opportunityUrl);
    const actualTo = TEST_MODE ? TEST_EMAIL : args.to;
    const subject = `Project Ready for Installation: ${args.opportunityName} - Salinas Solar`;
    const actualSubject = TEST_MODE ? `[TEST - Original: ${args.to}] ${subject}` : subject;

    try {
      const response = await fetch(RESEND_API_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [actualTo],
          subject: actualSubject,
          html,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("[Resend API] Send failed:", data);
        return { success: false, error: data.message || "Failed to send email" };
      }

      console.log("[Resend API] Installation stage email sent successfully:", data.id);
      return { success: true, emailId: data.id };
    } catch (error) {
      console.error("[Resend API] Network error:", error);
      return { success: false, error: error instanceof Error ? error.message : "Network error" };
    }
  },
});
