import { Request, Response } from "express";
import { ProcessCallInput } from "@schemas/call";

export const processCall = (
  req: Request<unknown, unknown, ProcessCallInput>,
  res: Response
): void => {
  const { transcript } = req.body;

  res.status(200).json({
    status: "accepted",
    transcript: { length: transcript.length },
  });
};
