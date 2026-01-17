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
      <CardContent className="px-2.5 py-0.5 sm:px-4 sm:py-1.5">
        {/* Opportunity Name */}
        <h4 className="font-semibold text-[11px] leading-tight line-clamp-1 sm:text-sm sm:leading-normal sm:mb-2 sm:line-clamp-2">
          {opportunity.name}
        </h4>

        <div className="space-y-0 text-[10px] text-muted-foreground sm:space-y-1.5 sm:text-xs">
          {/* Associated Contact */}
          {opportunity.contact && (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <User className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground flex-shrink-0" />
              <span className="truncate">{opportunity.contact.firstName} {opportunity.contact.lastName}</span>
            </div>
          )}

          {/* System Consultant */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {opportunity.systemConsultant ? (
              <>
                <HardHat className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-[#ff5603] flex-shrink-0" />
                <span className="truncate">{opportunity.systemConsultant.firstName} {opportunity.systemConsultant.lastName}</span>
              </>
            ) : (
              <div className="relative">
                <HardHat className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-gray-300" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-3.5 h-0.5 sm:w-4 bg-gray-400 rotate-45 rounded-full" />
                </div>
              </div>
            )}
          </div>

          {/* Estimated Value */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="font-medium text-foreground text-xs sm:text-sm">
              {formatCurrency(opportunity.estimatedValue)}
            </span>
          </div>
        </div>

        {/* Bottom row: Appointment Date (left) & Location Indicator (right) */}
        <div className="flex items-center justify-between mt-1 pt-1 sm:mt-2.5 sm:pt-2.5 border-t">
          {/* Appointment Date - Bottom Left */}
          <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs">
            {opportunity.scheduledAppointment ? (
              <>
                <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-[#ff5603]" />
                <span className="text-muted-foreground">
                  {new Date(opportunity.scheduledAppointment.date).toLocaleDateString(
                    "en-US",
                    { month: "short", day: "numeric" }
                  )}
                </span>
              </>
            ) : (
              <div className="relative">
                <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-300" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-4 sm:w-5 h-0.5 bg-gray-400 rotate-45 rounded-full" />
                </div>
              </div>
            )}
          </div>

          {/* Location Indicator - Bottom Right */}
          <div className="relative">
            {opportunity.location || opportunity.locationLat ? (
              <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#ff5603]" />
            ) : (
              <div className="relative">
                <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-300" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-4 sm:w-5 h-0.5 bg-gray-400 rotate-45 rounded-full" />
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
