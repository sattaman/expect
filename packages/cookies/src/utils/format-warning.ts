import { formatError } from "./format-error.js";

export const formatWarning = (source: string, action: string, error: unknown): string =>
  `${source}: ${action}: ${formatError(error)}`;
