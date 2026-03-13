import { existsSync, readdirSync, rmSync } from "node:fs";
import { homedir, platform } from "node:os";
import path from "node:path";
import { MAX_UNIX_EPOCH_SECONDS } from "../constants.js";
import type { Cookie, ExtractResult } from "../types.js";
import { getEpochSeconds } from "@browser-tester/utils";
import { copyDatabaseToTemp } from "../utils/copy-database.js";
import { formatWarning } from "../utils/format-warning.js";
import { normalizeSameSite } from "../utils/normalize-same-site.js";
import { buildHostWhereClause, sqliteBool } from "../utils/sql.js";
import { stripLeadingDot } from "../utils/strip-leading-dot.js";
import { querySqlite } from "./adapter.js";

const parseFirefoxExpiry = (value: unknown): number | undefined => {
  let expirySeconds: number;
  if (typeof value === "bigint") {
    expirySeconds = Number(value);
  } else if (typeof value === "string") {
    expirySeconds = Number(value);
    if (!Number.isFinite(expirySeconds)) return undefined;
  } else if (typeof value === "number") {
    expirySeconds = value;
  } else {
    return undefined;
  }
  if (Number.isNaN(expirySeconds) || expirySeconds <= 0 || expirySeconds > MAX_UNIX_EPOCH_SECONDS)
    return undefined;
  return Math.round(expirySeconds);
};

const resolveCookieDbPath = (): string | null => {
  const home = homedir();
  const currentPlatform = platform();

  const roots =
    currentPlatform === "darwin"
      ? [path.join(home, "Library", "Application Support", "Firefox", "Profiles")]
      : currentPlatform === "linux"
        ? [path.join(home, ".mozilla", "firefox")]
        : currentPlatform === "win32"
          ? [path.join(home, "AppData", "Roaming", "Mozilla", "Firefox", "Profiles")]
          : [];

  for (const root of roots) {
    try {
      const entries = readdirSync(root, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name);

      const picked = entries.find((entry) => entry.includes("default-release")) ?? entries[0];
      if (!picked) continue;

      const candidate = path.join(root, picked, "cookies.sqlite");
      if (existsSync(candidate)) return candidate;
    } catch {
      continue;
    }
  }

  return null;
};

export const extractFirefoxCookies = async (
  hosts: string[],
  options: {
    names?: string[];
    includeExpired?: boolean;
  } = {},
): Promise<ExtractResult> => {
  const warnings: string[] = [];
  const databasePath = resolveCookieDbPath();

  if (!databasePath) {
    warnings.push("firefox: cookie database not found");
    return { cookies: [], warnings };
  }

  let tempDir: string;
  let tempDatabasePath: string;
  try {
    ({ tempDir, tempDatabasePath } = copyDatabaseToTemp(
      databasePath,
      "cookies-firefox-",
      "cookies.sqlite",
    ));
  } catch (error) {
    warnings.push(formatWarning("firefox", "failed to copy cookie database", error));
    return { cookies: [], warnings };
  }

  try {
    const whereClause = buildHostWhereClause(hosts, "host");
    const currentTime = getEpochSeconds();
    const expiryClause = options.includeExpired
      ? ""
      : ` AND (expiry = 0 OR expiry > ${currentTime})`;

    const sqlQuery =
      `SELECT name, value, host, path, expiry, isSecure, isHttpOnly, sameSite ` +
      `FROM moz_cookies WHERE (${whereClause})${expiryClause} ORDER BY expiry DESC`;

    const cookieRows = await querySqlite(tempDatabasePath, sqlQuery);
    const allowlist = options.names ? new Set(options.names) : null;
    const cookies: Cookie[] = [];

    for (const cookieRow of cookieRows) {
      const cookieName = typeof cookieRow.name === "string" ? cookieRow.name : null;
      const cookieValue = typeof cookieRow.value === "string" ? cookieRow.value : null;
      const cookieHost = typeof cookieRow.host === "string" ? cookieRow.host : null;

      if (!cookieName || cookieValue === null || !cookieHost) continue;
      if (allowlist && !allowlist.has(cookieName)) continue;

      const expires = parseFirefoxExpiry(cookieRow.expiry);

      if (!options.includeExpired && expires && expires < currentTime) continue;

      cookies.push({
        name: cookieName,
        value: cookieValue,
        domain: stripLeadingDot(cookieHost),
        path: (typeof cookieRow.path === "string" ? cookieRow.path : "") || "/",
        expires,
        secure: sqliteBool(cookieRow.isSecure),
        httpOnly: sqliteBool(cookieRow.isHttpOnly),
        sameSite: normalizeSameSite(cookieRow.sameSite),
        browser: "firefox",
      });
    }

    return { cookies, warnings };
  } catch (error) {
    warnings.push(formatWarning("firefox", "failed to read cookies", error));
    return { cookies: [], warnings };
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
};
