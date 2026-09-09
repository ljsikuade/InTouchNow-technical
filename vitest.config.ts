import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const here = path.dirname(fileURLToPath(import.meta.url));
const src = (segment: string) => path.resolve(here, "src", segment);

export default defineConfig({
  resolve: {
    alias: {
      "@config": src("config"),
      "@controllers": src("controllers"),
      "@errors": src("errors"),
      "@llm": src("llm"),
      "@middleware": src("middleware"),
      "@routes": src("routes"),
      "@schemas": src("schemas"),
      "@services": src("services"),
      "@utils": src("utils"),
      "@": src(""),
    },
  },
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    env: { ANTHROPIC_API_KEY: "test-key" },
  },
});
