"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@/components/providers/auth-provider";
import { Id } from "../../../convex/_generated/dataModel";
import { tourSteps } from "./tour-steps-data";

export function useOnboarding() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isTourActive, setIsTourActive] = useState(false);
  const [isFaqOpen, setIsFaqOpen] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  // Get user data including onboarding status
  const userData = useQuery(
    api.users.get,
    user?.id ? { id: user.id as Id<"users"> } : "skip"
  );

  const completeOnboarding = useMutation(api.users.completeOnboarding);
  const resetOnboarding = useMutation(api.users.resetOnboarding);

  // Check if user needs onboarding on mount
  useEffect(() => {
    if (userData && userData.hasCompletedOnboarding !== true) {
      // Small delay to ensure UI is ready
      const timer = setTimeout(() => {
        setIsTourActive(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [userData]);

  // Navigate to the correct route when step changes
  useEffect(() => {
    if (!isTourActive || isNavigating) return;

    const step = tourSteps[currentStepIndex];
    if (step?.route && pathname !== step.route) {
      setIsNavigating(true);
      router.push(step.route);
      // Give time for navigation and DOM to settle
      const timer = setTimeout(() => {
        setIsNavigating(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [currentStepIndex, isTourActive, pathname, router, isNavigating]);

  const currentStep = tourSteps[currentStepIndex];
  const totalSteps = tourSteps.length;

  const nextStep = useCallback(() => {
    if (currentStepIndex < totalSteps - 1) {
      const nextIndex = currentStepIndex + 1;
      const nextStepData = tourSteps[nextIndex];

      // If next step requires navigation, do it before updating index
      if (nextStepData?.route && pathname !== nextStepData.route) {
        setIsNavigating(true);
        router.push(nextStepData.route);
        // Small delay to let navigation happen, then update step
        setTimeout(() => {
          setCurrentStepIndex(nextIndex);
          setIsNavigating(false);
        }, 300);
      } else {
        setCurrentStepIndex(nextIndex);
      }
    }
  }, [currentStepIndex, totalSteps, pathname, router]);

  const prevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      const prevIndex = currentStepIndex - 1;
      const prevStepData = tourSteps[prevIndex];

      // If previous step requires navigation, do it before updating index
      if (prevStepData?.route && pathname !== prevStepData.route) {
        setIsNavigating(true);
        router.push(prevStepData.route);
        // Small delay to let navigation happen, then update step
        setTimeout(() => {
          setCurrentStepIndex(prevIndex);
          setIsNavigating(false);
        }, 300);
      } else {
        setCurrentStepIndex(prevIndex);
      }
    }
  }, [currentStepIndex, pathname, router]);

  const skipTour = useCallback(async () => {
    if (user?.id) {
      await completeOnboarding({ id: user.id as Id<"users"> });
    }
    setIsTourActive(false);
    setCurrentStepIndex(0);
  }, [user?.id, completeOnboarding]);

  const completeTour = useCallback(async () => {
    if (user?.id) {
      await completeOnboarding({ id: user.id as Id<"users"> });
    }
    setIsTourActive(false);
    setCurrentStepIndex(0);
  }, [user?.id, completeOnboarding]);

  const restartTour = useCallback(async () => {
    if (user?.id) {
      await resetOnboarding({ id: user.id as Id<"users"> });
    }
    // Navigate to dashboard before starting tour
    router.push("/dashboard");
    setCurrentStepIndex(0);
    setIsFaqOpen(false);
    setTimeout(() => {
      setIsTourActive(true);
    }, 300);
  }, [user?.id, resetOnboarding, router]);

  const openFaq = useCallback(() => {
    setIsFaqOpen(true);
  }, []);

  const closeFaq = useCallback(() => {
    setIsFaqOpen(false);
  }, []);

  return {
    // Tour state
    isTourActive,
    currentStep,
    currentStepIndex,
    totalSteps,
    // Tour actions
    nextStep,
    prevStep,
    skipTour,
    completeTour,
    restartTour,
    // FAQ state
    isFaqOpen,
    openFaq,
    closeFaq,
    // User onboarding status
    hasCompletedOnboarding: userData?.hasCompletedOnboarding ?? false,
  };
}
