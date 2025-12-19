"use client";

import { ContactSource, PipelineStage, getFullName } from "@/lib/types";
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
import { Search, Plus, Phone, Mail, Building2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

// Local mock interface (will be replaced with Convex queries)
interface MockContact {
  _id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  address?: string;
  source: ContactSource;
  opportunityId?: string;
  opportunityName?: string;
  opportunityStage?: PipelineStage;
  createdAt: number;
  updatedAt: number;
}

// Mock data for contacts
const mockContacts: MockContact[] = [
  {
    _id: "c1",
    firstName: "Maria",
    lastName: "Santos",
    email: "maria.santos@email.com",
    phone: "+63 917 123 4567",
    address: "123 Solar Street, Salinas, Cavite",
    source: "website",
    opportunityId: "opp1",
    opportunityName: "Santos Residence Solar Installation",
    opportunityStage: "proposal",
    createdAt: Date.parse("2024-01-15T08:00:00Z"),
    updatedAt: Date.parse("2024-01-20T10:30:00Z"),
  },
  {
    _id: "c2",
    firstName: "Juan",
    lastName: "Dela Cruz",
    email: "juan.delacruz@company.com",
    phone: "+63 918 234 5678",
    address: "456 Green Ave, Bacoor, Cavite",
    source: "referral",
    opportunityId: "opp2",
    opportunityName: "Dela Cruz Commercial Project",
    opportunityStage: "negotiation",
    createdAt: Date.parse("2024-01-10T09:00:00Z"),
    updatedAt: Date.parse("2024-01-18T14:00:00Z"),
  },
  {
    _id: "c3",
    firstName: "Ana",
    lastName: "Reyes",
    phone: "+63 919 345 6789",
    source: "facebook",
    opportunityId: "opp3",
    opportunityName: "Reyes Home Solar System",
    opportunityStage: "qualified",
    createdAt: Date.parse("2024-01-20T11:00:00Z"),
    updatedAt: Date.parse("2024-01-22T09:00:00Z"),
  },
  {
    _id: "c4",
    firstName: "Pedro",
    lastName: "Garcia",
    email: "pedro.garcia@gmail.com",
    source: "google_ads",
    opportunityId: "opp4",
    opportunityName: "Garcia Building Rooftop Solar",
    opportunityStage: "new_lead",
    createdAt: Date.parse("2024-01-22T13:00:00Z"),
    updatedAt: Date.parse("2024-01-22T13:00:00Z"),
  },
  {
    _id: "c5",
    firstName: "Elena",
    lastName: "Cruz",
    email: "elena.cruz@business.com",
    phone: "+63 920 456 7890",
    address: "789 Energy Road, Imus, Cavite",
    source: "walk_in",
    opportunityId: "opp5",
    opportunityName: "Cruz Factory Solar Installation",
    opportunityStage: "closed_won",
    createdAt: Date.parse("2024-01-05T10:00:00Z"),
    updatedAt: Date.parse("2024-01-25T16:00:00Z"),
  },
  {
    _id: "c6",
    firstName: "Roberto",
    lastName: "Lim",
    email: "roberto.lim@email.com",
    phone: "+63 921 567 8901",
    source: "cold_call",
    createdAt: Date.parse("2024-01-23T08:30:00Z"),
    updatedAt: Date.parse("2024-01-23T08:30:00Z"),
  },
  {
    _id: "c7",
    firstName: "Carmen",
    lastName: "Villanueva",
    email: "carmen.v@company.ph",
    phone: "+63 922 678 9012",
    address: "321 Sun Boulevard, Dasmarinas, Cavite",
    source: "referral",
    opportunityId: "opp6",
    opportunityName: "Villanueva Warehouse Project",
    opportunityStage: "contacted",
    createdAt: Date.parse("2024-01-18T14:00:00Z"),
    updatedAt: Date.parse("2024-01-21T11:00:00Z"),
  },
];

const sourceLabels: Record<ContactSource, string> = {
  website: "Website",
  referral: "Referral",
  facebook: "Facebook",
  google_ads: "Google Ads",
  walk_in: "Walk-in",
  cold_call: "Cold Call",
  other: "Other",
};

const stageLabels: Record<PipelineStage, string> = {
  new_lead: "New Lead",
  contacted: "Contacted",
  qualified: "Qualified",
  proposal: "Proposal",
  negotiation: "Negotiation",
  closed_won: "Closed Won",
  closed_lost: "Closed Lost",
};

const stageColors: Record<PipelineStage, string> = {
  new_lead: "bg-slate-500",
  contacted: "bg-blue-500",
  qualified: "bg-purple-500",
  proposal: "bg-amber-500",
  negotiation: "bg-orange-500",
  closed_won: "bg-green-500",
  closed_lost: "bg-red-500",
};

export default function ContactsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredContacts = mockContacts.filter((contact) => {
    const fullName = getFullName(contact.firstName, contact.lastName);
    return (
      fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.phone?.includes(searchQuery) ||
      contact.opportunityName
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase())
    );
  });

  const handleContactClick = (contactId: string) => {
    router.push(`/contacts/${contactId}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Contacts</h1>
          <p className="text-muted-foreground">
            Manage your customer contacts and leads.
          </p>
        </div>
        <Button className="bg-[#ff5603] hover:bg-[#ff5603]/90">
          <Plus className="h-4 w-4 mr-2" />
          Add Contact
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search contacts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Contacts Table */}
      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Number</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Associated Opportunity</TableHead>
              <TableHead>Stage</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredContacts.map((contact) => (
              <TableRow
                key={contact._id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleContactClick(contact._id)}
              >
                <TableCell className="font-medium">
                  {getFullName(contact.firstName, contact.lastName)}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{sourceLabels[contact.source]}</Badge>
                </TableCell>
                <TableCell>
                  {contact.phone ? (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{contact.phone}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {contact.email ? (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{contact.email}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {contact.opportunityName ? (
                    <div className="flex items-center gap-2">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="max-w-[200px] truncate">
                        {contact.opportunityName}
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {contact.opportunityStage ? (
                    <Badge
                      className={`${stageColors[contact.opportunityStage]} text-white`}
                    >
                      {stageLabels[contact.opportunityStage]}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {filteredContacts.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-8 text-muted-foreground"
                >
                  No contacts found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
