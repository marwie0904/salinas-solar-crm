"use client";

import { AppLayout } from "@/components/layout";
import { ConvexClientProvider } from "@/components/providers/convex-provider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ConvexClientProvider>
      <AppLayout>{children}</AppLayout>
    </ConvexClientProvider>
  );
}
