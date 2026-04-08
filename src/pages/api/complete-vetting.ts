import type { APIRoute } from 'astro';
import { z } from 'zod';
import { wait } from '@trigger.dev/sdk';

const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
const phoneRegex = /^\+?[\d\s\-()]{10,}$/;

const VettingCompletionSchema = z.object({
  token: z.string().min(1, "Token is required"),
  companyName: z.string().min(1, "Company Name is required"),
  companyDomain: z.string().regex(domainRegex, "Please enter a valid domain (e.g. company.com)"),
  phone: z.string().regex(phoneRegex, "Please enter a valid phone number"),
  annualRevenue: z.string().min(1, "Revenue is required"),
  problem: z.string().min(1, "Problem description is required"),
  hoursLost: z.coerce.number().min(0),
  isDecisionMaker: z.enum(["yes", "no"]),
  decisionMakerName: z.string().optional(),
});

export const POST: APIRoute = async ({ request }) => {
  // ACCESS SECRETS ONLY INSIDE THE HANDLER
  const TRIGGER_KEY = process.env.TRIGGER_SECRET_KEY || (globalThis as any).process?.env?.TRIGGER_SECRET_KEY;
  if (TRIGGER_KEY) {
    process.env.TRIGGER_SECRET_KEY = TRIGGER_KEY;
  }

  try {
    const body = await request.json();

    const result = VettingCompletionSchema.safeParse(body);
    if (!result.success) {
      return new Response(JSON.stringify({ error: 'Validation failed', details: result.error.errors }), { status: 400 });
    }

    const data = result.data;

    if (!process.env.TRIGGER_SECRET_KEY) {
      throw new Error("TRIGGER_SECRET_KEY is missing. Please add it to the Netlify dashboard.");
    }

    await wait.completeToken(data.token, {
      companyName: data.companyName,
      companyDomain: data.companyDomain,
      phone: data.phone,
      annualRevenue: data.annualRevenue,
      problem: data.problem,
      hoursLost: data.hoursLost,
      isDecisionMaker: data.isDecisionMaker,
      decisionMakerName: data.decisionMakerName
    });

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (error: any) {
    console.error('[API] Vetting Completion Error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to complete vetting',
      message: error.message || 'Unknown error'
    }), { status: 500 });
  }
};
