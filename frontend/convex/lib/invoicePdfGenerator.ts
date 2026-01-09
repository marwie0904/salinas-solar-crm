/**
 * Server-side Invoice PDF Generator using pdf-lib
 * Used for auto-generating invoices when agreements are signed
 */

import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export interface InvoicePdfData {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  billedTo: {
    name: string;
    address: string;
  };
  opportunityName: string;
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
  subtotal: number;
  total: number;
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

// Format date for display
function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Generate invoice PDF using pdf-lib (server-side compatible)
 */
export async function generateInvoicePdf(data: InvoicePdfData): Promise<Uint8Array> {
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

  // ===== INVOICE TITLE (right side) =====
  const invoiceTitleX = width - marginRight;
  page.drawText("INVOICE", {
    x: invoiceTitleX - helveticaBold.widthOfTextAtSize("INVOICE", 24),
    y: y + 45,
    size: 24,
    font: helveticaBold,
    color: black,
  });

  // Invoice details (right aligned)
  const invoiceNumText = `Invoice #: ${data.invoiceNumber}`;
  page.drawText(invoiceNumText, {
    x: invoiceTitleX - helvetica.widthOfTextAtSize(invoiceNumText, 10),
    y: y + 25,
    size: 10,
    font: helvetica,
    color: gray,
  });

  const dateText = `Date: ${data.invoiceDate}`;
  page.drawText(dateText, {
    x: invoiceTitleX - helvetica.widthOfTextAtSize(dateText, 10),
    y: y + 11,
    size: 10,
    font: helvetica,
    color: gray,
  });

  const dueDateText = `Due Date: ${data.dueDate}`;
  page.drawText(dueDateText, {
    x: invoiceTitleX - helvetica.widthOfTextAtSize(dueDateText, 10),
    y: y - 3,
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

  // ===== BILLED FROM / BILLED TO =====
  const colWidth = contentWidth / 2;

  page.drawText("BILLED FROM:", {
    x: marginLeft,
    y,
    size: 10,
    font: helveticaBold,
    color: gray,
  });

  page.drawText("BILLED TO:", {
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

  page.drawText(data.billedTo.name, {
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

  // Split address into multiple lines if needed (simple approach)
  const addressLines = data.billedTo.address.split(",").map((s) => s.trim());
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
  if (data.opportunityName) {
    page.drawText("PROJECT:", {
      x: marginLeft,
      y,
      size: 10,
      font: helveticaBold,
      color: gray,
    });

    page.drawText(data.opportunityName, {
      x: marginLeft + 70,
      y,
      size: 10,
      font: helvetica,
      color: black,
    });
    y -= 28;
  }

  // ===== LINE ITEMS TABLE =====
  // Table header
  page.drawText("Description", {
    x: marginLeft,
    y,
    size: 10,
    font: helveticaBold,
    color: gray,
  });

  page.drawText("Qty", {
    x: width - marginRight - 180,
    y,
    size: 10,
    font: helveticaBold,
    color: gray,
  });

  page.drawText("Unit Price", {
    x: width - marginRight - 120,
    y,
    size: 10,
    font: helveticaBold,
    color: gray,
  });

  page.drawText("Total", {
    x: width - marginRight - 50,
    y,
    size: 10,
    font: helveticaBold,
    color: gray,
  });

  y -= 17;

  // Table line
  page.drawLine({
    start: { x: marginLeft, y: y + 5 },
    end: { x: width - marginRight, y: y + 5 },
    thickness: 0.5,
    color: lightGray,
  });

  // Line items
  for (const item of data.lineItems) {
    page.drawText(item.description, {
      x: marginLeft,
      y,
      size: 10,
      font: helvetica,
      color: black,
    });

    page.drawText(item.quantity.toString(), {
      x: width - marginRight - 175,
      y,
      size: 10,
      font: helvetica,
      color: black,
    });

    page.drawText(formatCurrency(item.unitPrice), {
      x: width - marginRight - 120,
      y,
      size: 10,
      font: helvetica,
      color: black,
    });

    const totalText = formatCurrency(item.lineTotal);
    page.drawText(totalText, {
      x: width - marginRight - helvetica.widthOfTextAtSize(totalText, 10),
      y,
      size: 10,
      font: helvetica,
      color: black,
    });

    y -= 20;
  }

  y -= 10;

  // ===== TOTALS =====
  page.drawLine({
    start: { x: width - marginRight - 200, y },
    end: { x: width - marginRight, y },
    thickness: 0.5,
    color: lightGray,
  });
  y -= 20;

  // Subtotal
  page.drawText("Subtotal:", {
    x: width - marginRight - 150,
    y,
    size: 10,
    font: helvetica,
    color: gray,
  });

  const subtotalText = formatCurrency(data.subtotal);
  page.drawText(subtotalText, {
    x: width - marginRight - helvetica.widthOfTextAtSize(subtotalText, 10),
    y,
    size: 10,
    font: helvetica,
    color: black,
  });
  y -= 20;

  // Total (highlighted)
  page.drawRectangle({
    x: width - marginRight - 200,
    y: y - 5,
    width: 200,
    height: 25,
    color: brandOrange,
  });

  page.drawText("TOTAL:", {
    x: width - marginRight - 190,
    y: y + 3,
    size: 12,
    font: helveticaBold,
    color: rgb(1, 1, 1),
  });

  const totalText = formatCurrency(data.total);
  page.drawText(totalText, {
    x: width - marginRight - 10 - helveticaBold.widthOfTextAtSize(totalText, 12),
    y: y + 3,
    size: 12,
    font: helveticaBold,
    color: rgb(1, 1, 1),
  });

  y -= 45;

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

  // ===== PAYMENT INSTRUCTIONS =====
  page.drawLine({
    start: { x: marginLeft, y },
    end: { x: width - marginRight, y },
    thickness: 0.5,
    color: lightGray,
  });
  y -= 22;

  page.drawText("PAYMENT INSTRUCTIONS:", {
    x: marginLeft,
    y,
    size: 10,
    font: helveticaBold,
    color: gray,
  });
  y -= 17;

  page.drawText("Bank: BPI", {
    x: marginLeft,
    y,
    size: 10,
    font: helvetica,
    color: black,
  });
  y -= 14;

  page.drawText("Account Name: SALINAS SOLAR ENTERPRISES CORPORATION", {
    x: marginLeft,
    y,
    size: 10,
    font: helvetica,
    color: black,
  });
  y -= 14;

  page.drawText("Account No.: 2291-0004-98", {
    x: marginLeft,
    y,
    size: 10,
    font: helvetica,
    color: black,
  });
  y -= 28;

  page.drawText("Please include the invoice number as reference when making payment.", {
    x: marginLeft,
    y,
    size: 9,
    font: helvetica,
    color: gray,
  });

  // ===== FOOTER =====
  const footerText = "Thank you for your business!";
  page.drawText(footerText, {
    x: (width - helvetica.widthOfTextAtSize(footerText, 8)) / 2,
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
export function formatDateForPdf(timestamp: number): string {
  return formatDate(timestamp);
}
