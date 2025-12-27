import { v } from "convex/values";
import { action, mutation, internalMutation } from "./_generated/server";
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
