"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { usePageTitle } from "@/components/providers/page-title-context";
import { AgreementForm } from "@/components/agreements";
import { FileSignature } from "lucide-react";
import { Id } from "../../../../convex/_generated/dataModel";
import { AgreementMaterial, SystemType } from "@/lib/types";

// OpenSolar prefill data structure (matching the one in agreement-form.tsx)
interface OpenSolarPrefillData {
  systemType?: SystemType;
  systemSize?: number;
  batteryCapacity?: number;
  projectLocation?: string;
  totalContractAmount?: number;
  upfrontPaymentAmount?: number;
  materials?: AgreementMaterial[];
}

function AgreementsContent() {
  const searchParams = useSearchParams();
  const getProjectForAgreement = useAction(api.openSolar.getProjectForAgreement);
  const { setPageTitle } = usePageTitle();

  // Set page title for mobile header
  useEffect(() => {
    setPageTitle("Agreement");
    return () => setPageTitle("");
  }, [setPageTitle]);

  // OpenSolar loading state
  const [isLoadingOpenSolar, setIsLoadingOpenSolar] = useState(false);
  const [openSolarError, setOpenSolarError] = useState<string | null>(null);
  const [openSolarData, setOpenSolarData] = useState<OpenSolarPrefillData | undefined>(undefined);

  // Read pre-fill data from URL params
  const openSolarProjectId = searchParams.get("openSolarProjectId");
  const basePrefillData = {
    clientName: searchParams.get("clientName") || "",
    clientAddress: searchParams.get("clientAddress") || "",
    projectLocation: searchParams.get("projectLocation") || "",
    totalAmount: searchParams.get("totalAmount") ? parseFloat(searchParams.get("totalAmount")!) : 0,
    opportunityId: searchParams.get("opportunityId") as Id<"opportunities"> | undefined,
    opportunityName: searchParams.get("opportunityName") || undefined,
    contactId: searchParams.get("contactId") as Id<"contacts"> | undefined,
    contactEmail: searchParams.get("contactEmail") || undefined,
  };

  // Fetch OpenSolar data if project ID is provided
  useEffect(() => {
    async function fetchOpenSolarData() {
      if (!openSolarProjectId) return;

      const projectId = parseInt(openSolarProjectId, 10);
      if (isNaN(projectId)) return;

      setIsLoadingOpenSolar(true);
      setOpenSolarError(null);

      try {
        const result = await getProjectForAgreement({ openSolarProjectId: projectId });

        if (result.success && result.data) {
          setOpenSolarData({
            systemType: result.data.systemType,
            systemSize: result.data.systemSize,
            batteryCapacity: result.data.batteryCapacity,
            projectLocation: result.data.projectLocation,
            totalContractAmount: result.data.totalContractAmount,
            upfrontPaymentAmount: result.data.upfrontPaymentAmount,
            materials: result.data.materials,
          });
        } else {
          setOpenSolarError(result.error || "Failed to fetch OpenSolar data");
        }
      } catch (error) {
        console.error("Error fetching OpenSolar data:", error);
        setOpenSolarError(error instanceof Error ? error.message : "Failed to fetch OpenSolar data");
      } finally {
        setIsLoadingOpenSolar(false);
      }
    }

    fetchOpenSolarData();
  }, [openSolarProjectId, getProjectForAgreement]);

  // Combine base prefill data with OpenSolar data
  const prefillData = {
    ...basePrefillData,
    openSolarData,
    isLoadingOpenSolar,
    openSolarError,
  };

  return (
    <div className="space-y-4 md:space-y-6" data-tour="agreements-form">
      <div className="flex items-center gap-3">
        <div className="hidden sm:block p-2 bg-muted rounded-lg">
          <FileSignature className="h-6 w-6 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="hidden sm:block text-xl md:text-2xl font-bold text-foreground">Generate Agreement</h1>
          <p className="text-xs sm:text-sm md:text-base text-muted-foreground truncate">
            {basePrefillData.opportunityName
              ? `Creating agreement for: ${basePrefillData.opportunityName}`
              : "Create a solar installation agreement document"}
          </p>
        </div>
      </div>

      <AgreementForm prefillData={prefillData} />
    </div>
  );
}

export default function AgreementsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]">Loading...</div>}>
      <AgreementsContent />
    </Suspense>
  );
}
