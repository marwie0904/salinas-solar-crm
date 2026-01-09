/**
 * Server-side Receipt PDF Generator using pdf-lib
 * Used for auto-generating receipts when opportunities are closed
 */

import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export interface ReceiptPdfData {
  receiptNumber: string;
  receiptDate: string;
  issuedTo: {
    name: string;
    address: string;
  };
  projectName: string;
  projectLocation: string;
  description: string;
  totalAmount: number;
  notes?: string;
}

// Format currency for PDF
function formatCurrency(amount: number): string {
  const formatted = new Intl.NumberFormat("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `PHP ${formatted}`;
}

/**
 * Generate receipt PDF using pdf-lib (server-side compatible)
 */
export async function generateReceiptPdf(data: ReceiptPdfData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 size in points
  const { width, height } = page.getSize();

  // Embed fonts
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Colors
  const brandOrange = rgb(255 / 255, 86 / 255, 3 / 255);
  const black = rgb(0, 0, 0);
  const gray = rgb(100 / 255, 100 / 255, 100 / 255);
  const lightGray = rgb(200 / 255, 200 / 255, 200 / 255);
  const green = rgb(34 / 255, 139 / 255, 34 / 255);

  // Margins
  const marginLeft = 56.7; // 20mm
  const marginRight = 56.7;
  const contentWidth = width - marginLeft - marginRight;

  let y = height - 56.7; // Start 20mm from top

  // Company info
  const companyName = "SALINAS SOLAR SERVICES";
  const companyFullName = "Salinas Solar Enterprises Corporation";
  const companyAddress = "Roman Superhighway, Brgy. Bilolo, Orion, Bataan";

  // ===== HEADER - Company Name =====
  page.drawText(companyName, {
    x: marginLeft,
    y,
    size: 18,
    font: helveticaBold,
    color: brandOrange,
  });
  y -= 22;

  page.drawText(companyFullName, {
    x: marginLeft,
    y,
    size: 10,
    font: helvetica,
    color: gray,
  });
  y -= 14;

  page.drawText(companyAddress, {
    x: marginLeft,
    y,
    size: 10,
    font: helvetica,
    color: gray,
  });
  y -= 34;

  // ===== RECEIPT TITLE (right side) =====
  const receiptTitleX = width - marginRight;
  page.drawText("RECEIPT", {
    x: receiptTitleX - helveticaBold.widthOfTextAtSize("RECEIPT", 24),
    y: y + 45,
    size: 24,
    font: helveticaBold,
    color: green,
  });

  // Receipt details (right aligned)
  const receiptNumText = `Receipt #: ${data.receiptNumber}`;
  page.drawText(receiptNumText, {
    x: receiptTitleX - helvetica.widthOfTextAtSize(receiptNumText, 10),
    y: y + 25,
    size: 10,
    font: helvetica,
    color: gray,
  });

  const dateText = `Date: ${data.receiptDate}`;
  page.drawText(dateText, {
    x: receiptTitleX - helvetica.widthOfTextAtSize(dateText, 10),
    y: y + 11,
    size: 10,
    font: helvetica,
    color: gray,
  });

  y -= 30;

  // ===== HORIZONTAL LINE =====
  page.drawLine({
    start: { x: marginLeft, y },
    end: { x: width - marginRight, y },
    thickness: 0.5,
    color: lightGray,
  });
  y -= 28;

  // ===== ISSUED FROM / ISSUED TO =====
  const colWidth = contentWidth / 2;

  page.drawText("ISSUED FROM:", {
    x: marginLeft,
    y,
    size: 10,
    font: helveticaBold,
    color: gray,
  });

  page.drawText("ISSUED TO:", {
    x: marginLeft + colWidth + 28,
    y,
    size: 10,
    font: helveticaBold,
    color: gray,
  });
  y -= 17;

  page.drawText(companyFullName, {
    x: marginLeft,
    y,
    size: 10,
    font: helvetica,
    color: black,
  });

  page.drawText(data.issuedTo.name, {
    x: marginLeft + colWidth + 28,
    y,
    size: 10,
    font: helvetica,
    color: black,
  });
  y -= 14;

  page.drawText(companyAddress, {
    x: marginLeft,
    y,
    size: 10,
    font: helvetica,
    color: black,
  });

  // Split address into multiple lines if needed
  const addressLines = data.issuedTo.address.split(",").map((s) => s.trim());
  let addressY = y;
  for (const line of addressLines) {
    page.drawText(line, {
      x: marginLeft + colWidth + 28,
      y: addressY,
      size: 10,
      font: helvetica,
      color: black,
    });
    addressY -= 14;
  }

  y -= Math.max(addressLines.length * 14, 28);

  // ===== HORIZONTAL LINE =====
  page.drawLine({
    start: { x: marginLeft, y },
    end: { x: width - marginRight, y },
    thickness: 0.5,
    color: lightGray,
  });
  y -= 28;

  // ===== PROJECT =====
  page.drawText("PROJECT:", {
    x: marginLeft,
    y,
    size: 10,
    font: helveticaBold,
    color: gray,
  });

  page.drawText(data.projectName, {
    x: marginLeft + 70,
    y,
    size: 10,
    font: helvetica,
    color: black,
  });
  y -= 17;

  page.drawText("LOCATION:", {
    x: marginLeft,
    y,
    size: 10,
    font: helveticaBold,
    color: gray,
  });

  page.drawText(data.projectLocation, {
    x: marginLeft + 70,
    y,
    size: 10,
    font: helvetica,
    color: black,
  });
  y -= 28;

  // ===== DESCRIPTION =====
  page.drawText("DESCRIPTION:", {
    x: marginLeft,
    y,
    size: 10,
    font: helveticaBold,
    color: gray,
  });
  y -= 17;

  page.drawText(data.description, {
    x: marginLeft,
    y,
    size: 10,
    font: helvetica,
    color: black,
  });
  y -= 40;

  // ===== TOTAL AMOUNT =====
  page.drawLine({
    start: { x: width - marginRight - 200, y },
    end: { x: width - marginRight, y },
    thickness: 0.5,
    color: lightGray,
  });
  y -= 25;

  // Total (highlighted in green for receipt)
  page.drawRectangle({
    x: width - marginRight - 200,
    y: y - 5,
    width: 200,
    height: 30,
    color: green,
  });

  page.drawText("TOTAL PAID:", {
    x: width - marginRight - 190,
    y: y + 5,
    size: 12,
    font: helveticaBold,
    color: rgb(1, 1, 1),
  });

  const totalText = formatCurrency(data.totalAmount);
  page.drawText(totalText, {
    x: width - marginRight - 10 - helveticaBold.widthOfTextAtSize(totalText, 12),
    y: y + 5,
    size: 12,
    font: helveticaBold,
    color: rgb(1, 1, 1),
  });

  y -= 50;

  // ===== PAYMENT STATUS =====
  const paidText = "PAID IN FULL";
  const paidWidth = helveticaBold.widthOfTextAtSize(paidText, 16);
  page.drawText(paidText, {
    x: (width - paidWidth) / 2,
    y,
    size: 16,
    font: helveticaBold,
    color: green,
  });

  y -= 40;

  // ===== NOTES =====
  if (data.notes) {
    page.drawText("NOTES:", {
      x: marginLeft,
      y,
      size: 10,
      font: helveticaBold,
      color: gray,
    });
    y -= 17;

    page.drawText(data.notes, {
      x: marginLeft,
      y,
      size: 10,
      font: helvetica,
      color: black,
    });
    y -= 28;
  }

  // ===== FOOTER =====
  const footerText = "Thank you for choosing Salinas Solar!";
  page.drawText(footerText, {
    x: (width - helvetica.widthOfTextAtSize(footerText, 10)) / 2,
    y: 60,
    size: 10,
    font: helveticaBold,
    color: brandOrange,
  });

  const footerSubtext = "This receipt serves as proof of completed transaction.";
  page.drawText(footerSubtext, {
    x: (width - helvetica.widthOfTextAtSize(footerSubtext, 8)) / 2,
    y: 42,
    size: 8,
    font: helvetica,
    color: rgb(150 / 255, 150 / 255, 150 / 255),
  });

  // Save and return PDF bytes
  return await pdfDoc.save();
}

/**
 * Helper to format a timestamp into date string for PDF
 */
export function formatDateForReceiptPdf(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
