"use client";

import { ConvexClientProvider } from "@/components/providers/convex-provider";

export default function MessageTestingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ConvexClientProvider>{children}</ConvexClientProvider>;
}
