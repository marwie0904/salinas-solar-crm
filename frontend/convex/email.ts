/**
 * Email Actions
 *
 * Convex actions that call the Resend API to send emails.
 * Actions can make HTTP requests to external services.
 */

import { v } from "convex/values";
import { action } from "./_generated/server";

const RESEND_API_URL = "https://api.resend.com/emails";

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
  location: string
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

    <p style="font-size: 16px; margin-bottom: 24px;">Please see the attached agreement for your home at <strong>${location}</strong>.</p>

    <p style="font-size: 16px; margin-bottom: 24px;">Please review the agreement carefully. If you have any questions or would like to discuss any terms, feel free to reach out to us.</p>

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

// ============================================
// ACTIONS
// ============================================

/**
 * Send an invoice email with PDF attachment
 */
export const sendInvoiceEmail = action({
  args: {
    to: v.string(),
    firstName: v.string(),
    invoiceUrl: v.string(),
    pdfBase64: v.optional(v.string()),
    pdfFilename: v.optional(v.string()),
  },
  handler: async (_, args): Promise<{ success: boolean; emailId?: string; error?: string }> => {
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || "Salinas Solar <noreply@salinassolar.com>";

    if (!apiKey) {
      return { success: false, error: "RESEND_API_KEY not configured" };
    }

    if (!args.to) {
      return { success: false, error: "No email address provided" };
    }

    const html = generateInvoiceEmailHtml(args.firstName, args.invoiceUrl);

    const body: {
      from: string;
      to: string[];
      subject: string;
      html: string;
      attachments?: { filename: string; content: string }[];
    } = {
      from: fromEmail,
      to: [args.to],
      subject: "Invoice from Salinas Solar",
      html,
    };

    // Add PDF attachment if provided
    if (args.pdfBase64 && args.pdfFilename) {
      body.attachments = [
        {
          filename: args.pdfFilename,
          content: args.pdfBase64,
        },
      ];
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
        return {
          success: false,
          error: data.message || "Failed to send email",
        };
      }

      console.log("[Resend API] Invoice email sent successfully:", data.id);

      return {
        success: true,
        emailId: data.id,
      };
    } catch (error) {
      console.error("[Resend API] Network error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Network error",
      };
    }
  },
});

/**
 * Send an agreement email with PDF attachment
 */
export const sendAgreementEmail = action({
  args: {
    to: v.string(),
    firstName: v.string(),
    location: v.string(),
    pdfBase64: v.optional(v.string()),
    pdfFilename: v.optional(v.string()),
  },
  handler: async (_, args): Promise<{ success: boolean; emailId?: string; error?: string }> => {
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || "Salinas Solar <noreply@salinassolar.com>";

    if (!apiKey) {
      return { success: false, error: "RESEND_API_KEY not configured" };
    }

    if (!args.to) {
      return { success: false, error: "No email address provided" };
    }

    const html = generateAgreementEmailHtml(args.firstName, args.location);

    const body: {
      from: string;
      to: string[];
      subject: string;
      html: string;
      attachments?: { filename: string; content: string }[];
    } = {
      from: fromEmail,
      to: [args.to],
      subject: "Solar Installation Agreement - Salinas Solar",
      html,
    };

    // Add PDF attachment if provided
    if (args.pdfBase64 && args.pdfFilename) {
      body.attachments = [
        {
          filename: args.pdfFilename,
          content: args.pdfBase64,
        },
      ];
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
        return {
          success: false,
          error: data.message || "Failed to send email",
        };
      }

      console.log("[Resend API] Agreement email sent successfully:", data.id);

      return {
        success: true,
        emailId: data.id,
      };
    } catch (error) {
      console.error("[Resend API] Network error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Network error",
      };
    }
  },
});

/**
 * Send an appointment confirmation email
 */
export const sendAppointmentEmail = action({
  args: {
    to: v.string(),
    firstName: v.string(),
    assignedUserName: v.string(),
    date: v.string(),
    time: v.string(),
  },
  handler: async (_, args): Promise<{ success: boolean; emailId?: string; error?: string }> => {
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || "Salinas Solar <noreply@salinassolar.com>";

    if (!apiKey) {
      return { success: false, error: "RESEND_API_KEY not configured" };
    }

    if (!args.to) {
      return { success: false, error: "No email address provided" };
    }

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

    const body = {
      from: fromEmail,
      to: [args.to],
      subject: "Appointment Confirmation - Salinas Solar",
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
        console.error("[Resend API] Send failed:", data);
        return {
          success: false,
          error: data.message || "Failed to send email",
        };
      }

      console.log("[Resend API] Appointment email sent successfully:", data.id);

      return {
        success: true,
        emailId: data.id,
      };
    } catch (error) {
      console.error("[Resend API] Network error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Network error",
      };
    }
  },
});
