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
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, User, DollarSign, HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PipelineKanbanProps {
  opportunities: PipelineOpportunity[];
  onOpportunityClick: (opportunity: PipelineOpportunity) => void;
  onStageChange: (opportunityId: string, newStage: PipelineStage) => void;
}

const stages: { stage: PipelineStage; color: string }[] = [
  { stage: "inbox", color: "bg-slate-500" },
  { stage: "scheduled_discovery_call", color: "bg-blue-500" },
  { stage: "discovery_call", color: "bg-cyan-500" },
  { stage: "no_show_discovery_call", color: "bg-red-400" },
  { stage: "field_inspection", color: "bg-purple-500" },
  { stage: "to_follow_up", color: "bg-amber-500" },
  { stage: "contract_drafting", color: "bg-orange-500" },
  { stage: "contract_signing", color: "bg-indigo-500" },
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
        "flex-1 space-y-3 p-2 rounded-lg transition-colors overflow-y-auto",
        isOver ? "bg-[#ff5603]/10 ring-2 ring-[#ff5603]/30" : "bg-muted/30"
      )}
    >
      {children}
    </div>
  );
}

function DragOverlayCard({ opportunity }: { opportunity: PipelineOpportunity }) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
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
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
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

export function PipelineKanban({
  opportunities,
  onOpportunityClick,
  onStageChange,
}: PipelineKanbanProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  // Only enable DnD after component mounts on client
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const getOpportunitiesByStage = (stage: PipelineStage) =>
    opportunities.filter((opp) => opp.stage === stage);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getStageTotal = (stage: PipelineStage) => {
    return getOpportunitiesByStage(stage).reduce(
      (sum, opp) => sum + opp.estimatedValue,
      0
    );
  };

  const activeOpportunity = activeId
    ? opportunities.find((opp) => opp._id === activeId)
    : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    if (over) {
      const isStage = stages.some((s) => s.stage === over.id);
      if (isStage) {
        setOverId(over.id as string);
      } else {
        const overOpportunity = opportunities.find((opp) => opp._id === over.id);
        if (overOpportunity) {
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
      const activeOpp = opportunities.find((opp) => opp._id === active.id);

      if (activeOpp) {
        const isStage = stages.some((s) => s.stage === over.id);

        if (isStage) {
          const newStage = over.id as PipelineStage;
          if (activeOpp.stage !== newStage) {
            onStageChange(activeOpp._id, newStage);
          }
        } else {
          const overOpp = opportunities.find((opp) => opp._id === over.id);
          if (overOpp && activeOpp.stage !== overOpp.stage) {
            onStageChange(activeOpp._id, overOpp.stage);
          }
        }
      }
    }

    setActiveId(null);
    setOverId(null);
  };

  // Render static version during SSR
  if (!isMounted) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-220px)]">
        {stages.map((stageConfig) => {
          const stageOpportunities = getOpportunitiesByStage(stageConfig.stage);
          const stageTotal = getStageTotal(stageConfig.stage);

          return (
            <div
              key={stageConfig.stage}
              className="flex-shrink-0 w-[280px] flex flex-col"
            >
              <div className="mb-3">
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className={cn("w-3 h-3 rounded-full", stageConfig.color)}
                  />
                  <h3 className="font-semibold text-sm">{PIPELINE_STAGE_LABELS[stageConfig.stage]}</h3>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[250px]">
                      <p>{PIPELINE_STAGE_DESCRIPTIONS[stageConfig.stage]}</p>
                    </TooltipContent>
                  </Tooltip>
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {stageOpportunities.length}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground pl-5">
                  {formatCurrency(stageTotal)}
                </p>
              </div>
              <div className="flex-1 space-y-3 p-2 bg-muted/30 rounded-lg overflow-y-auto">
                {stageOpportunities.map((opportunity) => (
                  <StaticOpportunityCard
                    key={opportunity._id}
                    opportunity={opportunity}
                    onClick={() => onOpportunityClick(opportunity)}
                  />
                ))}
                {stageOpportunities.length === 0 && (
                  <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
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
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-220px)]">
        {stages.map((stageConfig) => {
          const stageOpportunities = getOpportunitiesByStage(stageConfig.stage);
          const stageTotal = getStageTotal(stageConfig.stage);
          const isOver = overId === stageConfig.stage;

          return (
            <div
              key={stageConfig.stage}
              className="flex-shrink-0 w-[280px] flex flex-col"
            >
              <div className="mb-3">
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className={cn("w-3 h-3 rounded-full", stageConfig.color)}
                  />
                  <h3 className="font-semibold text-sm">{PIPELINE_STAGE_LABELS[stageConfig.stage]}</h3>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[250px]">
                      <p>{PIPELINE_STAGE_DESCRIPTIONS[stageConfig.stage]}</p>
                    </TooltipContent>
                  </Tooltip>
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {stageOpportunities.length}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground pl-5">
                  {formatCurrency(stageTotal)}
                </p>
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
                    <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
                      No opportunities
                    </div>
                  )}
                  {stageOpportunities.length === 0 && isOver && (
                    <div className="flex items-center justify-center h-24 text-sm text-[#ff5603] font-medium">
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
