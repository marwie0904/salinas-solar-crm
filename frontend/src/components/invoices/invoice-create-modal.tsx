"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Target, Download, CheckCircle2, Mail } from "lucide-react";
import {
  PaymentType,
  PaymentMethod,
  PAYMENT_TYPE_LABELS,
  PAYMENT_METHOD_LABELS,
  formatPHP,
} from "@/lib/types";
import { generateInvoicePDF, GeneratedPDF } from "./invoice-pdf-generator";

interface InvoiceCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  preselectedOpportunityId?: Id<"opportunities">;
}

interface FormData {
  opportunityId: string;
  paymentType: PaymentType;
  paymentMethod: PaymentMethod;
  total: string;
  installmentAmount: string;
  numberOfInstallments: string;
  dueDate: string;
  notes: string;
}

const PAYMENT_TYPES: PaymentType[] = [
  "one_time",
  "installment",
  "downpayment",
  "progress_billing",
];

const PAYMENT_METHODS: PaymentMethod[] = [
  "cash",
  "bank_transfer",
  "check",
  "credit_card",
  "gcash",
  "maya",
  "other",
];

export function InvoiceCreateModal({
  open,
  onOpenChange,
  onSuccess,
  preselectedOpportunityId,
}: InvoiceCreateModalProps) {
  const [formData, setFormData] = useState<FormData>({
    opportunityId: preselectedOpportunityId || "",
    paymentType: "one_time",
    paymentMethod: "bank_transfer",
    total: "",
    installmentAmount: "",
    numberOfInstallments: "",
    dueDate: "",
    notes: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  // Success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successData, setSuccessData] = useState<{
    contactEmail: string;
    contactName: string;
    pdf: GeneratedPDF | null;
  } | null>(null);

  // Reset form when preselectedOpportunityId changes
  useEffect(() => {
    if (preselectedOpportunityId) {
      setFormData((prev) => ({ ...prev, opportunityId: preselectedOpportunityId }));
    }
  }, [preselectedOpportunityId]);

  // Fetch opportunities with contact info
  const opportunities = useQuery(api.opportunities.list, {});

  const createInvoice = useMutation(api.invoices.createSimple);
  const generateUploadUrl = useMutation(api.documents.generateUploadUrl);
  const createDocument = useMutation(api.documents.create);

  // Get selected opportunity details
  const selectedOpportunity = opportunities?.find(
    (opp) => opp._id === formData.opportunityId
  );

  const resetForm = () => {
    setFormData({
      opportunityId: preselectedOpportunityId || "",
      paymentType: "one_time",
      paymentMethod: "bank_transfer",
      total: "",
      installmentAmount: "",
      numberOfInstallments: "",
      dueDate: "",
      notes: "",
    });
  };

  // Helper function to save PDF as document
  const savePDFAsDocument = async (
    pdfBlob: Blob,
    filename: string,
    opportunityId: Id<"opportunities">,
    invoiceId: Id<"invoices">
  ) => {
    try {
      // Get upload URL
      const uploadUrl = await generateUploadUrl();

      // Upload the PDF blob
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": "application/pdf" },
        body: pdfBlob,
      });

      if (!response.ok) {
        throw new Error("Failed to upload PDF");
      }

      const { storageId } = await response.json();

      // Create document record linked to opportunity and invoice
      await createDocument({
        name: filename,
        mimeType: "application/pdf",
        storageId,
        fileSize: pdfBlob.size,
        opportunityId,
        invoiceId,
      });

      return true;
    } catch (error) {
      console.error("Failed to save PDF as document:", error);
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.opportunityId || !formData.total || !formData.dueDate) {
      return;
    }

    setIsSaving(true);
    try {
      // Create the invoice
      const invoiceId = await createInvoice({
        opportunityId: formData.opportunityId as Id<"opportunities">,
        total: parseFloat(formData.total),
        paymentType: formData.paymentType,
        paymentMethod: formData.paymentMethod,
        installmentAmount:
          formData.paymentType === "installment" && formData.installmentAmount
            ? parseFloat(formData.installmentAmount)
            : undefined,
        numberOfInstallments:
          formData.paymentType === "installment" && formData.numberOfInstallments
            ? parseInt(formData.numberOfInstallments)
            : undefined,
        dueDate: new Date(formData.dueDate).getTime(),
        notes: formData.notes || undefined,
      });

      // Generate invoice number (same format as backend)
      const now = new Date();
      const year = now.getFullYear();
      const invoiceNumber = `INV-${year}-${invoiceId.slice(-6).toUpperCase()}`;

      // Generate PDF
      const contactName = selectedOpportunity?.contact
        ? `${selectedOpportunity.contact.firstName} ${selectedOpportunity.contact.lastName}`
        : "Customer";
      const contactEmail = selectedOpportunity?.contact?.email || "";

      const pdfData = {
        invoiceNumber,
        invoiceDate: new Date().toISOString(),
        dueDate: formData.dueDate,
        billedTo: {
          name: contactName,
          address: selectedOpportunity?.contact?.address || "",
        },
        opportunityName: selectedOpportunity?.name || "",
        paymentType: formData.paymentType,
        paymentMethod: formData.paymentMethod,
        total: parseFloat(formData.total),
        installmentAmount:
          formData.paymentType === "installment" && formData.installmentAmount
            ? parseFloat(formData.installmentAmount)
            : undefined,
        numberOfInstallments:
          formData.paymentType === "installment" && formData.numberOfInstallments
            ? parseInt(formData.numberOfInstallments)
            : undefined,
        notes: formData.notes,
      };

      const pdf = generateInvoicePDF(pdfData);

      // Save PDF as document linked to opportunity
      await savePDFAsDocument(
        pdf.blob,
        pdf.filename,
        formData.opportunityId as Id<"opportunities">,
        invoiceId
      );

      // Show success modal
      setSuccessData({
        contactEmail,
        contactName,
        pdf,
      });
      setShowSuccessModal(true);

      // Reset form but keep modal open for success message
      resetForm();
      onSuccess?.();
    } catch (error) {
      console.error("Failed to create invoice:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadPDF = () => {
    if (successData?.pdf) {
      successData.pdf.download();
    }
  };

  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
    setSuccessData(null);
    onOpenChange(false);
  };

  // Auto-calculate total from installments
  const handleInstallmentChange = (field: "installmentAmount" | "numberOfInstallments", value: string) => {
    const newFormData = { ...formData, [field]: value };

    if (newFormData.installmentAmount && newFormData.numberOfInstallments) {
      const installment = parseFloat(newFormData.installmentAmount);
      const count = parseInt(newFormData.numberOfInstallments);
      if (!isNaN(installment) && !isNaN(count)) {
        newFormData.total = (installment * count).toString();
      }
    }

    setFormData(newFormData);
  };

  // Success Modal
  if (showSuccessModal && successData) {
    return (
      <Dialog open={true} onOpenChange={handleCloseSuccessModal}>
        <DialogContent className="sm:max-w-[400px] bg-background border shadow-lg">
          <div className="flex flex-col items-center text-center py-4">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Invoice Created</h2>
            <div className="flex items-center gap-2 text-muted-foreground mb-6">
              <Mail className="h-4 w-4" />
              <span>
                Sent to: {successData.contactEmail || "No email on file"}
              </span>
            </div>
            <div className="flex gap-3 w-full">
              <Button
                variant="outline"
                onClick={handleCloseSuccessModal}
                className="flex-1"
              >
                Close
              </Button>
              <Button
                onClick={handleDownloadPDF}
                className="flex-1 bg-[#ff5603] hover:bg-[#e64d00] gap-2"
              >
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[500px] bg-background border shadow-lg"
        hideOverlay
      >
        <DialogHeader>
          <DialogTitle>Create Invoice</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Opportunity Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Opportunity *</label>
            <Select
              value={formData.opportunityId}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, opportunityId: value }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select an opportunity" />
              </SelectTrigger>
              <SelectContent>
                {opportunities?.map((opp) => (
                  <SelectItem key={opp._id} value={opp._id}>
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-muted-foreground" />
                      <span>{opp.name}</span>
                      {opp.contact && (
                        <span className="text-muted-foreground">
                          - {opp.contact.firstName} {opp.contact.lastName}
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Payment Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Payment Type *</label>
            <Select
              value={formData.paymentType}
              onValueChange={(value: PaymentType) =>
                setFormData((prev) => ({ ...prev, paymentType: value }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select payment type" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {PAYMENT_TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Installment Fields (shown only for installment type) */}
          {formData.paymentType === "installment" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Amount per Installment</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={formData.installmentAmount}
                  onChange={(e) => handleInstallmentChange("installmentAmount", e.target.value)}
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Number of Installments</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={formData.numberOfInstallments}
                  onChange={(e) => handleInstallmentChange("numberOfInstallments", e.target.value)}
                  min="1"
                  step="1"
                />
              </div>
            </div>
          )}

          {/* Total Payment */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Total Payment *</label>
            <Input
              type="number"
              placeholder="0.00"
              value={formData.total}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, total: e.target.value }))
              }
              min="0"
              step="0.01"
              required
            />
            {formData.total && (
              <p className="text-sm text-muted-foreground">
                {formatPHP(parseFloat(formData.total) || 0)}
              </p>
            )}
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Due Date *</label>
            <Input
              type="date"
              value={formData.dueDate}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, dueDate: e.target.value }))
              }
              required
            />
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Payment Method *</label>
            <Select
              value={formData.paymentMethod}
              onValueChange={(value: PaymentMethod) =>
                setFormData((prev) => ({ ...prev, paymentMethod: value }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((method) => (
                  <SelectItem key={method} value={method}>
                    {PAYMENT_METHOD_LABELS[method]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Notes</label>
            <Textarea
              placeholder="Additional notes..."
              value={formData.notes}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, notes: e.target.value }))
              }
              rows={2}
            />
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-[#ff5603] hover:bg-[#e64d00] cursor-pointer"
              disabled={
                isSaving ||
                !formData.opportunityId ||
                !formData.total ||
                !formData.dueDate
              }
            >
              {isSaving ? "Creating..." : "Create Invoice"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
