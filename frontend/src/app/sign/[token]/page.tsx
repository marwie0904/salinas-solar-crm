"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { SignaturePad } from "@/components/signature";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  FileSignature,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
  MapPin,
  Settings,
  Package,
  CreditCard,
  User,
  Clock,
  Download,
} from "lucide-react";
import { formatPHP, SYSTEM_TYPE_LABELS, SystemType, PAYMENT_METHOD_LABELS, PaymentMethod } from "@/lib/types";

export default function SignAgreementPage() {
  const params = useParams();
  const token = params.token as string;

  const agreement = useQuery(api.agreements.getByToken, { token });
  const markViewed = useMutation(api.agreements.markViewed);
  const signAgreement = useAction(api.agreements.sign);

  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [signerName, setSignerName] = useState("");
  const [isSigning, setIsSigning] = useState(false);
  const [signedSuccess, setSignedSuccess] = useState(false);
  const [signedDocumentUrl, setSignedDocumentUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Mark as viewed when page loads
  useEffect(() => {
    if (agreement && !agreement.isExpired && agreement.status !== "signed") {
      markViewed({ token });
    }
  }, [agreement, token, markViewed]);

  // Pre-fill signer name from agreement
  useEffect(() => {
    if (agreement?.clientName && !signerName) {
      setSignerName(agreement.clientName);
    }
  }, [agreement, signerName]);

  const handleSign = async () => {
    if (!signatureData) {
      setError("Please provide your signature");
      return;
    }

    if (!signerName.trim()) {
      setError("Please enter your name");
      return;
    }

    setIsSigning(true);
    setError(null);

    try {
      const result = await signAgreement({
        token,
        signatureData,
        signedByName: signerName.trim(),
      });
      setSignedSuccess(true);
      if (result.signedDocumentUrl) {
        setSignedDocumentUrl(result.signedDocumentUrl);
      }
    } catch (err) {
      console.error("Failed to sign agreement:", err);
      setError(err instanceof Error ? err.message : "Failed to sign agreement");
    } finally {
      setIsSigning(false);
    }
  };

  // Loading state
  if (agreement === undefined) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-[#ff5603] mx-auto mb-4" />
          <p className="text-muted-foreground">Loading agreement...</p>
        </div>
      </div>
    );
  }

  // Not found
  if (!agreement) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Agreement Not Found</h2>
            <p className="text-muted-foreground">
              This agreement link is invalid or has been removed.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Expired
  if (agreement.isExpired) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <Clock className="h-12 w-12 text-orange-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Agreement Expired</h2>
            <p className="text-muted-foreground">
              This agreement link has expired. Please contact Salinas Solar for a new agreement.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Already signed
  if (agreement.status === "signed" || signedSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Agreement Signed</h2>
            <p className="text-muted-foreground mb-4">
              Thank you for signing the agreement. Your signed copy has been saved.
            </p>
            {signedDocumentUrl && (
              <Button
                asChild
                className="mb-4 bg-[#ff5603] hover:bg-[#e64d00]"
              >
                <a href={signedDocumentUrl} download={`${agreement.clientName}_Signed_Agreement.pdf`} target="_blank" rel="noopener noreferrer">
                  <Download className="h-4 w-4 mr-2" />
                  Download Signed Document
                </a>
              </Button>
            )}
            {agreement.signedAt && (
              <p className="text-sm text-muted-foreground">
                Signed on: {new Date(agreement.signedAt).toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Current date for signing
  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#ff5603] to-[#e64d00] text-white py-8 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl font-bold mb-2">Salinas Solar</h1>
          <p className="text-white/90">Solar Installation Agreement</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
        {/* Agreement Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSignature className="h-5 w-5" />
              Agreement Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Client Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <User className="h-4 w-4" />
                  Client Name
                </div>
                <p className="font-medium">{agreement.clientName}</p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Calendar className="h-4 w-4" />
                  Agreement Date
                </div>
                <p className="font-medium">
                  {new Date(agreement.agreementDate).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <MapPin className="h-4 w-4" />
                Project Location
              </div>
              <p className="font-medium">{agreement.projectLocation}</p>
            </div>

            {/* System Details */}
            <div className="border-t pt-4">
              <h3 className="font-semibold flex items-center gap-2 mb-3">
                <Settings className="h-4 w-4" />
                System Specifications
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">System Type</p>
                  <p className="font-medium">
                    {SYSTEM_TYPE_LABELS[agreement.systemType as SystemType] || agreement.systemType}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">System Size</p>
                  <p className="font-medium">{agreement.systemSize} kW</p>
                </div>
                {agreement.batteryCapacity && agreement.batteryCapacity > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground">Battery Capacity</p>
                    <p className="font-medium">{agreement.batteryCapacity} kWh</p>
                  </div>
                )}
              </div>
            </div>

            {/* Materials */}
            {agreement.materials && agreement.materials.length > 0 && (
              <div className="border-t pt-4">
                <h3 className="font-semibold flex items-center gap-2 mb-3">
                  <Package className="h-4 w-4" />
                  Materials
                </h3>
                <div className="space-y-2">
                  {agreement.materials.map((material: { name: string; quantity: number; model?: string }, idx: number) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span>
                        {material.name}
                        {material.model && <span className="text-muted-foreground"> ({material.model})</span>}
                      </span>
                      <span className="text-muted-foreground">Qty: {material.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Payment Schedule */}
            {agreement.payments && agreement.payments.length > 0 && (
              <div className="border-t pt-4">
                <h3 className="font-semibold flex items-center gap-2 mb-3">
                  <CreditCard className="h-4 w-4" />
                  Payment Schedule
                </h3>
                <div className="space-y-3">
                  {agreement.payments.map((payment: { description: string; amount: number; dueDate: string; paymentMethods?: PaymentMethod[] }, idx: number) => (
                    <div key={idx} className="flex justify-between items-start p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">{payment.description}</p>
                        <p className="text-sm text-muted-foreground">
                          Due: {new Date(payment.dueDate).toLocaleDateString()}
                        </p>
                        {payment.paymentMethods && payment.paymentMethods.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Payment methods: {payment.paymentMethods.map(m => PAYMENT_METHOD_LABELS[m]).join(", ")}
                          </p>
                        )}
                      </div>
                      <p className="font-semibold text-[#ff5603]">{formatPHP(payment.amount)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Total */}
            <div className="border-t pt-4">
              <div className="flex justify-between items-center text-lg">
                <span className="font-semibold">Total Contract Amount</span>
                <span className="font-bold text-[#ff5603] text-xl">
                  {formatPHP(agreement.totalAmount)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Signature Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSignature className="h-5 w-5" />
              Sign Agreement
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Signer Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Full Name <span className="text-red-500">*</span>
              </label>
              <Input
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="Enter your full name"
              />
            </div>

            {/* Signature Pad */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Signature <span className="text-red-500">*</span>
              </label>
              <SignaturePad onSignatureChange={setSignatureData} />
            </div>

            {/* Date */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Date</label>
              <Input
                value={currentDate}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                This date will be automatically recorded when you sign
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 text-red-500 text-sm">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            {/* Sign Button */}
            <Button
              onClick={handleSign}
              disabled={isSigning || !signatureData || !signerName.trim()}
              className="w-full bg-[#ff5603] hover:bg-[#e64d00] h-12 text-lg"
            >
              {isSigning ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Signing Agreement...
                </>
              ) : (
                <>
                  <FileSignature className="h-5 w-5 mr-2" />
                  Sign Agreement
                </>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              By signing this agreement, you acknowledge that you have read and agree to all terms and conditions.
            </p>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground pb-8">
          <p>Salinas Solar Philippines</p>
          <p className="mt-1">Questions? Contact us for assistance.</p>
        </div>
      </div>
    </div>
  );
}
