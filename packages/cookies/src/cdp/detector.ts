import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { homedir, platform } from "node:os";
import path from "node:path";
import { execCommand } from "@browser-tester/utils";
import type { BrowserInfo, BrowserProfile, LocalStateProfile } from "../types.js";
import { naturalCompare } from "../utils/natural-sort.js";
import { PROFILE_BROWSER_CONFIGS } from "./constants.js";

const loadProfileNamesFromLocalState = (userDataDir: string): Record<string, LocalStateProfile> => {
  const localStatePath = path.join(userDataDir, "Local State");
  try {
    const content = readFileSync(localStatePath, "utf-8");
    const localState = JSON.parse(content);
    const infoCache = localState?.profile?.info_cache;
    if (!infoCache || typeof infoCache !== "object") {
      return {};
    }
    const profiles: Record<string, LocalStateProfile> = {};
    for (const [profileId, profileEntry] of Object.entries(infoCache)) {
      const entry = profileEntry as Record<string, unknown>;
      if (entry?.name && typeof entry.name === "string") {
        profiles[profileId] = { name: entry.name };
      }
    }
    return profiles;
  } catch {
    return {};
  }
};

const isValidProfile = (profilePath: string): boolean => {
  try {
    const stats = statSync(profilePath);
    if (!stats.isDirectory()) return false;

    const preferencesPath = path.join(profilePath, "Preferences");
    return existsSync(preferencesPath);
  } catch {
    return false;
  }
};

const getUserDataDirDarwin = (darwinPath: string): string =>
  path.join(homedir(), "Library", "Application Support", darwinPath);

const getUserDataDirLinux = (linuxPath: string): string =>
  path.join(process.env["XDG_CONFIG_HOME"] ?? path.join(homedir(), ".config"), linuxPath);

const getUserDataDirWin32 = (win32Path: string): string => {
  const localAppData = process.env["LOCALAPPDATA"] ?? path.join(homedir(), "AppData", "Local");
  return path.join(localAppData, win32Path);
};

export const getUserDataDir = (
  currentPlatform: string,
  config: {
    darwinUserDataPath: string;
    linuxUserDataPath: string;
    win32UserDataPath: string;
  },
): string | null => {
  switch (currentPlatform) {
    case "darwin":
      return getUserDataDirDarwin(config.darwinUserDataPath);
    case "linux":
      return getUserDataDirLinux(config.linuxUserDataPath);
    case "win32":
      return getUserDataDirWin32(config.win32UserDataPath);
    default:
      return null;
  }
};

const detectProfilesForBrowser = (browser: BrowserInfo, userDataDir: string): BrowserProfile[] => {
  if (!existsSync(userDataDir)) return [];

  const profileNames = loadProfileNamesFromLocalState(userDataDir);
  const profiles: BrowserProfile[] = [];

  try {
    const entries = readdirSync(userDataDir);

    for (const entry of entries) {
      const profilePath = path.join(userDataDir, entry);
      if (!isValidProfile(profilePath)) continue;

      const localStateProfile = profileNames[entry];
      const displayName = localStateProfile?.name ?? entry;

      profiles.push({
        profileName: entry,
        profilePath,
        displayName,
        browser,
      });
    }
  } catch {
    return [];
  }

  profiles.sort((left, right) => naturalCompare(left.profileName, right.profileName));
  return profiles;
};

const detectBrowsersDarwin = (): BrowserInfo[] =>
  PROFILE_BROWSER_CONFIGS.filter((config) => existsSync(config.info.executablePath)).map(
    (config) => config.info,
  );

const detectBrowsersLinux = (): BrowserInfo[] => {
  const browsers: BrowserInfo[] = [];
  for (const config of PROFILE_BROWSER_CONFIGS) {
    const binaryName = config.linuxUserDataPath.split("/").pop() ?? config.linuxUserDataPath;
    const searchPaths = [
      `/usr/bin/${binaryName}`,
      `/usr/local/bin/${binaryName}`,
      `/snap/bin/${binaryName}`,
    ];
    for (const executablePath of searchPaths) {
      if (existsSync(executablePath)) {
        browsers.push({ name: config.info.name, executablePath });
        break;
      }
    }
  }
  return browsers;
};

const queryRegistryPath = (registryKey: string): string | null => {
  const regPath = `HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\${registryKey}`;
  return execCommand(`reg query "${regPath}" /ve`);
};

const parseRegistryOutput = (output: string): string | null => {
  const match = output.match(/REG_SZ\s+(.+)/);
  if (!match?.[1]) return null;
  const candidate = match[1].trim();
  return candidate.length > 0 ? candidate : null;
};

const detectBrowsersWin32 = (): BrowserInfo[] => {
  const browsers: BrowserInfo[] = [];
  const programFiles = process.env["ProgramFiles"] ?? "C:\\Program Files";
  const programFilesX86 = process.env["ProgramFiles(x86)"] ?? "C:\\Program Files (x86)";
  const localAppData = process.env["LOCALAPPDATA"] ?? path.join(homedir(), "AppData", "Local");

  for (const config of PROFILE_BROWSER_CONFIGS) {
    const registryOutput = queryRegistryPath(config.registryKey);
    if (registryOutput) {
      const registryExePath = parseRegistryOutput(registryOutput);
      if (registryExePath && existsSync(registryExePath)) {
        browsers.push({ name: config.info.name, executablePath: registryExePath });
        continue;
      }
    }

    let found = false;
    for (const win32RelativePath of config.win32ExecutablePaths) {
      const candidates = [
        path.join(programFiles, win32RelativePath),
        path.join(programFilesX86, win32RelativePath),
        path.join(localAppData, win32RelativePath),
      ];
      for (const candidate of candidates) {
        if (existsSync(candidate)) {
          browsers.push({ name: config.info.name, executablePath: candidate });
          found = true;
          break;
        }
      }
      if (found) break;
    }
  }
  return browsers;
};

export const detectBrowserProfiles = (): BrowserProfile[] => {
  const currentPlatform = platform();
  const allProfiles: BrowserProfile[] = [];

  const installedBrowsers =
    currentPlatform === "darwin"
      ? detectBrowsersDarwin()
      : currentPlatform === "linux"
        ? detectBrowsersLinux()
        : currentPlatform === "win32"
          ? detectBrowsersWin32()
          : [];

  for (const browser of installedBrowsers) {
    const config = PROFILE_BROWSER_CONFIGS.find(
      (browserConfig) => browserConfig.info.name === browser.name,
    );
    if (!config) continue;

    const userDataDir = getUserDataDir(currentPlatform, config);
    if (!userDataDir) continue;

    const profiles = detectProfilesForBrowser(browser, userDataDir);
    allProfiles.push(...profiles);
  }

  return allProfiles;
};
