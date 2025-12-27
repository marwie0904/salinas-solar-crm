"use client";

import type { PipelineOpportunity } from "@/app/(dashboard)/pipeline/page";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, User, HardHat, MapPin } from "lucide-react";
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
    return "₱" + new Intl.NumberFormat("en-PH", {
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
      <CardContent className="px-4 py-1.5">
        {/* Opportunity Name */}
        <h4 className="font-semibold text-sm mb-2 line-clamp-2">
          {opportunity.name}
        </h4>

        <div className="space-y-1.5 text-xs text-muted-foreground">
          {/* Associated Contact */}
          {opportunity.contact && (
            <div className="flex items-center gap-2">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{opportunity.contact.firstName} {opportunity.contact.lastName}</span>
            </div>
          )}

          {/* System Consultant */}
          {opportunity.systemConsultant && (
            <div className="flex items-center gap-2">
              <HardHat className="h-3.5 w-3.5 text-[#ff5603]" />
              <span>{opportunity.systemConsultant.firstName} {opportunity.systemConsultant.lastName}</span>
            </div>
          )}

          {/* Estimated Value */}
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">
              {formatCurrency(opportunity.estimatedValue)}
            </span>
          </div>
        </div>

        {/* Bottom row: Appointment Date (left) & Location Indicator (right) */}
        <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t">
          {/* Appointment Date - Bottom Left */}
          <div className="flex items-center gap-1.5 text-xs">
            {opportunity.scheduledAppointment ? (
              <>
                <Calendar className="h-3.5 w-3.5 text-[#ff5603]" />
                <span className="text-muted-foreground">
                  {new Date(opportunity.scheduledAppointment.date).toLocaleDateString(
                    "en-US",
                    { month: "short", day: "numeric" }
                  )}
                </span>
              </>
            ) : (
              <div className="relative">
                <Calendar className="h-4 w-4 text-gray-300" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-5 h-0.5 bg-gray-400 rotate-45 rounded-full" />
                </div>
              </div>
            )}
          </div>

          {/* Location Indicator - Bottom Right */}
          <div className="relative">
            {opportunity.location || opportunity.locationLat ? (
              <MapPin className="h-4 w-4 text-[#ff5603]" />
            ) : (
              <div className="relative">
                <MapPin className="h-4 w-4 text-gray-300" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-5 h-0.5 bg-gray-400 rotate-45 rounded-full" />
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
