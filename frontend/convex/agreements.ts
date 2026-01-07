import { v } from "convex/values";
import { mutation, query, action, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

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
    await ctx.db.patch(args.agreementId, {
      status: "sent",
      sentAt: now,
      updatedAt: now,
    });
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
    await ctx.db.patch(args.agreementId, {
      status: "signed",
      signatureData: args.signatureData,
      signedAt: now,
      signedByName: args.signedByName,
      signedByIp: args.signedByIp,
      signedDocumentId: args.signedDocumentId,
      updatedAt: now,
    });
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
            console.log("[Sign Agreement] PDF loaded, pages:", pages.length);

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

            // Calculate signature dimensions (max 200x80)
            const sigDims = signatureImage.scale(1);
            const maxWidth = 200;
            const maxHeight = 80;
            const scale = Math.min(maxWidth / sigDims.width, maxHeight / sigDims.height, 1);
            const sigWidth = sigDims.width * scale;
            const sigHeight = sigDims.height * scale;
            console.log("[Sign Agreement] Signature dimensions:", sigWidth, "x", sigHeight);

            // Add signature at the bottom of the last page
            lastPage.drawImage(signatureImage, {
              x: 72, // 1 inch from left
              y: 120, // Near bottom
              width: sigWidth,
              height: sigHeight,
            });

            // Add signer name and date below signature
            const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
            const signedDate = new Date().toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            });

            lastPage.drawText(args.signedByName, {
              x: 72,
              y: 100,
              size: 10,
              font,
              color: rgb(0, 0, 0),
            });

            lastPage.drawText(`Signed: ${signedDate}`, {
              x: 72,
              y: 85,
              size: 9,
              font,
              color: rgb(0.4, 0.4, 0.4),
            });
            console.log("[Sign Agreement] Text added to PDF");

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
