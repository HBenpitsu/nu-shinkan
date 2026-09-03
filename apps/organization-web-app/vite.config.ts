import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  root: "./src",
  publicDir: "./public",
  envDir: mode === "development" ? "." : "./.generated",
  build: {
    outDir: "../dist",
    emptyOutDir: true,
  },
  plugins: [
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
      routesDirectory: "./routes",
      generatedRouteTree: "./routeTree.gen.ts",
      routeFileIgnorePrefix: "-",
      quoteStyle: "single",
    }),
    react(),
  ],
  resolve: {
    alias: {
      "@": import.meta.dirname + "/src",
    },
  },
}));
