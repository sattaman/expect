import { unlink } from "node:fs/promises";
import { dirname } from "node:path";
import { syncSavedFlowDirectory } from "./sync-saved-flow-directory.js";

export const removeSavedFlow = async (filePath: string): Promise<void> => {
  await unlink(filePath);
  await syncSavedFlowDirectory(dirname(filePath));
};
