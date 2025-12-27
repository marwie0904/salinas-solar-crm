"use client";

import { InvoiceStatus } from "@/lib/types";
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
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

// Local mock interfaces (will be replaced with real data from backend)
interface MockDocument {
  _id: string;
  name: string;
  mimeType: string;
  url: string;
  createdAt: number;
}

interface MockInvoice {
  _id: string;
  invoiceNumber: string;
  opportunityId: string;
  opportunityName: string;
  total: number;
  amountPaid: number;
  status: InvoiceStatus;
  notes?: string;
  dueDate: number;
  dateSent?: number;
  documents: MockDocument[];
}

// Mock data for invoices
const mockInvoices: MockInvoice[] = [
  {
    _id: "inv1",
    invoiceNumber: "INV-2024-001",
    opportunityId: "opp1",
    opportunityName: "Santos Residence - 5kW System",
    total: 150000,
    amountPaid: 150000,
    status: "paid_full",
    notes: "Payment received via bank transfer. Installation scheduled for next week.",
    dueDate: Date.parse("2024-12-15"),
    dateSent: Date.parse("2024-12-01"),
    documents: [
      {
        _id: "doc1",
        name: "Invoice_INV-2024-001.pdf",
        mimeType: "application/pdf",
        url: "/documents/invoice-001.pdf",
        createdAt: Date.parse("2024-12-01"),
      },
      {
        _id: "doc2",
        name: "Payment_Receipt.pdf",
        mimeType: "application/pdf",
        url: "/documents/receipt-001.pdf",
        createdAt: Date.parse("2024-12-10"),
      },
    ],
  },
  {
    _id: "inv2",
    invoiceNumber: "INV-2024-002",
    opportunityId: "opp2",
    opportunityName: "Rodriguez Commercial Building",
    total: 450000,
    amountPaid: 225000,
    status: "partially_paid",
    notes: "First installment received. Second payment due upon installation completion.",
    dueDate: Date.parse("2024-12-30"),
    dateSent: Date.parse("2024-12-10"),
    documents: [
      {
        _id: "doc3",
        name: "Invoice_INV-2024-002.pdf",
        mimeType: "application/pdf",
        url: "/documents/invoice-002.pdf",
        createdAt: Date.parse("2024-12-10"),
      },
    ],
  },
  {
    _id: "inv3",
    invoiceNumber: "INV-2024-003",
    opportunityId: "opp3",
    opportunityName: "Dela Cruz Family Home",
    total: 180000,
    amountPaid: 0,
    status: "pending",
    notes: "Awaiting customer confirmation before sending.",
    dueDate: Date.parse("2025-01-15"),
    documents: [],
  },
  {
    _id: "inv4",
    invoiceNumber: "INV-2024-004",
    opportunityId: "opp4",
    opportunityName: "Mendoza Warehouse Project",
    total: 850000,
    amountPaid: 0,
    status: "pending",
    notes: "Large commercial project. Payment terms: 50% upfront, 50% upon completion.",
    dueDate: Date.parse("2025-01-20"),
    dateSent: Date.parse("2024-12-18"),
    documents: [
      {
        _id: "doc4",
        name: "Invoice_INV-2024-004.pdf",
        mimeType: "application/pdf",
        url: "/documents/invoice-004.pdf",
        createdAt: Date.parse("2024-12-18"),
      },
      {
        _id: "doc5",
        name: "Project_Proposal.pdf",
        mimeType: "application/pdf",
        url: "/documents/proposal-004.pdf",
        createdAt: Date.parse("2024-12-15"),
      },
    ],
  },
  {
    _id: "inv5",
    invoiceNumber: "INV-2024-005",
    opportunityId: "opp5",
    opportunityName: "Villanueva Residence",
    total: 220000,
    amountPaid: 220000,
    status: "paid_full",
    dueDate: Date.parse("2024-12-20"),
    dateSent: Date.parse("2024-12-05"),
    documents: [
      {
        _id: "doc6",
        name: "Invoice_INV-2024-005.pdf",
        mimeType: "application/pdf",
        url: "/documents/invoice-005.pdf",
        createdAt: Date.parse("2024-12-05"),
      },
    ],
  },
  {
    _id: "inv6",
    invoiceNumber: "INV-2024-006",
    opportunityId: "opp6",
    opportunityName: "Tan Office Building",
    total: 380000,
    amountPaid: 0,
    status: "cancelled",
    notes: "Customer decided to go with a different vendor.",
    dueDate: Date.parse("2024-12-25"),
    dateSent: Date.parse("2024-12-12"),
    documents: [
      {
        _id: "doc7",
        name: "Invoice_INV-2024-006.pdf",
        mimeType: "application/pdf",
        url: "/documents/invoice-006.pdf",
        createdAt: Date.parse("2024-12-12"),
      },
    ],
  },
  {
    _id: "inv7",
    invoiceNumber: "INV-2024-007",
    opportunityId: "opp7",
    opportunityName: "Reyes Farm Solar",
    total: 520000,
    amountPaid: 260000,
    status: "partially_paid",
    notes: "Agricultural solar project. Government incentives applied.",
    dueDate: Date.parse("2025-01-30"),
    dateSent: Date.parse("2024-12-15"),
    documents: [
      {
        _id: "doc8",
        name: "Invoice_INV-2024-007.pdf",
        mimeType: "application/pdf",
        url: "/documents/invoice-007.pdf",
        createdAt: Date.parse("2024-12-15"),
      },
      {
        _id: "doc9",
        name: "Government_Incentive_Application.pdf",
        mimeType: "application/pdf",
        url: "/documents/incentive-007.pdf",
        createdAt: Date.parse("2024-12-14"),
      },
    ],
  },
];

const statusLabels: Record<InvoiceStatus, string> = {
  pending: "Pending",
  partially_paid: "Partially Paid",
  paid_full: "Paid Full",
  cancelled: "Cancelled",
};

const statusColors: Record<InvoiceStatus, string> = {
  pending: "bg-amber-500",
  partially_paid: "bg-blue-500",
  paid_full: "bg-green-500",
  cancelled: "bg-red-500",
};

const formatCurrency = (amount: number) => {
  return "₱" + new Intl.NumberFormat("en-PH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (timestamp: number | undefined) => {
  if (!timestamp) return "—";
  return new Date(timestamp).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export default function InvoicesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<MockInvoice | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const filteredInvoices = mockInvoices.filter(
    (invoice) =>
      invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.opportunityName
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
  );

  const handleInvoiceClick = (invoice: MockInvoice) => {
    setSelectedInvoice(invoice);
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Invoices</h1>
          <p className="text-muted-foreground">
            Manage and track your invoices.
          </p>
        </div>
        <Button className="bg-[#ff5603] hover:bg-[#ff5603]/90">
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
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Date Sent</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInvoices.map((invoice) => (
              <TableRow
                key={invoice._id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleInvoiceClick(invoice)}
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
                      {invoice.opportunityName}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="font-medium">
                    {formatCurrency(invoice.total)}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge
                    className={cn("text-white", statusColors[invoice.status])}
                  >
                    {statusLabels[invoice.status]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    {formatDate(invoice.dueDate)}
                  </div>
                </TableCell>
                <TableCell>
                  {invoice.dateSent ? (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      {formatDate(invoice.dateSent)}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {filteredInvoices.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
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
                      {selectedInvoice.opportunityName}
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
                      {statusLabels[selectedInvoice.status]}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Due Date</p>
                    <p className="font-medium">
                      {formatDate(selectedInvoice.dueDate)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date Sent</p>
                    <p className="font-medium">
                      {formatDate(selectedInvoice.dateSent)}
                    </p>
                  </div>
                </div>
                {selectedInvoice.notes && (
                  <div>
                    <p className="text-sm text-muted-foreground">Notes</p>
                    <p className="text-sm mt-1">{selectedInvoice.notes}</p>
                  </div>
                )}
              </div>

              {/* Amount Section */}
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

              {/* Documents Section */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Documents ({selectedInvoice.documents.length})
                </h3>
                {selectedInvoice.documents.length > 0 ? (
                  <div className="space-y-2">
                    {selectedInvoice.documents.map((doc) => (
                      <div
                        key={doc._id}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{doc.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Uploaded {formatDate(doc.createdAt)}
                            </p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No documents attached
                  </p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
