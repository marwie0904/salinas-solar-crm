"use client";

import { PipelineStage, PIPELINE_STAGE_LABELS, PIPELINE_STAGE_DESCRIPTIONS } from "@/lib/types";
import type { PipelineOpportunity } from "@/app/(dashboard)/pipeline/page";
import { OpportunityCard } from "./opportunity-card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  rectIntersection,
  CollisionDetection,
  pointerWithin,
  getFirstCollision,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, User, DollarSign, HelpCircle, Lock } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PipelineKanbanProps {
  opportunities: PipelineOpportunity[];
  onOpportunityClick: (opportunity: PipelineOpportunity) => void;
  onStageChange: (opportunityId: string, newStage: PipelineStage) => void;
  userRole?: string;
}

const stages: { stage: PipelineStage; color: string }[] = [
  { stage: "inbox", color: "bg-slate-500" },
  { stage: "to_call", color: "bg-blue-500" },
  { stage: "did_not_answer", color: "bg-red-400" },
  { stage: "booked_call", color: "bg-cyan-500" },
  { stage: "did_not_book_call", color: "bg-amber-500" },
  { stage: "for_ocular", color: "bg-purple-500" },
  { stage: "follow_up", color: "bg-yellow-500" },
  { stage: "contract_sent", color: "bg-orange-500" },
  { stage: "for_installation", color: "bg-teal-500" },
  { stage: "closed", color: "bg-green-500" },
];

function DroppableColumn({
  stage,
  children,
  isOver,
}: {
  stage: PipelineStage;
  children: React.ReactNode;
  isOver: boolean;
}) {
  const { setNodeRef } = useDroppable({ id: stage });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex-1 space-y-2 sm:space-y-3 p-1.5 sm:p-2 rounded-lg transition-colors overflow-y-auto",
        isOver ? "bg-[#ff5603]/10 ring-2 ring-[#ff5603]/30" : "bg-muted/30"
      )}
    >
      {children}
    </div>
  );
}

function DragOverlayCard({ opportunity }: { opportunity: PipelineOpportunity }) {
  const formatCurrency = (value: number) => {
    return "₱" + new Intl.NumberFormat("en-PH", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card className="w-[260px] shadow-xl ring-2 ring-[#ff5603] bg-white rotate-3">
      <CardContent className="p-4">
        <h4 className="font-semibold text-sm mb-3 line-clamp-2">
          {opportunity.name}
        </h4>
        <div className="space-y-2 text-xs text-muted-foreground">
          {opportunity.scheduledAppointment && (
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-[#ff5603]" />
              <span>
                {new Date(opportunity.scheduledAppointment.date).toLocaleDateString(
                  "en-US",
                  { month: "short", day: "numeric" }
                )}{" "}
                at {opportunity.scheduledAppointment.time}
              </span>
            </div>
          )}
          {opportunity.contact && (
            <div className="flex items-center gap-2">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{opportunity.contact.firstName} {opportunity.contact.lastName}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <DollarSign className="h-3.5 w-3.5 text-green-600" />
            <span className="font-medium text-foreground">
              {formatCurrency(opportunity.estimatedValue)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Static card for SSR - no drag functionality
function StaticOpportunityCard({
  opportunity,
  onClick,
}: {
  opportunity: PipelineOpportunity;
  onClick: () => void;
}) {
  const formatCurrency = (value: number) => {
    return "₱" + new Intl.NumberFormat("en-PH", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card
      className="cursor-pointer transition-all hover:shadow-md hover:border-[#ff5603]/30 bg-white"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <h4 className="font-semibold text-sm mb-3 line-clamp-2">
          {opportunity.name}
        </h4>
        <div className="space-y-2 text-xs text-muted-foreground">
          {opportunity.scheduledAppointment && (
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-[#ff5603]" />
              <span>
                {new Date(opportunity.scheduledAppointment.date).toLocaleDateString(
                  "en-US",
                  { month: "short", day: "numeric" }
                )}{" "}
                at {opportunity.scheduledAppointment.time}
              </span>
            </div>
          )}
          {opportunity.contact && (
            <div className="flex items-center gap-2">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{opportunity.contact.firstName} {opportunity.contact.lastName}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <DollarSign className="h-3.5 w-3.5 text-green-600" />
            <span className="font-medium text-foreground">
              {formatCurrency(opportunity.estimatedValue)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Custom collision detection that prioritizes column drops
const columnFirstCollision: CollisionDetection = (args) => {
  // First check if pointer is within any column (stage)
  const pointerCollisions = pointerWithin(args);

  // Find column collisions (stages)
  const columnCollision = pointerCollisions.find((collision) =>
    stages.some((s) => s.stage === collision.id)
  );

  // If we found a column collision, return it
  if (columnCollision) {
    return [columnCollision];
  }

  // Fall back to rect intersection for finding the column
  const rectCollisions = rectIntersection(args);
  const rectColumnCollision = rectCollisions.find((collision) =>
    stages.some((s) => s.stage === collision.id)
  );

  if (rectColumnCollision) {
    return [rectColumnCollision];
  }

  // If still no column, return all pointer collisions
  return pointerCollisions;
};

export function PipelineKanban({
  opportunities,
  onOpportunityClick,
  onStageChange,
  userRole,
}: PipelineKanbanProps) {
  const canAccessClosedStage = userRole === "project_manager";
  const [isMounted, setIsMounted] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  // Optimistic updates: local copy of opportunities for instant UI updates
  const [localOpportunities, setLocalOpportunities] = useState(opportunities);
  const [pendingUpdates, setPendingUpdates] = useState<Map<string, PipelineStage>>(new Map());

  // Sync local state with props when opportunities change from server
  useEffect(() => {
    setLocalOpportunities((current) => {
      // Merge server data with any pending local updates
      return opportunities.map((opp) => {
        const pendingStage = pendingUpdates.get(opp._id);
        if (pendingStage) {
          return { ...opp, stage: pendingStage };
        }
        return opp;
      });
    });
  }, [opportunities, pendingUpdates]);

  // Only enable DnD after component mounts on client
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        // Require user to hold still for 250ms without moving more than 3px
        // This prevents accidental drags during scroll
        delay: 250,
        tolerance: 3,
      },
    })
  );

  const getOpportunitiesByStage = useCallback((stage: PipelineStage) =>
    localOpportunities.filter((opp) => opp.stage === stage), [localOpportunities]);

  const formatCurrency = (value: number) => {
    return "₱" + new Intl.NumberFormat("en-PH", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getStageTotal = useCallback((stage: PipelineStage) => {
    return getOpportunitiesByStage(stage).reduce(
      (sum, opp) => sum + opp.estimatedValue,
      0
    );
  }, [getOpportunitiesByStage]);

  const activeOpportunity = activeId
    ? localOpportunities.find((opp) => opp._id === activeId)
    : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    if (over) {
      const isStage = stages.some((s) => s.stage === over.id);
      if (isStage) {
        // Don't show drop indicator on closed stage for non-project managers
        if (over.id === "closed" && !canAccessClosedStage) {
          setOverId(null);
          return;
        }
        setOverId(over.id as string);
      } else {
        const overOpportunity = localOpportunities.find((opp) => opp._id === over.id);
        if (overOpportunity) {
          // Don't show drop indicator on closed stage for non-project managers
          if (overOpportunity.stage === "closed" && !canAccessClosedStage) {
            setOverId(null);
            return;
          }
          setOverId(overOpportunity.stage);
        }
      }
    } else {
      setOverId(null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over) {
      const activeOpp = localOpportunities.find((opp) => opp._id === active.id);

      if (activeOpp) {
        // Determine the target stage
        let newStage: PipelineStage | null = null;

        const isStage = stages.some((s) => s.stage === over.id);
        if (isStage) {
          newStage = over.id as PipelineStage;
        } else {
          const overOpp = localOpportunities.find((opp) => opp._id === over.id);
          if (overOpp) {
            newStage = overOpp.stage;
          }
        }

        // Only update if stage actually changed
        // Prevent non-project managers from moving to "closed" stage
        if (newStage === "closed" && !canAccessClosedStage) {
          setActiveId(null);
          setOverId(null);
          return;
        }

        if (newStage && activeOpp.stage !== newStage) {
          // Optimistic update: immediately update local state
          setLocalOpportunities((current) =>
            current.map((opp) =>
              opp._id === activeOpp._id ? { ...opp, stage: newStage! } : opp
            )
          );

          // Track pending update
          setPendingUpdates((current) => {
            const updated = new Map(current);
            updated.set(activeOpp._id, newStage!);
            return updated;
          });

          // Trigger backend update (runs in background)
          onStageChange(activeOpp._id, newStage);

          // Clear pending update after a short delay (gives server time to respond)
          setTimeout(() => {
            setPendingUpdates((current) => {
              const updated = new Map(current);
              updated.delete(activeOpp._id);
              return updated;
            });
          }, 2000);
        }
      }
    }

    setActiveId(null);
    setOverId(null);
  };

  // Render static version during SSR
  if (!isMounted) {
    return (
      <div className="flex gap-2 sm:gap-4 overflow-x-auto pb-4 sm:pb-6 h-[calc(100vh-120px)] sm:h-[calc(100vh-200px)] kanban-scroll touch-scroll kanban-scrollbar pl-1 pr-4 sm:pl-0 sm:pr-0 sm:-mx-4 sm:px-4 md:mx-0 md:px-0">
        {stages.map((stageConfig) => {
          const stageOpportunities = getOpportunitiesByStage(stageConfig.stage);
          const stageTotal = getStageTotal(stageConfig.stage);
          const isClosedStageRestricted = stageConfig.stage === "closed" && !canAccessClosedStage;

          return (
            <div
              key={stageConfig.stage}
              data-tour={`stage-${stageConfig.stage}`}
              className={cn(
                "flex-shrink-0 w-[200px] sm:w-[280px] flex flex-col kanban-column",
                isClosedStageRestricted && "opacity-50"
              )}
            >
              <div className="mb-2 sm:mb-3">
                <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
                  <div
                    className={cn(
                      "w-2 h-2 sm:w-3 sm:h-3 rounded-full",
                      isClosedStageRestricted ? "bg-gray-400" : stageConfig.color
                    )}
                  />
                  <h3 className={cn(
                    "font-semibold text-[11px] sm:text-sm truncate",
                    isClosedStageRestricted && "text-muted-foreground"
                  )}>
                    {PIPELINE_STAGE_LABELS[stageConfig.stage]}
                  </h3>
                  {isClosedStageRestricted ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Lock className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[250px]">
                        <p>Project Manager Restricted Stage</p>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground cursor-help hidden sm:block" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[250px]">
                        <p>{PIPELINE_STAGE_DESCRIPTIONS[stageConfig.stage]}</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  <Badge variant="secondary" className="ml-auto text-[10px] sm:text-xs px-1.5 sm:px-2">
                    {stageOpportunities.length}
                  </Badge>
                </div>
                {isClosedStageRestricted ? (
                  <p className="text-[10px] sm:text-xs text-muted-foreground pl-3.5 sm:pl-5 italic">
                    PM Restricted
                  </p>
                ) : (
                  <p className="text-[10px] sm:text-xs text-muted-foreground pl-3.5 sm:pl-5">
                    {formatCurrency(stageTotal)}
                  </p>
                )}
              </div>
              <div className="flex-1 space-y-2 sm:space-y-3 p-1.5 sm:p-2 bg-muted/30 rounded-lg overflow-y-auto">
                {stageOpportunities.map((opportunity) => (
                  <StaticOpportunityCard
                    key={opportunity._id}
                    opportunity={opportunity}
                    onClick={() => onOpportunityClick(opportunity)}
                  />
                ))}
                {stageOpportunities.length === 0 && (
                  <div className="flex items-center justify-center h-16 sm:h-24 text-[11px] sm:text-sm text-muted-foreground">
                    No opportunities
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Render with DnD after client mount
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={columnFirstCollision}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-2 sm:gap-4 overflow-x-auto pb-4 sm:pb-6 h-[calc(100vh-120px)] sm:h-[calc(100vh-200px)] kanban-scroll touch-scroll kanban-scrollbar pl-1 pr-4 sm:pl-0 sm:pr-0 sm:-mx-4 sm:px-4 md:mx-0 md:px-0">
        {stages.map((stageConfig) => {
          const stageOpportunities = getOpportunitiesByStage(stageConfig.stage);
          const stageTotal = getStageTotal(stageConfig.stage);
          const isOver = overId === stageConfig.stage;
          const isClosedStageRestricted = stageConfig.stage === "closed" && !canAccessClosedStage;

          return (
            <div
              key={stageConfig.stage}
              data-tour={`stage-${stageConfig.stage}`}
              className={cn(
                "flex-shrink-0 w-[200px] sm:w-[280px] flex flex-col kanban-column",
                isClosedStageRestricted && "opacity-50"
              )}
            >
              <div className="mb-2 sm:mb-3">
                <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
                  <div
                    className={cn(
                      "w-2 h-2 sm:w-3 sm:h-3 rounded-full",
                      isClosedStageRestricted ? "bg-gray-400" : stageConfig.color
                    )}
                  />
                  <h3 className={cn(
                    "font-semibold text-[11px] sm:text-sm truncate",
                    isClosedStageRestricted && "text-muted-foreground"
                  )}>
                    {PIPELINE_STAGE_LABELS[stageConfig.stage]}
                  </h3>
                  {isClosedStageRestricted ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Lock className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[250px]">
                        <p>Project Manager Restricted Stage</p>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground cursor-help hidden sm:block" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[250px]">
                        <p>{PIPELINE_STAGE_DESCRIPTIONS[stageConfig.stage]}</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  <Badge variant="secondary" className="ml-auto text-[10px] sm:text-xs px-1.5 sm:px-2">
                    {stageOpportunities.length}
                  </Badge>
                </div>
                {isClosedStageRestricted ? (
                  <p className="text-[10px] sm:text-xs text-muted-foreground pl-3.5 sm:pl-5 italic">
                    PM Restricted
                  </p>
                ) : (
                  <p className="text-[10px] sm:text-xs text-muted-foreground pl-3.5 sm:pl-5">
                    {formatCurrency(stageTotal)}
                  </p>
                )}
              </div>

              <SortableContext
                items={stageOpportunities.map((opp) => opp._id)}
                strategy={verticalListSortingStrategy}
              >
                <DroppableColumn stage={stageConfig.stage} isOver={isOver}>
                  {stageOpportunities.map((opportunity) => (
                    <OpportunityCard
                      key={opportunity._id}
                      opportunity={opportunity}
                      onClick={() => onOpportunityClick(opportunity)}
                    />
                  ))}
                  {stageOpportunities.length === 0 && !isOver && (
                    <div className="flex items-center justify-center h-16 sm:h-24 text-[11px] sm:text-sm text-muted-foreground">
                      No opportunities
                    </div>
                  )}
                  {stageOpportunities.length === 0 && isOver && (
                    <div className="flex items-center justify-center h-16 sm:h-24 text-[11px] sm:text-sm text-[#ff5603] font-medium">
                      Drop here
                    </div>
                  )}
                </DroppableColumn>
              </SortableContext>
            </div>
          );
        })}
      </div>

      <DragOverlay>
        {activeOpportunity ? (
          <DragOverlayCard opportunity={activeOpportunity} />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
