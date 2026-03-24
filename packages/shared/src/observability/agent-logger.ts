import { Logger } from "effect";
import { join } from "node:path";

const LOG_FILE = join(process.cwd(), ".expect", "logs.md");

export const DebugFileLogger = Logger.formatLogFmt.pipe(Logger.toFile(LOG_FILE));
