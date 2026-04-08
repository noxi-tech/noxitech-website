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

// A small shim to guarantee the Trigger.dev SDK finds the secret key if it's in your .env
if (!process.env.TRIGGER_SECRET_KEY && (import.meta as any).env?.TRIGGER_SECRET_KEY) {
  process.env.TRIGGER_SECRET_KEY = (import.meta as any).env.TRIGGER_SECRET_KEY;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();

    // 1. Validate Input
    const result = LeadSchema.safeParse(body);
    if (!result.success) {
      return new Response(JSON.stringify({
        error: 'Validation failed',
        details: result.error.errors
      }), { status: 400 });
    }

    const { firstName, lastName, email, reason, message } = result.data;

    // 2. Trigger Appropriate Trigger.dev Task
    let handle;
    if (reason === 'audit') {
      // Vetting workflow only needs basic lead info
      handle = await tasks.trigger('vetting-workflow', {
        firstName,
        lastName,
        email,
      });
    } else if (reason === 'support') {
      // Support workflow gets all collected data
      handle = await tasks.trigger('technical-support', {
        firstName,
        lastName,
        email,
        reason,
        message,
      });
    } else {
      // Default to general inquiry for 'inquiry' (and any other fallbacks)
      handle = await tasks.trigger('general-inquiry', {
        firstName,
        lastName,
        email,
        reason,
        message,
      });
    }

    console.log(`[API] Triggered ${reason} workflow: ${email}, Run ID: ${handle.id}`);

    return new Response(JSON.stringify({
      success: true,
      runId: handle.id
    }), { status: 200 });

  } catch (error) {
    console.error('[API] Lead Submission Error:', error);
    return new Response(JSON.stringify({
      error: 'Internal Server Error'
    }), { status: 500 });
  }
};
