import type { APIRoute } from 'astro';
import { Client } from "@hubspot/api-client";

export const POST: APIRoute = async ({ request }) => {
  try {
    const { token } = await request.json();

    if (!token) {
      return new Response(JSON.stringify({ message: "No token provided." }), { status: 400 });
    }

    const hubspot = new Client({ accessToken: process.env.HUBSPOT_ACCESS_TOKEN || (import.meta as any).env.HUBSPOT_ACCESS_TOKEN });

    // Search for contact by vetting_token
    const searchResponse = await hubspot.crm.contacts.searchApi.doSearch({
      filterGroups: [
        {
          filters: [
            {
              propertyName: "vetting_token",
              operator: "EQ" as any, // FilterOperatorEnum.Eq
              value: token,
            },
          ],
        },
      ],
      properties: ["firstname", "lastname", "hs_lead_status"],
    });

    if (searchResponse.results.length === 0) {
      return new Response(JSON.stringify({ message: "Invalid or expired token." }), { status: 404 });
    }

    const contact = searchResponse.results[0];
    const status = contact.properties.hs_lead_status;
    const contactName = `${contact.properties.firstname || ""}`.trim();

    return new Response(JSON.stringify({
      completed: status === "VETTED",
      contactName: contactName || "Friend",
      message: "Success"
    }), { status: 200 });

  } catch (error: any) {
    console.error("[Vetting API] HubSpot Error:", error);
    return new Response(JSON.stringify({
      message: "A server error occurred during verification.",
      error: error.message
    }), { status: 500 });
  }
};
