import {
  APICallError,
  LoadAPIKeyError,
  NoObjectGeneratedError,
  NoOutputGeneratedError,
  RetryError,
  TypeValidationError,
} from "ai";
import { ExtractionError } from "@errors/extraction-error";
import { extractCallData } from "@llm/extract";
import { CallExtraction } from "@schemas/extraction";

const unwrap = (err: unknown): unknown =>
  RetryError.isInstance(err) && err.lastError ? err.lastError : err;

const toExtractionError = (raw: unknown): ExtractionError => {
  const err = unwrap(raw);

  if (LoadAPIKeyError.isInstance(err)) {
    return new ExtractionError(
      "Extraction provider is not configured",
      500,
      raw
    );
  }

  if (APICallError.isInstance(err)) {
    return new ExtractionError(
      "Extraction provider request failed",
      err.isRetryable ? 503 : 502,
      raw
    );
  }

  if (
    NoObjectGeneratedError.isInstance(err) ||
    NoOutputGeneratedError.isInstance(err) ||
    TypeValidationError.isInstance(err)
  ) {
    return new ExtractionError(
      "Extraction produced no usable result for this transcript",
      502,
      raw
    );
  }

  return new ExtractionError("Extraction failed", 502, raw);
};

const enforceEmergencyEscalationIfNeeded = (
  data: CallExtraction
): CallExtraction => {
  if (
    data.clinical.urgency !== "emergency" ||
    data.recommended_action.type === "escalate_urgent"
  ) {
    return data;
  }

  console.warn(
    `[call-service] coerced recommended_action.type ` +
      `${data.recommended_action.type} -> escalate_urgent (urgency=emergency)`
  );

  return {
    ...data,
    recommended_action: {
      ...data.recommended_action,
      type: "escalate_urgent",
    },
  };
};

export const processCallTranscript = async (
  transcript: string
): Promise<CallExtraction> => {
  try {
    const { data } = await extractCallData(transcript);
    const safe = enforceEmergencyEscalationIfNeeded(data);

    console.log(
      `[call-service] extracted intent=${safe.intent ?? "null"} ` +
        `action=${safe.recommended_action.type} confidence=${safe.confidence} `
    );

    return safe;
  } catch (err) {
    const extractionError = toExtractionError(err);
    console.error(
      `[call-service] extraction failed (${extractionError.statusCode}):`,
      err instanceof Error ? err.message : err
    );
    throw extractionError;
  }
};
