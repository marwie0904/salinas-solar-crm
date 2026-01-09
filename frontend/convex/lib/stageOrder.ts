/**
 * Pipeline stage ordering utilities for automatic stage transitions.
 * Used to ensure opportunities only move forward in the pipeline.
 */

// Ordered list of pipeline stages from start to finish
const STAGE_ORDER = [
  "inbox",
  "to_call",
  "did_not_answer",
  "booked_call",
  "did_not_book_call",
  "for_ocular",
  "follow_up",
  "contract_sent",
  "for_installation",
  "closed",
] as const;

export type PipelineStage = (typeof STAGE_ORDER)[number];

/**
 * Determines if an opportunity should transition to a target stage.
 * Only returns true if the target stage is ahead of the current stage.
 * This prevents opportunities from moving backwards in the pipeline.
 *
 * @param currentStage - The opportunity's current pipeline stage
 * @param targetStage - The stage to potentially transition to
 * @returns true if the transition should happen (moving forward), false otherwise
 */
export function shouldTransitionTo(
  currentStage: string,
  targetStage: string
): boolean {
  const currentIndex = STAGE_ORDER.indexOf(currentStage as PipelineStage);
  const targetIndex = STAGE_ORDER.indexOf(targetStage as PipelineStage);

  // If either stage is not found, don't transition
  if (currentIndex === -1 || targetIndex === -1) {
    return false;
  }

  // Only transition if moving forward
  return targetIndex > currentIndex;
}
