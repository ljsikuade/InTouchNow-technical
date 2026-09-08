import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { ValidationError } from "@errors/validation-error";

export const validate =
  <T extends z.ZodType>(schema: T) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) return next(new ValidationError(result.error));
    req.body = result.data as z.infer<T>;
    next();
  };
