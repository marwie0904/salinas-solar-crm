import jsPDF from "jspdf";
import {
  PaymentType,
  PaymentMethod,
  PAYMENT_TYPE_LABELS,
  PAYMENT_METHOD_LABELS,
} from "@/lib/types";

// Format currency for PDF (using PHP text instead of peso symbol to avoid jsPDF rendering issues)
function formatCurrencyForPDF(amount: number): string {
  const formatted = new Intl.NumberFormat("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `PHP ${formatted}`;
}

function formatDateLong(dateStr: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export interface InvoicePDFData {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  billedTo: {
    name: string;
    address: string;
  };
  opportunityName: string;
  paymentType: PaymentType;
  paymentMethod: PaymentMethod;
  total: number;
  installmentAmount?: number;
  numberOfInstallments?: number;
  notes?: string;
}

export interface GeneratedPDF {
  blob: Blob;
  filename: string;
  download: () => void;
}

export function generateInvoicePDF(data: InvoicePDFData): GeneratedPDF {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const marginLeft = 20;
  const marginRight = 20;
  const contentWidth = pageWidth - marginLeft - marginRight;
  let y = 20;

  // Company info
  const companyName = "SALINAS SOLAR SERVICES";
  const companyFullName = "Salinas Solar Enterprises Corporation";
  const companyAddress = "Roman Superhighway, Brgy. Bilolo, Orion, Bataan";
  const companyPhone = "";
  const companyEmail = "";

  // ===== HEADER - Company Name (Top Left) =====
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 86, 3); // Brand orange color
  doc.text(companyName, marginLeft, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(companyFullName, marginLeft, y);
  y += 5;
  doc.text(companyAddress, marginLeft, y);
  y += 12;

  // ===== INVOICE TITLE =====
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("INVOICE", pageWidth - marginRight, y, { align: "right" });
  y += 10;

  // Invoice Number and Date (right aligned)
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  doc.text(`Invoice #: ${data.invoiceNumber}`, pageWidth - marginRight, y, {
    align: "right",
  });
  y += 5;
  doc.text(
    `Date: ${formatDateLong(data.invoiceDate)}`,
    pageWidth - marginRight,
    y,
    { align: "right" }
  );
  y += 5;
  doc.text(
    `Due Date: ${formatDateLong(data.dueDate)}`,
    pageWidth - marginRight,
    y,
    { align: "right" }
  );
  y += 15;

  // ===== HORIZONTAL LINE =====
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(marginLeft, y, pageWidth - marginRight, y);
  y += 10;

  // ===== BILLED FROM / BILLED TO SECTION =====
  const colWidth = contentWidth / 2;

  // Billed From
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 100, 100);
  doc.text("BILLED FROM:", marginLeft, y);

  // Billed To
  doc.text("BILLED TO:", marginLeft + colWidth + 10, y);
  y += 6;

  // Company details
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  doc.text(companyFullName, marginLeft, y);
  doc.text(data.billedTo.name || "Customer", marginLeft + colWidth + 10, y);
  y += 5;

  // Wrap address text
  const fromAddressLines = doc.splitTextToSize(companyAddress, colWidth - 5);
  const toAddressLines = doc.splitTextToSize(
    data.billedTo.address || "No address provided",
    colWidth - 5
  );

  fromAddressLines.forEach((line: string, index: number) => {
    doc.text(line, marginLeft, y + index * 5);
  });

  toAddressLines.forEach((line: string, index: number) => {
    doc.text(line, marginLeft + colWidth + 10, y + index * 5);
  });

  y += Math.max(fromAddressLines.length, toAddressLines.length) * 5 + 10;

  // ===== HORIZONTAL LINE =====
  doc.setDrawColor(200, 200, 200);
  doc.line(marginLeft, y, pageWidth - marginRight, y);
  y += 10;

  // ===== PROJECT/OPPORTUNITY =====
  if (data.opportunityName) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 100, 100);
    doc.text("PROJECT:", marginLeft, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.text(data.opportunityName, marginLeft + 25, y);
    y += 10;
  }

  // ===== PAYMENT DETAILS BOX =====
  doc.setFillColor(248, 248, 248);
  doc.roundedRect(marginLeft, y, contentWidth, 50, 3, 3, "F");

  y += 8;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("PAYMENT DETAILS", marginLeft + 5, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  // Payment Type
  doc.setTextColor(100, 100, 100);
  doc.text("Payment Type:", marginLeft + 5, y);
  doc.setTextColor(0, 0, 0);
  doc.text(PAYMENT_TYPE_LABELS[data.paymentType], marginLeft + 45, y);
  y += 6;

  // Payment Method
  doc.setTextColor(100, 100, 100);
  doc.text("Payment Method:", marginLeft + 5, y);
  doc.setTextColor(0, 0, 0);
  doc.text(PAYMENT_METHOD_LABELS[data.paymentMethod], marginLeft + 45, y);
  y += 6;

  // Due Date
  doc.setTextColor(100, 100, 100);
  doc.text("Due Date:", marginLeft + 5, y);
  doc.setTextColor(0, 0, 0);
  doc.text(formatDateLong(data.dueDate), marginLeft + 45, y);
  y += 6;

  // Installment details (if applicable)
  if (
    data.paymentType === "installment" &&
    data.installmentAmount &&
    data.numberOfInstallments
  ) {
    doc.setTextColor(100, 100, 100);
    doc.text("Installment Amount:", marginLeft + 5, y);
    doc.setTextColor(0, 0, 0);
    doc.text(formatCurrencyForPDF(data.installmentAmount), marginLeft + 50, y);
    y += 6;

    doc.setTextColor(100, 100, 100);
    doc.text("No. of Installments:", marginLeft + 5, y);
    doc.setTextColor(0, 0, 0);
    doc.text(data.numberOfInstallments.toString(), marginLeft + 50, y);
  }

  y += 20;

  // ===== TOTAL AMOUNT BOX =====
  doc.setFillColor(255, 86, 3); // Brand orange
  doc.roundedRect(marginLeft, y, contentWidth, 20, 3, 3, "F");

  y += 13;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("TOTAL AMOUNT:", marginLeft + 5, y);
  doc.text(formatCurrencyForPDF(data.total), pageWidth - marginRight - 5, y, {
    align: "right",
  });

  y += 20;

  // ===== NOTES (if any) =====
  if (data.notes) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 100, 100);
    doc.text("NOTES:", marginLeft, y);
    y += 6;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    const noteLines = doc.splitTextToSize(data.notes, contentWidth);
    noteLines.forEach((line: string) => {
      doc.text(line, marginLeft, y);
      y += 5;
    });
    y += 5;
  }

  // ===== BANK DETAILS =====
  y += 10;
  doc.setDrawColor(200, 200, 200);
  doc.line(marginLeft, y, pageWidth - marginRight, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 100, 100);
  doc.text("PAYMENT INSTRUCTIONS:", marginLeft, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  doc.text("Bank: BPI", marginLeft, y);
  y += 5;
  doc.text("Account Name: SALINAS SOLAR ENTERPRISES CORPORATION", marginLeft, y);
  y += 5;
  doc.text("Account No.: 2291-0004-98", marginLeft, y);
  y += 10;

  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(
    "Please include the invoice number as reference when making payment.",
    marginLeft,
    y
  );

  // ===== FOOTER =====
  const footerY = doc.internal.pageSize.getHeight() - 15;
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text("Thank you for your business!", pageWidth / 2, footerY, {
    align: "center",
  });

  // Generate filename
  const sanitizedName = data.billedTo.name.replace(/[^a-zA-Z0-9]/g, "_") || "Customer";
  const filename = `Invoice_${data.invoiceNumber}_${sanitizedName}.pdf`;

  // Return PDF blob and filename
  const pdfBlob = doc.output("blob");

  return {
    blob: pdfBlob,
    filename,
    download: () => doc.save(filename),
  };
}
