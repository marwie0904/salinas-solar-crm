import { v } from "convex/values";
import { mutation, query, action, internalMutation, internalQuery, internalAction } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { getFullName } from "./lib/helpers";
import { logStageChange } from "./lib/activityLogger";
import { shouldTransitionTo } from "./lib/stageOrder";
import { generateInvoicePdf, formatDateForPdf } from "./lib/invoicePdfGenerator";

// Generate a random signing token
function generateSigningToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

/**
 * Create a new agreement for signing
 */
export const create = mutation({
  args: {
    opportunityId: v.id("opportunities"),
    contactId: v.id("contacts"),
    documentId: v.optional(v.id("documents")),
    clientName: v.string(),
    clientAddress: v.string(),
    projectLocation: v.string(),
    systemType: v.string(),
    systemSize: v.number(),
    batteryCapacity: v.optional(v.number()),
    totalAmount: v.number(),
    agreementDate: v.string(),
    materialsJson: v.string(),
    paymentsJson: v.string(),
    phasesJson: v.optional(v.string()),
    warrantyTerms: v.optional(v.string()),
    additionalTerms: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const signingToken = generateSigningToken();

    // Set expiry to 30 days from now
    const expiresAt = now + (30 * 24 * 60 * 60 * 1000);

    const agreementId = await ctx.db.insert("agreements", {
      signingToken,
      opportunityId: args.opportunityId,
      contactId: args.contactId,
      documentId: args.documentId,
      clientName: args.clientName,
      clientAddress: args.clientAddress,
      projectLocation: args.projectLocation,
      systemType: args.systemType,
      systemSize: args.systemSize,
      batteryCapacity: args.batteryCapacity,
      totalAmount: args.totalAmount,
      agreementDate: args.agreementDate,
      materialsJson: args.materialsJson,
      paymentsJson: args.paymentsJson,
      phasesJson: args.phasesJson,
      warrantyTerms: args.warrantyTerms,
      additionalTerms: args.additionalTerms,
      status: "pending",
      expiresAt,
      createdAt: now,
      updatedAt: now,
    });

    return { agreementId, signingToken };
  },
});

/**
 * Mark agreement as sent (after email is sent)
 */
export const markSent = mutation({
  args: {
    agreementId: v.id("agreements"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Get agreement details for SMS
    const agreement = await ctx.db.get(args.agreementId);
    if (!agreement) {
      throw new Error("Agreement not found");
    }

    await ctx.db.patch(args.agreementId, {
      status: "sent",
      sentAt: now,
      updatedAt: now,
    });

    // Send agreement sent SMS notification
    const contact = await ctx.db.get(agreement.contactId);
    if (contact?.phone && contact?.email) {
      await ctx.scheduler.runAfter(0, internal.autoSms.internalSendAgreementSentSms, {
        phoneNumber: contact.phone,
        firstName: contact.firstName,
        email: contact.email,
        contactId: agreement.contactId,
      });

      // Schedule 3-day reminder if not signed
      const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
      await ctx.scheduler.runAfter(threeDaysMs, internal.autoSms.internalCheckAndSendAgreementReminder, {
        agreementId: args.agreementId,
        phoneNumber: contact.phone,
        firstName: contact.firstName,
        contactId: agreement.contactId,
      });
    }

    // Auto-transition opportunity to "contract_sent" stage
    const opportunity = await ctx.db.get(agreement.opportunityId);
    if (opportunity && shouldTransitionTo(opportunity.stage, "contract_sent")) {
      const previousStage = opportunity.stage;
      await ctx.db.patch(agreement.opportunityId, {
        stage: "contract_sent",
        updatedAt: now,
      });
      await logStageChange(
        ctx,
        agreement.opportunityId,
        previousStage,
        "contract_sent",
        undefined // System-triggered
      );
    }
  },
});

/**
 * Get agreement by signing token (public - no auth required)
 */
export const getByToken = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const agreement = await ctx.db
      .query("agreements")
      .withIndex("by_signing_token", (q) => q.eq("signingToken", args.token))
      .first();

    if (!agreement) {
      return null;
    }

    // Check if expired
    const isExpired = Boolean(agreement.expiresAt && agreement.expiresAt < Date.now());

    // Parse JSON fields and return consistent shape
    return {
      ...agreement,
      materials: JSON.parse(agreement.materialsJson),
      payments: JSON.parse(agreement.paymentsJson),
      phases: agreement.phasesJson ? JSON.parse(agreement.phasesJson) : [],
      isExpired,
    };
  },
});

/**
 * Get agreement by token (internal - returns raw data for actions)
 */
export const getByTokenInternal = internalQuery({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const agreement = await ctx.db
      .query("agreements")
      .withIndex("by_signing_token", (q) => q.eq("signingToken", args.token))
      .first();

    return agreement;
  },
});

/**
 * Get document by ID (internal - for actions)
 */
export const getDocumentInternal = internalQuery({
  args: {
    id: v.id("documents"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/**
 * Get contact by ID (internal - for actions)
 */
export const getContactInternal = internalQuery({
  args: {
    id: v.id("contacts"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/**
 * Mark agreement as viewed (when client opens the signing page)
 */
export const markViewed = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const agreement = await ctx.db
      .query("agreements")
      .withIndex("by_signing_token", (q) => q.eq("signingToken", args.token))
      .first();

    if (!agreement) {
      throw new Error("Agreement not found");
    }

    // Only update if not already viewed or signed
    if (agreement.status === "sent" || agreement.status === "pending") {
      const now = Date.now();
      await ctx.db.patch(agreement._id, {
        status: "viewed",
        viewedAt: now,
        updatedAt: now,
      });
    }
  },
});

/**
 * Internal mutation to update agreement after signing
 */
export const updateSignedAgreement = internalMutation({
  args: {
    agreementId: v.id("agreements"),
    signatureData: v.string(),
    signedByName: v.string(),
    signedByIp: v.optional(v.string()),
    signedDocumentId: v.optional(v.id("documents")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Get agreement details for notification
    const agreement = await ctx.db.get(args.agreementId);

    await ctx.db.patch(args.agreementId, {
      status: "signed",
      signatureData: args.signatureData,
      signedAt: now,
      signedByName: args.signedByName,
      signedByIp: args.signedByIp,
      signedDocumentId: args.signedDocumentId,
      updatedAt: now,
    });

    // Create notification for the opportunity owner (system consultant)
    if (agreement) {
      const opportunity = await ctx.db.get(agreement.opportunityId);
      if (opportunity?.assignedTo) {
        await ctx.db.insert("notifications", {
          userId: opportunity.assignedTo,
          type: "agreement_approved",
          title: "Agreement Approved",
          message: `${agreement.clientName} signed the agreement on ${opportunity.name}`,
          agreementId: args.agreementId,
          opportunityId: agreement.opportunityId,
          contactId: agreement.contactId,
          read: false,
          createdAt: now,
        });
      }

      // Notify all project managers about the signed agreement
      if (opportunity) {
        await ctx.scheduler.runAfter(0, internal.teamNotifications.notifyProjectManagersAgreementSigned, {
          clientName: agreement.clientName,
          opportunityName: opportunity.name,
          opportunityId: agreement.opportunityId,
        });
      }

      // Auto-transition opportunity to "for_installation" stage
      if (opportunity && shouldTransitionTo(opportunity.stage, "for_installation")) {
        const previousStage = opportunity.stage;
        await ctx.db.patch(agreement.opportunityId, {
          stage: "for_installation",
          updatedAt: now,
        });
        await logStageChange(
          ctx,
          agreement.opportunityId,
          previousStage,
          "for_installation",
          undefined // System-triggered
        );

        // Notify operations team about the installation stage
        const contact = await ctx.db.get(agreement.contactId);
        const location = opportunity.location || contact?.address || "Not specified";

        await ctx.scheduler.runAfter(0, internal.teamNotifications.notifyOperationsTeamInstallation, {
          clientName: agreement.clientName,
          opportunityName: opportunity.name,
          opportunityId: agreement.opportunityId,
          location,
        });
      }
    }

    return { success: true, signedAt: now };
  },
});

/**
 * Internal mutation to create signed document record
 */
export const createSignedDocument = internalMutation({
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
 * Sign the agreement (action that generates signed PDF and creates document)
 */
export const sign = action({
  args: {
    token: v.string(),
    signatureData: v.string(), // Base64 encoded signature image (data URL)
    signedByName: v.string(),
    signedByIp: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ success: boolean; signedAt: number; signedDocumentUrl?: string; error?: string }> => {
    console.log("[Sign Agreement] Starting sign action for token:", args.token.substring(0, 8) + "...");
    console.log("[Sign Agreement] Signer name:", args.signedByName);

    // Get the agreement
    const agreement = await ctx.runQuery(internal.agreements.getByTokenInternal, {
      token: args.token,
    });

    console.log("[Sign Agreement] Agreement found:", agreement ? "Yes" : "No");

    if (!agreement) {
      throw new Error("Agreement not found");
    }

    console.log("[Sign Agreement] Agreement ID:", agreement._id);
    console.log("[Sign Agreement] Agreement status:", agreement.status);
    console.log("[Sign Agreement] Agreement documentId:", agreement.documentId || "None");
    console.log("[Sign Agreement] Agreement opportunityId:", agreement.opportunityId);

    if (agreement.status === "signed") {
      throw new Error("Agreement has already been signed");
    }

    if (agreement.expiresAt && agreement.expiresAt < Date.now()) {
      throw new Error("Agreement has expired");
    }

    let signedDocumentId: Id<"documents"> | undefined;
    let signedDocumentUrl: string | undefined;

    // If there's an original document, create a signed version
    if (agreement.documentId) {
      console.log("[Sign Agreement] Original document exists, attempting to create signed version...");
      try {
        // Get the original document
        const originalDoc = await ctx.runQuery(internal.agreements.getDocumentInternal, {
          id: agreement.documentId,
        });

        console.log("[Sign Agreement] Original document fetched:", originalDoc ? "Yes" : "No");
        if (originalDoc) {
          console.log("[Sign Agreement] Original doc name:", originalDoc.name);
          console.log("[Sign Agreement] Original doc storageId:", originalDoc.storageId || "None");
        }

        if (originalDoc && originalDoc.storageId) {
          // Fetch the original PDF
          const pdfUrl = await ctx.storage.getUrl(originalDoc.storageId);
          console.log("[Sign Agreement] PDF URL obtained:", pdfUrl ? "Yes" : "No");

          if (pdfUrl) {
            console.log("[Sign Agreement] Fetching PDF from storage...");
            const pdfResponse = await fetch(pdfUrl);
            console.log("[Sign Agreement] PDF fetch response status:", pdfResponse.status);
            const pdfBytes = await pdfResponse.arrayBuffer();
            console.log("[Sign Agreement] PDF bytes received:", pdfBytes.byteLength);

            // Load the PDF
            console.log("[Sign Agreement] Loading PDF with pdf-lib...");
            const pdfDoc = await PDFDocument.load(pdfBytes);
            const pages = pdfDoc.getPages();
            const lastPage = pages[pages.length - 1];
            const { height: pageHeight } = lastPage.getSize();
            console.log("[Sign Agreement] PDF loaded, pages:", pages.length, "height:", pageHeight);

            // Extract signature image from data URL
            console.log("[Sign Agreement] Processing signature image...");
            const signatureBase64 = args.signatureData.replace(/^data:image\/\w+;base64,/, "");
            const signatureBytes = Uint8Array.from(atob(signatureBase64), (c) => c.charCodeAt(0));
            console.log("[Sign Agreement] Signature bytes:", signatureBytes.byteLength);

            // Embed the signature image
            let signatureImage;
            if (args.signatureData.includes("image/png")) {
              console.log("[Sign Agreement] Embedding PNG signature...");
              signatureImage = await pdfDoc.embedPng(signatureBytes);
            } else {
              console.log("[Sign Agreement] Embedding JPG signature...");
              signatureImage = await pdfDoc.embedJpg(signatureBytes);
            }
            console.log("[Sign Agreement] Signature embedded successfully");

            // Calculate signature dimensions (scaled for good visibility)
            const sigDims = signatureImage.scale(1);
            const maxWidth = 100; // Compact width for signature
            const maxHeight = 40; // Compact height for signature
            const scale = Math.min(maxWidth / sigDims.width, maxHeight / sigDims.height, 1);
            const sigWidth = sigDims.width * scale;
            const sigHeight = sigDims.height * scale;
            console.log("[Sign Agreement] Signature dimensions:", sigWidth, "x", sigHeight);

            // Position for "FOR THE CLIENT:" section (right column in two-column layout)
            // The PDF generator uses jsPDF with mm from top, pdf-lib uses points from bottom
            // A4 page: 297mm height = 841.89 points, width = 210mm = 595.28 points
            // 1mm = 2.835 points
            //
            // PDF Generator layout (pdf-generator.ts):
            // - marginLeft = 25mm, marginTop = 20mm, marginBottom = 25mm
            // - contentWidth = 160mm, colWidth = 70mm
            // - Right column starts at: marginLeft + colWidth + 20 = 115mm = 326 points
            //
            // Signature section structure (from signatureStartY):
            // - +0mm: "FOR THE CLIENT:"
            // - +5mm: Client name (uppercase)
            // - +25mm: Signature line (after 20mm gap for signature)
            // - +30mm: Client name (normal case)
            // - +35mm: "Client / Property Owner"
            // - +45mm: "Date: ____________________"
            //
            // The signature section has checkPageBreak(90) before it:
            // - If page break triggered: signature section starts at marginTop (20mm from top)
            // - If no page break: signature section is above marginBottom (25mm from bottom)

            // Get page dimensions
            const { width: pageWidth } = lastPage.getSize();

            // Right column X position (115mm from left = ~326 points)
            const rightColX = 326;
            // Signature placed slightly indented in the signature area
            const signatureX = rightColX + 5;
            // Date text appears after "Date: " label (~12mm / ~34 points from column start)
            const dateX = rightColX + 40;

            // Determine positioning based on page count and layout
            // The checkPageBreak(90) in pdf-generator.ts triggers a new page if less than 90mm available
            // For most contracts (3+ pages), the signature section is on a new page starting at top

            let signatureY: number;
            let dateY: number;

            // Signature section total height is approximately 45mm
            // From signatureStartY to Date line = 45mm

            if (pages.length >= 3) {
              // Multi-page document: signature section likely starts at top of last page
              // signatureStartY ≈ marginTop = 20mm from top
              // Signature line at signatureStartY + 25mm = 45mm from top
              // Date line at signatureStartY + 45mm = 65mm from top
              console.log("[Sign Agreement] Multi-page document - positioning from top");

              const marginTop = 20; // mm
              const signatureStartY = marginTop; // mm from top

              // Convert to points from bottom (pdf-lib coordinate system)
              // Signature line is at signatureStartY + 25mm from top
              const sigLineFromTop = signatureStartY + 25; // mm from top
              // Place signature above the line
              signatureY = pageHeight - (sigLineFromTop * 2.835) + 5;

              // Date line is at signatureStartY + 45mm from top
              const dateLineFromTop = signatureStartY + 45; // mm from top
              dateY = pageHeight - (dateLineFromTop * 2.835) + 3;
            } else {
              // 1-2 page document: signature section is at bottom of last page
              // The section ends at marginBottom = 25mm from bottom
              // Date line is approximately 25-30mm from bottom
              // Signature line is approximately 45-50mm from bottom
              console.log("[Sign Agreement] Short document - positioning from bottom");

              // Positions from bottom of page
              const dateFromBottom = 30; // mm from bottom
              dateY = dateFromBottom * 2.835;

              const sigLineFromBottom = 50; // mm from bottom
              // Place signature so bottom edge is just above the line
              signatureY = sigLineFromBottom * 2.835;
            }

            console.log("[Sign Agreement] Page dimensions - width:", pageWidth, "height:", pageHeight);
            console.log("[Sign Agreement] Pages count:", pages.length);
            console.log("[Sign Agreement] Placing signature at x:", signatureX, "y:", signatureY);
            console.log("[Sign Agreement] Placing date at x:", dateX, "y:", dateY);

            // Add signature on the signature line in "FOR THE CLIENT:" section
            // pdf-lib uses bottom-left origin, so y is distance from bottom
            lastPage.drawImage(signatureImage, {
              x: signatureX,
              y: signatureY,
              width: sigWidth,
              height: sigHeight,
            });

            // Add date on the "Date:" line
            const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
            const signedDate = new Date().toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            });

            // Draw date after the "Date: " label
            lastPage.drawText(signedDate, {
              x: dateX,
              y: dateY,
              size: 11,
              font,
              color: rgb(0, 0, 0),
            });
            console.log("[Sign Agreement] Signature and date added to FOR THE CLIENT section");

            // Save the signed PDF
            console.log("[Sign Agreement] Saving signed PDF...");
            const signedPdfBytes = await pdfDoc.save();
            console.log("[Sign Agreement] Signed PDF bytes:", signedPdfBytes.byteLength);

            // Upload to storage
            console.log("[Sign Agreement] Generating upload URL...");
            const uploadUrl = await ctx.storage.generateUploadUrl();
            console.log("[Sign Agreement] Upload URL obtained");

            const pdfBlob = new Blob([signedPdfBytes as BlobPart], { type: "application/pdf" });
            console.log("[Sign Agreement] Uploading signed PDF...");
            const uploadResponse = await fetch(uploadUrl, {
              method: "POST",
              headers: { "Content-Type": "application/pdf" },
              body: pdfBlob,
            });
            console.log("[Sign Agreement] Upload response status:", uploadResponse.status);

            if (uploadResponse.ok) {
              const uploadResult = await uploadResponse.json();
              console.log("[Sign Agreement] Upload result:", JSON.stringify(uploadResult));
              const { storageId } = uploadResult;

              // Get the URL for the signed document
              signedDocumentUrl = await ctx.storage.getUrl(storageId) ?? undefined;
              console.log("[Sign Agreement] Signed document URL obtained:", signedDocumentUrl ? "Yes" : "No");

              // Create document name with -signed suffix
              const originalName = originalDoc.name.replace(/\.pdf$/i, "");
              const signedDocName = `${originalName}-signed.pdf`;
              console.log("[Sign Agreement] Creating document record:", signedDocName);

              // Create document record
              signedDocumentId = await ctx.runMutation(
                internal.agreements.createSignedDocument,
                {
                  name: signedDocName,
                  mimeType: "application/pdf",
                  storageId,
                  fileSize: signedPdfBytes.byteLength,
                  opportunityId: agreement.opportunityId,
                }
              );
              console.log("[Sign Agreement] Signed document created with ID:", signedDocumentId);
            } else {
              const errorText = await uploadResponse.text();
              console.error("[Sign Agreement] Upload failed:", uploadResponse.status, errorText);
            }
          }
        } else {
          console.log("[Sign Agreement] No original document or no storageId");
        }
      } catch (error) {
        console.error("[Sign Agreement] Error creating signed PDF:", error);
        // Continue without signed document - we'll still record the signature
      }
    } else {
      console.log("[Sign Agreement] No documentId on agreement, skipping signed PDF creation");
    }

    // Update the agreement with signature
    console.log("[Sign Agreement] Updating agreement with signature...");
    console.log("[Sign Agreement] signedDocumentId:", signedDocumentId || "None");
    const result = await ctx.runMutation(internal.agreements.updateSignedAgreement, {
      agreementId: agreement._id,
      signatureData: args.signatureData,
      signedByName: args.signedByName,
      signedByIp: args.signedByIp,
      signedDocumentId,
    });
    console.log("[Sign Agreement] Agreement updated successfully");
    console.log("[Sign Agreement] Returning signedDocumentUrl:", signedDocumentUrl || "None");

    // Send client notification with signed agreement PDF
    console.log("[Sign Agreement] Sending client notification...");
    const contact = await ctx.runQuery(internal.agreements.getContactInternal, {
      id: agreement.contactId,
    });

    if (contact) {
      // Get the signed PDF bytes if available
      let signedPdfBase64: string | undefined;
      let signedPdfFilename: string | undefined;

      if (signedDocumentUrl && signedDocumentId) {
        try {
          // Fetch the signed PDF to convert to base64 for email attachment
          const signedPdfResponse = await fetch(signedDocumentUrl);
          if (signedPdfResponse.ok) {
            const signedPdfArrayBuffer = await signedPdfResponse.arrayBuffer();
            const signedPdfBytesArray = new Uint8Array(signedPdfArrayBuffer);
            signedPdfBase64 = btoa(
              Array.from(signedPdfBytesArray)
                .map((byte) => String.fromCharCode(byte))
                .join("")
            );
            signedPdfFilename = `${agreement.clientName.replace(/[^a-zA-Z0-9]/g, "_")}_Signed_Agreement.pdf`;
            console.log("[Sign Agreement] Signed PDF converted to base64 for email attachment");
          }
        } catch (error) {
          console.error("[Sign Agreement] Error fetching signed PDF for email:", error);
        }
      }

      // Send client notification
      await ctx.runAction(internal.teamNotifications.notifyClientAgreementSigned, {
        contactPhone: contact.phone,
        contactEmail: contact.email,
        contactFirstName: contact.firstName,
        signedPdfBase64,
        signedPdfFilename,
      });
      console.log("[Sign Agreement] Client notification sent");
    } else {
      console.log("[Sign Agreement] No contact found, skipping client notification");
    }

    return { ...result, signedDocumentUrl };
  },
});

/**
 * Get agreement by ID (for internal use)
 */
export const get = query({
  args: {
    id: v.id("agreements"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/**
 * List agreements for an opportunity
 */
export const listByOpportunity = query({
  args: {
    opportunityId: v.id("opportunities"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("agreements")
      .withIndex("by_opportunity", (q) => q.eq("opportunityId", args.opportunityId))
      .order("desc")
      .collect();
  },
});

/**
 * List all agreements
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const agreements = await ctx.db
      .query("agreements")
      .withIndex("by_created_at")
      .order("desc")
      .collect();

    // Enrich with contact and opportunity data
    const enriched = await Promise.all(
      agreements.map(async (agreement) => {
        const [contact, opportunity] = await Promise.all([
          ctx.db.get(agreement.contactId),
          ctx.db.get(agreement.opportunityId),
        ]);
        return {
          ...agreement,
          contact,
          opportunity,
        };
      })
    );

    return enriched;
  },
});

/**
 * Internal query to get invoice data for PDF generation
 */
export const getInvoiceDataForPdf = internalQuery({
  args: {
    invoiceId: v.id("invoices"),
  },
  handler: async (ctx, args) => {
    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) return null;

    const opportunity = await ctx.db.get(invoice.opportunityId);
    if (!opportunity) return null;

    const contact = await ctx.db.get(opportunity.contactId);

    // Get line items
    const lineItems = await ctx.db
      .query("invoiceLineItems")
      .withIndex("by_invoice", (q) => q.eq("invoiceId", args.invoiceId))
      .collect();

    return {
      invoice,
      opportunity,
      contact,
      lineItems,
    };
  },
});

/**
 * Internal mutation to create invoice document record
 */
export const createInvoiceDocument = internalMutation({
  args: {
    name: v.string(),
    mimeType: v.string(),
    storageId: v.string(),
    fileSize: v.optional(v.number()),
    opportunityId: v.id("opportunities"),
    invoiceId: v.id("invoices"),
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
      invoiceId: args.invoiceId,
      isDeleted: false,
      createdAt: now,
    });

    return documentId;
  },
});

/**
 * Internal action to generate invoice PDF, save it, and send email
 * Called after an agreement is signed and invoice is created
 */
export const sendInvoiceFromAgreement = internalAction({
  args: {
    invoiceId: v.id("invoices"),
    contactEmail: v.string(),
    contactFirstName: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; emailSent?: boolean; error?: string }> => {
    console.log("[Send Invoice] Starting invoice send for:", args.invoiceId);

    // Get invoice data
    const data = await ctx.runQuery(internal.agreements.getInvoiceDataForPdf, {
      invoiceId: args.invoiceId,
    });

    if (!data) {
      console.error("[Send Invoice] Invoice data not found");
      return { success: false, error: "Invoice data not found" };
    }

    const { invoice, opportunity, contact, lineItems } = data;

    try {
      // Generate PDF
      console.log("[Send Invoice] Generating PDF...");
      const pdfBytes = await generateInvoicePdf({
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: formatDateForPdf(invoice.createdAt),
        dueDate: formatDateForPdf(invoice.dueDate),
        billedTo: {
          name: contact ? getFullName(contact.firstName, contact.lastName) : "Customer",
          address: contact?.address || "No address provided",
        },
        opportunityName: opportunity.name,
        lineItems: lineItems.map((item: { description: string; quantity: number; unitPrice: number; lineTotal: number }) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
        })),
        subtotal: invoice.subtotal,
        total: invoice.total,
        notes: invoice.notes,
      });

      console.log("[Send Invoice] PDF generated, size:", pdfBytes.byteLength);

      // Upload to storage
      console.log("[Send Invoice] Uploading PDF...");
      const uploadUrl = await ctx.storage.generateUploadUrl();
      const pdfBlob = new Blob([pdfBytes as BlobPart], { type: "application/pdf" });

      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": "application/pdf" },
        body: pdfBlob,
      });

      if (!uploadResponse.ok) {
        console.error("[Send Invoice] Upload failed:", uploadResponse.status);
        return { success: false, error: "Failed to upload PDF" };
      }

      const { storageId } = await uploadResponse.json();
      console.log("[Send Invoice] PDF uploaded, storageId:", storageId);

      // Create document record
      const customerName = contact ? getFullName(contact.firstName, contact.lastName).replace(/[^a-zA-Z0-9]/g, "_") : "Customer";
      const filename = `Invoice_${invoice.invoiceNumber}_${customerName}.pdf`;

      await ctx.runMutation(internal.agreements.createInvoiceDocument, {
        name: filename,
        mimeType: "application/pdf",
        storageId,
        fileSize: pdfBytes.byteLength,
        opportunityId: invoice.opportunityId,
        invoiceId: args.invoiceId,
      });

      console.log("[Send Invoice] Document record created");

      // Send email with PDF attachment
      if (args.contactEmail) {
        console.log("[Send Invoice] Sending email to:", args.contactEmail);

        // Convert PDF to base64 for email attachment
        const pdfBase64 = btoa(
          Array.from(pdfBytes)
            .map((byte) => String.fromCharCode(byte))
            .join("")
        );

        // Get the base URL from environment or use default
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.CONVEX_SITE_URL || "https://salinassolar.com";
        const invoiceUrl = `${baseUrl}/invoices`;

        const emailResult: { success: boolean; emailId?: string; error?: string } = await ctx.runAction(api.email.sendInvoiceEmail, {
          to: args.contactEmail,
          firstName: args.contactFirstName,
          invoiceUrl,
          pdfBase64,
          pdfFilename: filename,
        });

        if (emailResult.success) {
          console.log("[Send Invoice] Email sent successfully");
        } else {
          console.error("[Send Invoice] Email failed:", emailResult.error);
        }

        return { success: true, emailSent: emailResult.success };
      }

      return { success: true, emailSent: false };
    } catch (error) {
      console.error("[Send Invoice] Error:", error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  },
});
