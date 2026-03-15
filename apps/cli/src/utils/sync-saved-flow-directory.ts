import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { FLOW_DIRECTORY_INDEX_FILE_NAME } from "../constants.js";
import { parseSavedFlowFile } from "./saved-flow-file.js";

interface SavedFlowDirectoryEntry {
  title: string;
  description: string;
  slug: string;
}

const parseSavedFlowDirectoryEntry = (content: string): SavedFlowDirectoryEntry | null => {
  const savedFlowFileData = parseSavedFlowFile(content);
  if (!savedFlowFileData) return null;

  return {
    title: savedFlowFileData.title,
    description: savedFlowFileData.description,
    slug: savedFlowFileData.slug,
  };
};

const formatSavedFlowDirectoryContent = (entries: SavedFlowDirectoryEntry[]): string =>
  [
    "# Saved Flows",
    "",
    ...(entries.length > 0
      ? entries.map((entry) => `- [${entry.title}](./${entry.slug}.md) - ${entry.description}`)
      : ["No saved flows yet."]),
    "",
  ].join("\n");

export const syncSavedFlowDirectory = async (flowDirectoryPath: string): Promise<string> => {
  const directoryFilePath = join(flowDirectoryPath, FLOW_DIRECTORY_INDEX_FILE_NAME);

  let flowFileNames: string[];
  try {
    flowFileNames = (await readdir(flowDirectoryPath))
      .filter((fileName) => fileName.endsWith(".md") && fileName !== FLOW_DIRECTORY_INDEX_FILE_NAME)
      .sort((leftValue, rightValue) => leftValue.localeCompare(rightValue));
  } catch {
    return directoryFilePath;
  }

  const directoryEntries = (
    await Promise.all(
      flowFileNames.map(async (fileName) => {
        const filePath = join(flowDirectoryPath, fileName);
        const fileContent = await readFile(filePath, "utf8");
        return parseSavedFlowDirectoryEntry(fileContent);
      }),
    )
  )
    .filter((entry): entry is SavedFlowDirectoryEntry => entry !== null)
    .sort((leftValue, rightValue) => leftValue.title.localeCompare(rightValue.title));

  await writeFile(directoryFilePath, formatSavedFlowDirectoryContent(directoryEntries), "utf8");

  return directoryFilePath;
};
