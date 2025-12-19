"use client";

import { useState } from "react";
import { PipelineStage } from "@/lib/types";
import { placeholderOpportunities, MockOpportunity } from "@/lib/data/opportunities";
import { PipelineKanban } from "@/components/pipeline/pipeline-kanban";
import { OpportunityDetailModal } from "@/components/pipeline/opportunity-detail-modal";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function PipelinePage() {
  const [opportunities, setOpportunities] = useState<MockOpportunity[]>(
    placeholderOpportunities
  );
  const [selectedOpportunity, setSelectedOpportunity] =
    useState<MockOpportunity | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpportunityClick = (opportunity: MockOpportunity) => {
    setSelectedOpportunity(opportunity);
    setIsModalOpen(true);
  };

  const handleStageChange = (opportunityId: string, newStage: PipelineStage) => {
    setOpportunities((prev) =>
      prev.map((opp) =>
        opp._id === opportunityId ? { ...opp, stage: newStage } : opp
      )
    );
  };

  const handleSave = (updatedOpportunity: MockOpportunity) => {
    setOpportunities((prev) =>
      prev.map((opp) =>
        opp._id === updatedOpportunity._id ? updatedOpportunity : opp
      )
    );
    setSelectedOpportunity(null);
  };

  const handleDelete = (opportunityId: string) => {
    setOpportunities((prev) => prev.filter((opp) => opp._id !== opportunityId));
    setSelectedOpportunity(null);
  };

  // Calculate totals
  const totalOpportunities = opportunities.length;
  const totalValue = opportunities.reduce(
    (sum, opp) => sum + opp.estimatedValue,
    0
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

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
        opportunities={opportunities}
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
