"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { TourStep } from "./tour-steps-data";

interface TourStepProps {
  step: TourStep;
  currentIndex: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onComplete: () => void;
}

export function TourStepComponent({
  step,
  currentIndex,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
  onComplete,
}: TourStepProps) {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const isFirstStep = currentIndex === 0;
  const isLastStep = currentIndex === totalSteps - 1;
  const isCentered = step.placement === "center" || !step.target;

  useEffect(() => {
    if (!step.target) {
      // Center the tooltip
      setTargetRect(null);
      setPosition({
        top: window.innerHeight / 2,
        left: window.innerWidth / 2,
      });
      return;
    }

    const targetElement = document.querySelector(step.target);
    if (!targetElement) {
      // Fallback to center if target not found
      setTargetRect(null);
      setPosition({
        top: window.innerHeight / 2,
        left: window.innerWidth / 2,
      });
      return;
    }

    const rect = targetElement.getBoundingClientRect();
    setTargetRect(rect);

    // Calculate tooltip position based on placement
    const tooltipWidth = 400;
    const tooltipHeight = 200;
    const padding = 16;

    let top = 0;
    let left = 0;

    switch (step.placement) {
      case "top":
        top = rect.top - tooltipHeight - padding;
        left = rect.left + rect.width / 2;
        break;
      case "bottom":
        top = rect.bottom + padding;
        left = rect.left + rect.width / 2;
        break;
      case "left":
        top = rect.top + rect.height / 2;
        left = rect.left - tooltipWidth - padding;
        break;
      case "right":
        top = rect.top + rect.height / 2;
        left = rect.right + padding;
        break;
      default:
        top = rect.bottom + padding;
        left = rect.left + rect.width / 2;
    }

    // Keep tooltip within viewport
    top = Math.max(padding, Math.min(top, window.innerHeight - tooltipHeight - padding));
    left = Math.max(padding, Math.min(left, window.innerWidth - tooltipWidth - padding));

    setPosition({ top, left });
  }, [step]);

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-[9998] pointer-events-none">
        {/* Dark overlay with spotlight cutout */}
        <svg className="w-full h-full">
          <defs>
            <mask id="spotlight-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {targetRect && (
                <rect
                  x={targetRect.left - 8}
                  y={targetRect.top - 8}
                  width={targetRect.width + 16}
                  height={targetRect.height + 16}
                  rx="8"
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(0, 0, 0, 0.75)"
            mask="url(#spotlight-mask)"
          />
        </svg>
      </div>

      {/* Target highlight border */}
      {targetRect && (
        <div
          className="fixed z-[9999] pointer-events-none rounded-lg ring-2 ring-[#ff5603] ring-offset-2 ring-offset-transparent"
          style={{
            top: targetRect.top - 4,
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
          }}
        />
      )}

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className={`fixed z-[10000] w-[400px] max-w-[calc(100vw-32px)] bg-white rounded-xl shadow-2xl border border-gray-200 ${
          isCentered ? "-translate-x-1/2 -translate-y-1/2" : ""
        }`}
        style={{
          top: position.top,
          left: position.left,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">{step.title}</h3>
          <button
            onClick={onSkip}
            className="p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Skip tour"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{step.content}</p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-100 bg-gray-50 rounded-b-xl">
          {/* Progress indicator */}
          <div className="flex items-center gap-1">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === currentIndex
                    ? "w-6 bg-[#ff5603]"
                    : i < currentIndex
                      ? "w-1.5 bg-[#ff5603]/50"
                      : "w-1.5 bg-gray-300"
                }`}
              />
            ))}
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center gap-2">
            {!isFirstStep && (
              <Button
                variant="outline"
                size="sm"
                onClick={onPrev}
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
            )}
            {isLastStep ? (
              <Button
                size="sm"
                onClick={onComplete}
                className="bg-[#ff5603] hover:bg-[#e04d00] text-white gap-1"
              >
                Get Started
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={onNext}
                className="bg-[#ff5603] hover:bg-[#e04d00] text-white gap-1"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
