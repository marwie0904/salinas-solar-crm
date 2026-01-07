/**
 * Resend Email API Client
 *
 * Handles sending emails via Resend.
 * API Documentation: https://resend.com/docs
 */

// ============================================
// TYPES
// ============================================

export interface ResendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  attachments?: ResendAttachment[];
}

export interface ResendAttachment {
  filename: string;
  content: string; // Base64 encoded content
  contentType?: string;
}

export interface ResendSendResponse {
  id: string;
}

export interface ResendError {
  message: string;
  statusCode: number;
  name: string;
}

// ============================================
// ERROR HANDLING
// ============================================

export class ResendApiError extends Error {
  public details: unknown;
  public statusCode?: number;

  constructor(message: string, details?: unknown, statusCode?: number) {
    super(message);
    this.name = "ResendApiError";
    this.details = details;
    this.statusCode = statusCode;
  }
}

// ============================================
// SENDING EMAILS
// ============================================

/**
 * Send an email via Resend API
 *
 * @param apiKey - Resend API key
 * @param options - Email options
 */
export async function sendEmail(
  apiKey: string,
  options: ResendEmailOptions
): Promise<ResendSendResponse> {
  const url = "https://api.resend.com/emails";

  const body = {
    from: options.from || "Salinas Solar <noreply@salinassolar.com>",
    to: Array.isArray(options.to) ? options.to : [options.to],
    subject: options.subject,
    html: options.html,
    text: options.text,
    reply_to: options.replyTo,
    attachments: options.attachments?.map((att) => ({
      filename: att.filename,
      content: att.content,
      type: att.contentType,
    })),
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new ResendApiError(
      `Failed to send email: ${data.message || JSON.stringify(data)}`,
      data,
      response.status
    );
  }

  return data;
}

// ============================================
// EMAIL TEMPLATES
// ============================================

/**
 * Generate invoice email HTML
 */
export function generateInvoiceEmailHtml(
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

/**
 * Generate agreement email HTML
 */
export function generateAgreementEmailHtml(
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

/**
 * Generate appointment confirmation email HTML
 */
export function generateAppointmentEmailHtml(
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
// UTILITIES
// ============================================

/**
 * Convert a Blob to Base64 string
 */
export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove the data URL prefix (e.g., "data:application/pdf;base64,")
      const base64Content = base64String.split(",")[1];
      resolve(base64Content);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
