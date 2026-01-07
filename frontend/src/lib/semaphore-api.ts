/**
 * Semaphore SMS API Client
 *
 * Handles sending SMS messages via Semaphore (Philippines SMS Gateway).
 * API Documentation: https://semaphore.co/docs
 */

const SEMAPHORE_API_BASE = "https://api.semaphore.co/api/v4";

// ============================================
// TYPES
// ============================================

export interface SemaphoreSendResponse {
  message_id: number;
  user_id: number;
  user: string;
  account_id: number;
  account: string;
  recipient: string;
  message: string;
  sender_name: string;
  network: string;
  status: "Queued" | "Pending" | "Sent" | "Failed" | "Refunded";
  type: string;
  source: string;
  created_at: string;
  updated_at: string;
}

export interface SemaphoreAccountResponse {
  account_id: number;
  account_name: string;
  status: string;
  credit_balance: number;
}

export interface SemaphoreError {
  message: string;
  code?: string;
}

// ============================================
// ERROR HANDLING
// ============================================

export class SemaphoreApiError extends Error {
  public details: unknown;
  public statusCode?: number;

  constructor(message: string, details?: unknown, statusCode?: number) {
    super(message);
    this.name = "SemaphoreApiError";
    this.details = details;
    this.statusCode = statusCode;
  }
}

// ============================================
// SENDING MESSAGES
// ============================================

/**
 * Send a regular SMS message
 * Rate limit: 120 calls per minute
 *
 * @param apiKey - Semaphore API key
 * @param number - Recipient phone number(s), comma-separated for bulk (max 1000)
 * @param message - SMS content (auto-splits if >160 chars)
 * @param senderName - Optional sender ID (defaults to "SEMAPHORE")
 */
export async function sendSms(
  apiKey: string,
  number: string,
  message: string,
  senderName?: string
): Promise<SemaphoreSendResponse[]> {
  const url = `${SEMAPHORE_API_BASE}/messages`;

  const body: Record<string, string> = {
    apikey: apiKey,
    number: number,
    message: message,
  };

  if (senderName) {
    body.sendername = senderName;
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(body).toString(),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new SemaphoreApiError(
      `Failed to send SMS: ${JSON.stringify(data)}`,
      data,
      response.status
    );
  }

  return data;
}

/**
 * Send a priority SMS message (bypasses queue)
 * Cost: 2 credits per 160-character SMS
 * No rate limiting
 *
 * @param apiKey - Semaphore API key
 * @param number - Recipient phone number(s)
 * @param message - SMS content
 * @param senderName - Optional sender ID
 */
export async function sendPrioritySms(
  apiKey: string,
  number: string,
  message: string,
  senderName?: string
): Promise<SemaphoreSendResponse[]> {
  const url = `${SEMAPHORE_API_BASE}/priority`;

  const body: Record<string, string> = {
    apikey: apiKey,
    number: number,
    message: message,
  };

  if (senderName) {
    body.sendername = senderName;
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(body).toString(),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new SemaphoreApiError(
      `Failed to send priority SMS: ${JSON.stringify(data)}`,
      data,
      response.status
    );
  }

  return data;
}

/**
 * Send an OTP message
 * Cost: 2 credits per 160-character SMS
 * No rate limiting
 * Note: Only for OTP traffic, not regular messages
 *
 * @param apiKey - Semaphore API key
 * @param number - Recipient phone number
 * @param message - OTP message content
 * @param senderName - Optional sender ID
 */
export async function sendOtp(
  apiKey: string,
  number: string,
  message: string,
  senderName?: string
): Promise<SemaphoreSendResponse[]> {
  const url = `${SEMAPHORE_API_BASE}/otp`;

  const body: Record<string, string> = {
    apikey: apiKey,
    number: number,
    message: message,
  };

  if (senderName) {
    body.sendername = senderName;
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(body).toString(),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new SemaphoreApiError(
      `Failed to send OTP: ${JSON.stringify(data)}`,
      data,
      response.status
    );
  }

  return data;
}

// ============================================
// ACCOUNT INFO
// ============================================

/**
 * Get account information and credit balance
 * Rate limit: 2 calls per minute
 *
 * @param apiKey - Semaphore API key
 */
export async function getAccountInfo(
  apiKey: string
): Promise<SemaphoreAccountResponse> {
  const url = `${SEMAPHORE_API_BASE}/account?apikey=${apiKey}`;

  const response = await fetch(url, {
    method: "GET",
  });

  const data = await response.json();

  if (!response.ok) {
    throw new SemaphoreApiError(
      `Failed to get account info: ${JSON.stringify(data)}`,
      data,
      response.status
    );
  }

  return data;
}

// ============================================
// MESSAGE RETRIEVAL
// ============================================

/**
 * Get sent messages
 * Rate limit: 30 calls per minute
 *
 * @param apiKey - Semaphore API key
 * @param limit - Number of messages to retrieve (default 100)
 * @param page - Page number for pagination
 */
export async function getMessages(
  apiKey: string,
  limit: number = 100,
  page: number = 1
): Promise<SemaphoreSendResponse[]> {
  const params = new URLSearchParams({
    apikey: apiKey,
    limit: limit.toString(),
    page: page.toString(),
  });

  const url = `${SEMAPHORE_API_BASE}/messages?${params}`;

  const response = await fetch(url, {
    method: "GET",
  });

  const data = await response.json();

  if (!response.ok) {
    throw new SemaphoreApiError(
      `Failed to get messages: ${JSON.stringify(data)}`,
      data,
      response.status
    );
  }

  return data;
}

// ============================================
// PHONE NUMBER UTILITIES
// ============================================

/**
 * Format Philippine phone number to proper format
 * Semaphore accepts: 09XXXXXXXXX or 639XXXXXXXXX
 *
 * @param phone - Phone number to format
 * @returns Formatted phone number
 */
export function formatPhoneNumber(phone: string): string {
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
 *
 * @param phone - Phone number to validate
 * @returns Whether the phone number is valid
 */
export function isValidPhilippinePhone(phone: string): boolean {
  const formatted = formatPhoneNumber(phone);
  // Should be 12 digits starting with 639
  return /^639\d{9}$/.test(formatted);
}
