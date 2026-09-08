import { ZodError } from "zod";
import { AppError } from "@errors/app-error";

export interface ValidationIssue {
  path: string;
  message: string;
}

export class ValidationError extends AppError {
  readonly statusCode = 400;
  readonly code = "VALIDATION_ERROR";
  readonly issues: ValidationIssue[];

  constructor(error: ZodError) {
    super("Request validation failed");
    this.issues = error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));
  }
}
