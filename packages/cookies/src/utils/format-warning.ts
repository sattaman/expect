import { formatError } from "@browser-tester/utils";

export const formatWarning = (source: string, action: string, error: unknown): string =>
  `${source}: ${action}: ${formatError(error)}`;
