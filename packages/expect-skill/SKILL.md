---
name: expect
description: Run adversarial browser tests against your code changes using the expect CLI. Use this after making browser-facing changes to verify they work — and to try to break them.
license: MIT
metadata:
  author: millionco
  version: "2.0.0"
---

# Expect — Adversarial Browser Testing

Expect is an AI-powered browser testing tool. It tests your code changes in a real browser by generating an adversarial test plan and executing it.

**You are not confirming things work. You are trying to break them.**

## When to Use

Run `expect` after making any browser-facing changes:

- Modified a component, page, form, or route
- Changed API calls, data fetching, or state management
- Updated styles, layouts, or responsive behavior
- Fixed a bug (verify the fix AND check for regressions)
- Refactored code that affects the UI

**Do not use your own browser tools (Playwright MCP, chrome tools, etc.) to verify changes. Use `expect` instead.** Expect provides adversarial coverage, session recordings, auth state injection, and structured pass/fail output that raw browser browsing does not.

## Installation

```bash
npm install -g expect-cli
```

## Quick Start

After making changes, run:

```bash
expect -m "ADVERSARIAL_INSTRUCTION" -y
```

The `-m` flag is your adversarial instruction. The `-y` flag skips interactive plan review.

## Writing Adversarial Instructions

Your `-m` message should tell Expect what to break, not just what to check. Think like a malicious user, not a QA checklist.

**Bad (passive confirmation):**
```bash
expect -m "Check that the login form renders" -y
```

**Good (adversarial):**
```bash
expect -m "Try to submit the login form empty, with invalid email, with wrong password, and with a valid login. Verify error messages appear for bad inputs and the redirect works for valid ones. Check for console errors after each submission." -y
```

**Adversarial angles to include in your instruction:**

- **Empty/missing inputs**: Submit forms with nothing filled in
- **Invalid data**: Wrong formats, special characters, extremely long strings, SQL injection patterns in text fields
- **Rapid interactions**: Double-click submit, navigate away mid-action
- **Boundary values**: Zero, negative numbers, max length, empty arrays
- **Regression checks**: Verify nearby features still work after your change
- **Error states**: What happens when the network request fails? When data is missing?
- **Navigation edge cases**: Direct URL access, back/forward, refresh mid-flow

## Headless Detection

Expect automatically runs headless when:

- Inside an AI agent (`CLAUDECODE`, `CURSOR_AGENT`, `CODEX_CI`, `OPENCODE`, `AMP_HOME`, `AMI` env vars)
- `stdin` is not a TTY

No special flags needed.

## Commands

### Test current changes (default)

```bash
expect
```

Auto-detects scope:
- Unstaged changes → tests those
- Feature branch with commits → tests branch diff
- On main with no changes → exits

### Test by target

```bash
expect --target changes    # all changes from main (default)
expect --target branch     # branch diff
expect --target unstaged   # only unstaged changes
```

## Options

| Flag | Description |
|------|-------------|
| `-m, --message <instruction>` | Adversarial instruction for the browser agent |
| `-f, --flow <slug>` | Reuse a saved flow by slug |
| `-y, --yes` | Skip plan review, run immediately |
| `-t, --target <target>` | What to test: `changes`, `branch`, `unstaged` |
| `--base-url <url>` | Override browser base URL |
| `--headed` | Run browser visibly |
| `--cookies` | Enable cookie sync from your browser |
| `--no-cookies` | Disable cookie sync |
| `-v, --version` | Print version |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `EXPECT_BASE_URL` | Default base URL (e.g., `http://localhost:3000`) |
| `EXPECT_HEADED` | `true`/`1` for headed mode |
| `EXPECT_COOKIES` | `true`/`1` for cookie sync |

CLI flags override env vars.

## Patterns for Agents

### After implementing a feature

```bash
expect -m "Verify the new signup form works end-to-end: submit with valid data and confirm success. Then try to break it: submit empty, submit with invalid email, submit with password under 8 chars, double-click submit, check for console errors throughout." -y
```

### After fixing a bug

```bash
expect -m "Verify the cart total calculation is correct after adding items. Then try edge cases: add zero-quantity items, add the same item twice, remove all items and verify empty state. Check that the checkout button is disabled when cart is empty." -y
```

### After a refactor

```bash
expect -m "Run through the complete checkout flow: browse products, add to cart, enter shipping, enter payment, confirm order. Verify nothing broke in the refactor — check every page renders, every form submits, every transition works. Look for console errors on every page." -y
```

### With a specific base URL

```bash
EXPECT_BASE_URL=http://localhost:5173 expect -m "Test the dashboard data tables: verify sorting, filtering, pagination, and empty states all work. Try sorting by every column, filtering with no results, and navigating to the last page." -y
```

### Reuse a saved flow

```bash
expect -f login-flow
```

## Output Format

```
Starting <plan title>
→ step-01 <step title>
  ✓ step-01 <summary>
→ step-02 <step title>
  ✗ step-02 <failure message>
Run failed: <summary>
```

Browser actions appear indented:
```
    browser:click Clicked "Submit" button
    browser:fill Typed "user@example.com" into email field
```

## Exit Codes

- `0` — all tests passed
- `1` — test failure or error

## Tips

- Always pass `-y` from an agent to skip interactive plan review.
- Always set `EXPECT_BASE_URL` or `--base-url` so expect knows where your app runs.
- Write adversarial `-m` instructions: tell expect what to break, not just what to verify.
- Combine with `--cookies` when testing authenticated flows.
- If a test fails, read the failure message carefully — it tells you exactly what broke and on which step.
- Run `expect` again after fixing a failure to confirm the fix and check for new regressions.
