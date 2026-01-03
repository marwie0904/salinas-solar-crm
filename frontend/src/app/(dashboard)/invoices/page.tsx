"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import {
  InvoiceStatus,
  PaymentType,
  PaymentMethod,
  INVOICE_STATUS_LABELS,
  PAYMENT_TYPE_LABELS,
  PAYMENT_METHOD_LABELS,
} from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  Plus,
  FileText,
  Calendar,
  Building2,
  Download,
  Loader2,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { InvoiceCreateModal } from "@/components/invoices";
import { generateInvoicePDF } from "@/components/invoices/invoice-pdf-generator";

const statusColors: Record<InvoiceStatus, string> = {
  pending: "bg-amber-500",
  partially_paid: "bg-blue-500",
  paid_full: "bg-green-500",
  cancelled: "bg-red-500",
};

const formatCurrency = (amount: number) => {
  return (
    "₱" +
    new Intl.NumberFormat("en-PH", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  );
};

const formatDate = (timestamp: number | undefined) => {
  if (!timestamp) return "—";
  return new Date(timestamp).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

interface InvoiceWithDetails {
  _id: Id<"invoices">;
  invoiceNumber: string;
  opportunityId: Id<"opportunities">;
  subtotal: number;
  taxRate?: number;
  taxAmount?: number;
  discountAmount?: number;
  total: number;
  amountPaid: number;
  status: InvoiceStatus;
  paymentType?: PaymentType;
  paymentMethod?: PaymentMethod;
  installmentAmount?: number;
  numberOfInstallments?: number;
  notes?: string;
  dueDate: number;
  dateSent?: number;
  paidAt?: number;
  isDeleted: boolean;
  createdAt: number;
  updatedAt: number;
  opportunity?: { _id: Id<"opportunities">; name: string } | null;
  contact?: {
    _id: Id<"contacts">;
    fullName: string;
    address?: string;
  } | null;
  isOverdue?: boolean;
}

export default function InvoicesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInvoice, setSelectedInvoice] =
    useState<InvoiceWithDetails | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Fetch invoices from Convex
  const invoices = useQuery(api.invoices.list, {});

  const filteredInvoices = invoices?.filter(
    (invoice) =>
      invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.opportunity?.name
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      invoice.contact?.fullName
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase())
  );

  const handleInvoiceClick = (invoice: InvoiceWithDetails) => {
    setSelectedInvoice(invoice);
    setIsDialogOpen(true);
  };

  const handleDownloadPDF = (invoice: InvoiceWithDetails) => {
    const pdfData = {
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: new Date(invoice.createdAt).toISOString(),
      dueDate: new Date(invoice.dueDate).toISOString().split("T")[0],
      billedTo: {
        name: invoice.contact?.fullName || "Customer",
        address: invoice.contact?.address || "",
      },
      opportunityName: invoice.opportunity?.name || "",
      paymentType: invoice.paymentType || "one_time",
      paymentMethod: invoice.paymentMethod || "bank_transfer",
      total: invoice.total,
      installmentAmount: invoice.installmentAmount,
      numberOfInstallments: invoice.numberOfInstallments,
      notes: invoice.notes,
    };

    const pdf = generateInvoicePDF(pdfData);
    pdf.download();
  };

  if (invoices === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Invoices</h1>
          <p className="text-muted-foreground">
            Manage and track your invoices.
          </p>
        </div>
        <Button
          className="bg-[#ff5603] hover:bg-[#ff5603]/90"
          onClick={() => setIsCreateModalOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Invoice
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search invoices..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Invoices Table */}
      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Associated Opportunity</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Payment Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Due Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInvoices?.map((invoice) => (
              <TableRow
                key={invoice._id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleInvoiceClick(invoice as InvoiceWithDetails)}
              >
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    {invoice.invoiceNumber}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="max-w-[200px] truncate">
                      {invoice.opportunity?.name || "—"}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="max-w-[150px] truncate">
                    {invoice.contact?.fullName || "—"}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="font-medium">
                    {formatCurrency(invoice.total)}
                  </span>
                </TableCell>
                <TableCell>
                  {(invoice as InvoiceWithDetails).paymentType ? (
                    <span className="text-sm">
                      {PAYMENT_TYPE_LABELS[(invoice as InvoiceWithDetails).paymentType!]}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge
                    className={cn(
                      "text-white",
                      statusColors[invoice.status as InvoiceStatus]
                    )}
                  >
                    {INVOICE_STATUS_LABELS[invoice.status as InvoiceStatus]}
                  </Badge>
                  {invoice.isOverdue && (
                    <Badge variant="destructive" className="ml-2">
                      Overdue
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    {formatDate(invoice.dueDate)}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filteredInvoices?.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center py-8 text-muted-foreground"
                >
                  No invoices found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Invoice Detail Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {selectedInvoice?.invoiceNumber}
            </DialogTitle>
          </DialogHeader>

          {selectedInvoice && (
            <div className="space-y-6">
              {/* Invoice Details */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Invoice Details
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Associated Opportunity
                    </p>
                    <p className="font-medium">
                      {selectedInvoice.opportunity?.name || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Customer</p>
                    <p className="font-medium">
                      {selectedInvoice.contact?.fullName || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge
                      className={cn(
                        "text-white mt-1",
                        statusColors[selectedInvoice.status]
                      )}
                    >
                      {INVOICE_STATUS_LABELS[selectedInvoice.status]}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Due Date</p>
                    <p className="font-medium">
                      {formatDate(selectedInvoice.dueDate)}
                    </p>
                  </div>
                  {selectedInvoice.paymentType && (
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Payment Type
                      </p>
                      <p className="font-medium">
                        {PAYMENT_TYPE_LABELS[selectedInvoice.paymentType]}
                      </p>
                    </div>
                  )}
                  {selectedInvoice.paymentMethod && (
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Payment Method
                      </p>
                      <p className="font-medium">
                        {PAYMENT_METHOD_LABELS[selectedInvoice.paymentMethod]}
                      </p>
                    </div>
                  )}
                </div>
                {selectedInvoice.notes && (
                  <div>
                    <p className="text-sm text-muted-foreground">Notes</p>
                    <p className="text-sm mt-1">{selectedInvoice.notes}</p>
                  </div>
                )}
              </div>

              {/* Payment Section */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Payment
                </h3>
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Total Amount</span>
                    <span className="font-semibold text-lg">
                      {formatCurrency(selectedInvoice.total)}
                    </span>
                  </div>
                  {selectedInvoice.paymentType === "installment" &&
                    selectedInvoice.installmentAmount && (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">
                            Per Installment
                          </span>
                          <span className="font-medium">
                            {formatCurrency(selectedInvoice.installmentAmount)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">
                            No. of Installments
                          </span>
                          <span className="font-medium">
                            {selectedInvoice.numberOfInstallments}
                          </span>
                        </div>
                      </>
                    )}
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Amount Paid</span>
                    <span className="font-semibold text-lg text-green-600">
                      {formatCurrency(selectedInvoice.amountPaid)}
                    </span>
                  </div>
                  <div className="border-t pt-3 flex justify-between items-center">
                    <span className="text-muted-foreground">
                      Remaining Balance
                    </span>
                    <span
                      className={cn(
                        "font-semibold text-lg",
                        selectedInvoice.total - selectedInvoice.amountPaid > 0
                          ? "text-amber-600"
                          : "text-green-600"
                      )}
                    >
                      {formatCurrency(
                        selectedInvoice.total - selectedInvoice.amountPaid
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => handleDownloadPDF(selectedInvoice)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Invoice Create Modal */}
      <InvoiceCreateModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onSuccess={() => {
          // Invoices will auto-refresh due to Convex reactivity
        }}
      />
    </div>
  );
}
