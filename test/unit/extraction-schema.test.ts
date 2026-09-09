import { describe, expect, it } from "vitest";
import { callExtractionSchema } from "@schemas/extraction";
import { completeExtraction, incompleteExtraction } from "../helpers/fixtures";

const parse = (payload: unknown) => callExtractionSchema.safeParse(payload);
const withPatient = (patch: object) => ({
  ...completeExtraction,
  patient: { ...completeExtraction.patient, ...patch },
});
const withClinical = (patch: object) => ({
  ...completeExtraction,
  clinical: { ...completeExtraction.clinical, ...patch },
});

describe("callExtractionSchema", () => {
  describe("accepts", () => {
    it("a complete extraction", () => {
      const result = parse(completeExtraction);
      expect(result.success).toBe(true);
      expect(result.success && result.data.patient.name).toBe("John Smith");
    });

    it("an incomplete extraction where every data field is null", () => {
      const result = parse(incompleteExtraction);
      expect(result.success).toBe(true);
      expect(result.success && result.data.intent).toBeNull();
      expect(result.success && result.data.recommended_action.type).toBe("unclear");
    });
  });

  describe("degrades unusable values to null without losing the rest", () => {
    it.each([
      ["empty name", withPatient({ name: "" }), "patient.name"],
      ["non-string name", withPatient({ name: 123 }), "patient.name"],
      ["impossible date", withPatient({ date_of_birth: "1990-02-31" }), "patient.date_of_birth"],
      ["non-leap-year 29 Feb", withPatient({ date_of_birth: "1900-02-29" }), "patient.date_of_birth"],
      ["future date of birth", withPatient({ date_of_birth: "2087-01-01" }), "patient.date_of_birth"],
      ["wrong date format", withPatient({ date_of_birth: "02/01/1990" }), "patient.date_of_birth"],
      ["symptom array with an empty entry", withClinical({ symptoms: ["cough", ""] }), "clinical.symptoms"],
      ["symptoms not an array", withClinical({ symptoms: "cough" }), "clinical.symptoms"],
      ["empty duration", withClinical({ duration: "" }), "clinical.duration"],
      ["invalid urgency", withClinical({ urgency: "banana" }), "clinical.urgency"],
    ])("%s -> null", (_label, payload, path) => {
      const result = parse(payload);
      expect(result.success).toBe(true);
      if (!result.success) return;

      const [head, tail] = path.split(".");
      const section = result.data[head as "patient" | "clinical"] as Record<string, unknown>;
      expect(section[tail]).toBeNull();

      // The rest of the extraction must survive.
      expect(result.data.confidence).toBe(completeExtraction.confidence);
      expect(result.data.recommended_action.type).toBe("book_appointment");
    });

    it("an invalid intent -> null", () => {
      const result = parse({ ...completeExtraction, intent: "banana" });
      expect(result.success).toBe(true);
      expect(result.success && result.data.intent).toBeNull();
    });

    it("keeps a real leap day", () => {
      const result = parse(withPatient({ date_of_birth: "2000-02-29" }));
      expect(result.success && result.data.patient.date_of_birth).toBe("2000-02-29");
    });
  });

  describe("rejects — the system fields cannot degrade", () => {
    it.each([
      ["null confidence", { ...completeExtraction, confidence: null }],
      ["confidence above 1", { ...completeExtraction, confidence: 1.5 }],
      ["missing confidence", { ...completeExtraction, confidence: undefined }],
      [
        "null recommended_action.type",
        { ...completeExtraction, recommended_action: { type: null, mode: null } },
      ],
      [
        "invalid recommended_action.type",
        { ...completeExtraction, recommended_action: { type: "banana", mode: null } },
      ],
    ])("%s", (_label, payload) => {
      expect(parse(payload).success).toBe(false);
    });
  });
});
