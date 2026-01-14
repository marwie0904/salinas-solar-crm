/**
 * Receipts Module
 * Handles receipt generation and sending when opportunities are closed
 */

import { v } from "convex/values";
import { internalAction, internalQuery, internalMutation } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { generateReceiptPdf, formatDateForReceiptPdf } from "./lib/receiptPdfGenerator";
import { getFullName } from "./lib/helpers";

/**
 * Internal query to get receipt data for PDF generation
 */
export const getReceiptData = internalQuery({
  args: {
    opportunityId: v.id("opportunities"),
  },
  handler: async (ctx, args) => {
    const opportunity = await ctx.db.get(args.opportunityId);
    if (!opportunity) return null;

    const contact = await ctx.db.get(opportunity.contactId);

    // Get the signed agreement for this opportunity (if any)
    const agreement = await ctx.db
      .query("agreements")
      .withIndex("by_opportunity", (q) => q.eq("opportunityId", args.opportunityId))
      .filter((q) => q.eq(q.field("status"), "signed"))
      .first();

    // Get total paid amount from invoices
    const invoices = await ctx.db
      .query("invoices")
      .withIndex("by_opportunity", (q) => q.eq("opportunityId", args.opportunityId))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect();

    const totalPaid = invoices.reduce((sum, inv) => sum + inv.amountPaid, 0);
    const totalAmount = agreement?.totalAmount || opportunity.estimatedValue;

    return {
      opportunity,
      contact,
      contactId: opportunity.contactId,
      agreement,
      totalPaid,
      totalAmount,
    };
  },
});

/**
 * Internal mutation to create receipt document record
 */
export const createReceiptDocument = internalMutation({
  args: {
    name: v.string(),
    mimeType: v.string(),
    storageId: v.string(),
    fileSize: v.optional(v.number()),
    opportunityId: v.id("opportunities"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const url = await ctx.storage.getUrl(args.storageId);

    const documentId = await ctx.db.insert("documents", {
      name: args.name,
      mimeType: args.mimeType,
      storageId: args.storageId,
      url: url ?? undefined,
      fileSize: args.fileSize,
      opportunityId: args.opportunityId,
      isDeleted: false,
      createdAt: now,
    });

    return documentId;
  },
});

/**
 * Internal action to generate receipt PDF, save it, and send email + SMS
 * Called when an opportunity is moved to "closed" stage
 */
export const sendReceiptOnClose = internalAction({
  args: {
    opportunityId: v.id("opportunities"),
  },
  handler: async (ctx, args): Promise<{ success: boolean; emailSent?: boolean; smsSent?: boolean; error?: string }> => {
    console.log("[Send Receipt] Starting receipt generation for opportunity:", args.opportunityId);

    // Get receipt data
    const data = await ctx.runQuery(internal.receipts.getReceiptData, {
      opportunityId: args.opportunityId,
    });

    if (!data) {
      console.error("[Send Receipt] Opportunity data not found");
      return { success: false, error: "Opportunity data not found" };
    }

    const { opportunity, contact, contactId, agreement, totalAmount } = data;

    if (!contact) {
      console.error("[Send Receipt] Contact not found");
      return { success: false, error: "Contact not found" };
    }

    if (!contact.email) {
      console.error("[Send Receipt] Contact has no email");
      return { success: false, error: "Contact has no email address" };
    }

    try {
      // Generate receipt number (format: RCP-YYYYMM-XXXX)
      const date = new Date();
      const yearMonth = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}`;
      const receiptNumber = `RCP-${yearMonth}-${Date.now().toString().slice(-4)}`;

      // Generate PDF
      console.log("[Send Receipt] Generating PDF...");
      const pdfBytes = await generateReceiptPdf({
        receiptNumber,
        receiptDate: formatDateForReceiptPdf(Date.now()),
        issuedTo: {
          name: getFullName(contact.firstName, contact.lastName),
          address: contact.address || "No address provided",
        },
        projectName: opportunity.name,
        projectLocation: agreement?.projectLocation || opportunity.location || "N/A",
        description: `Solar Installation - ${agreement?.systemType === "hybrid" ? "Hybrid System" : "Grid-Tied System"} (${agreement?.systemSize || "N/A"} kW)`,
        totalAmount,
        notes: "Thank you for your business!",
      });

      console.log("[Send Receipt] PDF generated, size:", pdfBytes.byteLength);

      // Upload to storage
      console.log("[Send Receipt] Uploading PDF...");
      const uploadUrl = await ctx.storage.generateUploadUrl();
      const pdfBlob = new Blob([pdfBytes as BlobPart], { type: "application/pdf" });

      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": "application/pdf" },
        body: pdfBlob,
      });

      if (!uploadResponse.ok) {
        console.error("[Send Receipt] Upload failed:", uploadResponse.status);
        return { success: false, error: "Failed to upload PDF" };
      }

      const { storageId } = await uploadResponse.json();
      console.log("[Send Receipt] PDF uploaded, storageId:", storageId);

      // Create document record
      const customerName = getFullName(contact.firstName, contact.lastName).replace(/[^a-zA-Z0-9]/g, "_");
      const filename = `Receipt_${receiptNumber}_${customerName}.pdf`;

      await ctx.runMutation(internal.receipts.createReceiptDocument, {
        name: filename,
        mimeType: "application/pdf",
        storageId,
        fileSize: pdfBytes.byteLength,
        opportunityId: args.opportunityId,
      });

      console.log("[Send Receipt] Document record created");

      // Convert PDF to base64 for email attachment
      const pdfBase64 = btoa(
        Array.from(pdfBytes)
          .map((byte) => String.fromCharCode(byte))
          .join("")
      );

      // Send email with PDF attachment
      console.log("[Send Receipt] Sending email to:", contact.email);
      const emailResult: { success: boolean; emailId?: string; error?: string } = await ctx.runAction(api.email.sendReceiptEmail, {
        to: contact.email,
        firstName: contact.firstName,
        pdfBase64,
        pdfFilename: filename,
      });

      let emailSent = false;
      if (emailResult.success) {
        console.log("[Send Receipt] Email sent successfully");
        emailSent = true;
      } else {
        console.error("[Send Receipt] Email failed:", emailResult.error);
      }

      // Send SMS notification
      let smsSent = false;
      if (contact.phone) {
        console.log("[Send Receipt] Sending SMS to:", contact.phone);
        await ctx.scheduler.runAfter(0, internal.autoSms.internalSendReceiptSentSms, {
          phoneNumber: contact.phone,
          firstName: contact.firstName,
          email: contact.email,
          contactId: contactId,
        });
        smsSent = true;
        console.log("[Send Receipt] SMS scheduled");
      }

      return { success: true, emailSent, smsSent };
    } catch (error) {
      console.error("[Send Receipt] Error:", error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  },
});
