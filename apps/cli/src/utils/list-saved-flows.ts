import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import type { TestTarget } from "@browser-tester/supervisor";
import { FLOW_DIRECTORY_INDEX_FILE_NAME, FLOW_DIRECTORY_NAME } from "../constants.js";
import { parseSavedFlowFile } from "./saved-flow-file.js";

export interface SavedFlowSummary {
  title: string;
  description: string;
  slug: string;
  filePath: string;
  modifiedAtMs: number;
  savedTargetScope: TestTarget["scope"] | null;
  savedTargetDisplayName: string | null;
}

const parseSavedFlowSummary = (
  content: string,
  filePath: string,
  modifiedAtMs: number,
): SavedFlowSummary | null => {
  const savedFlowFileData = parseSavedFlowFile(content);
  if (!savedFlowFileData) return null;

  return {
    title: savedFlowFileData.title,
    description: savedFlowFileData.description,
    slug: savedFlowFileData.slug,
    filePath,
    modifiedAtMs,
    savedTargetScope: savedFlowFileData.saved_target_scope,
    savedTargetDisplayName: savedFlowFileData.saved_target_display_name,
  };
};

export const listSavedFlows = async (cwd: string = process.cwd()): Promise<SavedFlowSummary[]> => {
  const flowDirectoryPath = join(cwd, FLOW_DIRECTORY_NAME);

  let flowFileNames: string[];
  try {
    flowFileNames = (await readdir(flowDirectoryPath))
      .filter((fileName) => fileName.endsWith(".md") && fileName !== FLOW_DIRECTORY_INDEX_FILE_NAME)
      .sort((leftValue, rightValue) => leftValue.localeCompare(rightValue));
  } catch {
    return [];
  }

  const savedFlows = await Promise.all(
    flowFileNames.map(async (fileName) => {
      const filePath = join(flowDirectoryPath, fileName);

      try {
        const [content, fileStats] = await Promise.all([
          readFile(filePath, "utf8"),
          stat(filePath),
        ]);
        return parseSavedFlowSummary(content, filePath, fileStats.mtimeMs);
      } catch {
        return null;
      }
    }),
  );

  return savedFlows
    .filter((savedFlow): savedFlow is SavedFlowSummary => savedFlow !== null)
    .sort(
      (leftValue, rightValue) =>
        rightValue.modifiedAtMs - leftValue.modifiedAtMs ||
        leftValue.title.localeCompare(rightValue.title),
    );
};
