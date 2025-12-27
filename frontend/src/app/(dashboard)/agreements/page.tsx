"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AgreementForm } from "@/components/agreements";
import { FileSignature } from "lucide-react";
import { Id } from "../../../../convex/_generated/dataModel";

function AgreementsContent() {
  const searchParams = useSearchParams();

  // Read pre-fill data from URL params
  const prefillData = {
    clientName: searchParams.get("clientName") || "",
    clientAddress: searchParams.get("clientAddress") || "",
    projectLocation: searchParams.get("projectLocation") || "",
    totalAmount: searchParams.get("totalAmount") ? parseFloat(searchParams.get("totalAmount")!) : 0,
    opportunityId: searchParams.get("opportunityId") as Id<"opportunities"> | undefined,
    opportunityName: searchParams.get("opportunityName") || undefined,
    contactId: searchParams.get("contactId") as Id<"contacts"> | undefined,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-muted rounded-lg">
          <FileSignature className="h-6 w-6 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Generate Agreement</h1>
          <p className="text-muted-foreground">
            {prefillData.opportunityName
              ? `Creating agreement for: ${prefillData.opportunityName}`
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
