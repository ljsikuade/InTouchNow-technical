import { ErrorRequestHandler } from "express";
import { AppError } from "@errors/app-error";
import { ValidationError } from "@errors/validation-error";

const isJsonParseError = (err: unknown): err is SyntaxError =>
  err instanceof SyntaxError && "body" in err;

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ValidationError) {
    res.status(err.statusCode).json({
      error: { code: err.code, message: err.message, issues: err.issues },
    });
    return;
  }

  if (isJsonParseError(err)) {
    res.status(400).json({
      error: { code: "MALFORMED_JSON", message: "Request body is not valid JSON" },
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: { code: err.code, message: err.message },
    });
    return;
  }

  console.error(err);
  res.status(500).json({
    error: { code: "INTERNAL_ERROR", message: "Internal server error" },
  });
};
