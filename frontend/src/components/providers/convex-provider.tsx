"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode } from "react";

// Initialize the Convex client
// Note: You'll need to add your Convex deployment URL to .env.local as NEXT_PUBLIC_CONVEX_URL
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

// Only create the client if the URL is available
const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  if (!convex) {
    // Return children without Convex wrapper if not configured
    return <>{children}</>;
  }

  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
