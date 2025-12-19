"use client";

import type { PipelineOpportunity } from "@/app/(dashboard)/pipeline/page";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, User, DollarSign } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";

interface OpportunityCardProps {
  opportunity: PipelineOpportunity;
  onClick: () => void;
}

export function OpportunityCard({ opportunity, onClick }: OpportunityCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: opportunity._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleClick = () => {
    // Only trigger click if not dragging
    if (!isDragging) {
      onClick();
    }
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      className={cn(
        "cursor-grab active:cursor-grabbing touch-none transition-all hover:shadow-md hover:border-[#ff5603]/30 bg-white",
        isDragging && "opacity-50 shadow-lg ring-2 ring-[#ff5603]"
      )}
    >
      <CardContent className="p-4">
        {/* Opportunity Name */}
        <h4 className="font-semibold text-sm mb-3 line-clamp-2">
          {opportunity.name}
        </h4>

        <div className="space-y-2 text-xs text-muted-foreground">
          {/* Scheduled Appointment */}
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

          {/* Associated Contact */}
          {opportunity.contact && (
            <div className="flex items-center gap-2">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{opportunity.contact.firstName} {opportunity.contact.lastName}</span>
            </div>
          )}

          {/* Estimated Value */}
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
