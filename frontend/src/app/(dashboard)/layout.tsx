"use client";

import { AppLayout } from "@/components/layout";
import { ConvexClientProvider } from "@/components/providers/convex-provider";
import { AuthProvider, RequireAuth } from "@/components/providers/auth-provider";
import { OnboardingProvider } from "@/components/onboarding/onboarding-tour";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ConvexClientProvider>
      <AuthProvider>
        <RequireAuth>
          <OnboardingProvider>
            <AppLayout>{children}</AppLayout>
          </OnboardingProvider>
        </RequireAuth>
      </AuthProvider>
    </ConvexClientProvider>
  );
}
