import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  // Rozwiązuje alias "@/..." z tsconfig.json — natywnie, bez wtyczki.
  resolve: { tsconfigPaths: true },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    // Klient Prismy jest generowany — nie testujemy go.
    exclude: ["node_modules/**", "src/generated/**", ".next/**"],
  },
});
