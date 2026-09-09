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

const isRealDate = (value: string): boolean => {
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
};

const isNotFuture = (value: string): boolean =>
  new Date(`${value}T00:00:00Z`).getTime() <= Date.now();

export const callExtractionSchema = z.object({
  patient: z.object({
    name: z.string().min(1).nullable().catch(null),
    date_of_birth: z
      .string()
      .regex(ISO_DATE, "date_of_birth must be YYYY-MM-DD")
      .refine(isRealDate, "date_of_birth must be a real calendar date")
      .refine(isNotFuture, "date_of_birth must not be in the future")
      .nullable()
      .catch(null),
  }),
  clinical: z.object({
    symptoms: z.array(z.string().min(1)).nullable().catch(null),
    duration: z.string().min(1).nullable().catch(null),
    urgency: z.enum(URGENCY).nullable().catch(null),
  }),
  intent: z.enum(INTENT).nullable().catch(null),
  confidence: z.number().min(0).max(1),
  recommended_action: z.object({
    type: z.enum(ACTION_TYPE),
    mode: z.enum(ACTION_MODE).nullable(),
  }),
});

export type CallExtraction = z.infer<typeof callExtractionSchema>;
