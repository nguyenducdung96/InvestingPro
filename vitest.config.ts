import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
export default defineConfig({
  test: { include: ["tests/**/*.test.ts"], testTimeout: 30000 },
  resolve: {
    alias: {
      "@invest/domain": fileURLToPath(
        new URL("./packages/domain/src/index.ts", import.meta.url),
      ),
      "@invest/db": fileURLToPath(
        new URL("./packages/db/src/index.ts", import.meta.url),
      ),
      "@invest/port": fileURLToPath(
        new URL("./packages/modules/port/src/index.ts", import.meta.url),
      ),
    },
  },
});
