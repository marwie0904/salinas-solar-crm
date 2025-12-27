import { QueryCtx } from "../_generated/server";

/**
 * Get current timestamp in milliseconds
 */
export const now = (): number => Date.now();

/**
 * Generate next invoice number in format INV-YYYY-XXX
 */
export const generateInvoiceNumber = async (ctx: QueryCtx): Promise<string> => {
  const year = new Date().getFullYear();
  const startOfYear = new Date(year, 0, 1).getTime();

  const invoicesThisYear = await ctx.db
    .query("invoices")
    .withIndex("by_created_at", (q) => q.gte("createdAt", startOfYear))
    .collect();

  const nextNumber = invoicesThisYear.length + 1;
  return `INV-${year}-${String(nextNumber).padStart(3, "0")}`;
};

/**
 * Calculate invoice totals from line items
 */
export interface LineItemInput {
  quantity: number;
  unitPrice: number;
}

export interface InvoiceTotals {
  subtotal: number;
  taxAmount: number;
  total: number;
}

export const calculateInvoiceTotals = (
  lineItems: LineItemInput[],
  taxRate?: number,
  discountAmount?: number
): InvoiceTotals => {
  const subtotal = lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );
  const taxAmount = taxRate ? subtotal * (taxRate / 100) : 0;
  const discount = discountAmount ?? 0;
  const total = subtotal + taxAmount - discount;

  return { subtotal, taxAmount, total };
};

/**
 * Determine invoice status based on payment
 */
export type InvoiceStatusType =
  | "pending"
  | "partially_paid"
  | "paid_full"
  | "cancelled";

export const determineInvoiceStatus = (
  total: number,
  amountPaid: number
): InvoiceStatusType => {
  if (amountPaid >= total) return "paid_full";
  if (amountPaid > 0) return "partially_paid";
  return "pending";
};

/**
 * Format currency for display (PHP)
 */
export const formatPHP = (amount: number): string => {
  return "₱" + new Intl.NumberFormat("en-PH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Get full name from first and last name
 */
export const getFullName = (firstName: string, lastName: string): string => {
  return `${firstName} ${lastName}`.trim();
};

/**
 * Parse date string to timestamp
 */
export const parseDate = (dateStr: string): number => {
  return new Date(dateStr).getTime();
};

/**
 * Format timestamp to ISO date string (YYYY-MM-DD)
 */
export const formatDateISO = (timestamp: number): string => {
  return new Date(timestamp).toISOString().split("T")[0];
};

/**
 * Get start of day timestamp
 */
export const startOfDay = (timestamp: number): number => {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

/**
 * Get end of day timestamp
 */
export const endOfDay = (timestamp: number): number => {
  const date = new Date(timestamp);
  date.setHours(23, 59, 59, 999);
  return date.getTime();
};

/**
 * Get start of month timestamp
 */
export const startOfMonth = (timestamp: number): number => {
  const date = new Date(timestamp);
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

/**
 * Get end of month timestamp
 */
export const endOfMonth = (timestamp: number): number => {
  const date = new Date(timestamp);
  date.setMonth(date.getMonth() + 1);
  date.setDate(0);
  date.setHours(23, 59, 59, 999);
  return date.getTime();
};

/**
 * Check if a date is overdue
 */
export const isOverdue = (dueDate: number): boolean => {
  return dueDate < startOfDay(Date.now());
};

/**
 * Check if a date is today
 */
export const isToday = (timestamp: number): boolean => {
  const today = new Date();
  const date = new Date(timestamp);
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
};
