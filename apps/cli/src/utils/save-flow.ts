import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type {
  BrowserEnvironmentHints,
  BrowserFlowPlan,
  TestTarget,
} from "@browser-tester/supervisor";
import {
  FLOW_DESCRIPTION_CHAR_LIMIT,
  FLOW_DIRECTORY_INDEX_FILE_NAME,
  FLOW_DIRECTORY_NAME,
  SAVED_FLOW_FORMAT_VERSION,
} from "../constants.js";
import { slugify } from "./slugify.js";
import { formatSavedFlowFrontmatter } from "./saved-flow-file.js";
import { syncSavedFlowDirectory } from "./sync-saved-flow-directory.js";
import { truncateText } from "./truncate-text.js";

interface SaveFlowOptions {
  target: TestTarget;
  plan: BrowserFlowPlan;
  environment: BrowserEnvironmentHints;
}

export interface SaveFlowResult {
  flowPath: string;
  directoryPath: string;
  slug: string;
}

const normalizeWhitespace = (value: string): string => value.trim().replace(/\s+/g, " ");

const createFlowDescription = (plan: BrowserFlowPlan): string =>
  truncateText(
    normalizeWhitespace(plan.targetSummary || plan.rationale || plan.userInstruction),
    FLOW_DESCRIPTION_CHAR_LIMIT,
  );

const formatOptionalList = (values: string[]): string =>
  values.length > 0 ? values.map((value) => `- ${value}`).join("\n") : "- None";

const formatFlowFileContent = (
  options: SaveFlowOptions,
  slug: string,
  description: string,
): string => {
  const { target, plan, environment } = options;

  const stepBlocks = plan.steps
    .map((step, index) =>
      [
        `### ${index + 1}. ${step.title}`,
        "",
        `Instruction: ${step.instruction}`,
        `Expected outcome: ${step.expectedOutcome}`,
        `Route hint: ${step.routeHint ?? "None"}`,
        `Changed file evidence: ${
          step.changedFileEvidence && step.changedFileEvidence.length > 0
            ? step.changedFileEvidence.join(", ")
            : "None"
        }`,
      ].join("\n"),
    )
    .join("\n\n");

  return [
    formatSavedFlowFrontmatter({
      format_version: SAVED_FLOW_FORMAT_VERSION,
      title: plan.title,
      description,
      slug,
      saved_target_scope: target.scope,
      saved_target_display_name: target.displayName,
      plan,
      environment,
    }),
    "",
    `# ${plan.title}`,
    "",
    description,
    "",
    "## User Instruction",
    "",
    plan.userInstruction,
    "",
    "## Target",
    "",
    `- Scope: ${target.scope}`,
    `- Display name: ${target.displayName}`,
    `- Current branch: ${target.branch.current}`,
    `- Main branch: ${target.branch.main ?? "unknown"}`,
    "",
    "## Cookie Sync",
    "",
    `- Required: ${plan.cookieSync.required ? "Yes" : "No"}`,
    `- Reason: ${plan.cookieSync.reason}`,
    `- Enabled for this saved flow: ${environment.cookies === true ? "Yes" : "No"}`,
    "",
    "## Target URLs",
    "",
    formatOptionalList(plan.targetUrls),
    "",
    "## Risk Areas",
    "",
    formatOptionalList(plan.riskAreas),
    "",
    "## Assumptions",
    "",
    formatOptionalList(plan.assumptions),
    "",
    "## Steps",
    "",
    stepBlocks,
    "",
  ].join("\n");
};

export const saveFlow = async (options: SaveFlowOptions): Promise<SaveFlowResult> => {
  const slug = slugify(options.plan.title);
  const description = createFlowDescription(options.plan);
  const flowDirectoryPath = join(options.target.cwd, FLOW_DIRECTORY_NAME);
  const flowFilePath = join(flowDirectoryPath, `${slug}.md`);

  await mkdir(flowDirectoryPath, { recursive: true });
  await writeFile(flowFilePath, formatFlowFileContent(options, slug, description), "utf8");
  await syncSavedFlowDirectory(flowDirectoryPath);

  return {
    flowPath: join(FLOW_DIRECTORY_NAME, `${slug}.md`),
    directoryPath: join(FLOW_DIRECTORY_NAME, FLOW_DIRECTORY_INDEX_FILE_NAME),
    slug,
  };
};
