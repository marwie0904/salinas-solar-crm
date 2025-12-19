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

// Initialize Convex client
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Webhook verification token (you set this when configuring webhooks in Meta)
const WEBHOOK_VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN!;

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

    // Verify the signature
    const signature = request.headers.get("x-hub-signature-256");

    if (!verifyWebhookSignature(rawBody, signature)) {
      console.warn("[Meta Webhook] Invalid signature");
      return new NextResponse("Invalid signature", { status: 401 });
    }

    // Parse the payload
    const payload: MetaWebhookEvent = JSON.parse(rawBody);

    console.log("[Meta Webhook] Received event", {
      object: payload.object,
      entries: payload.entry?.length || 0,
    });

    // Parse and process events
    const events = parseWebhookPayload(payload);

    for (const event of events) {
      // Only process incoming messages (not delivery/read receipts)
      if (event.eventType !== "message" && event.eventType !== "postback") {
        continue;
      }

      // Skip messages from ourselves (outgoing messages)
      const pageId = process.env.FACEBOOK_PAGE_ID;
      const instagramId = process.env.INSTAGRAM_ACCOUNT_ID;

      if (event.senderId === pageId || event.senderId === instagramId) {
        console.log("[Meta Webhook] Skipping outgoing message");
        continue;
      }

      // Skip empty messages
      if (!event.text && !event.attachments?.length) {
        console.log("[Meta Webhook] Skipping empty message");
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
        await convex.mutation(api.messages.receiveFromMeta, {
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
