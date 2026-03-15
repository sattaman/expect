import { detectTerminal } from "detect-terminal";
import supportsTerminalGraphics from "supports-terminal-graphics";

const INLINE_IMAGE_UNSUPPORTED_TERMINALS = new Set(["warpterminal"]);

const graphicsSupport = supportsTerminalGraphics.stdout;
const detectedTerminal = detectTerminal({ preferOuter: true });
const canRenderInlineImages =
  process.stdout.isTTY && !INLINE_IMAGE_UNSUPPORTED_TERMINALS.has(detectedTerminal ?? "");

export const supportsKittyImages = canRenderInlineImages && graphicsSupport.kitty;
export const supportsItermImages = canRenderInlineImages && graphicsSupport.iterm2;
export const supportsInlineImages = supportsKittyImages || supportsItermImages;
