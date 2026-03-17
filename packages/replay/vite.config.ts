import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    entry: ["src/index.ts", "src/runtime/index.ts"],
    format: ["esm"],
    dts: true,
    sourcemap: true,
  },
});
