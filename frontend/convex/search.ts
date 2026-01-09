import { v } from "convex/values";
import { query } from "./_generated/server";
import { getFullName } from "./lib/helpers";

// Simple fuzzy match: checks if all characters appear in order
function fuzzyMatch(text: string, pattern: string): boolean {
  const textLower = text.toLowerCase();
  const patternLower = pattern.toLowerCase();

  let patternIdx = 0;
  for (let i = 0; i < textLower.length && patternIdx < patternLower.length; i++) {
    if (textLower[i] === patternLower[patternIdx]) {
      patternIdx++;
    }
  }
  return patternIdx === patternLower.length;
}

// Calculate match score (higher = better match)
function calculateScore(text: string, query: string): number {
  const textLower = text.toLowerCase();
  const queryLower = query.toLowerCase();

  // Exact match = highest score
  if (textLower === queryLower) return 100;

  // Starts with query = high score
  if (textLower.startsWith(queryLower)) return 90;

  // Contains exact query = medium-high score
  if (textLower.includes(queryLower)) return 80;

  // Fuzzy match = lower score
  if (fuzzyMatch(textLower, queryLower)) return 50;

  return 0;
}

export type SearchResultType = "contact" | "opportunity" | "appointment" | "invoice" | "document";

export interface SearchResult {
  type: SearchResultType;
  id: string;
  title: string;
  subtitle: string;
  score: number;
  metadata?: {
    stage?: string;
    status?: string;
    phone?: string;
    email?: string;
    date?: string;
    invoiceNumber?: string;
  };
}

/**
 * Unified search across contacts, opportunities, appointments, invoices, and documents
 */
export const unified = query({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<SearchResult[]> => {
    const searchQuery = args.query.trim();
    if (searchQuery.length < 2) return [];

    const limit = args.limit ?? 20;
    const results: SearchResult[] = [];

    // Search Contacts
    const contacts = await ctx.db
      .query("contacts")
      .withIndex("by_deleted", (q) => q.eq("isDeleted", false))
      .collect();

    for (const contact of contacts) {
      const fullName = getFullName(contact.firstName, contact.lastName);
      const email = contact.email ?? "";
      const phone = contact.phone ?? "";
      const address = contact.address ?? "";

      const nameScore = calculateScore(fullName, searchQuery);
      const emailScore = calculateScore(email, searchQuery);
      const phoneScore = calculateScore(phone, searchQuery);
      const addressScore = calculateScore(address, searchQuery);

      const maxScore = Math.max(nameScore, emailScore, phoneScore, addressScore);

      if (maxScore > 0) {
        results.push({
          type: "contact",
          id: contact._id,
          title: fullName,
          subtitle: contact.email || contact.phone || "No contact info",
          score: maxScore,
          metadata: {
            phone: contact.phone,
            email: contact.email,
          },
        });
      }
    }

    // Search Opportunities
    const opportunities = await ctx.db
      .query("opportunities")
      .withIndex("by_deleted_stage", (q) => q.eq("isDeleted", false))
      .collect();

    for (const opp of opportunities) {
      const contact = await ctx.db.get(opp.contactId);
      const contactName = contact
        ? getFullName(contact.firstName, contact.lastName)
        : "Unknown Contact";

      const nameScore = calculateScore(opp.name, searchQuery);
      const contactScore = calculateScore(contactName, searchQuery);
      const notesScore = opp.notes ? calculateScore(opp.notes, searchQuery) : 0;

      const maxScore = Math.max(nameScore, contactScore, notesScore);

      if (maxScore > 0) {
        results.push({
          type: "opportunity",
          id: opp._id,
          title: opp.name,
          subtitle: contactName,
          score: maxScore,
          metadata: {
            stage: opp.stage,
          },
        });
      }
    }

    // Search Appointments
    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_deleted", (q) => q.eq("isDeleted", false))
      .collect();

    for (const apt of appointments) {
      const contact = await ctx.db.get(apt.contactId);
      const contactName = contact
        ? getFullName(contact.firstName, contact.lastName)
        : "Unknown Contact";

      const titleScore = calculateScore(apt.title, searchQuery);
      const contactScore = calculateScore(contactName, searchQuery);
      const locationScore = apt.location ? calculateScore(apt.location, searchQuery) : 0;
      const descScore = apt.description ? calculateScore(apt.description, searchQuery) : 0;

      const maxScore = Math.max(titleScore, contactScore, locationScore, descScore);

      if (maxScore > 0) {
        results.push({
          type: "appointment",
          id: apt._id,
          title: apt.title,
          subtitle: `${contactName} - ${apt.date} at ${apt.time}`,
          score: maxScore,
          metadata: {
            status: apt.status,
            date: apt.date,
          },
        });
      }
    }

    // Search Invoices
    const invoices = await ctx.db
      .query("invoices")
      .withIndex("by_deleted", (q) => q.eq("isDeleted", false))
      .collect();

    for (const invoice of invoices) {
      const opportunity = await ctx.db.get(invoice.opportunityId);
      let contactName = "Unknown Contact";

      if (opportunity) {
        const contact = await ctx.db.get(opportunity.contactId);
        if (contact) {
          contactName = getFullName(contact.firstName, contact.lastName);
        }
      }

      const invoiceNumScore = calculateScore(invoice.invoiceNumber, searchQuery);
      const contactScore = calculateScore(contactName, searchQuery);
      const notesScore = invoice.notes ? calculateScore(invoice.notes, searchQuery) : 0;

      const maxScore = Math.max(invoiceNumScore, contactScore, notesScore);

      if (maxScore > 0) {
        results.push({
          type: "invoice",
          id: invoice._id,
          title: invoice.invoiceNumber,
          subtitle: `${contactName} - ₱${invoice.total.toLocaleString()}`,
          score: maxScore,
          metadata: {
            status: invoice.status,
            invoiceNumber: invoice.invoiceNumber,
          },
        });
      }
    }

    // Search Documents
    const documents = await ctx.db
      .query("documents")
      .withIndex("by_deleted", (q) => q.eq("isDeleted", false))
      .collect();

    for (const doc of documents) {
      const nameScore = calculateScore(doc.name, searchQuery);

      if (nameScore > 0) {
        let subtitle = doc.mimeType;

        // Try to get context from related entities
        if (doc.contactId) {
          const contact = await ctx.db.get(doc.contactId);
          if (contact) {
            subtitle = getFullName(contact.firstName, contact.lastName);
          }
        } else if (doc.opportunityId) {
          const opp = await ctx.db.get(doc.opportunityId);
          if (opp) {
            subtitle = opp.name;
          }
        } else if (doc.invoiceId) {
          const inv = await ctx.db.get(doc.invoiceId);
          if (inv) {
            subtitle = inv.invoiceNumber;
          }
        }

        results.push({
          type: "document",
          id: doc._id,
          title: doc.name,
          subtitle,
          score: nameScore,
        });
      }
    }

    // Sort by score (descending) and limit
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  },
});
