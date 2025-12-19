"use client";

import { PipelineStage } from "@/lib/types";
import { MockOpportunity } from "@/lib/data/opportunities";
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
import { Calendar, User, DollarSign } from "lucide-react";

interface PipelineKanbanProps {
  opportunities: MockOpportunity[];
  onOpportunityClick: (opportunity: MockOpportunity) => void;
  onStageChange: (opportunityId: string, newStage: PipelineStage) => void;
}

const stages: { stage: PipelineStage; label: string; color: string }[] = [
  { stage: "new_lead", label: "New Lead", color: "bg-slate-500" },
  { stage: "contacted", label: "Contacted", color: "bg-blue-500" },
  { stage: "qualified", label: "Qualified", color: "bg-purple-500" },
  { stage: "proposal", label: "Proposal", color: "bg-amber-500" },
  { stage: "negotiation", label: "Negotiation", color: "bg-orange-500" },
  { stage: "closed_won", label: "Closed Won", color: "bg-green-500" },
  { stage: "closed_lost", label: "Closed Lost", color: "bg-red-500" },
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
        "flex-1 space-y-3 min-h-[400px] p-2 rounded-lg transition-colors",
        isOver ? "bg-[#ff5603]/10 ring-2 ring-[#ff5603]/30" : "bg-muted/30"
      )}
    >
      {children}
    </div>
  );
}

function DragOverlayCard({ opportunity }: { opportunity: MockOpportunity }) {
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
          <div className="flex items-center gap-2">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{opportunity.contact.firstName} {opportunity.contact.lastName}</span>
          </div>
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
  opportunity: MockOpportunity;
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
          <div className="flex items-center gap-2">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{opportunity.contact.firstName} {opportunity.contact.lastName}</span>
          </div>
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
      <div className="flex gap-4 overflow-x-auto pb-4">
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
                  <h3 className="font-semibold text-sm">{stageConfig.label}</h3>
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {stageOpportunities.length}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground pl-5">
                  {formatCurrency(stageTotal)}
                </p>
              </div>
              <div className="flex-1 space-y-3 min-h-[400px] p-2 bg-muted/30 rounded-lg">
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
      <div className="flex gap-4 overflow-x-auto pb-4">
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
                  <h3 className="font-semibold text-sm">{stageConfig.label}</h3>
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
