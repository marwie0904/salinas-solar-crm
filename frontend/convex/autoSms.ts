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
import { action, internalAction, internalMutation, internalQuery } from "./_generated/server";
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
  | "installation_stage"
  | "did_not_book_call_followup"
  | "follow_up_stage";

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
// FOLLOW-UP SMS TEMPLATES (ROTATING)
// ============================================

interface DidNotBookCallParams {
  firstName: string;
}

interface FollowUpStageParams {
  firstName: string;
  consultantName: string;
  consultantPhone: string;
}

/**
 * 4 rotating SMS templates for "Did Not Book Call" stage
 * These are sent twice a week until the client books an ocular visit
 */
const DID_NOT_BOOK_CALL_TEMPLATES: Array<(params: DidNotBookCallParams) => string> = [
  // Template 1 (Original)
  (params) => `Hi ${params.firstName},

We have noticed that you have not booked a call yet for your future Solar Panel Installation.

If you want to save bills on electricity feel free to reach out!

Please Call us at:
09215565857
6am-8pm, everyday

(automated sms, do not reply)`,

  // Template 2
  (params) => `Hi ${params.firstName},

Still thinking about Solar Panels? We're here to help you start saving on your electricity bills!

Our team is ready to assist you with a free consultation.

Please Call us at:
09215565857
6am-8pm, everyday

(automated sms, do not reply)`,

  // Template 3
  (params) => `Hi ${params.firstName},

Don't miss out on massive electricity savings! Solar energy is the future, and we'd love to help you get started.

Book your free site visit today!

Please Call us at:
09215565857
6am-8pm, everyday

(automated sms, do not reply)`,

  // Template 4
  (params) => `Hi ${params.firstName},

Your solar journey awaits! Imagine slashing your electricity bills significantly every month.

Let us show you how - schedule a free ocular inspection now!

Please Call us at:
09215565857
6am-8pm, everyday

(automated sms, do not reply)`,
];

/**
 * 4 rotating SMS templates for "Follow Up" stage
 * These are sent twice a week until the proposal is confirmed
 */
const FOLLOW_UP_STAGE_TEMPLATES: Array<(params: FollowUpStageParams) => string> = [
  // Template 1 (Original)
  (params) => `Hi ${params.firstName},

What do you think of the proposal we sent over to you?

You are one step closer to Massive Electricity Bill Savings!

Please Call our Consultant at:
${params.consultantName}
${params.consultantPhone}

(automated sms, do not reply)`,

  // Template 2
  (params) => `Hi ${params.firstName},

We hope you had a chance to review our solar proposal. Have any questions? We're here to help!

Ready to take the next step towards energy savings?

Please Call our Consultant at:
${params.consultantName}
${params.consultantPhone}

(automated sms, do not reply)`,

  // Template 3
  (params) => `Hi ${params.firstName},

Just checking in on our solar proposal! We'd love to discuss how we can customize the solution for your needs.

Your savings await!

Please Call our Consultant at:
${params.consultantName}
${params.consultantPhone}

(automated sms, do not reply)`,

  // Template 4
  (params) => `Hi ${params.firstName},

Solar savings are just one call away! Let us answer any questions about the proposal we sent.

Our team is ready to help you finalize your installation.

Please Call our Consultant at:
${params.consultantName}
${params.consultantPhone}

(automated sms, do not reply)`,
];

/**
 * Generate SMS for "Did Not Book Call" stage with rotation
 */
export function generateDidNotBookCallSms(params: DidNotBookCallParams, templateIndex: number): string {
  const index = templateIndex % DID_NOT_BOOK_CALL_TEMPLATES.length;
  return DID_NOT_BOOK_CALL_TEMPLATES[index](params);
}

/**
 * Generate SMS for "Follow Up" stage with rotation
 */
export function generateFollowUpStageSms(params: FollowUpStageParams, templateIndex: number): string {
  const index = templateIndex % FOLLOW_UP_STAGE_TEMPLATES.length;
  return FOLLOW_UP_STAGE_TEMPLATES[index](params);
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

// ============================================
// FOLLOW-UP SMS QUERIES AND ACTIONS
// ============================================

/**
 * Get opportunities in "did_not_book_call" stage that need follow-up SMS
 */
export const getDidNotBookCallOpportunities = internalQuery({
  args: {},
  handler: async (ctx) => {
    const opportunities = await ctx.db
      .query("opportunities")
      .withIndex("by_deleted_stage", (q) =>
        q.eq("isDeleted", false).eq("stage", "did_not_book_call")
      )
      .collect();

    // Get contact info for each opportunity
    const opportunitiesWithContacts = await Promise.all(
      opportunities.map(async (opp) => {
        const contact = await ctx.db.get(opp.contactId);
        return {
          opportunityId: opp._id,
          contactPhone: contact?.phone,
          contactFirstName: contact?.firstName,
          lastSmsIndex: opp.lastFollowUpSmsIndex ?? -1,
          lastSmsAt: opp.lastFollowUpSmsAt,
        };
      })
    );

    // Filter to only those with valid phone numbers
    return opportunitiesWithContacts.filter(
      (opp) => opp.contactPhone && opp.contactFirstName
    );
  },
});

/**
 * Get opportunities in "follow_up" stage that need follow-up SMS
 */
export const getFollowUpStageOpportunities = internalQuery({
  args: {},
  handler: async (ctx) => {
    const opportunities = await ctx.db
      .query("opportunities")
      .withIndex("by_deleted_stage", (q) =>
        q.eq("isDeleted", false).eq("stage", "follow_up")
      )
      .collect();

    // Get contact and consultant info for each opportunity
    const opportunitiesWithDetails = await Promise.all(
      opportunities.map(async (opp) => {
        const contact = await ctx.db.get(opp.contactId);
        let consultantName = "Salinas Solar";
        let consultantPhone = "09215565857";

        if (opp.assignedTo) {
          const consultant = await ctx.db.get(opp.assignedTo);
          if (consultant) {
            consultantName = `${consultant.firstName} ${consultant.lastName}`;
            consultantPhone = consultant.phone || "09215565857";
          }
        }

        return {
          opportunityId: opp._id,
          contactPhone: contact?.phone,
          contactFirstName: contact?.firstName,
          consultantName,
          consultantPhone,
          lastSmsIndex: opp.lastFollowUpSmsIndex ?? -1,
          lastSmsAt: opp.lastFollowUpSmsAt,
        };
      })
    );

    // Filter to only those with valid phone numbers
    return opportunitiesWithDetails.filter(
      (opp) => opp.contactPhone && opp.contactFirstName
    );
  },
});

/**
 * Internal mutation to update opportunity's SMS tracking fields
 */
export const updateOpportunitySmsTracking = internalMutation({
  args: {
    opportunityId: v.id("opportunities"),
    smsIndex: v.number(),
    sentAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.opportunityId, {
      lastFollowUpSmsIndex: args.smsIndex,
      lastFollowUpSmsAt: args.sentAt,
      updatedAt: args.sentAt,
    });
  },
});

/**
 * Send follow-up SMS to "Did Not Book Call" opportunities
 * Called by cron job twice a week
 */
export const sendDidNotBookCallFollowUps = internalAction({
  args: {},
  handler: async (ctx) => {
    const opportunities = await ctx.runQuery(internal.autoSms.getDidNotBookCallOpportunities, {});

    console.log(`[Auto SMS] Found ${opportunities.length} opportunities in 'did_not_book_call' stage`);

    const results: Array<{
      opportunityId: string;
      success: boolean;
      templateIndex: number;
      error?: string;
    }> = [];

    for (const opp of opportunities) {
      if (opp.contactPhone && opp.contactFirstName) {
        // Rotate to next template
        const nextIndex = (opp.lastSmsIndex + 1) % 4;

        const message = generateDidNotBookCallSms(
          { firstName: opp.contactFirstName },
          nextIndex
        );

        const result = await sendSms(opp.contactPhone, message);

        if (result.success) {
          // Update opportunity with new SMS index and timestamp
          await ctx.runMutation(internal.autoSms.updateOpportunitySmsTracking, {
            opportunityId: opp.opportunityId,
            smsIndex: nextIndex,
            sentAt: Date.now(),
          });
        }

        results.push({
          opportunityId: opp.opportunityId,
          success: result.success,
          templateIndex: nextIndex,
          error: result.error,
        });

        // Small delay between messages to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    console.log("[Auto SMS] Did Not Book Call follow-ups completed:", results);
    return { totalSent: results.filter((r) => r.success).length, results };
  },
});

/**
 * Send follow-up SMS to "Follow Up" stage opportunities
 * Called by cron job twice a week
 */
export const sendFollowUpStageFollowUps = internalAction({
  args: {},
  handler: async (ctx) => {
    const opportunities = await ctx.runQuery(internal.autoSms.getFollowUpStageOpportunities, {});

    console.log(`[Auto SMS] Found ${opportunities.length} opportunities in 'follow_up' stage`);

    const results: Array<{
      opportunityId: string;
      success: boolean;
      templateIndex: number;
      error?: string;
    }> = [];

    for (const opp of opportunities) {
      if (opp.contactPhone && opp.contactFirstName) {
        // Rotate to next template
        const nextIndex = (opp.lastSmsIndex + 1) % 4;

        const message = generateFollowUpStageSms(
          {
            firstName: opp.contactFirstName,
            consultantName: opp.consultantName,
            consultantPhone: opp.consultantPhone,
          },
          nextIndex
        );

        const result = await sendSms(opp.contactPhone, message);

        if (result.success) {
          // Update opportunity with new SMS index and timestamp
          await ctx.runMutation(internal.autoSms.updateOpportunitySmsTracking, {
            opportunityId: opp.opportunityId,
            smsIndex: nextIndex,
            sentAt: Date.now(),
          });
        }

        results.push({
          opportunityId: opp.opportunityId,
          success: result.success,
          templateIndex: nextIndex,
          error: result.error,
        });

        // Small delay between messages to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    console.log("[Auto SMS] Follow Up stage follow-ups completed:", results);
    return { totalSent: results.filter((r) => r.success).length, results };
  },
});

/**
 * Combined cron job action that sends follow-up SMS for both stages
 * This is called twice a week (e.g., Monday and Thursday at 9 AM)
 */
export const sendScheduledFollowUpSms = internalAction({
  args: {},
  handler: async (ctx): Promise<{
    didNotBookCall: { totalSent: number };
    followUpStage: { totalSent: number };
  }> => {
    console.log("[Auto SMS] Starting scheduled follow-up SMS...");

    // ====================================
    // Process "Did Not Book Call" opportunities
    // ====================================
    const didNotBookOpps = await ctx.runQuery(internal.autoSms.getDidNotBookCallOpportunities, {});
    console.log(`[Auto SMS] Found ${didNotBookOpps.length} opportunities in 'did_not_book_call' stage`);

    let didNotBookSent = 0;
    for (const opp of didNotBookOpps) {
      if (opp.contactPhone && opp.contactFirstName) {
        const nextIndex = (opp.lastSmsIndex + 1) % 4;
        const message = generateDidNotBookCallSms({ firstName: opp.contactFirstName }, nextIndex);
        const result = await sendSms(opp.contactPhone, message);

        if (result.success) {
          await ctx.runMutation(internal.autoSms.updateOpportunitySmsTracking, {
            opportunityId: opp.opportunityId,
            smsIndex: nextIndex,
            sentAt: Date.now(),
          });
          didNotBookSent++;
        }
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    // ====================================
    // Process "Follow Up" stage opportunities
    // ====================================
    const followUpOpps = await ctx.runQuery(internal.autoSms.getFollowUpStageOpportunities, {});
    console.log(`[Auto SMS] Found ${followUpOpps.length} opportunities in 'follow_up' stage`);

    let followUpSent = 0;
    for (const opp of followUpOpps) {
      if (opp.contactPhone && opp.contactFirstName) {
        const nextIndex = (opp.lastSmsIndex + 1) % 4;
        const message = generateFollowUpStageSms(
          {
            firstName: opp.contactFirstName,
            consultantName: opp.consultantName,
            consultantPhone: opp.consultantPhone,
          },
          nextIndex
        );
        const result = await sendSms(opp.contactPhone, message);

        if (result.success) {
          await ctx.runMutation(internal.autoSms.updateOpportunitySmsTracking, {
            opportunityId: opp.opportunityId,
            smsIndex: nextIndex,
            sentAt: Date.now(),
          });
          followUpSent++;
        }
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    console.log("[Auto SMS] Scheduled follow-up SMS completed");
    return {
      didNotBookCall: { totalSent: didNotBookSent },
      followUpStage: { totalSent: followUpSent },
    };
  },
});
