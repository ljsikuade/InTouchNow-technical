import { AppError } from "@errors/app-error";

export class ExtractionError extends AppError {
  readonly statusCode: number;
  readonly code = "EXTRACTION_FAILED";

  constructor(message: string, statusCode = 502, cause?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.cause = cause;
  }
}
