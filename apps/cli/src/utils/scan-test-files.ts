import { execFile } from "node:child_process";
import { Effect, FileSystem } from "effect";
import { NodeServices } from "@effect/platform-node";
import { TEST_FILE_CONTENT_SIZE_LIMIT_BYTES, TEST_FILE_SCAN_LIMIT } from "../constants";

export interface TestFile {
  relativePath: string;
  content: string;
}

const TEST_FILE_PATTERN = /\.(?:test|spec|e2e)\.(?:ts|tsx|js|jsx|mts|mjs|cts|cjs)$/;

const TEST_DIRECTORY_PATTERN = /(?:^|[/\\])(?:__tests?__|tests?)[/\\]/;

const SOURCE_EXTENSION_PATTERN = /\.(?:ts|tsx|js|jsx|mts|mjs|cts|cjs)$/;

const SKIP_DIRECTORIES = new Set([
  "node_modules",
  "dist",
  "build",
  ".git",
  ".next",
  ".turbo",
  "coverage",
  ".nyc_output",
  ".cache",
  "__snapshots__",
  "__fixtures__",
]);

const isTestFile = (filePath: string): boolean => {
  if (TEST_FILE_PATTERN.test(filePath)) return true;
  if (TEST_DIRECTORY_PATTERN.test(filePath) && SOURCE_EXTENSION_PATTERN.test(filePath)) return true;
  return false;
};

const isInSkippedDirectory = (filePath: string): boolean => {
  const segments = filePath.split(/[/\\]/);
  return segments.some((segment) => SKIP_DIRECTORIES.has(segment));
};

const listGitFiles = (rootDir: string): Promise<string[]> =>
  new Promise((resolve) => {
    execFile(
      "git",
      ["ls-files", "--cached", "--others", "--exclude-standard"],
      { cwd: rootDir, maxBuffer: 10 * 1024 * 1024 },
      (error, stdout) => {
        if (error) {
          resolve([]);
          return;
        }
        const files = stdout.split("\n").filter((line) => line.length > 0);
        resolve(files);
      },
    );
  });

const readTestFile = Effect.fn("readTestFile")(function* (rootDir: string, relativePath: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  const fullPath = `${rootDir}/${relativePath}`;

  const stat = yield* fileSystem.stat(fullPath);
  if (stat.size > TEST_FILE_CONTENT_SIZE_LIMIT_BYTES) {
    return undefined;
  }

  const content = yield* fileSystem.readFileString(fullPath);
  return { relativePath, content } satisfies TestFile;
});

export const scanTestFiles = async (rootDir: string): Promise<TestFile[]> => {
  const allFiles = await listGitFiles(rootDir);

  const testFilePaths = allFiles
    .filter((filePath) => !isInSkippedDirectory(filePath) && isTestFile(filePath))
    .slice(0, TEST_FILE_SCAN_LIMIT);

  const effect = Effect.forEach(
    testFilePaths,
    (relativePath) =>
      readTestFile(rootDir, relativePath).pipe(
        Effect.catchTag("PlatformError", () => Effect.succeed(undefined)),
      ),
    { concurrency: 10 },
  ).pipe(
    Effect.map((results) => results.filter((result): result is TestFile => result !== undefined)),
  );

  return Effect.runPromise(effect.pipe(Effect.provide(NodeServices.layer)));
};
