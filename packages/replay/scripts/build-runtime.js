import { build } from "esbuild";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const result = await build({
  entryPoints: [resolve(root, "src/runtime/index.ts")],
  bundle: true,
  format: "iife",
  globalName: "__replayRuntime",
  minify: true,
  write: false,
  platform: "browser",
});

const bundledCode = result.outputFiles[0].text.trimEnd();
const escaped = JSON.stringify(bundledCode);
const generatedDir = resolve(root, "src/generated");

mkdirSync(generatedDir, { recursive: true });
writeFileSync(
  resolve(root, "src/generated/runtime-script.ts"),
  `export const RUNTIME_SCRIPT = ${escaped};\n`,
);
