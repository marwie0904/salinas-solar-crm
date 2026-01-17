"use client";

import { useEffect, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { ContactSource, PipelineStage, PIPELINE_STAGE_LABELS, PIPELINE_STAGE_DESCRIPTIONS } from "@/lib/types";
import { usePageTitle } from "@/components/providers/page-title-context";
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
  instagram: "Instagram",
  google_ads: "Google Ads",
  walk_in: "Walk-in",
  cold_call: "Cold Call",
  other: "Other",
};

// Social media icons
const FacebookIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
  </svg>
);

const stageColors: Record<PipelineStage, string> = {
  inbox: "bg-slate-500",
  to_call: "bg-blue-500",
  did_not_answer: "bg-red-400",
  booked_call: "bg-cyan-500",
  did_not_book_call: "bg-amber-500",
  for_ocular: "bg-purple-500",
  follow_up: "bg-yellow-500",
  contract_sent: "bg-orange-500",
  for_installation: "bg-teal-500",
  closed: "bg-green-500",
};

export default function ContactsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const { setPageTitle, setPageAction } = usePageTitle();

  // Handle add contact action (for header button)
  const handleAddContact = useCallback(() => {
    // TODO: Open add contact modal
    console.log("Add contact clicked");
  }, []);

  // Set page title and action for mobile header
  useEffect(() => {
    setPageTitle("Contacts");
    setPageAction(() => handleAddContact);
    return () => {
      setPageTitle("");
      setPageAction(null);
    };
  }, [setPageTitle, setPageAction, handleAddContact]);

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
    <div className="space-y-3 sm:space-y-4 md:space-y-6" data-tour="contacts-list">
      {/* Header - Desktop only (mobile has button in header) */}
      <div className="hidden sm:flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold text-foreground">Contacts</h1>
        <Button
          className="bg-[#ff5603] hover:bg-[#ff5603]/90 h-10 px-4 gap-2"
          onClick={handleAddContact}
        >
          <Plus className="h-4 w-4" />
          Add Contact
        </Button>
      </div>

      {/* Search */}
      <div className="relative w-full sm:max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search contacts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 h-10"
        />
      </div>

      {/* Contacts Table */}
      <div className="rounded-lg border bg-white overflow-x-auto">
        <Table className="table-fixed sm:table-auto">
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs sm:text-sm w-[20%] sm:w-auto px-1 sm:px-4">Name</TableHead>
              <TableHead className="hidden sm:table-cell">Source</TableHead>
              <TableHead className="text-xs sm:text-sm w-[16%] sm:w-auto px-1 sm:px-4">Number</TableHead>
              <TableHead className="hidden md:table-cell">Email</TableHead>
              <TableHead className="text-xs sm:text-sm w-[25%] sm:w-auto px-1 sm:px-4"><span className="hidden sm:inline">Opportunity</span><span className="sm:hidden">Opp.</span></TableHead>
              <TableHead className="text-xs sm:text-sm w-[20%] sm:w-auto px-1 sm:px-4">Stage</TableHead>
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
                  <TableCell className="font-medium text-xs sm:text-sm py-2 sm:py-4 px-1 sm:px-4">
                    <span className="block truncate">
                      {contact.fullName}
                    </span>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {contact.source === "facebook" ? (
                      <div className="flex items-center gap-1.5">
                        <div className="h-4 w-4 rounded flex items-center justify-center bg-blue-600">
                          <FacebookIcon className="h-2.5 w-2.5 text-white" />
                        </div>
                        <span className="text-blue-600 font-medium text-sm">Facebook</span>
                      </div>
                    ) : contact.source === "instagram" ? (
                      <div className="flex items-center gap-1.5">
                        <div className="h-4 w-4 rounded flex items-center justify-center bg-pink-500">
                          <InstagramIcon className="h-2.5 w-2.5 text-white" />
                        </div>
                        <span className="text-pink-500 font-medium text-sm">Instagram</span>
                      </div>
                    ) : (
                      <Badge variant="outline">{sourceLabels[contact.source]}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs sm:text-sm py-2 sm:py-4 px-1 sm:px-4">
                    {contact.phone ? (
                      <span className="block truncate">{contact.phone}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {contact.email ? (
                      <div className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="max-w-[150px] truncate">{contact.email}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs sm:text-sm py-2 sm:py-4 px-1 sm:px-4">
                    {contact.opportunity ? (
                      <div
                        className="cursor-pointer hover:text-[#ff5603] transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (contact.opportunity) {
                            router.push(`/pipeline?opportunityId=${contact.opportunity._id}`);
                          }
                        }}
                      >
                        <span className="block truncate underline">
                          <span className="hidden sm:inline">{contact.opportunity.name}</span>
                          <span className="sm:hidden">{contact.opportunity.name.replace(/^Opportunity\s*/i, '')}</span>
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="py-2 sm:py-4 px-1 sm:px-4">
                    {contact.opportunity?.stage ? (
                      <div className="flex items-center gap-1 sm:gap-1.5">
                        <Badge
                          className={`${stageColors[contact.opportunity.stage]} text-white text-[10px] sm:text-xs px-1.5 sm:px-2`}
                        >
                          <span className="hidden sm:inline">{PIPELINE_STAGE_LABELS[contact.opportunity.stage]}</span>
                          <span className="sm:hidden">{PIPELINE_STAGE_LABELS[contact.opportunity.stage].split(' ')[0]}</span>
                        </Badge>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground cursor-help hidden sm:block" />
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
