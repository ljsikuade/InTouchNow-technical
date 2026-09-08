import express from "express";
import { errorHandler } from "@middleware/error-handler";
import { callsRouter } from "@routes/calls";

export const createApp = () => {
  const app = express();

  app.use(express.json());
  app.use(callsRouter);
  app.use(errorHandler);

  return app;
};
