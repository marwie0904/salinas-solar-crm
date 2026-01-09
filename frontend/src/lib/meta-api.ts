/**
 * Meta (Facebook/Instagram) Messaging API Client
 *
 * Handles sending and receiving messages via Facebook Messenger and Instagram DM.
 *
 * Messaging Windows:
 * - 0-24 hours: Any message type (bots, promo, automated)
 * - 24h-7 days: Human-sent replies only (HUMAN_AGENT tag auto-applied)
 * - After 7 days: Message Tags only (transactional updates)
 */

import * as crypto from "crypto";

// Environment variables (server-side only)
const META_APP_SECRET = process.env.META_APP_SECRET!;
const FACEBOOK_PAGE_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN!;
const FACEBOOK_PAGE_ID = process.env.FACEBOOK_PAGE_ID!;

// Instagram config - supports two options:
// Option 1 (Separate accounts): INSTAGRAM_ACCESS_TOKEN is set
// Option 2 (Linked accounts): Instagram uses FACEBOOK_PAGE_ACCESS_TOKEN
const INSTAGRAM_ACCOUNT_ID = process.env.INSTAGRAM_ACCOUNT_ID;
const INSTAGRAM_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN; // Optional: for separate Instagram account

// Helper to get the correct Instagram token
function getInstagramAccessToken(): string {
  // Use dedicated Instagram token if available, otherwise fall back to Facebook Page token
  return INSTAGRAM_ACCESS_TOKEN || FACEBOOK_PAGE_ACCESS_TOKEN;
}

const GRAPH_API_VERSION = "v21.0";
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

// ============================================
// TYPES
// ============================================

export interface MetaWebhookEvent {
  object: "page" | "instagram";
  entry: MetaWebhookEntry[];
}

export interface MetaWebhookEntry {
  id: string;
  time: number;
  messaging?: MetaMessagingEvent[];
}

export interface MetaMessagingEvent {
  sender: { id: string };
  recipient: { id: string };
  timestamp: number;
  message?: {
    mid: string;
    text?: string;
    attachments?: MetaAttachment[];
    is_echo?: boolean; // True if this is an echo of a message sent by the page
    app_id?: number; // App ID if sent via API
  };
  postback?: {
    title: string;
    payload: string;
  };
  delivery?: {
    mids: string[];
    watermark: number;
  };
  read?: {
    watermark: number;
  };
}

export interface MetaAttachment {
  type: "image" | "video" | "audio" | "file" | "location" | "fallback";
  payload: {
    url?: string;
    coordinates?: { lat: number; long: number };
  };
}

export interface SendMessageResponse {
  recipient_id: string;
  message_id: string;
}

export interface MetaUserProfile {
  id: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  profile_pic?: string;
}

export type MessageTag =
  | "CONFIRMED_EVENT_UPDATE"
  | "POST_PURCHASE_UPDATE"
  | "ACCOUNT_UPDATE"
  | "HUMAN_AGENT";

// ============================================
// WEBHOOK VERIFICATION
// ============================================

/**
 * Verify the webhook signature from Meta
 * Uses X-Hub-Signature-256 header
 *
 * @param payload - The raw request body
 * @param signature - The X-Hub-Signature-256 header value
 * @param appSecret - The app secret to use (defaults to META_APP_SECRET env var)
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string | null,
  appSecret?: string
): boolean {
  const secret = appSecret || META_APP_SECRET;

  if (!signature || !secret) {
    return false;
  }

  const expectedSignature =
    "sha256=" +
    crypto.createHmac("sha256", secret).update(payload).digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Verify webhook subscription (GET request from Meta)
 */
export function verifyWebhookSubscription(
  mode: string | null,
  token: string | null,
  challenge: string | null,
  verifyToken: string
): { valid: boolean; challenge?: string } {
  if (mode === "subscribe" && token === verifyToken) {
    return { valid: true, challenge: challenge || "" };
  }
  return { valid: false };
}

// ============================================
// SENDING MESSAGES
// ============================================

/**
 * Send a message to Facebook Messenger
 */
export async function sendFacebookMessage(
  recipientPsid: string,
  messageText: string,
  messageTag?: MessageTag
): Promise<SendMessageResponse> {
  const url = `${GRAPH_API_BASE}/${FACEBOOK_PAGE_ID}/messages`;

  const body: Record<string, unknown> = {
    recipient: { id: recipientPsid },
    message: { text: messageText },
    messaging_type: messageTag ? "MESSAGE_TAG" : "RESPONSE",
  };

  if (messageTag) {
    body.tag = messageTag;
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${FACEBOOK_PAGE_ACCESS_TOKEN}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new MetaApiError(
      `Failed to send Facebook message: ${JSON.stringify(error)}`,
      error
    );
  }

  return response.json();
}

/**
 * Send a message to Instagram DM
 *
 * Supports two configurations:
 * - Option 1 (Separate accounts): Uses INSTAGRAM_ACCESS_TOKEN
 * - Option 2 (Linked accounts): Uses FACEBOOK_PAGE_ACCESS_TOKEN
 */
export async function sendInstagramMessage(
  recipientIgsid: string,
  messageText: string,
  messageTag?: MessageTag
): Promise<SendMessageResponse> {
  if (!INSTAGRAM_ACCOUNT_ID) {
    throw new Error("INSTAGRAM_ACCOUNT_ID not configured");
  }

  const accessToken = getInstagramAccessToken();
  if (!accessToken) {
    throw new Error("INSTAGRAM_ACCESS_TOKEN or FACEBOOK_PAGE_ACCESS_TOKEN not configured");
  }

  const url = `${GRAPH_API_BASE}/${INSTAGRAM_ACCOUNT_ID}/messages`;

  const body: Record<string, unknown> = {
    recipient: { id: recipientIgsid },
    message: { text: messageText },
  };

  if (messageTag) {
    body.messaging_type = "MESSAGE_TAG";
    body.tag = messageTag;
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new MetaApiError(
      `Failed to send Instagram message: ${JSON.stringify(error)}`,
      error
    );
  }

  return response.json();
}

/**
 * Send a message to either platform based on channel
 */
export async function sendMetaMessage(
  channel: "facebook" | "instagram",
  recipientId: string,
  messageText: string,
  messageTag?: MessageTag
): Promise<SendMessageResponse> {
  if (channel === "facebook") {
    return sendFacebookMessage(recipientId, messageText, messageTag);
  } else {
    return sendInstagramMessage(recipientId, messageText, messageTag);
  }
}

// ============================================
// USER PROFILE
// ============================================

/**
 * Get user profile from Facebook or Instagram
 *
 * Uses the appropriate access token based on channel:
 * - Facebook: FACEBOOK_PAGE_ACCESS_TOKEN
 * - Instagram: INSTAGRAM_ACCESS_TOKEN (if set) or FACEBOOK_PAGE_ACCESS_TOKEN
 */
export async function getUserProfile(
  userId: string,
  channel: "facebook" | "instagram"
): Promise<MetaUserProfile> {
  const fields =
    channel === "facebook"
      ? "first_name,last_name,profile_pic"
      : "name,profile_pic";

  const accessToken = channel === "instagram"
    ? getInstagramAccessToken()
    : FACEBOOK_PAGE_ACCESS_TOKEN;

  const url = `${GRAPH_API_BASE}/${userId}?fields=${fields}&access_token=${accessToken}`;

  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.json();
    throw new MetaApiError(
      `Failed to get user profile: ${JSON.stringify(error)}`,
      error
    );
  }

  return response.json();
}

// ============================================
// MESSAGING WINDOW HELPERS
// ============================================

/**
 * Calculate the messaging window expiry based on last customer message
 * Returns timestamps for 24-hour and 7-day windows
 */
export function calculateMessagingWindows(lastCustomerMessageAt: number): {
  standardWindowExpiry: number; // 24 hours - any message type
  humanAgentWindowExpiry: number; // 7 days - human replies only
} {
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

  return {
    standardWindowExpiry: lastCustomerMessageAt + TWENTY_FOUR_HOURS,
    humanAgentWindowExpiry: lastCustomerMessageAt + SEVEN_DAYS,
  };
}

/**
 * Check if we can send a message and what type is allowed
 */
export function getMessagingWindowStatus(lastCustomerMessageAt: number): {
  canSendAny: boolean; // Within 24h - any message type
  canSendHumanAgent: boolean; // Within 7 days - human only
  canSendMessageTag: boolean; // After 7 days - tags only
  windowType: "standard" | "human_agent" | "message_tag_only" | "closed";
  expiresAt: number | null;
  timeRemaining: number | null;
} {
  const now = Date.now();
  const { standardWindowExpiry, humanAgentWindowExpiry } =
    calculateMessagingWindows(lastCustomerMessageAt);

  if (now < standardWindowExpiry) {
    return {
      canSendAny: true,
      canSendHumanAgent: true,
      canSendMessageTag: true,
      windowType: "standard",
      expiresAt: standardWindowExpiry,
      timeRemaining: standardWindowExpiry - now,
    };
  }

  if (now < humanAgentWindowExpiry) {
    return {
      canSendAny: false,
      canSendHumanAgent: true,
      canSendMessageTag: true,
      windowType: "human_agent",
      expiresAt: humanAgentWindowExpiry,
      timeRemaining: humanAgentWindowExpiry - now,
    };
  }

  // After 7 days, only message tags for transactional updates
  return {
    canSendAny: false,
    canSendHumanAgent: false,
    canSendMessageTag: true,
    windowType: "message_tag_only",
    expiresAt: null,
    timeRemaining: null,
  };
}

/**
 * Format time remaining in human-readable format
 */
export function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return "Expired";

  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours}h`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

// ============================================
// ERROR HANDLING
// ============================================

export class MetaApiError extends Error {
  public details: unknown;

  constructor(message: string, details?: unknown) {
    super(message);
    this.name = "MetaApiError";
    this.details = details;
  }
}

// ============================================
// WEBHOOK PAYLOAD PARSING
// ============================================

/**
 * Parse incoming webhook and extract message events
 */
export function parseWebhookPayload(payload: MetaWebhookEvent): Array<{
  channel: "facebook" | "instagram";
  senderId: string;
  recipientId: string;
  timestamp: number;
  messageId?: string;
  text?: string;
  attachments?: MetaAttachment[];
  eventType: "message" | "postback" | "delivery" | "read" | "echo";
  isEcho?: boolean;
}> {
  const events: Array<{
    channel: "facebook" | "instagram";
    senderId: string;
    recipientId: string;
    timestamp: number;
    messageId?: string;
    text?: string;
    attachments?: MetaAttachment[];
    eventType: "message" | "postback" | "delivery" | "read" | "echo";
    isEcho?: boolean;
  }> = [];

  const channel = payload.object === "instagram" ? "instagram" : "facebook";

  for (const entry of payload.entry) {
    if (!entry.messaging) continue;

    for (const messagingEvent of entry.messaging) {
      if (messagingEvent.message) {
        const isEcho = messagingEvent.message.is_echo === true;
        events.push({
          channel,
          senderId: messagingEvent.sender.id,
          recipientId: messagingEvent.recipient.id,
          timestamp: messagingEvent.timestamp,
          messageId: messagingEvent.message.mid,
          text: messagingEvent.message.text,
          attachments: messagingEvent.message.attachments,
          eventType: isEcho ? "echo" : "message",
          isEcho,
        });
      } else if (messagingEvent.postback) {
        events.push({
          channel,
          senderId: messagingEvent.sender.id,
          recipientId: messagingEvent.recipient.id,
          timestamp: messagingEvent.timestamp,
          text: messagingEvent.postback.payload,
          eventType: "postback",
        });
      } else if (messagingEvent.delivery) {
        events.push({
          channel,
          senderId: messagingEvent.sender.id,
          recipientId: messagingEvent.recipient.id,
          timestamp: messagingEvent.delivery.watermark,
          eventType: "delivery",
        });
      } else if (messagingEvent.read) {
        events.push({
          channel,
          senderId: messagingEvent.sender.id,
          recipientId: messagingEvent.recipient.id,
          timestamp: messagingEvent.read.watermark,
          eventType: "read",
        });
      }
    }
  }

  return events;
}
