import { Request, Response } from "express";
import { ProcessCallInput } from "@schemas/call";
import { processCallTranscript } from "@services/call-service";

export const processCall = async (
  req: Request<unknown, unknown, ProcessCallInput>,
  res: Response
): Promise<void> => {
  const { transcript } = req.body;
  const extraction = await processCallTranscript(transcript);

  res.status(200).json(extraction);
};
