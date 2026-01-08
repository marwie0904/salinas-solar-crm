"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Logo } from "@/components/layout/logo";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileText, Calendar, CreditCard, AlertCircle } from "lucide-react";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(amount);
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getStatusBadge(status: string, isOverdue: boolean) {
  if (isOverdue && status !== "paid_full") {
    return <Badge variant="destructive">Overdue</Badge>;
  }

  switch (status) {
    case "pending":
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
    case "partially_paid":
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Partially Paid</Badge>;
    case "paid_full":
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Paid</Badge>;
    case "cancelled":
      return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Cancelled</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function getPaymentMethodLabel(method: string): string {
  const methods: Record<string, string> = {
    cash: "Cash",
    bank_transfer: "Bank Transfer",
    check: "Check",
    credit_card: "Credit Card",
    gcash: "GCash",
    maya: "Maya",
    other: "Other",
  };
  return methods[method] || method;
}

export default function PublicInvoicePage() {
  const params = useParams();
  const token = params.token as string;

  const invoice = useQuery(api.invoices.getByToken, { token });

  // Loading state
  if (invoice === undefined) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff5603]"></div>
      </div>
    );
  }

  // Not found state
  if (invoice === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            <div className="flex justify-center mb-4">
              <AlertCircle className="h-16 w-16 text-gray-400" />
            </div>
            <h1 className="text-xl font-semibold mb-2">Invoice Not Found</h1>
            <p className="text-muted-foreground">
              This invoice link is invalid or has been removed.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Logo />
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Invoice</p>
            <p className="text-xl font-bold text-[#ff5603]">#{invoice.invoiceNumber}</p>
          </div>
        </div>

        {/* Main Invoice Card */}
        <Card className="mb-6">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-[#ff5603]" />
                <CardTitle>Invoice Details</CardTitle>
              </div>
              {getStatusBadge(invoice.status, invoice.isOverdue)}
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {/* Customer & Invoice Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Bill To */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Bill To</h3>
                <p className="font-semibold">{invoice.contact?.fullName || "N/A"}</p>
                {invoice.contact?.address && (
                  <p className="text-sm text-muted-foreground">{invoice.contact.address}</p>
                )}
                {invoice.contact?.email && (
                  <p className="text-sm text-muted-foreground">{invoice.contact.email}</p>
                )}
                {invoice.contact?.phone && (
                  <p className="text-sm text-muted-foreground">{invoice.contact.phone}</p>
                )}
              </div>

              {/* Invoice Details */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Project:</span>
                  <span className="text-sm font-medium">{invoice.opportunity?.name || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Issue Date:</span>
                  <span className="text-sm">{formatDate(invoice.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Due Date:</span>
                  <span className={`text-sm ${invoice.isOverdue ? "text-red-600 font-medium" : ""}`}>
                    {formatDate(invoice.dueDate)}
                  </span>
                </div>
                {invoice.paidAt && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Paid Date:</span>
                    <span className="text-sm text-green-600">{formatDate(invoice.paidAt)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Line Items */}
            {invoice.lineItems && invoice.lineItems.length > 0 && (
              <div className="mb-8">
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Items</h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Unit Price</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoice.lineItems.map((item) => (
                        <TableRow key={item._id}>
                          <TableCell>
                            {item.product?.name || item.description}
                          </TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.lineTotal)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-full max-w-xs space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span>{formatCurrency(invoice.subtotal)}</span>
                </div>
                {invoice.taxAmount && invoice.taxAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Tax ({invoice.taxRate}%):
                    </span>
                    <span>{formatCurrency(invoice.taxAmount)}</span>
                  </div>
                )}
                {invoice.discountAmount && invoice.discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount:</span>
                    <span>-{formatCurrency(invoice.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-lg border-t pt-2">
                  <span>Total:</span>
                  <span>{formatCurrency(invoice.total)}</span>
                </div>
                {invoice.amountPaid > 0 && (
                  <>
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Amount Paid:</span>
                      <span>-{formatCurrency(invoice.amountPaid)}</span>
                    </div>
                    <div className="flex justify-between font-semibold border-t pt-2">
                      <span>Balance Due:</span>
                      <span className={invoice.remainingBalance > 0 ? "text-[#ff5603]" : "text-green-600"}>
                        {formatCurrency(invoice.remainingBalance)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Notes */}
            {invoice.notes && (
              <div className="mt-8 pt-6 border-t">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Notes</h3>
                <p className="text-sm whitespace-pre-wrap">{invoice.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment History */}
        {invoice.payments && invoice.payments.length > 0 && (
          <Card>
            <CardHeader className="border-b">
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-[#ff5603]" />
                <CardTitle>Payment History</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-3">
                {invoice.payments.map((payment) => (
                  <div
                    key={payment._id}
                    className="flex items-center justify-between py-3 border-b last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">
                          {formatDate(payment.paymentDate)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {getPaymentMethodLabel(payment.paymentMethod)}
                          {payment.referenceNumber && ` - Ref: ${payment.referenceNumber}`}
                        </p>
                      </div>
                    </div>
                    <span className="font-medium text-green-600">
                      +{formatCurrency(payment.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>Thank you for your business!</p>
          <p className="mt-1">Salinas Solar Services</p>
        </div>
      </div>
    </div>
  );
}
