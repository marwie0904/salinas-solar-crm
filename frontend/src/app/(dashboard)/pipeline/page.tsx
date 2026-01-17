"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { PipelineStage } from "@/lib/types";
import { PipelineKanban } from "@/components/pipeline/pipeline-kanban";
import { OpportunityDetailModal } from "@/components/pipeline/opportunity-detail-modal";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { usePageTitle } from "@/components/providers/page-title-context";

// Type for pipeline opportunity from Convex query
export type PipelineOpportunity = {
  _id: Id<"opportunities">;
  name: string;
  stage: PipelineStage;
  estimatedValue: number;
  location?: string;
  locationLat?: number;
  locationLng?: number;
  locationCapturedAt?: number;
  openSolarProjectId?: number;
  openSolarProjectUrl?: string;
  notes?: string;
  pmNotifiedForClose?: boolean;
  pmNotifiedForCloseAt?: number;
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
  systemConsultant: {
    _id: Id<"users">;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
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

function PipelineContent() {
  const [selectedOpportunity, setSelectedOpportunity] =
    useState<PipelineOpportunity | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const { setPageTitle, setPageAction } = usePageTitle();

  // Handle add opportunity action (for header button)
  const handleAddOpportunity = useCallback(() => {
    // TODO: Open add opportunity modal
    console.log("Add opportunity clicked");
  }, []);

  // Set page title and action for mobile header
  useEffect(() => {
    setPageTitle("Pipeline");
    setPageAction(() => handleAddOpportunity);
    return () => {
      setPageTitle("");
      setPageAction(null);
    };
  }, [setPageTitle, setPageAction, handleAddOpportunity]);

  // Fetch opportunities from Convex
  const opportunities = useQuery(api.opportunities.listForPipeline, {});
  const updateStage = useMutation(api.opportunities.updateStage);

  // Handle opportunityId from URL query params
  useEffect(() => {
    const opportunityId = searchParams.get("opportunityId");
    if (opportunityId && opportunities) {
      const opportunity = opportunities.find((opp) => opp._id === opportunityId);
      if (opportunity) {
        setSelectedOpportunity(opportunity);
        setIsModalOpen(true);
        // Clear the query param from URL
        router.replace("/pipeline", { scroll: false });
      }
    }
  }, [searchParams, opportunities, router]);

  const handleOpportunityClick = (opportunity: PipelineOpportunity) => {
    setSelectedOpportunity(opportunity);
    setIsModalOpen(true);
  };

  const handleStageChange = async (opportunityId: string, newStage: PipelineStage) => {
    try {
      await updateStage({
        id: opportunityId as Id<"opportunities">,
        stage: newStage,
        updatedBy: user?.id as Id<"users"> | undefined,
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
    <div className="space-y-4 md:space-y-6" data-tour="pipeline-board">
      {/* Header - Desktop only (mobile has button in header) */}
      <div className="hidden sm:flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold text-foreground">Pipeline</h1>
        <Button
          className="bg-[#ff5603] hover:bg-[#e64d00] h-10 px-4 gap-2"
          onClick={handleAddOpportunity}
        >
          <Plus className="h-4 w-4" />
          Add Opportunity
        </Button>
      </div>

      {/* Pipeline Kanban */}
      <PipelineKanban
        opportunities={opportunities as PipelineOpportunity[]}
        onOpportunityClick={handleOpportunityClick}
        onStageChange={handleStageChange}
        userRole={user?.role}
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

export default function PipelinePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading pipeline...</span>
          </div>
        </div>
      }
    >
      <PipelineContent />
    </Suspense>
  );
}
