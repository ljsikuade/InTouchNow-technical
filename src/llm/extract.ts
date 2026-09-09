import { generateText, Output } from "ai";
import { callExtractionSchema, CallExtraction } from "@schemas/extraction";
import { EXTRACTION_SYSTEM_PROMPT, buildExtractionPrompt } from "@llm/prompts";
import { extractionModel } from "@llm/model";

export interface ExtractionResult {
  data: CallExtraction;
}

export const extractCallData = async (
  transcript: string
): Promise<ExtractionResult> => {
  const { output } = await generateText({
    model: extractionModel,
    output: Output.object({
      schema: callExtractionSchema,
      name: "call_extraction",
      description:
        "Structured triage data extracted from a patient call transcript.",
    }),
    system: EXTRACTION_SYSTEM_PROMPT,
    prompt: buildExtractionPrompt(transcript),
  });

  return {
    data: output,
  };
};
