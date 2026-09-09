import { APICallError, LoadAPIKeyError, RetryError } from "ai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ExtractionError } from "@errors/extraction-error";
import { processCallTranscript } from "@services/call-service";
import {
  completeExtraction,
  incompleteExtraction,
  unsafeEmergencyExtraction,
} from "../helpers/fixtures";
import { failWith, respondWith, resetModel } from "../helpers/mock-model";

vi.mock("@llm/model", async () => {
  const { createMockModel } = await import("../helpers/mock-model");
  return { extractionModel: createMockModel() };
});

const apiError = (statusCode: number, isRetryable: boolean) =>
  new APICallError({
    message: `upstream ${statusCode}`,
    url: "https://api.anthropic.com/v1/messages",
    requestBodyValues: {},
    statusCode,
    isRetryable,
  });

const captureError = async (): Promise<ExtractionError> => {
  try {
    await processCallTranscript("any transcript");
  } catch (err) {
    return err as ExtractionError;
  }
  throw new Error("expected processCallTranscript to throw");
};

beforeEach(() => resetModel());
afterEach(() => vi.restoreAllMocks());

describe("processCallTranscript", () => {
  describe("happy path", () => {
    it("returns the extraction for a complete transcript", async () => {
      respondWith(completeExtraction);
      const result = await processCallTranscript("complete");

      expect(result.patient.name).toBe("John Smith");
      expect(result.patient.date_of_birth).toBe("1990-01-02");
      expect(result.clinical.symptoms).toEqual(["cough"]);
      expect(result.intent).toBe("book_appointment");
      expect(result.recommended_action.type).toBe("book_appointment");
    });

    it("returns nulls for an incomplete transcript rather than failing", async () => {
      respondWith(incompleteExtraction);
      const result = await processCallTranscript("incomplete");

      expect(result.patient.name).toBeNull();
      expect(result.intent).toBeNull();
      expect(result.clinical.symptoms).toBeNull();
      expect(result.recommended_action.type).toBe("unclear");
    });
  });

  describe("emergency escalation is enforced, not trusted", () => {
    it("coerces a routine action to escalate_urgent", async () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      respondWith(unsafeEmergencyExtraction);

      const result = await processCallTranscript("chest pain");

      expect(result.recommended_action.type).toBe("escalate_urgent");
      expect(warn).toHaveBeenCalledOnce();
    });

    it("coerces an unclear action to escalate_urgent", async () => {
      vi.spyOn(console, "warn").mockImplementation(() => {});
      respondWith({
        ...unsafeEmergencyExtraction,
        recommended_action: { type: "unclear", mode: null },
      });

      const result = await processCallTranscript("chest pain");
      expect(result.recommended_action.type).toBe("escalate_urgent");
    });

    it("leaves an already-correct escalation alone", async () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      respondWith({
        ...unsafeEmergencyExtraction,
        recommended_action: { type: "escalate_urgent", mode: null },
      });

      const result = await processCallTranscript("chest pain");
      expect(result.recommended_action.type).toBe("escalate_urgent");
      expect(warn).not.toHaveBeenCalled();
    });

    it("does not touch a non-emergency call", async () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      respondWith(completeExtraction);

      const result = await processCallTranscript("routine");
      expect(result.recommended_action.type).toBe("book_appointment");
      expect(warn).not.toHaveBeenCalled();
    });
  });

  describe("provider failures map to statuses", () => {
    beforeEach(() => {
      vi.spyOn(console, "error").mockImplementation(() => {});
    });

    it("a retryable failure wrapped in RetryError -> 503", async () => {
      failWith(
        new RetryError({
          message: "Failed after 3 attempts",
          reason: "maxRetriesExceeded",
          errors: [apiError(529, true)],
        })
      );

      const err = await captureError();
      expect(err).toBeInstanceOf(ExtractionError);
      expect(err.statusCode).toBe(503);
      expect(err.code).toBe("EXTRACTION_FAILED");
    });

    it("a non-retryable provider error -> 502", async () => {
      failWith(apiError(400, false));
      expect((await captureError()).statusCode).toBe(502);
    });

    it("a missing API key -> 500", async () => {
      failWith(
        new LoadAPIKeyError({ message: "ANTHROPIC_API_KEY is missing" })
      );
      expect((await captureError()).statusCode).toBe(500);
    });

    it("output that does not satisfy the schema -> 502", async () => {
      respondWith({ nonsense: true });
      const err = await captureError();
      expect(err.statusCode).toBe(502);
      expect(err.message).toMatch(/no usable result/i);
    });

    it("an unrecognised error -> 502", async () => {
      failWith(new Error("boom"));
      expect((await captureError()).statusCode).toBe(502);
    });

    it("never leaks provider detail into the message", async () => {
      failWith(apiError(400, false));
      const err = await captureError();
      expect(err.message).not.toMatch(/upstream|anthropic/i);
    });
  });
});
