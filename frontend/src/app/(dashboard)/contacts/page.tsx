"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { ContactSource, PipelineStage, PIPELINE_STAGE_LABELS, PIPELINE_STAGE_DESCRIPTIONS } from "@/lib/types";
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
import { Search, Plus, Phone, Mail, Building2, Loader2, HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useRouter } from "next/navigation";
import { useState } from "react";

const sourceLabels: Record<ContactSource, string> = {
  website: "Website",
  referral: "Referral",
  facebook: "Facebook",
  google_ads: "Google Ads",
  walk_in: "Walk-in",
  cold_call: "Cold Call",
  other: "Other",
};

const stageColors: Record<PipelineStage, string> = {
  inbox: "bg-slate-500",
  scheduled_discovery_call: "bg-blue-500",
  discovery_call: "bg-cyan-500",
  no_show_discovery_call: "bg-red-400",
  field_inspection: "bg-purple-500",
  to_follow_up: "bg-amber-500",
  contract_drafting: "bg-orange-500",
  contract_signing: "bg-indigo-500",
  closed: "bg-green-500",
};

export default function ContactsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch contacts from Convex
  const contacts = useQuery(api.contacts.listWithOpportunities, {});

  const filteredContacts = contacts?.filter((contact) => {
    const fullName = contact.fullName;
    return (
      fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.phone?.includes(searchQuery) ||
      contact.opportunity?.name
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
            {contacts === undefined ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-8"
                >
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading contacts...
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredContacts && filteredContacts.length > 0 ? (
              filteredContacts.map((contact) => (
                <TableRow
                  key={contact._id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleContactClick(contact._id)}
                >
                  <TableCell className="font-medium">
                    {contact.fullName}
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
                    {contact.opportunity ? (
                      <div className="flex items-center gap-2">
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="max-w-[200px] truncate">
                          {contact.opportunity.name}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {contact.opportunity?.stage ? (
                      <div className="flex items-center gap-1.5">
                        <Badge
                          className={`${stageColors[contact.opportunity.stage]} text-white`}
                        >
                          {PIPELINE_STAGE_LABELS[contact.opportunity.stage]}
                        </Badge>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-[280px]">
                            <p>{PIPELINE_STAGE_DESCRIPTIONS[contact.opportunity.stage]}</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-8 text-muted-foreground"
                >
                  {searchQuery ? "No contacts found matching your search" : "No contacts yet"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
