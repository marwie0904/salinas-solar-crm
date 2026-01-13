"use client";

import { createContext, useContext, ReactNode } from "react";
import { createPortal } from "react-dom";
import { useOnboarding } from "./use-onboarding";
import { TourStepComponent } from "./tour-step";

interface OnboardingContextType {
  isTourActive: boolean;
  isFaqOpen: boolean;
  openFaq: () => void;
  closeFaq: () => void;
  restartTour: () => void;
  hasCompletedOnboarding: boolean;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export function useOnboardingContext() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error("useOnboardingContext must be used within an OnboardingProvider");
  }
  return context;
}

interface OnboardingProviderProps {
  children: ReactNode;
}

export function OnboardingProvider({ children }: OnboardingProviderProps) {
  const {
    isTourActive,
    currentStep,
    currentStepIndex,
    totalSteps,
    nextStep,
    prevStep,
    skipTour,
    completeTour,
    restartTour,
    isFaqOpen,
    openFaq,
    closeFaq,
    hasCompletedOnboarding,
  } = useOnboarding();

  return (
    <OnboardingContext.Provider
      value={{
        isTourActive,
        isFaqOpen,
        openFaq,
        closeFaq,
        restartTour,
        hasCompletedOnboarding,
      }}
    >
      {children}
      {isTourActive &&
        currentStep &&
        typeof window !== "undefined" &&
        createPortal(
          <TourStepComponent
            step={currentStep}
            currentIndex={currentStepIndex}
            totalSteps={totalSteps}
            onNext={nextStep}
            onPrev={prevStep}
            onSkip={skipTour}
            onComplete={completeTour}
          />,
          document.body
        )}
    </OnboardingContext.Provider>
  );
}
