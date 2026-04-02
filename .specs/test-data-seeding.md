# Test Data Seeding

Enable Expect to test applications that require pre-existing data — employees with payroll runs, orders with line items, projects with collaborators — without manual environment setup.

---

## Problem

Expect tests against a live browser with real auth (extracted cookies). It does not control the application's database. For apps like Rippling, testing paystub functionality requires employees, payroll runs, tax documents, and benefit elections to already exist. Without that data, the agent navigates to a page and sees an empty state. The test is meaningless — it proves the empty state renders, not that the feature works.

This is the single biggest blocker for testing real customer scenarios.

### Why this is hard

1. **No database access.** Expect connects via browser. It cannot seed a DB directly.
2. **Complex object graphs.** A paystub requires a company → employee → pay schedule → payroll run → paystub chain. Creating one object is useless without its dependencies.
3. **Non-determinism.** The target environment may already have some data, different data, or stale data. Seeds must be idempotent.
4. **Time cost.** Creating data through a UI is slow (minutes). Creating it via API is fast but requires knowledge of the app's internals.
5. **Auth scope.** Some seeding actions require admin permissions that the test user may not have.

---

## Design

A three-layer approach, each layer building on the previous. Ship layer 1 first; layers 2 and 3 are follow-ups.

### Layer 1: Agent-driven data awareness (prompt-only)

Zero code changes to the schema or executor. Enhance the system prompt so the agent reasons about data prerequisites before testing.

#### New prompt section: `<data_awareness>`

Add to `buildExecutionSystemPrompt()` after `<execution_strategy>`:

```
<data_awareness>
Before testing any flow that depends on pre-existing data (lists, dashboards, detail pages, reports, history):
1. Navigate to the relevant page and take a snapshot.
2. If the page shows an empty state, missing records, or insufficient data for the test:
   a. Check if the app has a creation flow accessible from the current UI (e.g. "Add Employee", "Create Project").
   b. If yes, use it to create the minimum data needed, then return to the original page.
   c. If no creation flow is available, or if creating the data requires admin access you don't have, emit STEP_SKIPPED with category=missing-test-data and describe exactly what data is needed.
3. Never test a feature against an empty state unless the empty state IS the feature under test.
4. When creating seed data, use obviously fake but realistic values (e.g. "Test Employee", "jane.doe+test@example.com", "$1,000.00 salary"). Do not use real personal data.
5. Seed data creation counts as setup, not as a test step. Emit STEP_START/STEP_DONE for seed actions but prefix the step title with "[Setup]" so the report distinguishes setup from assertions.
</data_awareness>
```

#### New failure category

`missing-test-data` already exists in the allowed failure categories list. The prompt section above teaches the agent to use it precisely instead of emitting a vague `STEP_SKIPPED`.

#### Prompt changes to `<stability_and_recovery>`

Add one line:

```
- If you encounter missing test data (empty lists, no records, "no results" states), treat it as a blocker that may be resolvable — check for creation flows before giving up.
```

### Layer 2: Seed instructions in config

Add a `seeds` field to `ExecutionPromptOptions` that lets users describe data prerequisites as structured text. These get injected into the execution prompt as `<seed_instructions>`.

#### New type

```ts
interface SeedInstruction {
  readonly name: string;
  readonly description: string;
  readonly steps: readonly string[];
}
```

#### Config surface

Users describe seeds in their test instruction or in a future `expect.config.ts`:

```ts
seeds: [
  {
    name: "payroll-employee",
    description: "An employee with at least one completed payroll run",
    steps: [
      "Navigate to People > Add Employee",
      "Fill in: name='Test Employee', email='test.employee@example.com', department='Engineering'",
      "Navigate to Payroll > Run Payroll",
      "Select the test employee, set salary to $5,000, complete the payroll run",
    ],
  },
];
```

#### Prompt injection

Add to `buildExecutionPrompt()`:

```
<seed_instructions>
Before testing, ensure the following data exists. Create it if missing:

1. payroll-employee: An employee with at least one completed payroll run
   - Navigate to People > Add Employee
   - Fill in: name='Test Employee', email='test.employee@example.com', department='Engineering'
   - Navigate to Payroll > Run Payroll
   - Select the test employee, set salary to $5,000, complete the payroll run
</seed_instructions>
```

The agent follows these as a recipe. If the data already exists (the agent checks first), it skips seeding.

#### Executor changes

- `ExecuteOptions` gains `seeds?: readonly SeedInstruction[]`.
- `ExecutionPromptOptions` gains `seeds?: readonly SeedInstruction[]`.
- `buildExecutionPrompt` formats them into `<seed_instructions>`.
- No schema changes to `TestPlan` or `TestPlanStep` — setup steps are just regular steps with a `[Setup]` prefix.

### Layer 3: Programmatic seed hooks

For users who need fast, deterministic seeding via APIs rather than browser automation.

#### `expect.seed.ts` convention

```ts
import type { SeedContext } from "@expect/shared/seed";

export default {
  "payroll-employee": {
    description: "An employee with at least one completed payroll run",
    check: async (ctx: SeedContext) => {
      const response = await ctx.fetch("/api/v1/employees", {
        headers: { Authorization: `Bearer ${ctx.token}` },
      });
      const employees = await response.json();
      return employees.length > 0;
    },
    create: async (ctx: SeedContext) => {
      const employee = await ctx.fetch("/api/v1/employees", {
        method: "POST",
        body: JSON.stringify({ name: "Test Employee", email: "test@example.com" }),
        headers: { Authorization: `Bearer ${ctx.token}` },
      });
      const { id } = await employee.json();
      await ctx.fetch("/api/v1/payroll/run", {
        method: "POST",
        body: JSON.stringify({ employeeId: id, amount: 5000 }),
        headers: { Authorization: `Bearer ${ctx.token}` },
      });
      return { employeeId: id };
    },
  },
};
```

#### `SeedContext` interface

```ts
interface SeedContext {
  readonly baseUrl: string;
  readonly token: string | undefined;
  readonly cookies: readonly { name: string; value: string }[];
  readonly fetch: (path: string, init?: RequestInit) => Promise<Response>;
}
```

`ctx.fetch` is a wrapper around `fetch` that prepends `baseUrl` and injects extracted cookies as headers. The token is derived from cookies if the app uses bearer auth, or undefined if cookie-based.

#### Executor changes

Before launching the browser MCP and agent stream, the executor:

1. Loads `expect.seed.ts` from the project root (if it exists).
2. For each seed, runs `check()`. If it returns `true`, skips.
3. If `check()` returns `false`, runs `create()`.
4. Collects the returned context objects and injects them into the prompt as `<seeded_data>`.

```
<seeded_data>
The following test data was pre-created via API before this session:
- payroll-employee: employeeId=emp_abc123
Use these IDs when navigating to specific records.
</seeded_data>
```

#### Error handling

- `check()` failure → log warning, fall back to layer 1 (agent-driven seeding).
- `create()` failure → `SeedCreationFailedError` with `{ seedName, cause }`. The executor skips that seed and annotates the prompt: "Seed 'payroll-employee' failed to create. The agent should attempt to create this data manually."
- Both `check` and `create` have a 30-second timeout (`SEED_TIMEOUT_MS`).

---

## Step phase distinction

All three layers use the same mechanism to distinguish setup from test steps in the output: the `[Setup]` prefix in step titles. This is a convention enforced by the prompt, not a schema change.

The `TestReport` and CLI UI can use this prefix to visually separate setup actions from assertions:

```
[Setup] Create test employee .............. done
[Setup] Run payroll for test employee ..... done
step-01  View paystub detail page ......... passed
step-02  Verify gross pay matches ......... passed
step-03  Download paystub PDF ............. passed
```

A future iteration could add `phase: "setup" | "test"` to `TestPlanStep` if structured filtering is needed.

---

## Files to change

### Layer 1 (prompt-only)

| File | Change |
| --- | --- |
| `packages/shared/src/prompts.ts` | Add `<data_awareness>` section to `buildExecutionSystemPrompt()` |
| `packages/shared/src/prompts.ts` | Add one line to `<stability_and_recovery>` |
| `packages/shared/tests/prompts.test.ts` | Update snapshot for new prompt sections |

### Layer 2 (seed instructions)

| File | Change |
| --- | --- |
| `packages/shared/src/models.ts` | Add `SeedInstruction` schema |
| `packages/shared/src/prompts.ts` | Add `seeds` to `ExecutionPromptOptions`, format `<seed_instructions>` |
| `packages/supervisor/src/executor.ts` | Add `seeds` to `ExecuteOptions`, pass through to prompt builder |
| `apps/cli/src/data/execution-atom.ts` | Thread seeds from config into executor |

### Layer 3 (programmatic hooks)

| File | Change |
| --- | --- |
| `packages/shared/src/seed.ts` | New — `SeedContext` interface, `SeedDefinition` type |
| `packages/supervisor/src/seed-runner.ts` | New — loads `expect.seed.ts`, runs check/create cycle |
| `packages/supervisor/src/executor.ts` | Call seed runner before agent stream, inject results into prompt |
| `packages/shared/src/errors.ts` | Add `SeedCreationFailedError` |

---

## Design decisions

| Decision | Rationale |
| --- | --- |
| Prompt-first, schema-last | Layer 1 is zero code changes. The agent already has browser access and can create data through the UI. Teaching it when and how to do so is the highest-leverage first step. |
| `[Setup]` prefix over `phase` field | Avoids a schema migration for a presentation concern. The prefix is parseable if we need structured filtering later. |
| Seed instructions as structured text, not code | Layer 2 is accessible to non-developers. A product manager can describe "create a payroll run" in plain English. The agent interprets it. |
| API seeds as a separate layer | Browser-based seeding (layers 1-2) works for any app without knowing its internals. API seeds (layer 3) are an optimization for teams who need speed and determinism. Both paths coexist. |
| `check()` before `create()` | Idempotency. If the data already exists, skip creation. Avoids duplicates and saves time on re-runs. |
| 30-second seed timeout | Seeds should be fast API calls. A seed that takes 30+ seconds is a sign of a problem (wrong endpoint, auth failure, network issue). Fail fast. |
| Fall back to agent-driven seeding on API failure | Layer 3 failures should not block the test run. The agent can still try to create data through the UI (layer 1). Graceful degradation. |
| `SeedContext.fetch` wrapper | Seeds should not need to know the full URL or manage cookies manually. The wrapper handles both, making seed scripts portable across environments. |
| No database seeding | Expect's value is testing from the user's perspective. If data can't be created through the app's own UI or API, that's a gap in the app, not in Expect. |

---

## Open questions

1. **Seed cleanup.** Should seeds be cleaned up after the test run? Pro: no pollution. Con: cleanup is fragile, and most test environments don't care about leftover test data. Leaning toward no cleanup initially.

2. **Seed sharing across runs.** If the same seed is needed by multiple test plans, should the executor cache the result? Probably yes for layer 3 (API seeds are deterministic). Probably no for layers 1-2 (the agent needs to verify the data still exists).

3. **Admin vs. user permissions.** Some apps require admin access to create test data. Should `SeedContext` support multiple auth contexts (admin cookies + test user cookies)? Defer until a concrete use case requires it.

4. **Seed ordering.** Seeds may depend on each other (create company before creating employee). Layer 2 handles this implicitly (steps are ordered). Layer 3 would need explicit dependency declaration or sequential execution. Start with sequential.
