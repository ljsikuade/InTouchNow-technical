import { z } from "zod";

export const MAX_TRANSCRIPT_LENGTH = 5000;

export const processCallSchema = z.strictObject({
  transcript: z
    .string({ error: "transcript is required and must be a string" })
    .trim()
    .min(1, "transcript must not be empty")
    .max(
      MAX_TRANSCRIPT_LENGTH,
      `transcript must be at most ${MAX_TRANSCRIPT_LENGTH} characters`,
    ),
});

export type ProcessCallInput = z.infer<typeof processCallSchema>;
