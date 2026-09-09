import { APICallError, RetryError } from "ai";
import express from "express";
import request from "supertest";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  COMPLETE_TRANSCRIPT,
  INCOMPLETE_TRANSCRIPT,
  completeExtraction,
  incompleteExtraction,
  unsafeEmergencyExtraction,
} from "../helpers/fixtures";
import { failWith, respondWith, resetModel } from "../helpers/mock-model";

vi.mock("@llm/model", async () => {
  const { createMockModel } = await import("../helpers/mock-model");
  return { extractionModel: createMockModel() };
});

let app: express.Express;

beforeAll(async () => {
  const { createApp } = await import("@/app");
  app = createApp();
});

beforeEach(() => {
  resetModel();
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

const post = (body: unknown) =>
  request(app).post("/process-call").set("content-type", "application/json").send(body as object);

describe("POST /process-call", () => {
  describe("successful extraction", () => {
    it("returns the structured extraction for a complete transcript", async () => {
      respondWith(completeExtraction);
      const res = await post({ transcript: COMPLETE_TRANSCRIPT });

      expect(res.status).toBe(200);
      expect(res.body).toEqual(completeExtraction);
    });

    it("returns nulls for an incomplete transcript instead of erroring", async () => {
      respondWith(incompleteExtraction);
      const res = await post({ transcript: INCOMPLETE_TRANSCRIPT });

      expect(res.status).toBe(200);
      expect(res.body.patient).toEqual({ name: null, date_of_birth: null });
      expect(res.body.intent).toBeNull();
      expect(res.body.recommended_action.type).toBe("unclear");
    });

    it("escalates an emergency the model failed to escalate", async () => {
      respondWith(unsafeEmergencyExtraction);
      const res = await post({ transcript: "I have crushing chest pain" });

      expect(res.status).toBe(200);
      expect(res.body.clinical.urgency).toBe("emergency");
      expect(res.body.recommended_action.type).toBe("escalate_urgent");
    });

    it("accepts a transcript of exactly 5000 characters", async () => {
      respondWith(completeExtraction);
      const res = await post({ transcript: "a".repeat(5000) });
      expect(res.status).toBe(200);
    });
  });

  describe("request validation (400, before the model is called)", () => {
    it.each([
      ["missing transcript", {}],
      ["transcript is not a string", { transcript: 123 }],
      ["empty transcript", { transcript: "   " }],
      ["transcript over 5000 characters", { transcript: "a".repeat(5001) }],
      ["unknown key", { transcript: "hello", foo: 1 }],
    ])("rejects %s", async (_label, body) => {
      const res = await post(body);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(Array.isArray(res.body.error.issues)).toBe(true);
    });

    it("rejects malformed JSON", async () => {
      const res = await request(app)
        .post("/process-call")
        .set("content-type", "application/json")
        .send('{"transcript":');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("MALFORMED_JSON");
    });

    it("does not call the model when validation fails", async () => {
      failWith(new Error("the model must not be reached"));
      const res = await post({});
      expect(res.status).toBe(400);
    });
  });

  describe("extraction failures", () => {
    it("maps a retryable provider failure to 503", async () => {
      failWith(
        new RetryError({
          message: "Failed after 3 attempts",
          reason: "maxRetriesExceeded",
          errors: [
            new APICallError({
              message: "overloaded",
              url: "https://api.anthropic.com/v1/messages",
              requestBodyValues: {},
              statusCode: 529,
              isRetryable: true,
            }),
          ],
        }),
      );

      const res = await post({ transcript: COMPLETE_TRANSCRIPT });
      expect(res.status).toBe(503);
      expect(res.body.error.code).toBe("EXTRACTION_FAILED");
    });

    it("maps a non-retryable provider failure to 502", async () => {
      failWith(
        new APICallError({
          message: "bad request",
          url: "https://api.anthropic.com/v1/messages",
          requestBodyValues: {},
          statusCode: 400,
          isRetryable: false,
        }),
      );

      const res = await post({ transcript: COMPLETE_TRANSCRIPT });
      expect(res.status).toBe(502);
    });

    it("maps unparseable model output to 502", async () => {
      respondWith({ nonsense: true });
      const res = await post({ transcript: COMPLETE_TRANSCRIPT });

      expect(res.status).toBe(502);
      expect(res.body.error.code).toBe("EXTRACTION_FAILED");
    });

    it("never leaks provider internals to the client", async () => {
      failWith(new Error("ANTHROPIC_API_KEY=sk-secret leaked"));
      const res = await post({ transcript: COMPLETE_TRANSCRIPT });

      expect(res.status).toBe(502);
      expect(JSON.stringify(res.body)).not.toMatch(/sk-secret/);
      expect(res.body.error).toEqual({
        code: "EXTRACTION_FAILED",
        message: "Extraction failed",
      });
    });
  });

  describe("routing", () => {
    it("404s an unknown path", async () => {
      const res = await request(app).post("/nope").send({});
      expect(res.status).toBe(404);
    });

    it("404s the wrong method on /process-call", async () => {
      const res = await request(app).get("/process-call");
      expect(res.status).toBe(404);
    });
  });
});
