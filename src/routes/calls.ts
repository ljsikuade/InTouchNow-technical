import { Router } from "express";
import { processCall } from "@controllers/calls";
import { validate } from "@middleware/validate";
import { processCallSchema } from "@schemas/call";

export const callsRouter = Router();

callsRouter.post("/process-call", validate(processCallSchema), processCall);
