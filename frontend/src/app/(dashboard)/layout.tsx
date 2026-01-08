"use client";

import { AppLayout } from "@/components/layout";
import { ConvexClientProvider } from "@/components/providers/convex-provider";
import { AuthProvider, RequireAuth } from "@/components/providers/auth-provider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ConvexClientProvider>
      <AuthProvider>
        <RequireAuth>
          <AppLayout>{children}</AppLayout>
        </RequireAuth>
      </AuthProvider>
    </ConvexClientProvider>
  );
}
