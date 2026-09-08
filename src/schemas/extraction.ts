import { z } from "zod";

export const URGENCY = ["emergency", "urgent", "routine"] as const;

export const INTENT = [
  "book_appointment",
  "cancel_appointment",
  "prescription_refill",
  "test_results",
  "general_enquiry",
] as const;

export const ACTION_MODE = ["gp_consultation", "nurse_consultation"] as const;

export const ACTION_TYPE = [
  "book_appointment",
  "cancel_appointment",
  "issue_prescription",
  "escalate_urgent",
  "unclear",
] as const;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const callExtractionSchema = z.object({
  patient: z.object({
    name: z.string().min(1).nullable(),
    date_of_birth: z
      .string()
      .regex(ISO_DATE, "date_of_birth must be YYYY-MM-DD")
      .nullable(),
  }),
  clinical: z.object({
    symptoms: z.array(z.string().min(1)).nullable(),
    duration: z.string().min(1).nullable(),
    urgency: z.enum(URGENCY).nullable(),
  }),
  intent: z.enum(INTENT).nullable(),
  confidence: z.number().min(0).max(1),
  recommended_action: z.object({
    type: z.enum(ACTION_TYPE),
    mode: z.enum(ACTION_MODE).nullable(),
  }),
});

export type CallExtraction = z.infer<typeof callExtractionSchema>;
