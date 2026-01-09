"use client";

import { useState, useRef, useEffect } from "react";
import { useMutation, useAction, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { blobToBase64 } from "@/lib/resend-api";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AgreementFormData,
  AgreementMaterial,
  AgreementPayment,
  AgreementPhase,
  SystemType,
  SYSTEM_TYPE_LABELS,
  PaymentMethod,
  PAYMENT_METHOD_LABELS,
  CashSubType,
  CASH_SUB_TYPE_LABELS,
  formatPHP,
} from "@/lib/types";
import { generateAgreementPDF, GeneratedPDF } from "./pdf-generator";
import {
  Plus,
  Trash2,
  FileText,
  User,
  MapPin,
  Package,
  CreditCard,
  Calendar,
  Shield,
  Settings,
  AlertCircle,
  CheckCircle2,
  Download,
  Loader2,
  Sun,
  Target,
  Send,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Error tooltip component
function ErrorTooltip({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-1 text-xs text-red-500 mt-1">
      <AlertCircle className="h-3 w-3" />
      <span>{message}</span>
    </div>
  );
}

// OpenSolar pre-filled indicator tooltip
function OpenSolarIndicator() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center ml-1.5 cursor-help">
            <Sun className="h-4 w-4 text-yellow-500" />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="bg-gray-900 text-white text-xs px-2 py-1">
          Pre-filled from OpenSolar project
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Form field wrapper with error state
interface FormFieldProps {
  children: React.ReactNode;
  label: string;
  required?: boolean;
  error?: string;
  className?: string;
  isOpenSolarPrefilled?: boolean;
}

function FormField({ children, label, required, error, className = "", isOpenSolarPrefilled }: FormFieldProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      <label className="text-sm font-medium flex items-center">
        {label} {required && <span className="text-red-500">*</span>}
        {isOpenSolarPrefilled && <OpenSolarIndicator />}
      </label>
      {error && <ErrorTooltip message={error} />}
      {children}
    </div>
  );
}

const defaultMaterial: AgreementMaterial = {
  name: "",
  quantity: 1,
  model: "",
  specifications: "",
};

const defaultPayment: AgreementPayment = {
  description: "",
  amount: 0,
  dueDate: "",
  paymentMethods: [],
  cashSubTypes: [],
  isDownpayment: false,
};

const defaultPhase: AgreementPhase = {
  date: "",
  tasks: [""],
};

const defaultFormData: AgreementFormData = {
  clientName: "",
  clientAddress: "",
  agreementDate: new Date().toISOString().split("T")[0],
  systemType: "hybrid",
  systemSize: 0,
  batteryCapacity: 0,
  projectLocation: "",
  totalAmount: 0,
  materials: [],
  payments: [],
  phases: [
    {
      date: "",
      tasks: [
        "Installation of wire conduit from the roof to the main PV system panel",
        "Installation of wire conduit from main breaker panel to the main PV system panel",
        "Wire laying for the PV cable",
        "Installation of Solar Panels",
      ],
    },
    {
      date: "",
      tasks: [
        "Installation of inverter, battery, breakers and other main PV system panel component",
        "Testing and commissioning",
      ],
    },
  ],
  solarPanelWarranty: 10,
  inverterWarranty: 5,
  batteryWarranty: 5,
  mountingWarranty: 2,
  includeNetMetering: true,
  includePanelCleaning: true,
  includeMaintenanceService: true,
};

// Main payment method options for agreement
const AGREEMENT_PAYMENT_METHOD_OPTIONS: PaymentMethod[] = [
  "cash",
  "credit_card",
  "post_dated_check",
];

// Cash sub-type options
const CASH_SUB_TYPE_OPTIONS: CashSubType[] = [
  "bank_transfer",
  "online",
  "physical",
];

interface FormErrors {
  opportunity?: string;
  clientName?: string;
  clientAddress?: string;
  agreementDate?: string;
  systemSize?: string;
  projectLocation?: string;
  totalAmount?: string;
}

// OpenSolar prefill data structure
interface OpenSolarPrefillData {
  systemType?: SystemType;
  systemSize?: number;
  batteryCapacity?: number;
  projectLocation?: string;
  totalContractAmount?: number;
  upfrontPaymentAmount?: number;
  materials?: AgreementMaterial[];
}

interface PrefillData {
  clientName?: string;
  clientAddress?: string;
  projectLocation?: string;
  totalAmount?: number;
  opportunityId?: Id<"opportunities">;
  opportunityName?: string;
  contactId?: Id<"contacts">;
  contactEmail?: string;
  // OpenSolar data
  openSolarData?: OpenSolarPrefillData;
  isLoadingOpenSolar?: boolean;
  openSolarError?: string | null;
}

interface AgreementFormProps {
  prefillData?: PrefillData;
}

export function AgreementForm({ prefillData }: AgreementFormProps) {
  // Track which fields are pre-filled from OpenSolar
  const openSolarFields = {
    systemType: !!prefillData?.openSolarData?.systemType,
    systemSize: !!prefillData?.openSolarData?.systemSize && prefillData.openSolarData.systemSize > 0,
    batteryCapacity: !!prefillData?.openSolarData?.batteryCapacity && prefillData.openSolarData.batteryCapacity > 0,
    projectLocation: !!prefillData?.openSolarData?.projectLocation,
    totalAmount: !!prefillData?.openSolarData?.totalContractAmount && prefillData.openSolarData.totalContractAmount > 0,
    materials: !!prefillData?.openSolarData?.materials && prefillData.openSolarData.materials.length > 0,
  };

  // Merge prefill data with defaults, prioritizing OpenSolar data
  const openSolar = prefillData?.openSolarData;
  const initialFormData: AgreementFormData = {
    ...defaultFormData,
    clientName: prefillData?.clientName || defaultFormData.clientName,
    clientAddress: prefillData?.clientAddress || defaultFormData.clientAddress,
    // Use OpenSolar data if available, otherwise fall back to URL params
    projectLocation: openSolar?.projectLocation || prefillData?.projectLocation || defaultFormData.projectLocation,
    totalAmount: openSolar?.totalContractAmount || prefillData?.totalAmount || defaultFormData.totalAmount,
    systemType: openSolar?.systemType || defaultFormData.systemType,
    systemSize: openSolar?.systemSize || defaultFormData.systemSize,
    batteryCapacity: openSolar?.batteryCapacity || defaultFormData.batteryCapacity,
    // Use OpenSolar materials if available, otherwise use defaults
    materials: openSolar?.materials && openSolar.materials.length > 0
      ? [
          ...openSolar.materials,
          // Add standard items that OpenSolar might not include
          { name: "Mounting Structures", quantity: 1, model: "", specifications: "" },
          { name: "Complete AC/DC Cables and Connectors", quantity: 1, model: "", specifications: "" },
          { name: "Combiner Box and Safety Switches", quantity: 1, model: "", specifications: "" },
          { name: "Monitoring System", quantity: 1, model: "", specifications: "" },
        ]
      : defaultFormData.materials,
  };

  const [formData, setFormData] = useState<AgreementFormData>(initialFormData);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  // Selected opportunity state
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<string>(
    prefillData?.opportunityId || ""
  );

  // Success dialog state
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [generatedPdf, setGeneratedPdf] = useState<GeneratedPDF | null>(null);
  const [isSavingToDocuments, setIsSavingToDocuments] = useState(false);
  const [savedToDocuments, setSavedToDocuments] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  // Auto payment schedule state
  const [numberOfMonths, setNumberOfMonths] = useState<number>(0);
  const [upfrontPaymentAmount, setUpfrontPaymentAmount] = useState<number>(
    prefillData?.openSolarData?.upfrontPaymentAmount || 0
  );
  const [paymentDayOfMonth, setPaymentDayOfMonth] = useState<number>(15);
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState<PaymentMethod>("cash");
  const [defaultCashSubType, setDefaultCashSubType] = useState<CashSubType>("bank_transfer");

  // Update form data when OpenSolar data loads (async)
  useEffect(() => {
    const openSolar = prefillData?.openSolarData;
    if (openSolar && !prefillData?.isLoadingOpenSolar) {
      setFormData((prev) => ({
        ...prev,
        projectLocation: openSolar.projectLocation || prev.projectLocation,
        totalAmount: openSolar.totalContractAmount || prev.totalAmount,
        systemType: openSolar.systemType || prev.systemType,
        systemSize: openSolar.systemSize || prev.systemSize,
        batteryCapacity: openSolar.batteryCapacity || prev.batteryCapacity,
        materials: openSolar.materials && openSolar.materials.length > 0
          ? [
              ...openSolar.materials,
              { name: "Mounting Structures", quantity: 1, model: "", specifications: "" },
              { name: "Complete AC/DC Cables and Connectors", quantity: 1, model: "", specifications: "" },
              { name: "Combiner Box and Safety Switches", quantity: 1, model: "", specifications: "" },
              { name: "Monitoring System", quantity: 1, model: "", specifications: "" },
            ]
          : prev.materials,
      }));
      // Update upfront payment amount from OpenSolar
      if (openSolar.upfrontPaymentAmount && openSolar.upfrontPaymentAmount > 0) {
        setUpfrontPaymentAmount(openSolar.upfrontPaymentAmount);
      }
    }
  }, [prefillData?.openSolarData, prefillData?.isLoadingOpenSolar]);

  // Fetch opportunities with contact info
  const opportunities = useQuery(api.opportunities.list, {});

  // Convex mutations for saving PDF and creating agreement
  const generateUploadUrl = useMutation(api.documents.generateUploadUrl);
  const createDocument = useMutation(api.documents.create);
  const createAgreement = useMutation(api.agreements.create);
  const markAgreementSent = useMutation(api.agreements.markSent);
  const sendAgreementEmail = useAction(api.email.sendAgreementEmail);

  // Get selected opportunity details
  const selectedOpportunity = opportunities?.find(
    (opp) => opp._id === selectedOpportunityId
  );

  // Handle opportunity selection
  const handleOpportunitySelect = (opportunityId: string) => {
    setSelectedOpportunityId(opportunityId);
    const opportunity = opportunities?.find((opp) => opp._id === opportunityId);
    const contact = opportunity?.contact;
    if (contact) {
      setFormData((prev) => ({
        ...prev,
        clientName: `${contact.firstName} ${contact.lastName}`,
        clientAddress: contact.address || "",
      }));
      clearError("clientName");
      clearError("clientAddress");
    }
  };

  // Refs for scrolling to first error
  const opportunityRef = useRef<HTMLDivElement>(null);
  const clientNameRef = useRef<HTMLDivElement>(null);
  const clientAddressRef = useRef<HTMLDivElement>(null);
  const agreementDateRef = useRef<HTMLDivElement>(null);
  const systemSizeRef = useRef<HTMLDivElement>(null);
  const projectLocationRef = useRef<HTMLDivElement>(null);
  const totalAmountRef = useRef<HTMLDivElement>(null);

  const fieldRefs: Record<keyof FormErrors, React.RefObject<HTMLDivElement | null>> = {
    opportunity: opportunityRef,
    clientName: clientNameRef,
    clientAddress: clientAddressRef,
    agreementDate: agreementDateRef,
    systemSize: systemSizeRef,
    projectLocation: projectLocationRef,
    totalAmount: totalAmountRef,
  };

  // Clear specific error when field is updated
  const clearError = (field: keyof FormErrors) => {
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!selectedOpportunityId) {
      newErrors.opportunity = "Please select a contact & opportunity";
    }
    if (!formData.clientName.trim()) {
      newErrors.clientName = "Please fill in this required field";
    }
    if (!formData.clientAddress.trim()) {
      newErrors.clientAddress = "Please fill in this required field";
    }
    if (!formData.agreementDate) {
      newErrors.agreementDate = "Please fill in this required field";
    }
    if (formData.systemSize <= 0) {
      newErrors.systemSize = "Please fill in this required field";
    }
    if (!formData.projectLocation.trim()) {
      newErrors.projectLocation = "Please fill in this required field";
    }
    if (formData.totalAmount <= 0) {
      newErrors.totalAmount = "Please fill in this required field";
    }

    setErrors(newErrors);

    // Scroll to first error
    if (Object.keys(newErrors).length > 0) {
      const firstErrorField = Object.keys(newErrors)[0] as keyof FormErrors;
      const ref = fieldRefs[firstErrorField];
      if (ref?.current) {
        ref.current.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }

    return Object.keys(newErrors).length === 0;
  };

  const handleGenerate = async () => {
    if (!validateForm()) {
      return;
    }

    if (!selectedOpportunity?.contact?._id) {
      alert("Please select an opportunity with a valid contact.");
      return;
    }

    setIsGenerating(true);
    setSavedToDocuments(false);
    setEmailSent(false);
    setEmailError(null);

    try {
      // Generate the PDF
      const pdf = generateAgreementPDF(formData);
      setGeneratedPdf(pdf);

      let documentId: Id<"documents"> | undefined;

      // Save PDF to documents
      setIsSavingToDocuments(true);
      try {
        // Get upload URL from Convex
        const uploadUrl = await generateUploadUrl();

        // Upload PDF blob to Convex storage
        const response = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": "application/pdf" },
          body: pdf.blob,
        });

        if (!response.ok) {
          throw new Error("Upload failed");
        }

        const { storageId } = await response.json();

        // Create document record
        documentId = await createDocument({
          name: pdf.filename,
          mimeType: "application/pdf",
          storageId,
          fileSize: pdf.blob.size,
          opportunityId: selectedOpportunityId as Id<"opportunities">,
          contactId: selectedOpportunity.contact._id,
        });

        setSavedToDocuments(true);
      } catch (uploadError) {
        console.error("Error saving PDF to documents:", uploadError);
      } finally {
        setIsSavingToDocuments(false);
      }

      // Build warranty terms string from individual warranty values
      const warrantyTerms = [
        `Solar Panel: ${formData.solarPanelWarranty} years`,
        `Inverter: ${formData.inverterWarranty} years`,
        `Battery: ${formData.batteryWarranty} years`,
        `Mounting: ${formData.mountingWarranty} years`,
      ].join(", ");

      // Create agreement record for digital signing
      const { agreementId, signingToken } = await createAgreement({
        opportunityId: selectedOpportunityId as Id<"opportunities">,
        contactId: selectedOpportunity.contact._id,
        documentId,
        clientName: formData.clientName,
        clientAddress: formData.clientAddress,
        projectLocation: formData.projectLocation,
        systemType: formData.systemType,
        systemSize: formData.systemSize,
        batteryCapacity: formData.batteryCapacity || undefined,
        totalAmount: formData.totalAmount,
        agreementDate: formData.agreementDate,
        materialsJson: JSON.stringify(formData.materials),
        paymentsJson: JSON.stringify(formData.payments),
        phasesJson: JSON.stringify(formData.phases),
        warrantyTerms,
        additionalTerms: formData.additionalNotes || undefined,
      });

      // Build signing URL
      const signingUrl = `${window.location.origin}/sign/${signingToken}`;

      // Send email with signing link if contact has email
      const contactEmail = selectedOpportunity.contact.email;
      if (contactEmail) {
        try {
          const firstName = selectedOpportunity.contact.firstName || formData.clientName.split(" ")[0] || "Customer";

          const emailResult = await sendAgreementEmail({
            to: contactEmail,
            firstName,
            location: formData.projectLocation,
            signingUrl,
          });

          if (emailResult.success) {
            // Mark agreement as sent
            await markAgreementSent({ agreementId });
            setEmailSent(true);
          } else {
            setEmailError(emailResult.error || "Failed to send email");
            console.error("Failed to send agreement email:", emailResult.error);
          }
        } catch (error) {
          console.error("Error sending agreement email:", error);
          setEmailError(error instanceof Error ? error.message : "Failed to send email");
        }
      }

      // Show success dialog
      setShowSuccessDialog(true);
    } catch (error) {
      console.error("Error generating agreement:", error);
      alert("Error generating agreement. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleManualDownload = () => {
    if (generatedPdf) {
      generatedPdf.download();
    }
  };

  const handleCloseSuccessDialog = () => {
    setShowSuccessDialog(false);
    setGeneratedPdf(null);
  };

  const updateMaterial = (index: number, field: keyof AgreementMaterial, value: string | number) => {
    const newMaterials = [...formData.materials];
    newMaterials[index] = { ...newMaterials[index], [field]: value };
    setFormData({ ...formData, materials: newMaterials });
  };

  const addMaterial = () => {
    setFormData({
      ...formData,
      materials: [...formData.materials, { ...defaultMaterial }],
    });
  };

  const removeMaterial = (index: number) => {
    const newMaterials = formData.materials.filter((_, i) => i !== index);
    setFormData({ ...formData, materials: newMaterials });
  };

  const updatePayment = (index: number, field: keyof AgreementPayment, value: string | number | boolean | PaymentMethod[] | CashSubType[]) => {
    const newPayments = [...formData.payments];
    newPayments[index] = { ...newPayments[index], [field]: value };
    setFormData({ ...formData, payments: newPayments });
  };

  const addPayment = () => {
    setFormData({
      ...formData,
      payments: [...formData.payments, { ...defaultPayment }],
    });
  };

  const removePayment = (index: number) => {
    const newPayments = formData.payments.filter((_, i) => i !== index);
    setFormData({ ...formData, payments: newPayments });
  };

  const updatePhase = (index: number, field: keyof AgreementPhase, value: string | string[]) => {
    const newPhases = [...formData.phases];
    newPhases[index] = { ...newPhases[index], [field]: value };
    setFormData({ ...formData, phases: newPhases });
  };

  const updatePhaseTask = (phaseIndex: number, taskIndex: number, value: string) => {
    const newPhases = [...formData.phases];
    const newTasks = [...newPhases[phaseIndex].tasks];
    newTasks[taskIndex] = value;
    newPhases[phaseIndex] = { ...newPhases[phaseIndex], tasks: newTasks };
    setFormData({ ...formData, phases: newPhases });
  };

  const addPhaseTask = (phaseIndex: number) => {
    const newPhases = [...formData.phases];
    newPhases[phaseIndex] = {
      ...newPhases[phaseIndex],
      tasks: [...newPhases[phaseIndex].tasks, ""],
    };
    setFormData({ ...formData, phases: newPhases });
  };

  const removePhaseTask = (phaseIndex: number, taskIndex: number) => {
    const newPhases = [...formData.phases];
    newPhases[phaseIndex] = {
      ...newPhases[phaseIndex],
      tasks: newPhases[phaseIndex].tasks.filter((_, i) => i !== taskIndex),
    };
    setFormData({ ...formData, phases: newPhases });
  };

  const addPhase = () => {
    setFormData({
      ...formData,
      phases: [...formData.phases, { ...defaultPhase, tasks: [""] }],
    });
  };

  const removePhase = (index: number) => {
    const newPhases = formData.phases.filter((_, i) => i !== index);
    setFormData({ ...formData, phases: newPhases });
  };

  const togglePaymentMethod = (paymentIndex: number, method: PaymentMethod) => {
    const payment = formData.payments[paymentIndex];
    const currentMethods = payment.paymentMethods;
    const newMethods = currentMethods.includes(method)
      ? currentMethods.filter((m) => m !== method)
      : [...currentMethods, method];

    // If removing 'cash', also clear cash sub-types
    if (method === 'cash' && currentMethods.includes(method)) {
      const newPayments = [...formData.payments];
      newPayments[paymentIndex] = {
        ...newPayments[paymentIndex],
        paymentMethods: newMethods,
        cashSubTypes: []
      };
      setFormData({ ...formData, payments: newPayments });
    } else {
      updatePayment(paymentIndex, "paymentMethods", newMethods);
    }
  };

  const toggleCashSubType = (paymentIndex: number, subType: CashSubType) => {
    const payment = formData.payments[paymentIndex];
    const currentSubTypes = payment.cashSubTypes || [];
    const newSubTypes = currentSubTypes.includes(subType)
      ? currentSubTypes.filter((s) => s !== subType)
      : [...currentSubTypes, subType];
    updatePayment(paymentIndex, "cashSubTypes", newSubTypes);
  };

  // Generate automatic payment schedule
  const generatePaymentSchedule = () => {
    if (formData.totalAmount <= 0) return;

    const payments: AgreementPayment[] = [];
    const today = new Date();

    // Build payment method arrays from single selections
    const paymentMethods: PaymentMethod[] = [defaultPaymentMethod];
    const cashSubTypes: CashSubType[] = defaultPaymentMethod === "cash" ? [defaultCashSubType] : [];

    // Handle 0 months = pay everything upfront
    if (numberOfMonths === 0) {
      payments.push({
        description: "Full Payment",
        amount: formData.totalAmount,
        dueDate: today.toISOString().split("T")[0],
        paymentMethods,
        cashSubTypes,
        isDownpayment: false,
      });
      setFormData({ ...formData, payments });
      return;
    }

    // Calculate remaining amount after upfront payment
    const remainingAmount = formData.totalAmount - upfrontPaymentAmount;
    const monthlyAmount = Math.floor(remainingAmount / numberOfMonths);

    // Add upfront payment if amount > 0
    if (upfrontPaymentAmount > 0) {
      payments.push({
        description: "Upfront Payment",
        amount: upfrontPaymentAmount,
        dueDate: today.toISOString().split("T")[0],
        paymentMethods,
        cashSubTypes,
        isDownpayment: true,
      });
    }

    // Add monthly payments
    for (let i = 0; i < numberOfMonths; i++) {
      const paymentDate = new Date(today);
      // Set to next month(s) and specific day
      paymentDate.setMonth(paymentDate.getMonth() + i + (upfrontPaymentAmount > 0 ? 1 : 0));
      paymentDate.setDate(Math.min(paymentDayOfMonth, 28)); // Cap at 28 for safety

      // Handle last payment to account for rounding
      const isLastPayment = i === numberOfMonths - 1;
      const paidSoFar = upfrontPaymentAmount + (monthlyAmount * i);
      const amount = isLastPayment ? formData.totalAmount - paidSoFar : monthlyAmount;

      payments.push({
        description: `Month ${i + 1}`,
        amount: amount,
        dueDate: paymentDate.toISOString().split("T")[0],
        paymentMethods,
        cashSubTypes,
        isDownpayment: false,
      });
    }

    setFormData({ ...formData, payments });
  };

  // Error input styling
  const getInputClassName = (hasError: boolean) => {
    return hasError
      ? "border-red-500 focus:border-red-500 focus:ring-red-500"
      : "";
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* OpenSolar Loading/Error State */}
      {prefillData?.isLoadingOpenSolar && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-yellow-600" />
              <div>
                <p className="font-medium text-yellow-800">Loading OpenSolar project data...</p>
                <p className="text-sm text-yellow-600">Fetching system details to pre-fill the agreement form.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {prefillData?.openSolarError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="font-medium text-red-800">Could not load OpenSolar data</p>
                <p className="text-sm text-red-600">{prefillData.openSolarError}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {prefillData?.openSolarData && !prefillData.isLoadingOpenSolar && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <Sun className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="font-medium text-green-800">OpenSolar data loaded</p>
                <p className="text-sm text-green-600">
                  System details have been pre-filled. Look for the <Sun className="h-3 w-3 inline text-yellow-500" /> icon next to pre-filled fields.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Client Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Client Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Contact & Opportunity Selection */}
          <div ref={opportunityRef}>
            <FormField label="Contact & Opportunity" required error={errors.opportunity}>
              <Select
                value={selectedOpportunityId}
                onValueChange={(value) => {
                  handleOpportunitySelect(value);
                  clearError("opportunity");
                }}
              >
                <SelectTrigger className={getInputClassName(!!errors.opportunity)}>
                  <SelectValue placeholder="Select contact & opportunity" />
                </SelectTrigger>
                <SelectContent>
                  {opportunities?.map((opp) => (
                    <SelectItem key={opp._id} value={opp._id}>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {opp.contact
                            ? `${opp.contact.firstName} ${opp.contact.lastName}`
                            : "No contact"}
                        </span>
                        <span className="text-muted-foreground">|</span>
                        <Target className="h-4 w-4 text-muted-foreground" />
                        <span>{opp.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div ref={clientNameRef}>
              <FormField label="Client Name" required error={errors.clientName}>
                <Input
                  placeholder="Auto-filled from contact"
                  value={formData.clientName}
                  onChange={(e) => {
                    setFormData({ ...formData, clientName: e.target.value });
                    clearError("clientName");
                  }}
                  className={getInputClassName(!!errors.clientName)}
                />
              </FormField>
            </div>
            <div ref={agreementDateRef}>
              <FormField label="Agreement Date" required error={errors.agreementDate}>
                <Input
                  type="date"
                  value={formData.agreementDate}
                  onChange={(e) => {
                    setFormData({ ...formData, agreementDate: e.target.value });
                    clearError("agreementDate");
                  }}
                  className={getInputClassName(!!errors.agreementDate)}
                />
              </FormField>
            </div>
          </div>
          <div ref={clientAddressRef}>
            <FormField label="Client Address" required error={errors.clientAddress}>
              <Textarea
                placeholder="Auto-filled from contact"
                value={formData.clientAddress}
                onChange={(e) => {
                  setFormData({ ...formData, clientAddress: e.target.value });
                  clearError("clientAddress");
                }}
                rows={2}
                className={getInputClassName(!!errors.clientAddress)}
              />
            </FormField>
          </div>
        </CardContent>
      </Card>

      {/* Project Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Project Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="System Type" required isOpenSolarPrefilled={openSolarFields.systemType}>
              <Select
                value={formData.systemType}
                onValueChange={(value: SystemType) => setFormData({ ...formData, systemType: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select system type" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(SYSTEM_TYPE_LABELS) as SystemType[]).map((type) => (
                    <SelectItem key={type} value={type}>
                      {SYSTEM_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <div ref={systemSizeRef}>
              <FormField label="System Size (kW)" required error={errors.systemSize} isOpenSolarPrefilled={openSolarFields.systemSize}>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="e.g., 4.96"
                  value={formData.systemSize || ""}
                  onChange={(e) => {
                    setFormData({ ...formData, systemSize: parseFloat(e.target.value) || 0 });
                    clearError("systemSize");
                  }}
                  className={getInputClassName(!!errors.systemSize)}
                />
              </FormField>
            </div>
            {formData.systemType === "hybrid" && (
              <FormField label="Battery Capacity (kWh)" isOpenSolarPrefilled={openSolarFields.batteryCapacity}>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="e.g., 15.36"
                  value={formData.batteryCapacity || ""}
                  onChange={(e) => setFormData({ ...formData, batteryCapacity: parseFloat(e.target.value) || 0 })}
                />
              </FormField>
            )}
          </div>
          <div ref={projectLocationRef}>
            <FormField label="Project Location" required error={errors.projectLocation} isOpenSolarPrefilled={openSolarFields.projectLocation}>
              <Textarea
                placeholder="Enter complete project installation location"
                value={formData.projectLocation}
                onChange={(e) => {
                  setFormData({ ...formData, projectLocation: e.target.value });
                  clearError("projectLocation");
                }}
                rows={2}
                className={getInputClassName(!!errors.projectLocation)}
              />
            </FormField>
          </div>
          <div ref={totalAmountRef}>
            <FormField label="Total Contract Amount (PHP)" required error={errors.totalAmount} isOpenSolarPrefilled={openSolarFields.totalAmount}>
              <Input
                type="number"
                step="0.01"
                placeholder="e.g., 345000"
                value={formData.totalAmount || ""}
                onChange={(e) => {
                  setFormData({ ...formData, totalAmount: parseFloat(e.target.value) || 0 });
                  clearError("totalAmount");
                }}
                className={getInputClassName(!!errors.totalAmount)}
              />
              {formData.totalAmount > 0 && (
                <p className="text-sm text-muted-foreground mt-1">{formatPHP(formData.totalAmount)}</p>
              )}
            </FormField>
          </div>
        </CardContent>
      </Card>

      {/* Materials */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Materials List
            {openSolarFields.materials && <OpenSolarIndicator />}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.materials.map((material, index) => (
            <div key={index} className="flex gap-2 items-start p-3 md:p-0 border md:border-0 rounded-lg md:rounded-none">
              <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2">
                <Input
                  placeholder="Material name"
                  value={material.name}
                  onChange={(e) => updateMaterial(index, "name", e.target.value)}
                  className="col-span-2 md:col-span-1 h-10"
                />
                <Input
                  type="number"
                  placeholder="Qty"
                  value={material.quantity || ""}
                  onChange={(e) => updateMaterial(index, "quantity", parseInt(e.target.value) || 0)}
                  className="h-10"
                />
                <Input
                  placeholder="Model"
                  value={material.model}
                  onChange={(e) => updateMaterial(index, "model", e.target.value)}
                  className="h-10"
                />
                <Input
                  placeholder="Specifications"
                  value={material.specifications}
                  onChange={(e) => updateMaterial(index, "specifications", e.target.value)}
                  className="col-span-2 md:col-span-1 h-10"
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeMaterial(index)}
                className="shrink-0 h-10 w-10 touch-target"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" onClick={addMaterial} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Material
          </Button>
        </CardContent>
      </Card>

      {/* Payment Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Schedule
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Auto-generation Section */}
          <div className="p-4 border rounded-lg bg-muted/50 space-y-4">
            <p className="text-sm font-medium text-muted-foreground">Auto-generate Payment Schedule</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  Upfront Payment (PHP)
                  {prefillData?.openSolarData?.upfrontPaymentAmount && prefillData.openSolarData.upfrontPaymentAmount > 0 && (
                    <OpenSolarIndicator />
                  )}
                </label>
                <Input
                  type="number"
                  min="0"
                  placeholder="e.g., 100000"
                  value={upfrontPaymentAmount || ""}
                  onChange={(e) => setUpfrontPaymentAmount(parseFloat(e.target.value) || 0)}
                />
                {upfrontPaymentAmount > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {formatPHP(upfrontPaymentAmount)}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Number of Months</label>
                <Select
                  value={numberOfMonths.toString()}
                  onValueChange={(value) => setNumberOfMonths(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select months" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Full payment upfront</SelectItem>
                    {Array.from({ length: 24 }, (_, i) => i + 1).map((month) => (
                      <SelectItem key={month} value={month.toString()}>
                        {month} {month === 1 ? "month" : "months"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {numberOfMonths > 0 && formData.totalAmount > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {formatPHP((formData.totalAmount - upfrontPaymentAmount) / numberOfMonths)}/month
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Day of Month</label>
                <Select
                  value={paymentDayOfMonth.toString()}
                  onValueChange={(value) => setPaymentDayOfMonth(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select day" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                      <SelectItem key={day} value={day.toString()}>
                        {day}{day === 1 ? "st" : day === 2 ? "nd" : day === 3 ? "rd" : "th"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {/* Payment Method Selection */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
              <div className="space-y-2">
                <label className="text-sm font-medium">Payment Method</label>
                <Select
                  value={defaultPaymentMethod}
                  onValueChange={(value: PaymentMethod) => setDefaultPaymentMethod(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    {AGREEMENT_PAYMENT_METHOD_OPTIONS.map((method) => (
                      <SelectItem key={method} value={method}>
                        {PAYMENT_METHOD_LABELS[method]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* Cash Sub-option */}
              {defaultPaymentMethod === "cash" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Cash Type</label>
                  <Select
                    value={defaultCashSubType}
                    onValueChange={(value: CashSubType) => setDefaultCashSubType(value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {CASH_SUB_TYPE_OPTIONS.map((subType) => (
                        <SelectItem key={subType} value={subType}>
                          {CASH_SUB_TYPE_LABELS[subType]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium">&nbsp;</label>
                <Button
                  onClick={generatePaymentSchedule}
                  disabled={formData.totalAmount <= 0}
                  className="w-full bg-[#ff5603] hover:bg-[#e64d00] text-white"
                >
                  Generate Schedule
                </Button>
              </div>
            </div>
          </div>

          {/* Payment List */}
          {formData.payments.map((payment, index) => (
            <div key={index} className="p-4 border rounded-lg space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-medium">
                  {payment.isDownpayment ? "Upfront Payment" : payment.description || `Payment ${index + 1}`}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removePayment(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Input
                    placeholder="e.g., Upfront Payment, Month 1"
                    value={payment.description}
                    onChange={(e) => updatePayment(index, "description", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Amount (PHP)</label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={payment.amount || ""}
                    onChange={(e) => updatePayment(index, "amount", parseFloat(e.target.value) || 0)}
                  />
                  {payment.amount > 0 && (
                    <p className="text-xs text-muted-foreground">{formatPHP(payment.amount)}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Due Date</label>
                  <Input
                    type="date"
                    value={payment.dueDate}
                    onChange={(e) => updatePayment(index, "dueDate", e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Payment Methods</label>
                <div className="flex flex-wrap gap-4">
                  {AGREEMENT_PAYMENT_METHOD_OPTIONS.map((method) => (
                    <div key={method} className="flex items-center space-x-2">
                      <Checkbox
                        id={`payment-${index}-${method}`}
                        checked={payment.paymentMethods.includes(method)}
                        onCheckedChange={() => togglePaymentMethod(index, method)}
                      />
                      <label
                        htmlFor={`payment-${index}-${method}`}
                        className="text-sm cursor-pointer"
                      >
                        {PAYMENT_METHOD_LABELS[method]}
                      </label>
                    </div>
                  ))}
                </div>
                {/* Cash Sub-options */}
                {payment.paymentMethods.includes("cash") && (
                  <div className="ml-6 mt-2 p-3 bg-muted/50 rounded-md">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Cash Payment Options:</p>
                    <div className="flex flex-wrap gap-3">
                      {CASH_SUB_TYPE_OPTIONS.map((subType) => (
                        <div key={subType} className="flex items-center space-x-2">
                          <Checkbox
                            id={`payment-${index}-cash-${subType}`}
                            checked={(payment.cashSubTypes || []).includes(subType)}
                            onCheckedChange={() => toggleCashSubType(index, subType)}
                          />
                          <label
                            htmlFor={`payment-${index}-cash-${subType}`}
                            className="text-sm cursor-pointer"
                          >
                            {CASH_SUB_TYPE_LABELS[subType]}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          <Button variant="outline" onClick={addPayment} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Payment
          </Button>
        </CardContent>
      </Card>

      {/* Installation Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Installation Schedule
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.phases.map((phase, phaseIndex) => (
            <div key={phaseIndex} className="p-4 border rounded-lg space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-medium">Phase {phaseIndex + 1}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removePhase(phaseIndex)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Date</label>
                <Input
                  type="date"
                  value={phase.date}
                  onChange={(e) => updatePhase(phaseIndex, "date", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Tasks</label>
                {phase.tasks.map((task, taskIndex) => (
                  <div key={taskIndex} className="flex gap-2">
                    <Input
                      placeholder="Task description"
                      value={task}
                      onChange={(e) => updatePhaseTask(phaseIndex, taskIndex, e.target.value)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removePhaseTask(phaseIndex, taskIndex)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addPhaseTask(phaseIndex)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Task
                </Button>
              </div>
            </div>
          ))}
          <Button variant="outline" onClick={addPhase} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Phase
          </Button>
        </CardContent>
      </Card>

      {/* Warranty */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Warranty (Years)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Solar Panels</label>
              <Input
                type="number"
                value={formData.solarPanelWarranty}
                onChange={(e) => setFormData({ ...formData, solarPanelWarranty: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Inverter</label>
              <Input
                type="number"
                value={formData.inverterWarranty}
                onChange={(e) => setFormData({ ...formData, inverterWarranty: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Battery</label>
              <Input
                type="number"
                value={formData.batteryWarranty}
                onChange={(e) => setFormData({ ...formData, batteryWarranty: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Mounting</label>
              <Input
                type="number"
                value={formData.mountingWarranty}
                onChange={(e) => setFormData({ ...formData, mountingWarranty: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Additional Options
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeNetMetering"
                checked={formData.includeNetMetering}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, includeNetMetering: checked as boolean })
                }
              />
              <label htmlFor="includeNetMetering" className="text-sm cursor-pointer">
                Include Net Metering Provision
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includePanelCleaning"
                checked={formData.includePanelCleaning}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, includePanelCleaning: checked as boolean })
                }
              />
              <label htmlFor="includePanelCleaning" className="text-sm cursor-pointer">
                Include Free Panel Cleaning (2 years)
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeMaintenanceService"
                checked={formData.includeMaintenanceService}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, includeMaintenanceService: checked as boolean })
                }
              />
              <label htmlFor="includeMaintenanceService" className="text-sm cursor-pointer">
                Include Bi-annual Maintenance Service (15 years)
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Generate Button */}
      <div className="flex justify-center md:justify-end sticky bottom-0 bg-background py-4 border-t md:border-0 -mx-4 px-4 md:mx-0 md:px-0 md:relative md:py-0 safe-area-inset-bottom">
        <Button
          onClick={handleGenerate}
          disabled={isGenerating}
          size="lg"
          className="bg-[#ff5603] hover:bg-[#e64d00] w-full md:w-auto h-12 md:h-11 touch-target"
        >
          <Send className="h-5 w-5 mr-2" />
          {isGenerating ? "Generating & Sending..." : "Generate & Send"}
        </Button>
      </div>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={handleCloseSuccessDialog}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-md mx-auto rounded-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Agreement Sent Successfully
            </DialogTitle>
            <DialogDescription asChild>
              <div className="pt-2 space-y-3">
                {/* Document saved status */}
                <div className="text-foreground font-medium">
                  {isSavingToDocuments ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving to opportunity documents...
                    </span>
                  ) : savedToDocuments ? (
                    <span className="flex items-center gap-2 text-green-600">
                      <CheckCircle2 className="h-4 w-4" />
                      Saved to opportunity documents
                    </span>
                  ) : (
                    <span className="flex items-center gap-2 text-red-500">
                      <AlertCircle className="h-4 w-4" />
                      Could not save to documents
                    </span>
                  )}
                </div>
                {/* Email status */}
                <div className="text-sm">
                  {emailSent ? (
                    <span className="text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4" />
                      Email sent to {selectedOpportunity?.contact?.email}
                    </span>
                  ) : emailError ? (
                    <span className="text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      Failed to send email: {emailError}
                    </span>
                  ) : !selectedOpportunity?.contact?.email ? (
                    <span className="text-muted-foreground flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      No email on file for this contact
                    </span>
                  ) : null}
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 mt-4">
            <Button variant="outline" onClick={handleCloseSuccessDialog} className="h-10 touch-target">
              Close
            </Button>
            <Button
              onClick={handleManualDownload}
              className="bg-[#ff5603] hover:bg-[#e64d00] gap-2 h-10 touch-target"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
