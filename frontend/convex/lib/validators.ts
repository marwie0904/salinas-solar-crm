/**
 * Validation utilities for CRM data
 */

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate Philippine phone number
 * Accepts formats:
 * - 09XXXXXXXXX (11 digits starting with 09)
 * - +639XXXXXXXXX (with country code)
 * - 639XXXXXXXXX (country code without +)
 */
export const isValidPHPhone = (phone: string): boolean => {
  const cleaned = phone.replace(/[\s\-().]/g, "");
  const phPhoneRegex = /^(\+?63|0)?9\d{9}$/;
  return phPhoneRegex.test(cleaned);
};

/**
 * Format Philippine phone number to standard format
 */
export const formatPHPhone = (phone: string): string => {
  const cleaned = phone.replace(/[\s\-().]/g, "");

  // Extract the 10-digit number (9XXXXXXXXX)
  let digits: string;
  if (cleaned.startsWith("+63")) {
    digits = cleaned.slice(3);
  } else if (cleaned.startsWith("63")) {
    digits = cleaned.slice(2);
  } else if (cleaned.startsWith("0")) {
    digits = cleaned.slice(1);
  } else {
    digits = cleaned;
  }

  if (digits.length !== 10 || !digits.startsWith("9")) {
    return phone; // Return original if can't parse
  }

  // Format as +63 9XX XXX XXXX
  return `+63 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
};

/**
 * Validate required string (not empty after trim)
 */
export const isNotEmpty = (value: string): boolean => {
  return value.trim().length > 0;
};

/**
 * Validate string length
 */
export const isValidLength = (
  value: string,
  min: number,
  max: number
): boolean => {
  const length = value.trim().length;
  return length >= min && length <= max;
};

/**
 * Validate positive number
 */
export const isPositiveNumber = (value: number): boolean => {
  return typeof value === "number" && value > 0;
};

/**
 * Validate non-negative number
 */
export const isNonNegativeNumber = (value: number): boolean => {
  return typeof value === "number" && value >= 0;
};

/**
 * Validate percentage (0-100)
 */
export const isValidPercentage = (value: number): boolean => {
  return typeof value === "number" && value >= 0 && value <= 100;
};

/**
 * Validate date is in the future
 */
export const isFutureDate = (timestamp: number): boolean => {
  return timestamp > Date.now();
};

/**
 * Validate date is not in the past (allows today)
 */
export const isNotPastDate = (timestamp: number): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return timestamp >= today.getTime();
};

/**
 * Validate SKU format (alphanumeric with dashes)
 */
export const isValidSKU = (sku: string): boolean => {
  const skuRegex = /^[A-Za-z0-9\-]+$/;
  return skuRegex.test(sku);
};

/**
 * Validate invoice number format (INV-YYYY-XXX)
 */
export const isValidInvoiceNumber = (invoiceNumber: string): boolean => {
  const invoiceRegex = /^INV-\d{4}-\d{3,}$/;
  return invoiceRegex.test(invoiceNumber);
};

/**
 * Sanitize string input (trim and remove excess whitespace)
 */
export const sanitizeString = (value: string): string => {
  return value.trim().replace(/\s+/g, " ");
};

/**
 * Validate and return errors for contact creation
 */
export interface ContactValidationErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}

export const validateContact = (data: {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
}): ContactValidationErrors => {
  const errors: ContactValidationErrors = {};

  if (!isNotEmpty(data.firstName)) {
    errors.firstName = "First name is required";
  }

  if (!isNotEmpty(data.lastName)) {
    errors.lastName = "Last name is required";
  }

  if (data.email && !isValidEmail(data.email)) {
    errors.email = "Invalid email format";
  }

  if (data.phone && !isValidPHPhone(data.phone)) {
    errors.phone = "Invalid Philippine phone number";
  }

  return errors;
};

/**
 * Check if validation has errors
 */
export const hasErrors = (
  errors: Record<string, string | undefined>
): boolean => {
  return Object.values(errors).some((error) => error !== undefined);
};
