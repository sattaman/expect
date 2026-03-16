import { spawn, execSync, type ChildProcess } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { randomBytes } from "node:crypto";
import type { Mutation, EvalResult } from "./types.ts";
import {
  MUTATION_TIMEOUT_MS,
  HMR_WAIT_MS,
  HMR_REVERT_WAIT_MS,
  VITE_STARTUP_TIMEOUT_MS,
  VITE_POLL_INTERVAL_MS,
} from "./constants.ts";

const sleep = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const STATUS_PATTERN = /Run (passed|failed):/;

const repoRoot = resolve(dirname(new URL(import.meta.url).pathname), "../..");

const parseStatus = (stdout: string): "passed" | "failed" | "error" => {
  const match = stdout.match(STATUS_PATTERN);
  if (!match) return "error";
  return match[1] === "passed" ? "passed" : "failed";
};

const ensureCleanWorkingTree = () => {
  const status = execSync("git status --porcelain", {
    cwd: repoRoot,
    encoding: "utf-8",
  }).trim();
  if (status.length > 0) {
    throw new Error(`Git working tree is dirty. Clean up before running evals:\n${status}`);
  }
};

interface WorktreeSlot {
  worktreePath: string;
  port: number;
  viteProcess: ChildProcess;
}

const createWorktree = (slotIndex: number): string => {
  const randomSuffix = randomBytes(4).toString("hex");
  const worktreePath = join(tmpdir(), `testie-eval-${slotIndex}-${randomSuffix}`);
  execSync(`git worktree add --detach "${worktreePath}" HEAD`, {
    cwd: repoRoot,
    stdio: "pipe",
  });
  return worktreePath;
};

const removeWorktree = (worktreePath: string) => {
  try {
    execSync(`git worktree remove --force "${worktreePath}"`, {
      cwd: repoRoot,
      stdio: "pipe",
    });
  } catch {}
};

const installDeps = (worktreePath: string) => {
  execSync("pnpm install --prefer-offline --frozen-lockfile", {
    cwd: worktreePath,
    stdio: "pipe",
    env: { ...process.env, FORCE_COLOR: "0" },
    timeout: 60_000,
  });
};

const applyMutationAt = (rootPath: string, mutation: Mutation) => {
  const absolutePath = resolve(rootPath, mutation.filePath);
  const content = readFileSync(absolutePath, "utf-8");
  if (!content.includes(mutation.search)) {
    throw new Error(
      `Search string not found in ${mutation.filePath} for mutation "${mutation.id}"`,
    );
  }
  const mutatedContent = content.replace(mutation.search, mutation.replace);
  writeFileSync(absolutePath, mutatedContent, "utf-8");
};

const revertMutationAt = (rootPath: string, mutation: Mutation) => {
  const absolutePath = resolve(rootPath, mutation.filePath);
  execSync(`git checkout -- "${absolutePath}"`, { cwd: rootPath });
};

const startViteAt = (rootPath: string, port: number): ChildProcess => {
  const appDirectory = resolve(rootPath, "evals/app");
  const viteProcess = spawn("npx", ["vite", "--port", String(port), "--strictPort"], {
    cwd: appDirectory,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, FORCE_COLOR: "0" },
  });
  return viteProcess;
};

const waitForViteReady = async (port: number) => {
  const url = `http://localhost:${port}`;
  const startTime = Date.now();
  while (Date.now() - startTime < VITE_STARTUP_TIMEOUT_MS) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {}
    await sleep(VITE_POLL_INTERVAL_MS);
  }
  throw new Error(`Vite dev server did not start within ${VITE_STARTUP_TIMEOUT_MS}ms`);
};

const runTestieAt = (
  rootPath: string,
  port: number,
  timeoutMs: number,
): Promise<{ stdout: string; exitCode: number }> =>
  new Promise((resolve) => {
    const testieProcess = spawn(
      "npx",
      ["testie", "unstaged", "-y", "--base-url", `http://localhost:${port}`],
      {
        cwd: rootPath,
        stdio: ["ignore", "pipe", "pipe"],
        env: { ...process.env, CI: "true", FORCE_COLOR: "0" },
      },
    );

    let stdout = "";
    let stderr = "";
    testieProcess.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    testieProcess.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    const timer = setTimeout(() => {
      testieProcess.kill("SIGTERM");
      stdout += "\n[TIMEOUT] Process killed after timeout";
    }, timeoutMs);

    testieProcess.on("close", (code) => {
      clearTimeout(timer);
      resolve({ stdout: stdout + stderr, exitCode: code ?? 1 });
    });
  });

const executeMutation = async (
  rootPath: string,
  mutation: Mutation,
  port: number,
  timeoutMs: number,
  verbose: boolean,
): Promise<EvalResult> => {
  const startTime = Date.now();

  try {
    applyMutationAt(rootPath, mutation);
    await sleep(HMR_WAIT_MS);

    const { stdout } = await runTestieAt(rootPath, port, timeoutMs);
    const actualStatus = parseStatus(stdout);
    const durationMs = Date.now() - startTime;

    if (verbose) {
      console.log(`\n--- stdout for ${mutation.id} ---\n${stdout}\n---\n`);
    }

    return {
      mutationId: mutation.id,
      name: mutation.name,
      expectedStatus: mutation.expectedStatus,
      actualStatus,
      correct: actualStatus === mutation.expectedStatus,
      durationMs,
      stdout,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    return {
      mutationId: mutation.id,
      name: mutation.name,
      expectedStatus: mutation.expectedStatus,
      actualStatus: "error",
      correct: false,
      durationMs,
      stdout: "",
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    revertMutationAt(rootPath, mutation);
    await sleep(HMR_REVERT_WAIT_MS);
  }
};

export interface RunOptions {
  mutations: Mutation[];
  port: number;
  concurrency: number;
  timeoutMs: number;
  verbose: boolean;
  jsonOutput: boolean;
}

const runSequential = async (options: RunOptions): Promise<EvalResult[]> => {
  const { mutations, port, timeoutMs, verbose } = options;

  console.log(`Starting Vite dev server on port ${port}...`);
  const viteProcess = startViteAt(repoRoot, port);

  try {
    await waitForViteReady(port);
    console.log(`Vite ready. Running ${mutations.length} mutations...\n`);

    const results: EvalResult[] = [];
    for (const mutation of mutations) {
      const index = mutations.indexOf(mutation) + 1;
      process.stdout.write(`[${index}/${mutations.length}] ${mutation.id} ... `);

      const result = await executeMutation(repoRoot, mutation, port, timeoutMs, verbose);
      results.push(result);

      const icon = result.correct ? "OK" : "!!";
      const durationSeconds = (result.durationMs / 1000).toFixed(0);
      console.log(`[${icon}] ${result.actualStatus} (${durationSeconds}s)`);
    }

    return results;
  } finally {
    viteProcess.kill("SIGTERM");
  }
};

const runParallel = async (options: RunOptions): Promise<EvalResult[]> => {
  const { mutations, port, concurrency, timeoutMs, verbose } = options;
  const slotCount = Math.min(concurrency, mutations.length);

  console.log(`Setting up ${slotCount} worktree slots for parallel execution...`);

  const slots: WorktreeSlot[] = [];
  try {
    for (let slotIndex = 0; slotIndex < slotCount; slotIndex++) {
      const slotPort = port + slotIndex;
      process.stdout.write(`  Slot ${slotIndex}: creating worktree... `);
      const worktreePath = createWorktree(slotIndex);
      process.stdout.write("installing deps... ");
      installDeps(worktreePath);
      process.stdout.write(`starting Vite on :${slotPort}... `);
      const viteProcess = startViteAt(worktreePath, slotPort);
      await waitForViteReady(slotPort);
      console.log("ready");
      slots.push({ worktreePath, port: slotPort, viteProcess });
    }

    console.log(
      `\nAll slots ready. Running ${mutations.length} mutations with concurrency ${slotCount}...\n`,
    );

    const results: EvalResult[] = new Array(mutations.length);
    const slotAvailable = slots.map(() => Promise.resolve());
    let completedCount = 0;

    const runWithSlot = async (mutation: Mutation, mutationIndex: number, slotIndex: number) => {
      const slot = slots[slotIndex];
      const result = await executeMutation(
        slot.worktreePath,
        mutation,
        slot.port,
        timeoutMs,
        verbose,
      );
      results[mutationIndex] = result;
      completedCount++;

      const icon = result.correct ? "OK" : "!!";
      const durationSeconds = (result.durationMs / 1000).toFixed(0);
      console.log(
        `[${completedCount}/${mutations.length}] ${mutation.id} [${icon}] ${result.actualStatus} (${durationSeconds}s)`,
      );
    };

    for (let mutationIndex = 0; mutationIndex < mutations.length; mutationIndex++) {
      const slotIndex = mutationIndex % slotCount;
      const mutation = mutations[mutationIndex];

      slotAvailable[slotIndex] = slotAvailable[slotIndex].then(() =>
        runWithSlot(mutation, mutationIndex, slotIndex),
      );
    }

    await Promise.all(slotAvailable);
    return results;
  } finally {
    for (const slot of slots) {
      slot.viteProcess.kill("SIGTERM");
      removeWorktree(slot.worktreePath);
    }
  }
};

export const runEvals = async (options: RunOptions): Promise<EvalResult[]> => {
  ensureCleanWorkingTree();

  const results =
    options.concurrency <= 1 ? await runSequential(options) : await runParallel(options);

  if (options.jsonOutput) {
    const resultsDirectory = resolve(repoRoot, "evals/results");
    mkdirSync(resultsDirectory, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const outputPath = resolve(resultsDirectory, `${timestamp}.json`);
    writeFileSync(outputPath, JSON.stringify(results, null, 2), "utf-8");
    console.log(`\nResults written to ${outputPath}`);
  }

  return results;
};
