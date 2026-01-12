import { v } from "convex/values";
import { action, mutation, internalMutation, query } from "./_generated/server";
import { internal } from "./_generated/api";

// OpenSolar API configuration
const OPENSOLAR_API_URL = "https://api.opensolar.com/api";
const OPENSOLAR_ORG_ID = "74265";

// Token is set via: npx convex env set OPENSOLAR_API_TOKEN "your_token"
const getToken = () => {
  const token = process.env.OPENSOLAR_API_TOKEN;
  if (!token) {
    throw new Error("OPENSOLAR_API_TOKEN environment variable not set");
  }
  return token;
};

// OpenSolar role IDs mapping (you may need to update these based on your OpenSolar team)
const OPENSOLAR_ROLE_IDS: Record<string, number> = {
  // Default role ID for the main admin
  default: 120464,
};

interface OpenSolarProject {
  id: number;
  title: string;
  address: string;
  locality: string;
  state: string;
  zip: string;
  url: string;
}

interface OpenSolarContact {
  id: number;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
}

interface CreateProjectResult {
  success: boolean;
  project?: OpenSolarProject;
  contact?: OpenSolarContact;
  error?: string;
}

/**
 * Create a contact in OpenSolar
 */
async function createOpenSolarContact(contact: {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
}): Promise<{ success: boolean; contactId?: number; contactUrl?: string; error?: string }> {
  try {
    // Format phone number for Philippines (+63)
    let formattedPhone = contact.phone || "";
    if (formattedPhone && !formattedPhone.startsWith("(63)") && !formattedPhone.startsWith("+63")) {
      // Remove leading 0 if present and add country code
      formattedPhone = formattedPhone.replace(/^0/, "");
      formattedPhone = `(63) ${formattedPhone}`;
    }

    const contactData = {
      first_name: contact.firstName,
      family_name: contact.lastName,
      email: contact.email || null,
      phone: formattedPhone || "",
      type: 0, // 0 = primary contact
      custom_data: {
        os_meta: {
          phone_country_iso2: "PH",
        },
      },
    };

    const response = await fetch(
      `${OPENSOLAR_API_URL}/orgs/${OPENSOLAR_ORG_ID}/contacts/`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${getToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(contactData),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenSolar contact creation error:", errorText);
      return {
        success: false,
        error: `Failed to create contact: ${response.status}`,
      };
    }

    const createdContact = await response.json();
    return {
      success: true,
      contactId: createdContact.id,
      contactUrl: `https://api.opensolar.com/api/orgs/${OPENSOLAR_ORG_ID}/contacts/${createdContact.id}/`,
    };
  } catch (error) {
    console.error("Failed to create OpenSolar contact:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Create a project in OpenSolar with contact
 */
export const createProject = action({
  args: {
    opportunityId: v.id("opportunities"),
    title: v.string(),
    address: v.string(),
    lat: v.number(),
    lng: v.number(),
    // Contact info
    contactFirstName: v.string(),
    contactLastName: v.string(),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    assignedRoleId: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<CreateProjectResult> => {
    try {
      // Step 1: Create contact in OpenSolar
      const contactResult = await createOpenSolarContact({
        firstName: args.contactFirstName,
        lastName: args.contactLastName,
        email: args.contactEmail,
        phone: args.contactPhone,
      });

      if (!contactResult.success) {
        console.warn("Failed to create contact, proceeding with project creation:", contactResult.error);
      }

      // Step 2: Parse address components
      const addressParts = parseAddress(args.address);

      // Step 3: Create project with contact linked
      const projectData: Record<string, any> = {
        title: args.title,
        address: addressParts.street || args.address,
        locality: addressParts.locality || "",
        state: addressParts.state || "Central Luzon",
        zip: addressParts.zip || "",
        country: "https://api.opensolar.com/api/countries/173/", // Philippines
        is_residential: true,
        lat: args.lat,
        lon: args.lng,
        notes: `Created from CRM - Opportunity ID: ${args.opportunityId}`,
      };

      // Link contact if created successfully
      if (contactResult.success && contactResult.contactUrl) {
        projectData.contacts = [contactResult.contactUrl];
      }

      // Add assigned role if provided
      if (args.assignedRoleId) {
        projectData.assigned_role = `https://api.opensolar.com/api/orgs/${OPENSOLAR_ORG_ID}/roles/${args.assignedRoleId}/`;
      }

      const response = await fetch(
        `${OPENSOLAR_API_URL}/orgs/${OPENSOLAR_ORG_ID}/projects/`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${getToken()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(projectData),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("OpenSolar API error:", errorText);
        return {
          success: false,
          error: `OpenSolar API error: ${response.status} - ${errorText}`,
        };
      }

      const project = await response.json();

      // Update the opportunity with OpenSolar project info
      await ctx.runMutation(internal.openSolar.updateOpportunityWithOpenSolar, {
        opportunityId: args.opportunityId,
        openSolarProjectId: project.id,
        openSolarProjectUrl: `https://app.opensolar.com/#/projects/${project.id}/info`,
      });

      return {
        success: true,
        project: {
          id: project.id,
          title: project.title,
          address: project.address,
          locality: project.locality,
          state: project.state,
          zip: project.zip,
          url: `https://app.opensolar.com/#/projects/${project.id}/info`,
        },
        contact: contactResult.success && contactResult.contactId
          ? {
              id: contactResult.contactId,
              firstName: args.contactFirstName,
              lastName: args.contactLastName,
              email: args.contactEmail,
              phone: args.contactPhone,
            }
          : undefined,
      };
    } catch (error) {
      console.error("Failed to create OpenSolar project:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  },
});

/**
 * Get OpenSolar team roles for assignment
 */
export const getTeamRoles = action({
  args: {},
  handler: async (): Promise<{ success: boolean; roles?: Array<{ id: number; name: string; email: string }>; error?: string }> => {
    try {
      const response = await fetch(
        `${OPENSOLAR_API_URL}/orgs/${OPENSOLAR_ORG_ID}/roles/`,
        {
          headers: {
            "Authorization": `Bearer ${getToken()}`,
          },
        }
      );

      if (!response.ok) {
        return {
          success: false,
          error: `Failed to fetch roles: ${response.status}`,
        };
      }

      const roles = await response.json();

      return {
        success: true,
        roles: roles.map((role: any) => ({
          id: role.id,
          name: `${role.first_name} ${role.family_name}`,
          email: role.user_email || role.email,
        })),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

/**
 * Clear all OpenSolar data from opportunities (for testing)
 */
export const clearAllOpenSolarData = mutation({
  args: {},
  handler: async (ctx) => {
    const opportunities = await ctx.db.query("opportunities").collect();
    let cleared = 0;
    for (const opp of opportunities) {
      if (opp.openSolarProjectId || opp.openSolarProjectUrl) {
        await ctx.db.patch(opp._id, {
          openSolarProjectId: undefined,
          openSolarProjectUrl: undefined,
        });
        cleared++;
      }
    }
    return { cleared, total: opportunities.length };
  },
});

/**
 * Internal mutation to update opportunity with OpenSolar data
 */
export const updateOpportunityWithOpenSolar = internalMutation({
  args: {
    opportunityId: v.id("opportunities"),
    openSolarProjectId: v.number(),
    openSolarProjectUrl: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.opportunityId, {
      openSolarProjectId: args.openSolarProjectId,
      openSolarProjectUrl: args.openSolarProjectUrl,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Count imported OpenSolar projects
 */
export const countImported = query({
  args: {},
  handler: async (ctx) => {
    const opportunities = await ctx.db.query("opportunities").collect();
    const withOpenSolar = opportunities.filter(o => o.openSolarProjectId);
    return {
      totalOpportunities: opportunities.length,
      withOpenSolarId: withOpenSolar.length,
    };
  },
});

// ============================================
// IMPORT FUNCTIONALITY
// ============================================

interface OpenSolarProjectFull {
  id: number;
  title: string;
  address: string;
  locality: string;
  state: string;
  zip: string;
  lat: number;
  lon: number;
  notes: string;
  contacts: string[]; // URLs to contact endpoints
  documents: Array<{
    id: number;
    title: string;
    file_contents: string; // URL to download
    content_type: string;
  }>;
  is_residential: boolean;
  created_date: string;
}

interface OpenSolarContactFull {
  id: number;
  first_name: string;
  family_name: string;
  email: string | null;
  phone: string | null;
}

interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: string[];
  totalAvailable?: number;
  nextOffset?: number;
  hasMore?: boolean;
  details: Array<{
    projectId: number;
    projectTitle: string;
    status: "imported" | "skipped" | "error";
    reason?: string;
    contactName?: string;
    opportunityId?: string;
    documentsImported?: number;
  }>;
}

/**
 * List all projects from OpenSolar
 */
export const listAllProjects = action({
  args: {},
  handler: async (): Promise<{ success: boolean; projects?: OpenSolarProjectFull[]; error?: string }> => {
    try {
      const response = await fetch(
        `${OPENSOLAR_API_URL}/orgs/${OPENSOLAR_ORG_ID}/projects/`,
        {
          headers: {
            "Authorization": `Bearer ${getToken()}`,
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("OpenSolar list projects error:", errorText);
        return {
          success: false,
          error: `Failed to list projects: ${response.status}`,
        };
      }

      const projects = await response.json();
      return {
        success: true,
        projects,
      };
    } catch (error) {
      console.error("Failed to list OpenSolar projects:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

/**
 * Get project documents from OpenSolar
 */
async function getProjectDocuments(projectId: number): Promise<Array<{ id: number; title: string; fileUrl: string; contentType: string }>> {
  try {
    const response = await fetch(
      `${OPENSOLAR_API_URL}/orgs/${OPENSOLAR_ORG_ID}/projects/${projectId}/project_files/`,
      {
        headers: {
          "Authorization": `Bearer ${getToken()}`,
        },
      }
    );

    if (!response.ok) {
      console.warn(`Failed to fetch documents for project ${projectId}: ${response.status}`);
      return [];
    }

    const files = await response.json();
    return files.map((file: any) => ({
      id: file.id,
      title: file.title || `Document ${file.id}`,
      fileUrl: file.file_contents,
      contentType: file.content_type || "application/octet-stream",
    }));
  } catch (error) {
    console.warn(`Error fetching documents for project ${projectId}:`, error);
    return [];
  }
}

/**
 * Fetch contact details from OpenSolar
 */
async function fetchContactDetails(contactUrl: string): Promise<OpenSolarContactFull | null> {
  try {
    const response = await fetch(contactUrl, {
      headers: {
        "Authorization": `Bearer ${getToken()}`,
      },
    });

    if (!response.ok) {
      console.warn(`Failed to fetch contact from ${contactUrl}: ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.warn(`Error fetching contact from ${contactUrl}:`, error);
    return null;
  }
}

/**
 * Internal mutation to create contact and opportunity from imported data
 */
export const createImportedContactAndOpportunity = internalMutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    openSolarProjectId: v.number(),
    openSolarProjectUrl: v.string(),
    openSolarProjectTitle: v.string(),
    location: v.optional(v.string()),
    locationLat: v.optional(v.number()),
    locationLng: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const timestamp = Date.now();

    // Check if this OpenSolar project is already imported
    const existingOpportunity = await ctx.db
      .query("opportunities")
      .filter((q) => q.eq(q.field("openSolarProjectId"), args.openSolarProjectId))
      .first();

    if (existingOpportunity) {
      return {
        skipped: true,
        reason: "Project already imported",
        existingOpportunityId: existingOpportunity._id,
      };
    }

    // Create contact
    const contactId = await ctx.db.insert("contacts", {
      firstName: args.firstName,
      lastName: args.lastName,
      email: args.email,
      phone: args.phone,
      address: args.address,
      source: "other" as const,
      notes: `Imported from OpenSolar project: ${args.openSolarProjectTitle}`,
      isDeleted: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    // Get total opportunity count for numbering
    const allOpportunities = await ctx.db.query("opportunities").collect();
    const opportunityNumber = allOpportunities.length + 1;

    const contactName = `${args.firstName} ${args.lastName}`.trim() || "Unknown";
    const opportunityName = `Opportunity #${opportunityNumber}: ${contactName}`;

    // Create opportunity in follow_up stage
    const opportunityId = await ctx.db.insert("opportunities", {
      name: opportunityName,
      contactId,
      stage: "follow_up" as const,
      estimatedValue: 0,
      location: args.location,
      locationLat: args.locationLat,
      locationLng: args.locationLng,
      openSolarProjectId: args.openSolarProjectId,
      openSolarProjectUrl: args.openSolarProjectUrl,
      notes: args.notes,
      isDeleted: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    return {
      skipped: false,
      contactId,
      opportunityId,
    };
  },
});

/**
 * Internal mutation to create a document from imported file
 */
export const createImportedDocument = internalMutation({
  args: {
    name: v.string(),
    mimeType: v.string(),
    storageId: v.string(),
    fileSize: v.optional(v.number()),
    opportunityId: v.id("opportunities"),
  },
  handler: async (ctx, args) => {
    const timestamp = Date.now();
    const url = await ctx.storage.getUrl(args.storageId);

    const documentId = await ctx.db.insert("documents", {
      name: args.name,
      mimeType: args.mimeType,
      storageId: args.storageId,
      url: url ?? undefined,
      fileSize: args.fileSize,
      opportunityId: args.opportunityId,
      isDeleted: false,
      createdAt: timestamp,
    });

    return documentId;
  },
});

/**
 * Import projects from OpenSolar into the CRM (batched)
 * Creates contacts, opportunities (in follow_up stage), and downloads documents
 * Use page/limit to process in batches to avoid timeout
 */
export const importAllProjects = action({
  args: {
    page: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<ImportResult> => {
    const page = args.page ?? 1;
    const limit = args.limit ?? 50; // Process 50 at a time
    const result: ImportResult = {
      success: true,
      imported: 0,
      skipped: 0,
      errors: [],
      details: [],
    };

    try {
      // Step 1: Fetch projects for this batch (using page-based pagination)
      console.log(`Fetching OpenSolar projects (page: ${page}, limit: ${limit})...`);

      const response = await fetch(
        `${OPENSOLAR_API_URL}/orgs/${OPENSOLAR_ORG_ID}/projects/?page=${page}&limit=${limit}`,
        {
          headers: {
            "Authorization": `Bearer ${getToken()}`,
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        return {
          ...result,
          success: false,
          errors: [`Failed to list projects: ${response.status} - ${errorText}`],
        };
      }

      const pageData = await response.json();

      // OpenSolar API returns an array directly
      const projects: OpenSolarProjectFull[] = Array.isArray(pageData) ? pageData : (pageData.results || []);

      console.log(`Fetched ${projects.length} projects on page ${page}. Processing batch...`);

      // Track batch info for continuation
      const hasMore = projects.length === limit; // If we got a full page, there might be more
      result.nextOffset = hasMore ? page + 1 : undefined;
      result.hasMore = hasMore;

      // Step 2: Process each project
      for (const project of projects) {
        try {
          console.log(`Processing project ${project.id}: ${project.title}`);

          // Get contact info from the project
          let contactInfo: OpenSolarContactFull | null = null;

          if (project.contacts && project.contacts.length > 0) {
            // Fetch the first contact's details
            contactInfo = await fetchContactDetails(project.contacts[0]);
          }

          // Use project title as fallback for contact name
          const firstName = contactInfo?.first_name || project.title.split(" ")[0] || "Unknown";
          const lastName = contactInfo?.family_name || project.title.split(" ").slice(1).join(" ") || "";

          // Build full address
          const addressParts = [project.address, project.locality, project.state, project.zip].filter(Boolean);
          const fullAddress = addressParts.join(", ");

          // Create contact and opportunity
          const importResult = await ctx.runMutation(internal.openSolar.createImportedContactAndOpportunity, {
            firstName,
            lastName,
            email: contactInfo?.email || undefined,
            phone: contactInfo?.phone || undefined,
            address: fullAddress || undefined,
            openSolarProjectId: project.id,
            openSolarProjectUrl: `https://app.opensolar.com/#/projects/${project.id}/info`,
            openSolarProjectTitle: project.title,
            location: fullAddress || undefined,
            locationLat: project.lat || undefined,
            locationLng: project.lon || undefined,
            notes: project.notes || undefined,
          });

          if (importResult.skipped) {
            result.skipped++;
            result.details.push({
              projectId: project.id,
              projectTitle: project.title,
              status: "skipped",
              reason: importResult.reason,
            });
            console.log(`Skipped project ${project.id}: ${importResult.reason}`);
            continue;
          }

          // Import documents if opportunity was created
          let documentsImported = 0;
          if (importResult.opportunityId) {
            const documents = await getProjectDocuments(project.id);

            for (const doc of documents) {
              try {
                // Download the file
                const fileResponse = await fetch(doc.fileUrl, {
                  headers: {
                    "Authorization": `Bearer ${getToken()}`,
                  },
                });

                if (fileResponse.ok) {
                  const fileBlob = await fileResponse.blob();

                  // Upload to Convex storage
                  const uploadUrl = await ctx.storage.generateUploadUrl();
                  const uploadResponse = await fetch(uploadUrl, {
                    method: "POST",
                    headers: {
                      "Content-Type": doc.contentType,
                    },
                    body: fileBlob,
                  });

                  if (uploadResponse.ok) {
                    const { storageId } = await uploadResponse.json();

                    // Create document record
                    await ctx.runMutation(internal.openSolar.createImportedDocument, {
                      name: doc.title,
                      mimeType: doc.contentType,
                      storageId,
                      fileSize: fileBlob.size,
                      opportunityId: importResult.opportunityId,
                    });

                    documentsImported++;
                    console.log(`Imported document: ${doc.title}`);
                  }
                }
              } catch (docError) {
                console.warn(`Failed to import document ${doc.title}:`, docError);
              }
            }
          }

          result.imported++;
          result.details.push({
            projectId: project.id,
            projectTitle: project.title,
            status: "imported",
            contactName: `${firstName} ${lastName}`.trim(),
            opportunityId: importResult.opportunityId,
            documentsImported,
          });
          console.log(`Successfully imported project ${project.id} with ${documentsImported} documents`);

        } catch (projectError) {
          const errorMessage = projectError instanceof Error ? projectError.message : "Unknown error";
          result.errors.push(`Project ${project.id}: ${errorMessage}`);
          result.details.push({
            projectId: project.id,
            projectTitle: project.title,
            status: "error",
            reason: errorMessage,
          });
          console.error(`Error importing project ${project.id}:`, projectError);
        }
      }

      result.success = result.errors.length === 0;
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        ...result,
        success: false,
        errors: [errorMessage],
      };
    }
  },
});

// Types for OpenSolar system data
interface OpenSolarHardware {
  code: string;
  manufacturer_name: string;
  quantity: number;
}

interface OpenSolarSystemData {
  id: number;
  kw_stc: number;
  module_quantity: number;
  battery_total_kwh: number | null;
  output_annual_kwh: number;
  price_including_tax: number;
  price_excluding_tax: number;
  modules: OpenSolarHardware[];
  inverters: OpenSolarHardware[];
  batteries: OpenSolarHardware[];
  others: OpenSolarHardware[];
}

export interface OpenSolarAgreementData {
  // Project info
  projectLocation: string;
  projectAddress: string;
  projectLocality: string;
  projectState: string;
  projectZip: string;
  // System info
  systemType: "hybrid" | "grid_tied";
  systemSize: number; // kW
  batteryCapacity: number; // kWh
  annualProduction: number; // kWh
  // Pricing
  totalContractAmount: number;
  priceExcludingTax: number;
  upfrontPaymentAmount: number; // From payment_amount in OpenSolar
  // Materials
  materials: {
    name: string;
    quantity: number;
    model: string;
    specifications: string;
  }[];
}

/**
 * Fetch OpenSolar project data for agreement generation
 */
export const getProjectForAgreement = action({
  args: {
    openSolarProjectId: v.number(),
  },
  handler: async (_, args): Promise<{ success: boolean; data?: OpenSolarAgreementData; error?: string }> => {
    try {
      // Fetch project details (systems are included in the project response)
      const projectResponse = await fetch(
        `${OPENSOLAR_API_URL}/orgs/${OPENSOLAR_ORG_ID}/projects/${args.openSolarProjectId}/`,
        {
          headers: {
            "Authorization": `Bearer ${getToken()}`,
          },
        }
      );

      if (!projectResponse.ok) {
        const errorText = await projectResponse.text();
        console.error("OpenSolar project fetch error:", errorText);
        return {
          success: false,
          error: `Failed to fetch project: ${projectResponse.status}`,
        };
      }

      const project = await projectResponse.json();

      // Systems are included in the project response as a nested array
      const systems: OpenSolarSystemData[] = project.systems || [];

      // Get the current/primary system (usually the first one or marked as current)
      const primarySystem = systems.find((s: any) => s.is_current) || systems[0];

      if (!primarySystem) {
        return {
          success: false,
          error: "No system design found for this project. Please create a system design in OpenSolar first.",
        };
      }

      // Build full address
      const addressParts = [
        project.address,
        project.locality,
        project.state,
        project.zip,
      ].filter(Boolean);
      const fullAddress = addressParts.join(", ");

      // Determine system type based on battery presence
      const hasBattery = (primarySystem.battery_total_kwh && primarySystem.battery_total_kwh > 0) ||
                         (primarySystem.batteries && primarySystem.batteries.length > 0);
      const systemType = hasBattery ? "hybrid" : "grid_tied";

      // Build materials list from hardware
      const materials: OpenSolarAgreementData["materials"] = [];

      // Add solar panels
      if (primarySystem.modules && primarySystem.modules.length > 0) {
        primarySystem.modules.forEach((mod) => {
          materials.push({
            name: "Solar Panels",
            quantity: mod.quantity || primarySystem.module_quantity || 1,
            model: `${mod.manufacturer_name} ${mod.code}`.trim(),
            specifications: "",
          });
        });
      }

      // Add inverters
      if (primarySystem.inverters && primarySystem.inverters.length > 0) {
        primarySystem.inverters.forEach((inv) => {
          materials.push({
            name: "Inverter",
            quantity: inv.quantity || 1,
            model: `${inv.manufacturer_name} ${inv.code}`.trim(),
            specifications: "",
          });
        });
      }

      // Add batteries
      if (primarySystem.batteries && primarySystem.batteries.length > 0) {
        primarySystem.batteries.forEach((bat) => {
          materials.push({
            name: "Solar Battery",
            quantity: bat.quantity || 1,
            model: `${bat.manufacturer_name} ${bat.code}`.trim(),
            specifications: primarySystem.battery_total_kwh ? `${primarySystem.battery_total_kwh} kWh` : "",
          });
        });
      }

      // Add other equipment
      if (primarySystem.others && primarySystem.others.length > 0) {
        primarySystem.others.forEach((other) => {
          materials.push({
            name: other.code || "Additional Equipment",
            quantity: other.quantity || 1,
            model: other.manufacturer_name || "",
            specifications: "",
          });
        });
      }

      return {
        success: true,
        data: {
          projectLocation: fullAddress,
          projectAddress: project.address || "",
          projectLocality: project.locality || "",
          projectState: project.state || "",
          projectZip: project.zip || "",
          systemType,
          systemSize: primarySystem.kw_stc || 0,
          batteryCapacity: primarySystem.battery_total_kwh || 0,
          annualProduction: primarySystem.output_annual_kwh || 0,
          totalContractAmount: primarySystem.price_including_tax || 0,
          priceExcludingTax: primarySystem.price_excluding_tax || 0,
          // Get upfront payment from available_customer_actions
          upfrontPaymentAmount: project.available_customer_actions?.[0]?.actions_available?.[0]?.payment_amount || 0,
          materials,
        },
      };
    } catch (error) {
      console.error("Failed to fetch OpenSolar project for agreement:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  },
});

/**
 * Helper function to parse address into components
 */
function parseAddress(fullAddress: string): {
  street?: string;
  locality?: string;
  state?: string;
  zip?: string;
} {
  // Simple address parsing - this works for Philippine addresses
  // Format often: "Street, Barangay, City, Province, ZIP, Philippines"
  const parts = fullAddress.split(",").map((p) => p.trim());

  if (parts.length >= 4) {
    return {
      street: parts.slice(0, -3).join(", "),
      locality: parts[parts.length - 4] || parts[parts.length - 3],
      state: parts[parts.length - 3] || "Central Luzon",
      zip: parts[parts.length - 2]?.match(/\d+/)?.[0] || "",
    };
  }

  return {
    street: fullAddress,
    locality: "",
    state: "Central Luzon",
    zip: "",
  };
}
