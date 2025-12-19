"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { PipelineStage } from "@/lib/types";
import { PipelineKanban } from "@/components/pipeline/pipeline-kanban";
import { OpportunityDetailModal } from "@/components/pipeline/opportunity-detail-modal";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";

// Type for pipeline opportunity from Convex query
export type PipelineOpportunity = {
  _id: Id<"opportunities">;
  name: string;
  stage: PipelineStage;
  estimatedValue: number;
  notes?: string;
  createdAt: number;
  updatedAt: number;
  contact: {
    _id: Id<"contacts">;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    address?: string;
    source: string;
  } | null;
  scheduledAppointment: {
    _id: Id<"appointments">;
    title: string;
    date: string;
    time: string;
    location?: string;
    status: string;
    appointmentType: string;
  } | null;
};

export default function PipelinePage() {
  const [selectedOpportunity, setSelectedOpportunity] =
    useState<PipelineOpportunity | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch opportunities from Convex
  const opportunities = useQuery(api.opportunities.listForPipeline, {});
  const updateStage = useMutation(api.opportunities.updateStage);

  const handleOpportunityClick = (opportunity: PipelineOpportunity) => {
    setSelectedOpportunity(opportunity);
    setIsModalOpen(true);
  };

  const handleStageChange = async (opportunityId: string, newStage: PipelineStage) => {
    try {
      await updateStage({
        id: opportunityId as Id<"opportunities">,
        stage: newStage,
      });
    } catch (error) {
      console.error("Failed to update stage:", error);
    }
  };

  const handleSave = (updatedOpportunity: PipelineOpportunity) => {
    // Convex will auto-update via subscription
    setSelectedOpportunity(null);
    setIsModalOpen(false);
  };

  const handleDelete = (opportunityId: string) => {
    // Convex will auto-update via subscription
    setSelectedOpportunity(null);
    setIsModalOpen(false);
  };

  // Calculate totals
  const totalOpportunities = opportunities?.length ?? 0;
  const totalValue = opportunities?.reduce(
    (sum, opp) => sum + opp.estimatedValue,
    0
  ) ?? 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (opportunities === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading pipeline...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pipeline</h1>
          <p className="text-muted-foreground">
            {totalOpportunities} opportunities • {formatCurrency(totalValue)}{" "}
            total value
          </p>
        </div>
        <Button className="bg-[#ff5603] hover:bg-[#e64d00] gap-2">
          <Plus className="h-4 w-4" />
          <span>Add Opportunity</span>
        </Button>
      </div>

      {/* Pipeline Kanban */}
      <PipelineKanban
        opportunities={opportunities as PipelineOpportunity[]}
        onOpportunityClick={handleOpportunityClick}
        onStageChange={handleStageChange}
      />

      {/* Opportunity Detail Modal */}
      <OpportunityDetailModal
        opportunity={selectedOpportunity}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </div>
  );
}
