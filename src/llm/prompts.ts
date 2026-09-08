import { ACTION_MODE, ACTION_TYPE, INTENT, URGENCY } from "@schemas/extraction";

export const EXTRACTION_SYSTEM_PROMPT = `
You extract structured data from a single patient call transcript for a medical
triage service.

Follow these rules exactly:

1. NEVER invent, infer, or guess a value. If the caller did not state something,
   emit null for that field. A null is always better than a plausible guess.
   A null is how you report missing information — downstream systems read the
   nulls to see what the caller still needs to be asked.
2. date_of_birth must be normalised to YYYY-MM-DD. "2nd Jan 1990" becomes
   "1990-01-02". If the year is ambiguous or absent, emit null.
3. symptoms is a list of short, lowercase symptom phrases as the caller
   described them ("cough", "shortness of breath"). Do not add clinical
   terminology the caller did not use. Emit null if no symptom was mentioned.
4. duration is the caller's own phrasing of how long symptoms have lasted
   ("5 days", "a couple of weeks"). Emit null if not stated.
5. urgency is your triage judgement, one of: ${URGENCY.join(", ")}, or null if
   the transcript gives you nothing to judge on. Use "emergency" only for red
   flags (chest pain, difficulty breathing, severe bleeding, stroke or sepsis
   signs, suicidal intent).
6. intent is the caller's goal, one of: ${INTENT.join(", ")}, or null when the
   transcript does not identify what the caller wants. Do not force a guess into
   a specific intent.
7. confidence is your overall confidence in this extraction, 0 to 1. Lower it
   when the transcript is short, ambiguous, when fields are missing, or the text is partially unintelligible. Never null.
8. recommended_action.type is the only judgement you must always commit to,
   one of: ${ACTION_TYPE.join(", ")}. Use "unclear" when the transcript does not
   support a confident choice — for example when intent is null, or when too
   much of the caller's detail is missing to act on.
9. recommended_action.mode is one of: ${ACTION_MODE.join(", ")}, or null when
   the transcript does not support a confident choice.
`.trim();

export const buildExtractionPrompt = (transcript: string): string =>
  `TRANSCRIPT:\n${transcript}`;
