import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ============================================
// EMAIL & PHONE DETECTION UTILITIES
// ============================================

export type DetectedInfo = {
  type: "email" | "phone";
  value: string;
  startIndex: number;
  endIndex: number;
};

// Email pattern: matches common email formats
// Detects: @, @gmail, @yahoo, @outlook, @ with .com
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// Phone pattern: matches Philippine phone formats
// Detects: +639XXXXXXXXX, 639XXXXXXXXX, 09XXXXXXXXX
// Allows spaces between digits
const PHONE_PATTERN = /(?:\+?63\s*9|\b09)\s*(?:\d\s*){8,9}\d/g;

/**
 * Detects emails and phone numbers in a message
 */
export function detectContactInfo(text: string): DetectedInfo[] {
  const results: DetectedInfo[] = [];

  // Find all emails
  let emailMatch;
  while ((emailMatch = EMAIL_PATTERN.exec(text)) !== null) {
    results.push({
      type: "email",
      value: emailMatch[0],
      startIndex: emailMatch.index,
      endIndex: emailMatch.index + emailMatch[0].length,
    });
  }
  // Reset regex
  EMAIL_PATTERN.lastIndex = 0;

  // Find all phone numbers
  let phoneMatch;
  while ((phoneMatch = PHONE_PATTERN.exec(text)) !== null) {
    // Clean the phone number (remove spaces)
    const cleanedValue = phoneMatch[0].replace(/\s/g, "");
    results.push({
      type: "phone",
      value: cleanedValue,
      startIndex: phoneMatch.index,
      endIndex: phoneMatch.index + phoneMatch[0].length,
    });
  }
  // Reset regex
  PHONE_PATTERN.lastIndex = 0;

  // Sort by startIndex to process in order
  results.sort((a, b) => a.startIndex - b.startIndex);

  return results;
}

/**
 * Formats a phone number for display
 */
export function formatPhoneNumber(phone: string): string {
  // Remove spaces and clean
  const cleaned = phone.replace(/\s/g, "");

  // Format as +63 9XX XXX XXXX or 09XX XXX XXXX
  if (cleaned.startsWith("+63")) {
    const digits = cleaned.slice(3);
    return `+63 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  } else if (cleaned.startsWith("63")) {
    const digits = cleaned.slice(2);
    return `+63 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  } else if (cleaned.startsWith("09")) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
  }
  return phone;
}
