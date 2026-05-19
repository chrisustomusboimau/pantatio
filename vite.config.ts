import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // kosongkan config server → SSR effectively useless
  },
  vite: {
    build: {
      ssr: false, // ⛔ paksa client-only
    },
  },
});