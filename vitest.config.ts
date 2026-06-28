import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      include: [
        "src/lib/auth/api-errors.ts",
        "src/lib/auth/permissions.ts",
        "src/lib/validation/schemas.ts",
        "src/lib/pagination.ts",
        "src/lib/security/two-factor.ts",
        "src/lib/security/rate-limit.ts",
        "src/lib/queue/**",
        "src/lib/certificates/certificate-service.ts",
        "src/lib/certificates/errors.ts",
        "src/lib/reports/export-service.ts",
        "src/lib/seats/seat-service.ts",
        "src/lib/programs/program-service.ts",
        "src/lib/payment/types.ts",
        "src/lib/payment/payment-service.ts",
      ],
      exclude: [
        "src/lib/**/__tests__/**",
        "src/lib/**/*.integration.test.ts",
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 65,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
