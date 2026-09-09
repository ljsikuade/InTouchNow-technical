import { MockLanguageModelV4 } from "ai/test";

export const modelControl: { payload?: unknown; error?: unknown } = {};

export const respondWith = (payload: unknown): void => {
  modelControl.payload = payload;
  modelControl.error = undefined;
};

export const failWith = (error: unknown): void => {
  modelControl.error = error;
  modelControl.payload = undefined;
};

export const resetModel = (): void => {
  modelControl.payload = undefined;
  modelControl.error = undefined;
};

export const createMockModel = (): MockLanguageModelV4 =>
  new MockLanguageModelV4({
    doGenerate: async () => {
      if (modelControl.error) throw modelControl.error;

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(modelControl.payload ?? {}),
          },
        ],
        finishReason: { unified: "stop" as const, raw: "end_turn" },
        usage: {
          inputTokens: {
            total: 120,
            noCache: 120,
            cacheRead: 0,
            cacheWrite: 0,
          },
          outputTokens: { total: 60, text: 60, reasoning: 0 },
        },
        warnings: [],
      };
    },
  });
