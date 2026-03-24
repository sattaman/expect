import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    entry: ["src/index.ts", "src/models.ts", "src/observability/exports.ts"],
    format: ["esm"],
    dts: true,
    sourcemap: true,
  },
});
