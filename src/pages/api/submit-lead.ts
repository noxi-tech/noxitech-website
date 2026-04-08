import type { APIRoute } from 'astro';
import { z } from 'zod';
import { tasks } from '@trigger.dev/sdk';

const LeadSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  reason: z.enum(["inquiry", "audit", "support"], {
    errorMap: () => ({ message: "Please select a valid reason" })
  }),
  message: z.string().optional(),
});

export const POST: APIRoute = async ({ request }) => {
  // ACCESS SECRETS ONLY INSIDE THE HANDLER TO PREVENT BUILD-TIME INLINING
  const TRIGGER_KEY = process.env.TRIGGER_SECRET_KEY || (globalThis as any).process?.env?.TRIGGER_SECRET_KEY;
  
  if (TRIGGER_KEY) {
    process.env.TRIGGER_SECRET_KEY = TRIGGER_KEY;
  }

  try {
    const body = await request.json();

    const result = LeadSchema.safeParse(body);
    if (!result.success) {
      return new Response(JSON.stringify({ error: 'Validation failed', details: result.error.errors }), { status: 400 });
    }

    const { firstName, lastName, email, reason, message } = result.data;

    // Check key presence just before triggering
    if (!process.env.TRIGGER_SECRET_KEY) {
      throw new Error("TRIGGER_SECRET_KEY is missing. Please add it to the Netlify dashboard.");
    }

    let handle;
    if (reason === 'audit') {
      handle = await tasks.trigger('vetting-workflow', { firstName, lastName, email });
    } else if (reason === 'support') {
      handle = await tasks.trigger('technical-support', { firstName, lastName, email, reason, message });
    } else {
      handle = await tasks.trigger('general-inquiry', { firstName, lastName, email, reason, message });
    }

    return new Response(JSON.stringify({ success: true, runId: handle.id }), { status: 200 });

  } catch (error: any) {
    console.error('[API] Lead Submission Error:', error);
    return new Response(JSON.stringify({
      error: 'Internal Server Error',
      message: error.message || 'Unknown error'
    }), { status: 500 });
  }
};
