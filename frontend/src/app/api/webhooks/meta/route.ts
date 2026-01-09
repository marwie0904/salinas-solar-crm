/**
 * Meta Webhook Handler
 *
 * Handles incoming webhooks from Facebook Messenger and Instagram DM.
 *
 * GET: Webhook verification (Meta sends this when you first set up the webhook)
 * POST: Incoming messages and events
 */

import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import {
  verifyWebhookSignature,
  verifyWebhookSubscription,
  parseWebhookPayload,
  getUserProfile,
  type MetaWebhookEvent,
} from "../../../../lib/meta-api";

// Lazily initialize Convex client (avoids build-time errors)
let convexClient: ConvexHttpClient | null = null;

function getConvexClient(): ConvexHttpClient {
  if (!convexClient) {
    const url = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!url) {
      throw new Error("NEXT_PUBLIC_CONVEX_URL not configured");
    }
    convexClient = new ConvexHttpClient(url);
  }
  return convexClient;
}

// Webhook verification token (you set this when configuring webhooks in Meta)
const WEBHOOK_VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN || "";

/**
 * GET - Webhook Verification
 *
 * Meta sends a GET request to verify your webhook URL when you first set it up.
 * You must respond with the challenge value if the token matches.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  console.log("[Meta Webhook] Verification request received", {
    mode,
    token: token ? "***" : null,
    challenge,
  });

  const result = verifyWebhookSubscription(
    mode,
    token,
    challenge,
    WEBHOOK_VERIFY_TOKEN
  );

  if (result.valid) {
    console.log("[Meta Webhook] Verification successful");
    // Must return the challenge as plain text
    return new NextResponse(result.challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  console.warn("[Meta Webhook] Verification failed");
  return new NextResponse("Forbidden", { status: 403 });
}

/**
 * POST - Incoming Messages and Events
 *
 * Meta sends a POST request for each event (new message, delivery receipt, etc.)
 */
export async function POST(request: NextRequest) {
  try {
    // Get the raw body for signature verification
    const rawBody = await request.text();

    // Log the raw payload for debugging
    console.log("[Meta Webhook] Raw payload received:", rawBody.substring(0, 500));

    // Parse the payload first to determine which secret to use
    const payload: MetaWebhookEvent = JSON.parse(rawBody);

    console.log("[Meta Webhook] Parsed event", {
      object: payload.object,
      isInstagram: payload.object === "instagram",
      isFacebook: payload.object === "page",
      entries: payload.entry?.length || 0,
    });

    // Verify the signature using the appropriate secret
    // Instagram may use a different app secret than Facebook
    const signature = request.headers.get("x-hub-signature-256");
    const metaAppSecret = process.env.META_APP_SECRET;
    const instagramAppSecret = process.env.INSTAGRAM_APP_SECRET;

    // Use Instagram secret for Instagram webhooks if available, otherwise fall back to Meta secret
    const appSecret = payload.object === "instagram" && instagramAppSecret
      ? instagramAppSecret
      : metaAppSecret;

    if (appSecret) {
      if (!verifyWebhookSignature(rawBody, signature, appSecret)) {
        console.warn("[Meta Webhook] Invalid signature - rejecting", {
          object: payload.object,
          usedInstagramSecret: payload.object === "instagram" && !!instagramAppSecret,
        });
        return new NextResponse("Invalid signature", { status: 401 });
      }
      console.log("[Meta Webhook] Signature verified successfully");
    } else {
      console.warn("[Meta Webhook] No app secret configured - skipping signature verification");
    }

    // Parse and process events
    const events = parseWebhookPayload(payload);

    console.log("[Meta Webhook] Parsed events:", {
      count: events.length,
      types: events.map(e => e.eventType),
      channels: events.map(e => e.channel),
    });

    for (const event of events) {
      console.log("[Meta Webhook] Processing event:", {
        eventType: event.eventType,
        channel: event.channel,
        senderId: event.senderId,
        recipientId: event.recipientId,
        hasText: !!event.text,
        isEcho: event.isEcho,
      });

      // Skip delivery/read receipts
      if (event.eventType === "delivery" || event.eventType === "read") {
        console.log("[Meta Webhook] Skipping receipt event:", event.eventType);
        continue;
      }

      // Skip empty messages
      if (!event.text && !event.attachments?.length) {
        console.log("[Meta Webhook] Skipping empty message");
        continue;
      }

      const pageId = process.env.FACEBOOK_PAGE_ID;
      const instagramId = process.env.INSTAGRAM_ACCOUNT_ID;

      // Handle echo messages (messages sent from FB/IG app directly)
      if (event.eventType === "echo" || event.isEcho) {
        console.log("[Meta Webhook] Processing echo message (sent from external app)", {
          channel: event.channel,
          recipientId: event.recipientId,
        });

        // Build message content for echo
        let echoContent = event.text || "";
        if (event.attachments?.length) {
          const attachmentTexts = event.attachments.map((att) => {
            if (att.type === "image") return "[Image]";
            if (att.type === "video") return "[Video]";
            if (att.type === "audio") return "[Audio]";
            if (att.type === "file") return "[File]";
            if (att.type === "location") return "[Location]";
            return "[Attachment]";
          });
          echoContent = echoContent
            ? echoContent + "\n" + attachmentTexts.join(" ")
            : attachmentTexts.join(" ");
        }

        try {
          await getConvexClient().mutation(api.messages.storeEchoFromMeta, {
            channel: event.channel,
            platformUserId: event.recipientId, // The recipient of the echo is the contact
            content: echoContent,
            externalMessageId: event.messageId,
            timestamp: event.timestamp,
          });
          console.log("[Meta Webhook] Echo message stored successfully");
        } catch (error) {
          console.error("[Meta Webhook] Failed to store echo message:", error);
        }
        continue;
      }

      // Only process incoming messages and postbacks
      if (event.eventType !== "message" && event.eventType !== "postback") {
        console.log("[Meta Webhook] Skipping non-message event:", event.eventType);
        continue;
      }

      // Skip messages from ourselves (redundant check, but kept for safety)
      if (event.senderId === pageId || event.senderId === instagramId) {
        console.log("[Meta Webhook] Skipping message from page");
        continue;
      }

      console.log("[Meta Webhook] Processing incoming message", {
        channel: event.channel,
        senderId: event.senderId,
        hasText: !!event.text,
        attachments: event.attachments?.length || 0,
      });

      // Try to get user profile (for name)
      let senderName = "Unknown";
      let firstName = "Unknown";
      let lastName = "";

      try {
        const profile = await getUserProfile(event.senderId, event.channel);
        if (event.channel === "facebook") {
          firstName = profile.first_name || "Unknown";
          lastName = profile.last_name || "";
          senderName = `${firstName} ${lastName}`.trim();
        } else {
          // Instagram uses 'name' field
          senderName = profile.name || "Unknown";
          const nameParts = senderName.split(" ");
          firstName = nameParts[0] || "Unknown";
          lastName = nameParts.slice(1).join(" ");
        }
      } catch (error) {
        console.warn("[Meta Webhook] Failed to get user profile:", error);
      }

      // Build message content
      let messageContent = event.text || "";

      if (event.attachments?.length) {
        const attachmentTexts = event.attachments.map((att) => {
          if (att.type === "image") return "[Image]";
          if (att.type === "video") return "[Video]";
          if (att.type === "audio") return "[Audio]";
          if (att.type === "file") return "[File]";
          if (att.type === "location") return "[Location]";
          return "[Attachment]";
        });

        if (messageContent) {
          messageContent += "\n" + attachmentTexts.join(" ");
        } else {
          messageContent = attachmentTexts.join(" ");
        }
      }

      // Send to Convex to store the message
      try {
        await getConvexClient().mutation(api.messages.receiveFromMeta, {
          channel: event.channel,
          platformUserId: event.senderId,
          firstName,
          lastName,
          content: messageContent,
          externalMessageId: event.messageId,
          timestamp: event.timestamp,
        });

        console.log("[Meta Webhook] Message stored successfully");
      } catch (error) {
        console.error("[Meta Webhook] Failed to store message:", error);
      }
    }

    // Always respond with 200 OK to acknowledge receipt
    // Meta will retry if you don't respond within 20 seconds
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("[Meta Webhook] Error processing webhook:", error);

    // Still return 200 to prevent Meta from retrying
    // Log the error for debugging
    return NextResponse.json({ status: "error", message: "Internal error" });
  }
}
