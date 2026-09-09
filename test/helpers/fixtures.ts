export const COMPLETE_TRANSCRIPT =
  "Hi, I've had a really bad cough for 5 days and I'd like to see a doctor. " +
  "My name is John Smith and my date of birth is 2nd Jan 1990.";

export const INCOMPLETE_TRANSCRIPT =
  "Um, hello? I'm not sure if this is the right number.";

export const completeExtraction = {
  patient: { name: "John Smith", date_of_birth: "1990-01-02" },
  clinical: { symptoms: ["cough"], duration: "5 days", urgency: "routine" },
  intent: "book_appointment",
  confidence: 0.85,
  recommended_action: { type: "book_appointment", mode: "gp_consultation" },
};

export const incompleteExtraction = {
  patient: { name: null, date_of_birth: null },
  clinical: { symptoms: null, duration: null, urgency: null },
  intent: null,
  confidence: 0.1,
  recommended_action: { type: "unclear", mode: null },
};

export const unsafeEmergencyExtraction = {
  ...completeExtraction,
  clinical: {
    symptoms: ["chest pain"],
    duration: "1 hour",
    urgency: "emergency",
  },
  recommended_action: { type: "book_appointment", mode: "gp_consultation" },
};
