import * as fs from "node:fs";
import * as path from "node:path";

const CSS_OUTPUT_PATH = "./dist/overlay.css";
const FONTS_DIR = "./src/runtime/overlay/fonts";

const fonts = [
  {
    family: "OpenRunde-Medium",
    file: "OpenRunde-Medium.woff2",
    weight: "500",
    style: "normal",
  },
];

let cssContent = fs.readFileSync(CSS_OUTPUT_PATH, "utf8");

for (const font of fonts) {
  const fontPath = path.join(FONTS_DIR, font.file);
  const fontData = fs.readFileSync(fontPath);
  const base64 = fontData.toString("base64");
  const dataUrl = `data:font/woff2;base64,${base64}`;

  const fontFace = `@font-face{font-family:"${font.family}";src:url("${dataUrl}") format("woff2");font-weight:${font.weight};font-style:${font.style};font-display:swap}`;

  cssContent = fontFace + cssContent;
}

fs.writeFileSync(CSS_OUTPUT_PATH, cssContent);
