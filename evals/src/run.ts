import { MUTATIONS } from "./mutations.ts";
import { runEvals } from "./runner.ts";
import { buildSummary, printReport } from "./reporter.ts";
import { MUTATION_TIMEOUT_MS, DEFAULT_CONCURRENCY } from "./constants.ts";

const parseArgs = () => {
  const args = process.argv.slice(2);
  let filter: string | undefined;
  let port = 4173 + Math.floor(Math.random() * 100);
  let concurrency = DEFAULT_CONCURRENCY;
  let timeoutMs = MUTATION_TIMEOUT_MS;
  let verbose = false;
  let jsonOutput = false;

  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === "--filter" && args[index + 1]) {
      filter = args[++index];
    } else if (arg === "--port" && args[index + 1]) {
      port = parseInt(args[++index], 10);
    } else if (arg === "--concurrency" && args[index + 1]) {
      concurrency = parseInt(args[++index], 10);
    } else if (arg === "--timeout" && args[index + 1]) {
      timeoutMs = parseInt(args[++index], 10);
    } else if (arg === "--verbose") {
      verbose = true;
    } else if (arg === "--json") {
      jsonOutput = true;
    } else if (arg === "--help") {
      console.log(`Usage: bun src/run.ts [options]

Options:
  --filter <pattern>     Only run mutations whose ID contains <pattern>
  --concurrency <n>      Parallel mutation runs via git worktrees (default: ${DEFAULT_CONCURRENCY})
  --port <number>        Base Vite port (default: random 4173-4272)
  --timeout <ms>         Per-mutation timeout in ms (default: ${MUTATION_TIMEOUT_MS})
  --verbose              Print full testie stdout per mutation
  --json                 Write results JSON to evals/results/
  --help                 Show this help message`);
      process.exit(0);
    }
  }

  return { filter, port, concurrency, timeoutMs, verbose, jsonOutput };
};

const main = async () => {
  const { filter, port, concurrency, timeoutMs, verbose, jsonOutput } = parseArgs();

  let mutations = MUTATIONS;
  if (filter) {
    mutations = mutations.filter((mutation) => mutation.id.includes(filter));
    if (mutations.length === 0) {
      console.error(`No mutations match filter "${filter}"`);
      process.exit(1);
    }
    console.log(`Filtered to ${mutations.length} mutations matching "${filter}"`);
  }

  const results = await runEvals({
    mutations,
    port,
    concurrency,
    timeoutMs,
    verbose,
    jsonOutput,
  });
  const summary = buildSummary(results);
  printReport(summary);

  process.exit(summary.correct === summary.total ? 0 : 1);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
