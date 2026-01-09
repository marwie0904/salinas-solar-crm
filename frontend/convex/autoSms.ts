/**
 * Auto SMS Actions
 *
 * Automated SMS notifications for various events:
 * - Appointment set
 * - Appointment reminder (day of)
 * - Agreement sent
 * - Invoice sent
 * - Agreement/Invoice reminder (after 3 days)
 */

import { v } from "convex/values";
import { action, internalAction, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

const SEMAPHORE_API_BASE = "https://api.semaphore.co/api/v4";

// ============================================
// SMS TEMPLATES
// ============================================

export type SmsTemplateType =
  | "appointment_set"
  | "appointment_reminder"
  | "agreement_sent"
  | "invoice_sent"
  | "agreement_invoice_reminder"
  | "receipt_sent"
  | "consultant_assignment"
  | "consultant_appointment"
  | "agreement_signed_pm"
  | "installation_stage";

interface AppointmentSetParams {
  firstName: string;
  date: string;
  time: string;
  location: string;
  systemConsultantFullName: string;
}

interface AppointmentReminderParams {
  firstName: string;
  time: string;
}

interface AgreementSentParams {
  firstName: string;
  email: string;
}

interface InvoiceSentParams {
  firstName: string;
  email: string;
}

interface ReceiptSentParams {
  firstName: string;
  email: string;
}

interface AgreementInvoiceReminderParams {
  firstName: string;
}

/**
 * Generate SMS content for appointment set
 */
export function generateAppointmentSetSms(params: AppointmentSetParams): string {
  return `Hi ${params.firstName},

You have an appointment set for ${params.date} - ${params.time}, at ${params.location}. Our system consultant ${params.systemConsultantFullName} will be with you. Please keep your lines open at this number for a call from us regarding your appointment.

(automated sms, do not reply)`;
}

/**
 * Generate SMS content for appointment reminder (day of appointment)
 */
export function generateAppointmentReminderSms(params: AppointmentReminderParams): string {
  return `Hi ${params.firstName},

You have an appointment set for today at ${params.time}. Our system consultant will be in touch with you shortly.

(automated sms, do not reply)`;
}

/**
 * Generate SMS content for agreement sent
 */
export function generateAgreementSentSms(params: AgreementSentParams): string {
  return `Hi ${params.firstName},

We have sent the agreement to your email at: ${params.email}.

Please review and sign the agreement so we can process the invoice and proceed with installation.

Thank you!

(automated sms, do not reply)`;
}

/**
 * Generate SMS content for invoice sent
 */
export function generateInvoiceSentSms(params: InvoiceSentParams): string {
  return `Hi ${params.firstName},

We have sent the invoice to your email at: ${params.email}.

Thank you for trusting Salinas Solar Services!

(automated sms, do not reply)`;
}

/**
 * Generate SMS content for agreement/invoice reminder (3 days no action)
 */
export function generateAgreementInvoiceReminderSms(params: AgreementInvoiceReminderParams): string {
  return `Hi ${params.firstName},

We would like to follow up regarding the agreement/invoice we have sent over.

(automated sms, do not reply)`;
}

/**
 * Generate SMS content for receipt sent (project closed)
 */
export function generateReceiptSentSms(params: ReceiptSentParams): string {
  return `Hi ${params.firstName},

A copy of the receipt has been sent to your email at: ${params.email}.

Thank you for trusting Salinas Solar Services!

(automated sms, do not reply)`;
}

// ============================================
// INTERNAL TEAM SMS TEMPLATES
// ============================================

interface ConsultantAssignmentParams {
  consultantFirstName: string;
  opportunityName: string;
  contactName: string;
  location: string;
}

interface ConsultantAppointmentParams {
  consultantFirstName: string;
  contactName: string;
  date: string;
  time: string;
  location: string;
  appointmentType: string;
}

interface AgreementSignedPmParams {
  pmFirstName: string;
  clientName: string;
  opportunityName: string;
}

interface InstallationStageParams {
  firstName: string;
  clientName: string;
  opportunityName: string;
  location: string;
}

/**
 * Generate SMS for system consultant when assigned to new opportunity
 */
export function generateConsultantAssignmentSms(params: ConsultantAssignmentParams): string {
  return `Hi ${params.consultantFirstName},

You have been assigned to a new opportunity: ${params.opportunityName}.

Client: ${params.contactName}
Location: ${params.location}

Please check the CRM for details.

(automated sms, do not reply)`;
}

/**
 * Generate SMS for system consultant when appointment is booked
 */
export function generateConsultantAppointmentSms(params: ConsultantAppointmentParams): string {
  return `Hi ${params.consultantFirstName},

New ${params.appointmentType} scheduled:
Client: ${params.contactName}
Date: ${params.date}
Time: ${params.time}
Location: ${params.location}

Please check the CRM for details.

(automated sms, do not reply)`;
}

/**
 * Generate SMS for project manager when agreement is signed
 */
export function generateAgreementSignedPmSms(params: AgreementSignedPmParams): string {
  return `Hi ${params.pmFirstName},

Agreement signed by ${params.clientName} for ${params.opportunityName}.

Please check the CRM to review and proceed with project planning.

(automated sms, do not reply)`;
}

/**
 * Generate SMS for operations team when opportunity moves to installation stage
 */
export function generateInstallationStageSms(params: InstallationStageParams): string {
  return `Hi ${params.firstName},

Project ready for installation: ${params.opportunityName}

Client: ${params.clientName}
Location: ${params.location}

Please check the CRM for project details and schedule installation.

(automated sms, do not reply)`;
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

  const formattedPhone = formatPhoneNumber(phoneNumber);

  if (!isValidPhilippinePhone(formattedPhone)) {
    return {
      success: false,
      error: `Invalid Philippine phone number: ${phoneNumber}`,
    };
  }

  const body = new URLSearchParams({
    apikey: apiKey,
    number: formattedPhone,
    message: message,
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
      console.error("[Auto SMS] Send failed:", data);
      return {
        success: false,
        error: data.message || "Failed to send SMS",
      };
    }

    const results = data as Array<{ message_id: number }>;
    if (results && results.length > 0) {
      console.log("[Auto SMS] SMS sent successfully:", results[0].message_id);
      return {
        success: true,
        messageId: results[0].message_id.toString(),
      };
    }

    return { success: false, error: "Unexpected response from Semaphore" };
  } catch (error) {
    console.error("[Auto SMS] Network error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

// ============================================
// AUTO SMS ACTIONS
// ============================================

/**
 * Send appointment set SMS
 */
export const sendAppointmentSetSms = action({
  args: {
    phoneNumber: v.string(),
    firstName: v.string(),
    date: v.string(),
    time: v.string(),
    location: v.string(),
    systemConsultantFullName: v.string(),
  },
  handler: async (_, args) => {
    const message = generateAppointmentSetSms({
      firstName: args.firstName,
      date: args.date,
      time: args.time,
      location: args.location,
      systemConsultantFullName: args.systemConsultantFullName,
    });

    return await sendSms(args.phoneNumber, message);
  },
});

/**
 * Send appointment reminder SMS (day of appointment)
 */
export const sendAppointmentReminderSms = action({
  args: {
    phoneNumber: v.string(),
    firstName: v.string(),
    time: v.string(),
  },
  handler: async (_, args) => {
    const message = generateAppointmentReminderSms({
      firstName: args.firstName,
      time: args.time,
    });

    return await sendSms(args.phoneNumber, message);
  },
});

/**
 * Send agreement sent SMS
 */
export const sendAgreementSentSms = action({
  args: {
    phoneNumber: v.string(),
    firstName: v.string(),
    email: v.string(),
  },
  handler: async (_, args) => {
    const message = generateAgreementSentSms({
      firstName: args.firstName,
      email: args.email,
    });

    return await sendSms(args.phoneNumber, message);
  },
});

/**
 * Send invoice sent SMS
 */
export const sendInvoiceSentSms = action({
  args: {
    phoneNumber: v.string(),
    firstName: v.string(),
    email: v.string(),
  },
  handler: async (_, args) => {
    const message = generateInvoiceSentSms({
      firstName: args.firstName,
      email: args.email,
    });

    return await sendSms(args.phoneNumber, message);
  },
});

/**
 * Send agreement/invoice reminder SMS (3 days no action)
 */
export const sendAgreementInvoiceReminderSms = action({
  args: {
    phoneNumber: v.string(),
    firstName: v.string(),
  },
  handler: async (_, args) => {
    const message = generateAgreementInvoiceReminderSms({
      firstName: args.firstName,
    });

    return await sendSms(args.phoneNumber, message);
  },
});

/**
 * Send receipt sent SMS (project closed)
 */
export const sendReceiptSentSms = action({
  args: {
    phoneNumber: v.string(),
    firstName: v.string(),
    email: v.string(),
  },
  handler: async (_, args) => {
    const message = generateReceiptSentSms({
      firstName: args.firstName,
      email: args.email,
    });

    return await sendSms(args.phoneNumber, message);
  },
});

// ============================================
// INTERNAL ACTIONS (for scheduling from mutations)
// ============================================

/**
 * Internal action for appointment set SMS (schedulable from mutations)
 */
export const internalSendAppointmentSetSms = internalAction({
  args: {
    phoneNumber: v.string(),
    firstName: v.string(),
    date: v.string(),
    time: v.string(),
    location: v.string(),
    systemConsultantFullName: v.string(),
  },
  handler: async (_, args) => {
    const message = generateAppointmentSetSms({
      firstName: args.firstName,
      date: args.date,
      time: args.time,
      location: args.location,
      systemConsultantFullName: args.systemConsultantFullName,
    });

    const result = await sendSms(args.phoneNumber, message);
    console.log("[Auto SMS] Appointment set SMS result:", result);
    return result;
  },
});

/**
 * Internal action for appointment reminder SMS (schedulable from mutations)
 */
export const internalSendAppointmentReminderSms = internalAction({
  args: {
    phoneNumber: v.string(),
    firstName: v.string(),
    time: v.string(),
  },
  handler: async (_, args) => {
    const message = generateAppointmentReminderSms({
      firstName: args.firstName,
      time: args.time,
    });

    const result = await sendSms(args.phoneNumber, message);
    console.log("[Auto SMS] Appointment reminder SMS result:", result);
    return result;
  },
});

/**
 * Internal action for agreement sent SMS (schedulable from mutations)
 */
export const internalSendAgreementSentSms = internalAction({
  args: {
    phoneNumber: v.string(),
    firstName: v.string(),
    email: v.string(),
  },
  handler: async (_, args) => {
    const message = generateAgreementSentSms({
      firstName: args.firstName,
      email: args.email,
    });

    const result = await sendSms(args.phoneNumber, message);
    console.log("[Auto SMS] Agreement sent SMS result:", result);
    return result;
  },
});

/**
 * Internal action for invoice sent SMS (schedulable from mutations)
 */
export const internalSendInvoiceSentSms = internalAction({
  args: {
    phoneNumber: v.string(),
    firstName: v.string(),
    email: v.string(),
  },
  handler: async (_, args) => {
    const message = generateInvoiceSentSms({
      firstName: args.firstName,
      email: args.email,
    });

    const result = await sendSms(args.phoneNumber, message);
    console.log("[Auto SMS] Invoice sent SMS result:", result);
    return result;
  },
});

/**
 * Internal action for agreement/invoice reminder SMS (schedulable from mutations)
 */
export const internalSendAgreementInvoiceReminderSms = internalAction({
  args: {
    phoneNumber: v.string(),
    firstName: v.string(),
  },
  handler: async (_, args) => {
    const message = generateAgreementInvoiceReminderSms({
      firstName: args.firstName,
    });

    const result = await sendSms(args.phoneNumber, message);
    console.log("[Auto SMS] Agreement/Invoice reminder SMS result:", result);
    return result;
  },
});

/**
 * Internal action for receipt sent SMS (schedulable from mutations)
 */
export const internalSendReceiptSentSms = internalAction({
  args: {
    phoneNumber: v.string(),
    firstName: v.string(),
    email: v.string(),
  },
  handler: async (_, args) => {
    const message = generateReceiptSentSms({
      firstName: args.firstName,
      email: args.email,
    });

    const result = await sendSms(args.phoneNumber, message);
    console.log("[Auto SMS] Receipt sent SMS result:", result);
    return result;
  },
});

// ============================================
// INTERNAL TEAM NOTIFICATION ACTIONS
// ============================================

/**
 * Internal action for consultant assignment SMS
 */
export const internalSendConsultantAssignmentSms = internalAction({
  args: {
    phoneNumber: v.string(),
    consultantFirstName: v.string(),
    opportunityName: v.string(),
    contactName: v.string(),
    location: v.string(),
  },
  handler: async (_, args) => {
    const message = generateConsultantAssignmentSms({
      consultantFirstName: args.consultantFirstName,
      opportunityName: args.opportunityName,
      contactName: args.contactName,
      location: args.location,
    });

    const result = await sendSms(args.phoneNumber, message);
    console.log("[Auto SMS] Consultant assignment SMS result:", result);
    return result;
  },
});

/**
 * Internal action for consultant appointment notification SMS
 */
export const internalSendConsultantAppointmentSms = internalAction({
  args: {
    phoneNumber: v.string(),
    consultantFirstName: v.string(),
    contactName: v.string(),
    date: v.string(),
    time: v.string(),
    location: v.string(),
    appointmentType: v.string(),
  },
  handler: async (_, args) => {
    const message = generateConsultantAppointmentSms({
      consultantFirstName: args.consultantFirstName,
      contactName: args.contactName,
      date: args.date,
      time: args.time,
      location: args.location,
      appointmentType: args.appointmentType,
    });

    const result = await sendSms(args.phoneNumber, message);
    console.log("[Auto SMS] Consultant appointment SMS result:", result);
    return result;
  },
});

/**
 * Internal action for project manager agreement signed notification SMS
 */
export const internalSendAgreementSignedPmSms = internalAction({
  args: {
    phoneNumber: v.string(),
    pmFirstName: v.string(),
    clientName: v.string(),
    opportunityName: v.string(),
  },
  handler: async (_, args) => {
    const message = generateAgreementSignedPmSms({
      pmFirstName: args.pmFirstName,
      clientName: args.clientName,
      opportunityName: args.opportunityName,
    });

    const result = await sendSms(args.phoneNumber, message);
    console.log("[Auto SMS] PM agreement signed SMS result:", result);
    return result;
  },
});

/**
 * Internal action for operations team installation stage notification SMS
 */
export const internalSendInstallationStageSms = internalAction({
  args: {
    phoneNumber: v.string(),
    firstName: v.string(),
    clientName: v.string(),
    opportunityName: v.string(),
    location: v.string(),
  },
  handler: async (_, args) => {
    const message = generateInstallationStageSms({
      firstName: args.firstName,
      clientName: args.clientName,
      opportunityName: args.opportunityName,
      location: args.location,
    });

    const result = await sendSms(args.phoneNumber, message);
    console.log("[Auto SMS] Installation stage SMS result:", result);
    return result;
  },
});

/**
 * Test action to send all SMS templates to a test number
 */
export const sendAllTestSms = action({
  args: {
    phoneNumber: v.string(),
    firstName: v.string(),
    email: v.string(),
    location: v.string(),
    systemConsultantFullName: v.string(),
    date: v.string(),
    time: v.string(),
  },
  handler: async (_, args) => {
    const results: Record<string, { success: boolean; messageId?: string; error?: string }> = {};

    // 1. Appointment Set
    const appointmentSetMsg = generateAppointmentSetSms({
      firstName: args.firstName,
      date: args.date,
      time: args.time,
      location: args.location,
      systemConsultantFullName: args.systemConsultantFullName,
    });
    results.appointmentSet = await sendSms(args.phoneNumber, appointmentSetMsg);

    // Small delay between messages
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 2. Appointment Reminder
    const appointmentReminderMsg = generateAppointmentReminderSms({
      firstName: args.firstName,
      time: args.time,
    });
    results.appointmentReminder = await sendSms(args.phoneNumber, appointmentReminderMsg);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 3. Agreement Sent
    const agreementSentMsg = generateAgreementSentSms({
      firstName: args.firstName,
      email: args.email,
    });
    results.agreementSent = await sendSms(args.phoneNumber, agreementSentMsg);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 4. Invoice Sent
    const invoiceSentMsg = generateInvoiceSentSms({
      firstName: args.firstName,
      email: args.email,
    });
    results.invoiceSent = await sendSms(args.phoneNumber, invoiceSentMsg);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 5. Agreement/Invoice Reminder
    const reminderMsg = generateAgreementInvoiceReminderSms({
      firstName: args.firstName,
    });
    results.agreementInvoiceReminder = await sendSms(args.phoneNumber, reminderMsg);

    return results;
  },
});

// ============================================
// INTERNAL QUERIES (for checking status before sending reminders)
// ============================================

/**
 * Get agreement status for reminder check
 */
export const getAgreementStatus = internalQuery({
  args: {
    agreementId: v.id("agreements"),
  },
  handler: async (ctx, args) => {
    const agreement = await ctx.db.get(args.agreementId);
    return agreement ? { status: agreement.status } : null;
  },
});

/**
 * Get invoice status for reminder check
 */
export const getInvoiceStatus = internalQuery({
  args: {
    invoiceId: v.id("invoices"),
  },
  handler: async (ctx, args) => {
    const invoice = await ctx.db.get(args.invoiceId);
    return invoice ? { status: invoice.status, isDeleted: invoice.isDeleted } : null;
  },
});

/**
 * Get today's appointments for reminder cron
 */
export const getTodaysAppointments = internalQuery({
  args: {},
  handler: async (ctx) => {
    // Get today's date in YYYY-MM-DD format (Philippine timezone)
    const now = new Date();
    // Adjust for Philippine timezone (UTC+8)
    const phTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    const today = phTime.toISOString().split("T")[0];

    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_deleted_date", (q) =>
        q.eq("isDeleted", false).eq("date", today)
      )
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    // Get contact info for each appointment
    const appointmentsWithContacts = await Promise.all(
      appointments.map(async (apt) => {
        const contact = await ctx.db.get(apt.contactId);
        return {
          appointmentId: apt._id,
          time: apt.time,
          contactPhone: contact?.phone,
          contactFirstName: contact?.firstName,
        };
      })
    );

    return appointmentsWithContacts.filter(
      (apt) => apt.contactPhone && apt.contactFirstName
    );
  },
});

// ============================================
// 3-DAY REMINDER CHECK ACTIONS
// ============================================

/**
 * Check if agreement is still unsigned and send reminder
 */
export const internalCheckAndSendAgreementReminder = internalAction({
  args: {
    agreementId: v.id("agreements"),
    phoneNumber: v.string(),
    firstName: v.string(),
  },
  handler: async (ctx, args) => {
    // Check agreement status
    const agreement = await ctx.runQuery(internal.autoSms.getAgreementStatus, {
      agreementId: args.agreementId,
    });

    // Only send reminder if agreement is still in sent or viewed status (not signed)
    if (agreement && (agreement.status === "sent" || agreement.status === "viewed")) {
      const message = generateAgreementInvoiceReminderSms({
        firstName: args.firstName,
      });

      const result = await sendSms(args.phoneNumber, message);
      console.log("[Auto SMS] Agreement 3-day reminder SMS result:", result);
      return result;
    }

    console.log("[Auto SMS] Agreement already signed, skipping reminder");
    return { success: true, skipped: true, reason: "Agreement already signed" };
  },
});

/**
 * Check if invoice is still unpaid and send reminder
 */
export const internalCheckAndSendInvoiceReminder = internalAction({
  args: {
    invoiceId: v.id("invoices"),
    phoneNumber: v.string(),
    firstName: v.string(),
  },
  handler: async (ctx, args) => {
    // Check invoice status
    const invoice = await ctx.runQuery(internal.autoSms.getInvoiceStatus, {
      invoiceId: args.invoiceId,
    });

    // Only send reminder if invoice is pending or partially paid
    if (
      invoice &&
      !invoice.isDeleted &&
      (invoice.status === "pending" || invoice.status === "partially_paid")
    ) {
      const message = generateAgreementInvoiceReminderSms({
        firstName: args.firstName,
      });

      const result = await sendSms(args.phoneNumber, message);
      console.log("[Auto SMS] Invoice 3-day reminder SMS result:", result);
      return result;
    }

    console.log("[Auto SMS] Invoice already paid or cancelled, skipping reminder");
    return { success: true, skipped: true, reason: "Invoice already paid or cancelled" };
  },
});

// ============================================
// CRON JOB ACTIONS
// ============================================

/**
 * Send appointment reminders for today's appointments
 * This should be called by a cron job in the morning (e.g., 7 AM)
 */
export const sendDailyAppointmentReminders = internalAction({
  args: {},
  handler: async (ctx) => {
    const appointments = await ctx.runQuery(internal.autoSms.getTodaysAppointments, {});

    console.log(`[Auto SMS] Found ${appointments.length} appointments for today`);

    const results: Array<{ appointmentId: string; success: boolean; error?: string }> = [];

    for (const apt of appointments) {
      if (apt.contactPhone && apt.contactFirstName) {
        const message = generateAppointmentReminderSms({
          firstName: apt.contactFirstName,
          time: apt.time,
        });

        const result = await sendSms(apt.contactPhone, message);
        results.push({
          appointmentId: apt.appointmentId,
          success: result.success,
          error: result.error,
        });

        // Small delay between messages to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    console.log("[Auto SMS] Daily appointment reminders completed:", results);
    return { totalSent: results.filter((r) => r.success).length, results };
  },
});
