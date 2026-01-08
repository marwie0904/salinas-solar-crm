"use client";

import { ConvexClientProvider } from "@/components/providers/convex-provider";

export default function InvoiceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ConvexClientProvider>{children}</ConvexClientProvider>;
}
