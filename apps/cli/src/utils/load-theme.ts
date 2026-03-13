import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const CONFIG_DIRECTORY = join(homedir(), ".config", "browser-tester");
const THEME_FILE_PATH = join(CONFIG_DIRECTORY, "theme");

export const loadThemeName = (): string | null => {
  try {
    return readFileSync(THEME_FILE_PATH, "utf-8").trim() || null;
  } catch {
    return null;
  }
};

export const saveThemeName = (name: string): void => {
  mkdirSync(CONFIG_DIRECTORY, { recursive: true });
  writeFileSync(THEME_FILE_PATH, name, "utf-8");
};
