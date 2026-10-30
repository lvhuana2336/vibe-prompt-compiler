import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";

const packageInfo = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));

export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || "/",
  define: {
    __APP_VERSION__: JSON.stringify(packageInfo.version),
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
  },
  build: {
    outDir: "dist",
  },
});
